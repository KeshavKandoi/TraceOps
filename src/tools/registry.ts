import type { ToolResult } from "./types.js";
import type { AnyToolDefinition } from "./tool.js";
import { searchLogs, type SearchLogsInput } from "./search-logs.js";
import { getMetrics, type GetMetricsInput } from "./get-metrics.js";
import { getServiceStatus, type GetServiceStatusInput } from "./get-service-status.js";
import {
  SearchLogsInputSchema,
  GetMetricsInputSchema,
  GetServiceStatusInputSchema,
} from "./schemas.js";

const searchLogsTool: AnyToolDefinition = {
  name: "search_logs",
  description: "Search service logs, optionally filtered by log level.",
  inputSchema: SearchLogsInputSchema,
  execute: (input: SearchLogsInput) => searchLogs(input),
};

const getMetricsTool: AnyToolDefinition = {
  name: "get_metrics",
  description:
    "Get baseline and windowed metrics for a service, optionally filtered by a time range.",
  inputSchema: GetMetricsInputSchema,
  execute: (input: GetMetricsInput) => getMetrics(input),
};

const getServiceStatusTool: AnyToolDefinition = {
  name: "get_service_status",
  description:
    "Get the current health, dependency, and database status for a service.",
  inputSchema: GetServiceStatusInputSchema,
  execute: (input: GetServiceStatusInput) => getServiceStatus(input),
};

const registeredTools: AnyToolDefinition[] = [
  searchLogsTool,
  getMetricsTool,
  getServiceStatusTool,
];

const toolMap = new Map<string, AnyToolDefinition>(
  registeredTools.map((tool) => [tool.name, tool]),
);

export function listToolNames(): string[] {
  return Array.from(toolMap.keys());
}

export function listTools(): Array<{ name: string; description: string }> {
  return registeredTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
  }));
}

export function getTool(name: string): ToolResult<AnyToolDefinition> {
  const tool = toolMap.get(name);

  if (!tool) {
    return {
      ok: false,
      error: `Unknown tool: "${name}". Known tools: ${listToolNames().join(", ")}`,
    };
  }

  return { ok: true, data: tool };
}

export function executeTool(name: string, rawInput: unknown): ToolResult<unknown> {
  const toolLookup = getTool(name);

  if (!toolLookup.ok) {
    return toolLookup;
  }

  const tool = toolLookup.data;
  const parsedInput = tool.inputSchema.safeParse(rawInput);

  if (!parsedInput.success) {
    const details = parsedInput.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");

    return {
      ok: false,
      error: `Invalid input for tool "${name}": ${details}`,
    };
  }

  return tool.execute(parsedInput.data);
}
