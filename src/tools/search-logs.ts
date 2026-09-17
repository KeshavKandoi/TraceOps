import type { LogEntry, LogLevel, ToolResult } from "./types.js";
import { loadLogs, loadServices } from "./data-loader.js";

export interface SearchLogsInput {
  service: string;
  level?: LogLevel;
}

export function searchLogs(input: SearchLogsInput): ToolResult<LogEntry[]> {
  const knownServices = loadServices().map((service) => service.name);

  if (!knownServices.includes(input.service)) {
    return {
      ok: false,
      error: `Unknown service: "${input.service}". Known services: ${knownServices.join(", ")}`,
    };
  }

  const serviceLogs = loadLogs().filter((log) => log.service === input.service);
  const filteredLogs = input.level
    ? serviceLogs.filter((log) => log.level === input.level)
    : serviceLogs;

  return { ok: true, data: filteredLogs };
}
