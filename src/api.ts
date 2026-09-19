import "./load-env.js";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { runInvestigation, type StopReason } from "./agent/graph.js";
import type { AgentState } from "./agent/state.js";
import { FakeModel } from "./model/fake-model.js";
import { createGeminiModel, GeminiModelError } from "./model/gemini-model.js";
import { demoScenarios, getDemoScenario, type DemoScenarioId } from "./model/fake-scenarios.js";
import { listToolMetadata } from "./tools/registry.js";

const DEFAULT_PORT = 8787;

const InvestigationRequestSchema = z
  .object({
    objective: z.string().trim().min(1, "objective is required").max(500),
    maxSteps: z.number().int().min(1).max(20).optional(),
    model: z.enum(["fake", "gemini"]).optional().default("fake"),
    scenario: z.enum(["success", "tool_failure_recovery", "step_limit"]).optional().default("success"),
  })
  .strict();

export type InvestigationRequest = z.infer<typeof InvestigationRequestSchema>;

export interface ApiInvestigationResponse {
  objective: string;
  status: "completed" | "failed";
  stepCount: number;
  maxSteps: number;
  evidence: AgentState["evidence"];
  trace: AgentState["trace"];
  finalResponse: AgentState["finalResponse"];
  stopReason: StopReason;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    issues?: Array<{ path: string; message: string }>;
  };
}

export function toApiInvestigationResponse(
  state: AgentState,
  stopReason: StopReason,
  maxSteps: number,
): ApiInvestigationResponse {
  return {
    objective: state.objective,
    status: stopReason === "final_response" ? "completed" : "failed",
    stepCount: state.stepCount,
    maxSteps,
    evidence: state.evidence,
    trace: state.trace,
    finalResponse: state.finalResponse,
    stopReason,
  };
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": process.env.TRACEOPS_ALLOWED_ORIGIN ?? "http://localhost:5173",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end(JSON.stringify(payload));
}

function sendError(
  response: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  issues?: ApiErrorResponse["error"]["issues"],
): void {
  sendJson(response, statusCode, {
    error: {
      code,
      message,
      ...(issues !== undefined ? { issues } : {}),
    },
  } satisfies ApiErrorResponse);
}

const MAX_REQUEST_BODY_BYTES = 100_000;

export class RequestTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the maximum allowed size.");
    this.name = "RequestTooLargeError";
  }
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > MAX_REQUEST_BODY_BYTES) {
      throw new RequestTooLargeError();
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function scenarioPayload() {
  return Object.values(demoScenarios).map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
    objective: scenario.objective,
    maxSteps: scenario.maxSteps,
  }));
}

export function getScenarioSummaries() {
  return scenarioPayload();
}

export function validateInvestigationRequest(body: unknown):
  | { ok: true; data: InvestigationRequest }
  | { ok: false; error: ApiErrorResponse["error"] } {
  const parsed = InvestigationRequestSchema.safeParse(body);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  return {
    ok: false,
    error: {
      code: "invalid_request",
      message: "Request body failed validation.",
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join(".") || "(root)",
        message: issue.message,
      })),
    },
  };
}

export async function runApiInvestigation(
  request: InvestigationRequest,
): Promise<ApiInvestigationResponse> {
  const scenario = getDemoScenario(request.scenario as DemoScenarioId);
  const maxSteps = request.maxSteps ?? scenario.maxSteps;
  const model =
    request.model === "gemini"
      ? createGeminiModel()
      : new FakeModel(scenario.responses.map((responseItem) => {
          if (responseItem.type !== "final") {
            return responseItem;
          }
          return {
            ...responseItem,
            response: {
              ...responseItem.response,
              objective: request.objective,
            },
          };
        }));

  const result = await runInvestigation(request.objective, { model, maxSteps });
  return toApiInvestigationResponse(result.state, result.stopReason, maxSteps);
}

async function handleInvestigation(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      sendError(response, 413, "payload_too_large", error.message);
      return;
    }
    sendError(response, 400, "invalid_json", "Request body must be valid JSON.");
    return;
  }

  const parsed = validateInvestigationRequest(body);
  if (!parsed.ok) {
    sendError(
      response,
      400,
      parsed.error.code,
      parsed.error.message,
      parsed.error.issues,
    );
    return;
  }

  try {
    sendJson(response, 200, await runApiInvestigation(parsed.data));
  } catch (error) {
    if (error instanceof GeminiModelError) {
      sendError(response, 503, "model_unavailable", error.message);
      return;
    }
    throw error;
  }
}

export async function handleApiRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/tools") {
      sendJson(response, 200, { tools: listToolMetadata() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/scenarios") {
      sendJson(response, 200, { scenarios: getScenarioSummaries() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/investigate") {
      await handleInvestigation(request, response);
      return;
    }

    if (["/api/health", "/api/tools", "/api/scenarios", "/api/investigate"].includes(url.pathname)) {
      sendError(response, 405, "method_not_allowed", "Method not allowed for this route.");
      return;
    }

    sendError(response, 404, "not_found", "Route not found.");
  } catch {
    sendError(response, 500, "internal_error", "Unexpected server error.");
  }
}

export function createApiServer(): http.Server {
  return http.createServer((request, response) => {
    void handleApiRequest(request, response);
  });
}

export async function startApiServer(port = Number(process.env.PORT ?? DEFAULT_PORT)): Promise<http.Server> {
  const server = createApiServer();
  await new Promise<void>((resolve) => {
    server.listen(port, resolve);
  });
  return server;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const server = await startApiServer(port);
  const address = server.address();
  const boundPort = typeof address === "object" && address !== null ? address.port : port;
  console.log(`TraceOps API listening on http://localhost:${boundPort}`);
}
