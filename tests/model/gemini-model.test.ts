import { describe, it, expect } from "vitest";
import { GeminiModel, GeminiModelError, createGeminiModel } from "../../src/model/gemini-model.js";
import { addEvidence, createInitialState } from "../../src/agent/state.js";
import type { GeminiApiClient, GeminiGenerateContentResult } from "../../src/model/gemini-model.js";

const state = createInitialState("Investigate payment errors");

function clientReturning(result: GeminiGenerateContentResult): GeminiApiClient {
  return {
    generateContent: async () => result,
  };
}

describe("GeminiModel", () => {
  it("translates a tool_call function response into a ModelResponse", async () => {
    const client = clientReturning({
      functionCalls: [{ name: "get_service_status", args: { service: "payment" } }],
    });
    const model = new GeminiModel({ apiKey: "fake-key", client });

    const result = await model.decide(state);

    expect(result).toEqual({
      type: "tool_call",
      toolName: "get_service_status",
      arguments: { service: "payment" },
    });
  });

  it("prompts Gemini with exact synthetic service names for tool arguments", async () => {
    let prompt = "";
    const client: GeminiApiClient = {
      generateContent: async (params) => {
        prompt = params.contents;
        return { functionCalls: [{ name: "get_service_status", args: { service: "payment" } }] };
      },
    };
    const model = new GeminiModel({ apiKey: "fake-key", client });

    await model.decide(state);

    expect(prompt).toContain("Available synthetic service names: payment, user, order, inventory, notification");
    expect(prompt).toContain("Use these exact names in tool arguments.");
  });

  it("labels TraceOps evidence IDs separately from underlying tool record IDs", async () => {
    let prompt = "";
    const client: GeminiApiClient = {
      generateContent: async (params) => {
        prompt = params.contents;
        return { functionCalls: [{ name: "get_service_status", args: { service: "payment" } }] };
      },
    };
    const evidenceState = addEvidence(createInitialState("Investigate payment errors"), {
      toolName: "search_logs",
      input: { service: "payment" },
      result: { ok: true, data: { id: "log-0006", message: "connection pool exhausted" } },
    });
    const model = new GeminiModel({ apiKey: "fake-key", client });

    await model.decide(evidenceState);

    expect(prompt).toContain("TraceOps evidence ID: evidence-1");
    expect(prompt).toContain('"id":"log-0006"');
    expect(prompt).toContain("IDs inside a tool-result payload");
    expect(prompt).toContain("are never valid evidenceIds");
  });

  it("translates a final function response into a ModelResponse", async () => {
    const client = clientReturning({
      functionCalls: [
        {
          name: "submit_final_response",
          args: {
            rootCause: "connection pool exhaustion",
            summary: "Payment errors traced to a database issue.",
            evidenceIds: ["evidence-1", "evidence-2"],
          },
        },
      ],
    });
    const model = new GeminiModel({ apiKey: "fake-key", client });

    const result = await model.decide(state);

    expect(result.type).toBe("final");
    if (result.type === "final") {
      expect(result.response.rootCause).toBe("connection pool exhaustion");
      expect(result.response.evidenceIds).toEqual(["evidence-1", "evidence-2"]);
    }
  });

  it("throws a controlled error when Gemini returns no function call", async () => {
    const client = clientReturning({ functionCalls: [] });
    const model = new GeminiModel({ apiKey: "fake-key", client });

    await expect(model.decide(state)).rejects.toThrow(GeminiModelError);
  });

  it("throws a controlled error for an unsupported tool decision", async () => {
    const client = clientReturning({
      functionCalls: [{ name: "not_a_real_tool", args: {} }],
    });
    const model = new GeminiModel({ apiKey: "fake-key", client });

    await expect(model.decide(state)).rejects.toThrow(/unsupported tool decision/);
  });

  it("throws a controlled error for a malformed final response", async () => {
    const client = clientReturning({
      functionCalls: [{ name: "submit_final_response", args: { rootCause: "x" } }],
    });
    const model = new GeminiModel({ apiKey: "fake-key", client });

    await expect(model.decide(state)).rejects.toThrow(/malformed final response/);
  });

  it("wraps an SDK failure as a controlled GeminiModelError", async () => {
    const client: GeminiApiClient = {
      generateContent: async () => {
        throw new Error("network down");
      },
    };
    const model = new GeminiModel({ apiKey: "fake-key", client });

    await expect(model.decide(state)).rejects.toThrow(GeminiModelError);
    await expect(model.decide(state)).rejects.toThrow(/Gemini API request failed/);
  });

  it("throws a controlled error when constructed with no API key", () => {
    expect(() => new GeminiModel({ apiKey: "" })).toThrow(GeminiModelError);
  });

  it("createGeminiModel throws a controlled error when GEMINI_API_KEY is missing", () => {
    const original = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    expect(() => createGeminiModel()).toThrow(GeminiModelError);
    expect(() => createGeminiModel()).toThrow(/GEMINI_API_KEY/);

    if (original !== undefined) {
      process.env.GEMINI_API_KEY = original;
    }
  });

  it("createGeminiModel succeeds when an API key override is provided", () => {
    const original = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    expect(() => createGeminiModel({ apiKey: "override-key" })).not.toThrow();

    if (original !== undefined) {
      process.env.GEMINI_API_KEY = original;
    }
  });
});
