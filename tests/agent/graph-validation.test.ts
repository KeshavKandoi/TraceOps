import { describe, it, expect } from "vitest";
import { runInvestigation } from "../../src/agent/graph.js";
import { FakeModel } from "../../src/model/fake-model.js";
import type { ModelResponse } from "../../src/model/model.js";

describe("agent graph model-response validation", () => {
  it("rejects a tool_call with a non-string toolName", async () => {
    const malformed = {
      type: "tool_call",
      toolName: 123,
      arguments: { service: "payment" },
    } as unknown as ModelResponse;
    const model = new FakeModel([malformed]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });

    expect(result.stopReason).toBe("malformed_response");
  });

  it("rejects a tool_call whose arguments are not an object", async () => {
    const malformed = {
      type: "tool_call",
      toolName: "get_service_status",
      arguments: "payment",
    } as unknown as ModelResponse;
    const model = new FakeModel([malformed]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });

    expect(result.stopReason).toBe("malformed_response");
  });

  it("rejects a final response with an invalid shape", async () => {
    const malformed = {
      type: "final",
      response: { rootCause: "x" },
    } as unknown as ModelResponse;
    const model = new FakeModel([malformed]);

    const result = await runInvestigation("Investigate payment errors", { model, maxSteps: 10 });

    expect(result.stopReason).toBe("malformed_response");
  });
});
