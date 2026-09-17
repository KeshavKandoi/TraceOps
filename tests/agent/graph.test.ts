import { describe, it, expect } from "vitest";
import { runInvestigation } from "../../src/agent/graph.js";
import { FakeModel } from "../../src/model/fake-model.js";
import type { ModelResponse } from "../../src/model/model.js";

function finalResponse(summary: string): ModelResponse {
  return {
    type: "final",
    response: {
      objective: "test objective",
      rootCause: "root cause",
      summary,
      evidenceIds: [],
      createdAt: "2024-01-15T10:20:00Z",
    },
  };
}

describe("agent graph", () => {
  it("runs a single tool call followed by a final response", async () => {
    const model = new FakeModel([
      { type: "tool_call", toolName: "get_service_status", arguments: { service: "payment" } },
      finalResponse("payment service investigated"),
    ]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });

    expect(result.stopReason).toBe("final_response");
    expect(result.state.evidence).toHaveLength(1);
    expect(result.state.evidence[0]?.toolName).toBe("get_service_status");
    expect(result.state.finalResponse).not.toBeNull();
    expect(model.calls).toBe(2);
  });

  it("runs a multi-step investigation using multiple tools before a final response", async () => {
    const model = new FakeModel([
      { type: "tool_call", toolName: "get_service_status", arguments: { service: "payment" } },
      { type: "tool_call", toolName: "search_logs", arguments: { service: "payment", level: "error" } },
      { type: "tool_call", toolName: "get_metrics", arguments: { service: "payment" } },
      finalResponse("root cause identified after three tools"),
    ]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });

    expect(result.stopReason).toBe("final_response");
    expect(result.state.evidence).toHaveLength(3);
    expect(result.state.evidence.map((entry) => entry.toolName)).toEqual([
      "get_service_status",
      "search_logs",
      "get_metrics",
    ]);
    expect(model.calls).toBe(4);
  });

  it("returns a final response immediately when no tool call is made", async () => {
    const model = new FakeModel([finalResponse("no tools were necessary")]);

    const result = await runInvestigation("Quick check", { model, maxSteps: 10 });

    expect(result.stopReason).toBe("final_response");
    expect(result.state.evidence).toHaveLength(0);
    expect(model.calls).toBe(1);
  });

  it("handles an unknown tool decision safely without crashing", async () => {
    const model = new FakeModel([
      { type: "tool_call", toolName: "not_a_real_tool", arguments: { service: "payment" } },
      finalResponse("continued after unknown tool"),
    ]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });

    expect(result.stopReason).toBe("final_response");
    expect(result.state.evidence).toHaveLength(1);
    expect(result.state.evidence[0]?.result.ok).toBe(false);
    expect(model.calls).toBe(2);
  });

  it("handles a tool execution failure safely without crashing", async () => {
    const model = new FakeModel([
      { type: "tool_call", toolName: "get_metrics", arguments: { service: "" } },
      finalResponse("continued after tool failure"),
    ]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });

    expect(result.stopReason).toBe("final_response");
    expect(result.state.evidence).toHaveLength(1);
    expect(result.state.evidence[0]?.result.ok).toBe(false);
    expect(model.calls).toBe(2);
  });

  it("stops at the execution step limit before another model or tool call occurs", async () => {
    const model = new FakeModel([
      { type: "tool_call", toolName: "get_service_status", arguments: { service: "payment" } },
      { type: "tool_call", toolName: "search_logs", arguments: { service: "payment" } },
      { type: "tool_call", toolName: "get_metrics", arguments: { service: "payment" } },
      { type: "tool_call", toolName: "get_service_status", arguments: { service: "payment" } },
      finalResponse("should never be reached"),
    ]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 2 });

    expect(result.stopReason).toBe("step_limit_reached");
    expect(result.state.finalResponse).toBeNull();
    expect(model.calls).toBe(2);
    expect(model.remaining).toBe(3);
    expect(result.state.evidence).toHaveLength(2);
  });

  it("handles a malformed model response safely without crashing", async () => {
    const malformed = { type: "not_a_real_type" } as unknown as ModelResponse;
    const model = new FakeModel([malformed]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });

    expect(result.stopReason).toBe("malformed_response");
    expect(result.state.finalResponse).toBeNull();
    expect(model.calls).toBe(1);
  });
});
