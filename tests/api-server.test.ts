import { Readable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleApiRequest } from "../src/api.js";

interface CapturedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    issues?: Array<{ path: string; message: string }>;
  };
}

interface ToolsBody {
  tools: Array<{ name: string }>;
}

interface ScenariosBody {
  scenarios: Array<{ id: string }>;
}

function makeRequest(method: string, url: string, body?: string): IncomingMessage {
  const request = Readable.from(body === undefined ? [] : [body]) as IncomingMessage;
  request.method = method;
  request.url = url;
  request.headers = { host: "localhost", "content-type": "application/json" };
  return request;
}

function makeResponse(): ServerResponse & { captured: CapturedResponse } {
  const captured: CapturedResponse = {
    statusCode: 0,
    headers: {},
    body: undefined,
  };

  return {
    captured,
    writeHead(statusCode: number, headers: Record<string, string>) {
      captured.statusCode = statusCode;
      captured.headers = headers;
      return this;
    },
    end(payload?: string) {
      captured.body = payload ? JSON.parse(payload) : undefined;
      return this;
    },
  } as ServerResponse & { captured: CapturedResponse };
}

async function request(method: string, url: string, body?: unknown): Promise<CapturedResponse> {
  const response = makeResponse();
  const serializedBody =
    typeof body === "string" ? body : body === undefined ? undefined : JSON.stringify(body);
  await handleApiRequest(makeRequest(method, url, serializedBody), response);
  return response.captured;
}

describe("TraceOps HTTP API server", () => {
  const originalGeminiApiKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (originalGeminiApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalGeminiApiKey;
    }
  });

  it("serves health, tool metadata, and deterministic scenarios", async () => {
    const health = await request("GET", "/api/health");
    const tools = await request("GET", "/api/tools");
    const scenarios = await request("GET", "/api/scenarios");

    expect(health.statusCode).toBe(200);
    expect(health.body).toEqual({ ok: true });
    expect(health.headers["access-control-allow-origin"]).toBe("http://localhost:5173");

    expect(tools.statusCode).toBe(200);
    expect((tools.body as ToolsBody).tools.map((tool) => tool.name)).toEqual([
      "search_logs",
      "get_metrics",
      "get_service_status",
    ]);

    expect(scenarios.statusCode).toBe(200);
    expect((scenarios.body as ScenariosBody).scenarios.map((scenario) => scenario.id)).toEqual([
      "success",
      "tool_failure_recovery",
      "step_limit",
    ]);
  });

  it("rejects malformed JSON with a 400 response", async () => {
    const response = await request("POST", "/api/investigate", "{bad json");
    const body = response.body as ApiErrorBody;

    expect(response.statusCode).toBe(400);
    expect(body.error.code).toBe("invalid_json");
  });

  it("rejects invalid investigation request fields with structured issues", async () => {
    const response = await request("POST", "/api/investigate", {
      objective: "",
      maxSteps: 21,
      scenario: "unknown",
    });
    const body = response.body as ApiErrorBody;

    expect(response.statusCode).toBe(400);
    expect(body.error.code).toBe("invalid_request");
    expect(body.error.issues?.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(["objective", "maxSteps", "scenario"]),
    );
  });

  it("returns 405 for unsupported methods on known routes and 404 for unknown routes", async () => {
    const wrongMethod = await request("GET", "/api/investigate");
    const missingRoute = await request("GET", "/api/nope");

    expect(wrongMethod.statusCode).toBe(405);
    expect((wrongMethod.body as ApiErrorBody).error.code).toBe("method_not_allowed");

    expect(missingRoute.statusCode).toBe(404);
    expect((missingRoute.body as ApiErrorBody).error.code).toBe("not_found");
  });

  it("keeps Gemini key handling server-side and reports missing credentials safely", async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await request("POST", "/api/investigate", {
      objective: "Investigate payment errors",
      model: "gemini",
      scenario: "success",
    });
    const body = response.body as ApiErrorBody;

    expect(response.statusCode).toBe(503);
    expect(body.error.code).toBe("model_unavailable");
    expect(JSON.stringify(body)).not.toMatch(/AIza|sk-|secret|token/i);
  });
});
