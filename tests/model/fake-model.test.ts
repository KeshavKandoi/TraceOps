import { describe, it, expect } from "vitest";
import { FakeModel, FakeModelExhaustedError } from "../../src/model/fake-model.js";
import { createInitialState } from "../../src/agent/state.js";
import type { ModelResponse } from "../../src/model/model.js";

const state = createInitialState("Investigate payment errors around 10:00");

describe("FakeModel", () => {
  it("returns a single scripted response when decide is called once", async () => {
    const toolCall: ModelResponse = {
      type: "tool_call",
      toolName: "get_service_status",
      arguments: { service: "payment" },
    };
    const model = new FakeModel([toolCall]);

    const result = await model.decide(state);

    expect(result).toEqual(toolCall);
  });

  it("returns multiple sequential responses in order across separate calls", async () => {
    const responses: ModelResponse[] = [
      { type: "tool_call", toolName: "get_service_status", arguments: { service: "payment" } },
      { type: "tool_call", toolName: "search_logs", arguments: { service: "payment", level: "error" } },
      {
        type: "final",
        response: {
          objective: state.objective,
          rootCause: "payment-db connection pool exhaustion",
          summary: "Payment errors traced to a database connectivity incident.",
          evidenceIds: ["evidence-1", "evidence-2"],
          createdAt: "2024-01-15T10:20:00Z",
        },
      },
    ];
    const model = new FakeModel(responses);

    const first = await model.decide(state);
    const second = await model.decide(state);
    const third = await model.decide(state);

    expect(first).toEqual(responses[0]);
    expect(second).toEqual(responses[1]);
    expect(third).toEqual(responses[2]);
  });

  it("returns a tool_call response with structured arguments intact", async () => {
    const toolCall: ModelResponse = {
      type: "tool_call",
      toolName: "get_metrics",
      arguments: { service: "payment", from: "2024-01-15T10:00:00Z", to: "2024-01-15T10:10:00Z" },
    };
    const model = new FakeModel([toolCall]);

    const result = await model.decide(state);

    expect(result.type).toBe("tool_call");
    if (result.type === "tool_call") {
      expect(result.toolName).toBe("get_metrics");
      expect(result.arguments).toEqual({
        service: "payment",
        from: "2024-01-15T10:00:00Z",
        to: "2024-01-15T10:10:00Z",
      });
    }
  });

  it("returns a final response carrying the investigation result", async () => {
    const finalResponse: ModelResponse = {
      type: "final",
      response: {
        objective: state.objective,
        rootCause: "payment-db connection pool exhaustion",
        summary: "Root cause identified.",
        evidenceIds: ["evidence-1"],
        createdAt: "2024-01-15T10:20:00Z",
      },
    };
    const model = new FakeModel([finalResponse]);

    const result = await model.decide(state);

    expect(result.type).toBe("final");
    if (result.type === "final") {
      expect(result.response.rootCause).toBe("payment-db connection pool exhaustion");
    }
  });

  it("throws a controlled error once scripted responses are exhausted", async () => {
    const model = new FakeModel([{ type: "tool_call", toolName: "search_logs", arguments: { service: "payment" } }]);

    await model.decide(state);

    await expect(model.decide(state)).rejects.toThrow(FakeModelExhaustedError);
    await expect(model.decide(state)).rejects.toThrow(
      /FakeModel has no more scripted responses/,
    );
  });

  it("exposes call count and remaining responses for test assertions", async () => {
    const model = new FakeModel([
      { type: "tool_call", toolName: "search_logs", arguments: { service: "payment" } },
      { type: "tool_call", toolName: "get_metrics", arguments: { service: "payment" } },
    ]);

    expect(model.calls).toBe(0);
    expect(model.remaining).toBe(2);

    await model.decide(state);

    expect(model.calls).toBe(1);
    expect(model.remaining).toBe(1);
  });

  it("does not mutate the array of responses passed into the constructor", async () => {
    const responses: ModelResponse[] = [
      { type: "tool_call", toolName: "search_logs", arguments: { service: "payment" } },
    ];
    const model = new FakeModel(responses);

    await model.decide(state);

    expect(responses).toHaveLength(1);
  });
});
