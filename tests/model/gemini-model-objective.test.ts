import { describe, it, expect } from "vitest";
import { GeminiModel } from "../../src/model/gemini-model.js";
import { createInitialState } from "../../src/agent/state.js";
import type { GeminiApiClient, GeminiGenerateContentResult } from "../../src/model/gemini-model.js";

function clientReturning(result: GeminiGenerateContentResult): GeminiApiClient {
  return {
    generateContent: async () => result,
  };
}

describe("GeminiModel final response objective", () => {
  it("carries the current AgentState objective into the final InvestigationResponse", async () => {
    const state = createInitialState("Investigate elevated checkout latency");
    const client = clientReturning({
      functionCalls: [
        {
          name: "submit_final_response",
          args: {
            rootCause: "cache eviction storm",
            summary: "Checkout latency traced to cache eviction.",
            evidenceIds: ["evidence-1"],
          },
        },
      ],
    });
    const model = new GeminiModel({ apiKey: "fake-key", client });

    const result = await model.decide(state);

    expect(result.type).toBe("final");
    if (result.type === "final") {
      expect(result.response.objective).toBe("Investigate elevated checkout latency");
    }
  });
});
