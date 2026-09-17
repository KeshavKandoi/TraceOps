import { describe, it, expect } from "vitest";
import { runInvestigation } from "../../src/agent/graph.js";
import { FakeModel } from "../../src/model/fake-model.js";
import type { Model, ModelResponse } from "../../src/model/model.js";
import { TraceEventType, redactSensitiveValues, summarizeForTrace } from "../../src/trace/events.js";

function finalResponse(summary: string, rootCause = "root cause"): ModelResponse {
  return {
    type: "final",
    response: {
      objective: "test objective",
      rootCause,
      summary,
      evidenceIds: [],
      createdAt: "2024-01-15T10:20:00Z",
    },
  };
}

describe("trace events", () => {
  it("records an ordered trace for a single tool call followed by a final response", async () => {
    const model = new FakeModel([
      { type: "tool_call", toolName: "get_service_status", arguments: { service: "payment" } },
      finalResponse("done"),
    ]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });
    const types = result.state.trace.map((event) => event.type);

    expect(types).toEqual([
      TraceEventType.OBJECTIVE_SET,
      TraceEventType.MODEL_DECISION,
      TraceEventType.TOOL_CALL,
      TraceEventType.TOOL_RESULT,
      TraceEventType.MODEL_DECISION,
      TraceEventType.FINAL_RESPONSE,
    ]);
  });

  it("gives every event a unique id and a parseable timestamp", async () => {
    const model = new FakeModel([finalResponse("no tools needed")]);
    const result = await runInvestigation("Quick check", { model, maxSteps: 10 });

    const ids = new Set(result.state.trace.map((event) => event.id));
    expect(ids.size).toBe(result.state.trace.length);

    for (const event of result.state.trace) {
      expect(() => new Date(event.timestamp).toISOString()).not.toThrow();
      expect(typeof event.type).toBe("string");
    }
  });

  it("records a multi-step trace across several tools", async () => {
    const model = new FakeModel([
      { type: "tool_call", toolName: "get_service_status", arguments: { service: "payment" } },
      { type: "tool_call", toolName: "search_logs", arguments: { service: "payment" } },
      finalResponse("root cause found"),
    ]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });
    const types = result.state.trace.map((event) => event.type);

    expect(types.filter((type) => type === TraceEventType.TOOL_CALL)).toHaveLength(2);
    expect(types.filter((type) => type === TraceEventType.TOOL_RESULT)).toHaveLength(2);
    expect(types[types.length - 1]).toBe(TraceEventType.FINAL_RESPONSE);
  });

  it("records a tool_result event with a safe summary on success", async () => {
    const model = new FakeModel([
      { type: "tool_call", toolName: "get_service_status", arguments: { service: "payment" } },
      finalResponse("done"),
    ]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });
    const toolResultEvent = result.state.trace.find((event) => event.type === TraceEventType.TOOL_RESULT);

    expect(toolResultEvent).toBeDefined();
    expect(toolResultEvent?.details?.toolName).toBe("get_service_status");
  });

  it("records a tool_error event when a tool call fails", async () => {
    const model = new FakeModel([
      { type: "tool_call", toolName: "get_metrics", arguments: { service: "" } },
      finalResponse("continued"),
    ]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });
    const errorEvent = result.state.trace.find((event) => event.type === TraceEventType.TOOL_ERROR);

    expect(errorEvent).toBeDefined();
    expect(errorEvent?.details?.toolName).toBe("get_metrics");
  });

  it("records a model_error event when the model throws", async () => {
    const failingModel: Model = {
      decide: async () => {
        throw new Error("model exploded");
      },
    };

    const result = await runInvestigation("Investigate payment errors", { model: failingModel, maxSteps: 10 });
    const errorEvent = result.state.trace.find((event) => event.type === TraceEventType.MODEL_ERROR);

    expect(errorEvent).toBeDefined();
    expect(result.stopReason).toBe("model_error");
  });

  it("records an execution_limit_reached event when the step limit stops the loop", async () => {
    const model = new FakeModel([
      { type: "tool_call", toolName: "get_service_status", arguments: { service: "payment" } },
      { type: "tool_call", toolName: "search_logs", arguments: { service: "payment" } },
      finalResponse("should not be reached"),
    ]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 1 });
    const limitEvent = result.state.trace.find(
      (event) => event.type === TraceEventType.EXECUTION_LIMIT_REACHED,
    );

    expect(limitEvent).toBeDefined();
    expect(result.stopReason).toBe("step_limit_reached");
    expect(result.state.trace[result.state.trace.length - 1]?.type).toBe(
      TraceEventType.EXECUTION_LIMIT_REACHED,
    );
  });

  it("records a final_response event carrying the investigation conclusion", async () => {
    const model = new FakeModel([finalResponse("root cause identified", "db pool exhaustion")]);
    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });

    const finalEvent = result.state.trace.find((event) => event.type === TraceEventType.FINAL_RESPONSE);

    expect(finalEvent).toBeDefined();
    expect(finalEvent?.details?.rootCause).toBe("db pool exhaustion");
  });

  it("never exposes API-key-like values in the trace, even inside tool call arguments", async () => {
    const fakeSecret = "sk-1234567890abcdefABCDEFghijklmnop";
    const model = new FakeModel([
      {
        type: "tool_call",
        toolName: "get_service_status",
        arguments: { service: "payment", apiKey: fakeSecret },
      },
      finalResponse("done"),
    ]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });
    const serialized = JSON.stringify(result.state.trace);

    expect(serialized).not.toContain(fakeSecret);
  });

  it("redacts sensitive keys and long token-like values via redactSensitiveValues", () => {
    const redacted = redactSensitiveValues({
      service: "payment",
      apiKey: "should-be-hidden",
      nested: { token: "also-hidden", plain: "kept" },
      looseSecret: "aB3dEfGhIjKlMnOpQrStUvWxYz012345",
    }) as Record<string, unknown>;

    expect(redacted.service).toBe("payment");
    expect(redacted.apiKey).toBe("[REDACTED]");
    expect((redacted.nested as Record<string, unknown>).token).toBe("[REDACTED]");
    expect((redacted.nested as Record<string, unknown>).plain).toBe("kept");
    expect(redacted.looseSecret).toBe("[REDACTED]");
  });

  it("truncates very large values instead of dumping them raw", () => {
    const bigArray = Array.from({ length: 200 }, (_, index) => `entry-${index}`);
    const summarized = summarizeForTrace(bigArray, 100) as { truncated: boolean; preview: string };

    expect(summarized.truncated).toBe(true);
    expect(summarized.preview.length).toBeLessThanOrEqual(103);
  });
});
