import { describe, it, expect } from "vitest";
import {
  createInitialState,
  addMessage,
  addEvidence,
  addConclusion,
  incrementStep,
  setFinalResponse,
} from "../../src/agent/state.js";
import type { ToolResult } from "../../src/tools/types.js";

describe("createInitialState", () => {
  it("initializes all fields to sensible empty defaults", () => {
    const state = createInitialState("Investigate payment errors around 10:00");

    expect(state.objective).toBe("Investigate payment errors around 10:00");
    expect(state.messages).toEqual([]);
    expect(state.evidence).toEqual([]);
    expect(state.conclusions).toEqual([]);
    expect(state.stepCount).toBe(0);
    expect(state.trace).toEqual([]);
    expect(state.finalResponse).toBeNull();
  });

  it("is JSON serializable", () => {
    const state = createInitialState("Investigate payment errors");
    const roundTripped = JSON.parse(JSON.stringify(state));
    expect(roundTripped).toEqual(state);
  });
});

describe("addMessage", () => {
  it("appends a new message and preserves the rest of the state", () => {
    const initial = createInitialState("Investigate payment errors");
    const next = addMessage(
      initial,
      { role: "user", content: "Why is payment failing?" },
      "2024-01-15T10:00:00Z",
    );

    expect(next.messages).toHaveLength(1);
    expect(next.messages[0]).toEqual({
      id: "msg-1",
      role: "user",
      content: "Why is payment failing?",
      timestamp: "2024-01-15T10:00:00Z",
    });

    expect(next.objective).toBe(initial.objective);
    expect(next.evidence).toBe(initial.evidence);
    expect(next.conclusions).toBe(initial.conclusions);
    expect(next.stepCount).toBe(initial.stepCount);
    expect(next.trace).toBe(initial.trace);
  });

  it("does not mutate the original state", () => {
    const initial = createInitialState("Investigate payment errors");
    addMessage(initial, { role: "assistant", content: "Checking logs" });

    expect(initial.messages).toEqual([]);
  });
});

describe("addEvidence", () => {
  it("records tool evidence tagged with the current step number", () => {
    const withStep = incrementStep(createInitialState("Investigate payment errors"));

    const toolResult: ToolResult<{ count: number }> = { ok: true, data: { count: 3 } };
    const next = addEvidence(
      withStep,
      { toolName: "search_logs", input: { service: "payment" }, result: toolResult },
      "2024-01-15T10:00:05Z",
    );

    expect(next.evidence).toHaveLength(1);
    expect(next.evidence[0]).toEqual({
      id: "evidence-1",
      stepNumber: 1,
      toolName: "search_logs",
      input: { service: "payment" },
      result: toolResult,
      collectedAt: "2024-01-15T10:00:05Z",
    });
  });

  it("keeps evidence separate from conclusions", () => {
    const state = createInitialState("Investigate payment errors");
    const withEvidence = addEvidence(state, {
      toolName: "get_service_status",
      input: { service: "payment" },
      result: { ok: true, data: { status: "degraded" } },
    });

    expect(withEvidence.conclusions).toEqual([]);
    expect(withEvidence.evidence).toHaveLength(1);
  });

  it("does not mutate unrelated fields", () => {
    const state = createInitialState("Investigate payment errors");
    const next = addEvidence(state, {
      toolName: "search_logs",
      input: { service: "payment" },
      result: { ok: true, data: [] },
    });

    expect(next.messages).toBe(state.messages);
    expect(next.conclusions).toBe(state.conclusions);
    expect(next.trace).toBe(state.trace);
    expect(next.stepCount).toBe(state.stepCount);
    expect(state.evidence).toEqual([]);
  });
});

describe("addConclusion", () => {
  it("records an agent-generated conclusion distinct from evidence", () => {
    const state = createInitialState("Investigate payment errors");
    const next = addConclusion(
      state,
      { summary: "payment-db connection pool exhaustion is the likely cause", confidence: "high" },
      "2024-01-15T10:15:00Z",
    );

    expect(next.conclusions).toHaveLength(1);
    expect(next.conclusions[0]).toEqual({
      id: "conclusion-1",
      stepNumber: 0,
      summary: "payment-db connection pool exhaustion is the likely cause",
      confidence: "high",
      createdAt: "2024-01-15T10:15:00Z",
    });
    expect(next.evidence).toEqual([]);
  });

  it("omits confidence entirely when not provided", () => {
    const state = createInitialState("Investigate payment errors");
    const next = addConclusion(state, { summary: "Needs more investigation" });

    expect(next.conclusions[0]).not.toHaveProperty("confidence");
  });
});

describe("incrementStep", () => {
  it("increases the step count by one and leaves other fields untouched", () => {
    const state = createInitialState("Investigate payment errors");
    const next = incrementStep(incrementStep(state));

    expect(next.stepCount).toBe(2);
    expect(state.stepCount).toBe(0);
    expect(next.messages).toBe(state.messages);
    expect(next.evidence).toBe(state.evidence);
    expect(next.conclusions).toBe(state.conclusions);
  });
});

describe("setFinalResponse", () => {
  it("attaches a final investigation response without disturbing evidence or conclusions", () => {
    const state = addConclusion(
      addEvidence(createInitialState("Investigate payment errors"), {
        toolName: "get_service_status",
        input: { service: "payment" },
        result: { ok: true, data: { status: "degraded" } },
      }),
      { summary: "Database connectivity issue", confidence: "high" },
    );

    const next = setFinalResponse(state, {
      objective: state.objective,
      rootCause: "payment-db connection pool exhaustion",
      summary: "Payment errors traced to a database connectivity incident around 10:00.",
      evidenceIds: state.evidence.map((item) => item.id),
      createdAt: "2024-01-15T10:20:00Z",
    });

    expect(next.finalResponse).not.toBeNull();
    expect(next.finalResponse?.rootCause).toBe("payment-db connection pool exhaustion");
    expect(next.evidence).toBe(state.evidence);
    expect(next.conclusions).toBe(state.conclusions);
    expect(state.finalResponse).toBeNull();
  });
});
