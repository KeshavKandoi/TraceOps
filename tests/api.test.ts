import { describe, expect, it } from "vitest";
import {
  getScenarioSummaries,
  runApiInvestigation,
  toApiInvestigationResponse,
  validateInvestigationRequest,
} from "../src/api.js";
import { createInitialState } from "../src/agent/state.js";
import { listToolMetadata } from "../src/tools/registry.js";

describe("TraceOps API", () => {
  it("returns canonical tool metadata from the registry", () => {
    const tools = listToolMetadata();

    expect(tools.map((tool) => tool.name)).toEqual([
      "search_logs",
      "get_metrics",
      "get_service_status",
    ]);
    expect(tools.find((tool) => tool.name === "search_logs")?.fields).toContainEqual(
      expect.objectContaining({ name: "service", required: true }),
    );
  });

  it("validates investigation requests with Zod and returns structured errors", () => {
    const body = validateInvestigationRequest({ objective: "", maxSteps: 0 });

    expect(body.ok).toBe(false);
    if (!body.ok) {
      expect(body.error.code).toBe("invalid_request");
      expect(body.error.issues?.length).toBeGreaterThan(0);
    }
  });

  it("runs a deterministic investigation through the API contract", async () => {
    const body = await runApiInvestigation({
      objective: "Investigate elevated payment errors",
      scenario: "success",
      model: "fake",
    });

    expect(body.stopReason).toBe("final_response");
    expect(body.evidence.length).toBeGreaterThan(1);
    expect(body.finalResponse?.evidenceIds.every((id) => body.evidence.some((entry) => entry.id === id))).toBe(
      true,
    );
    expect(body.trace.map((event) => event.type)).toContain("final_response");
  });

  it("surfaces execution-limit termination through the API response", async () => {
    const body = await runApiInvestigation({
      objective: "Investigate order latency",
      scenario: "step_limit",
      model: "fake",
    });

    expect(body.status).toBe("failed");
    expect(body.stopReason).toBe("step_limit_reached");
    expect(body.finalResponse).toBeNull();
    expect(body.trace.at(-1)?.type).toBe("execution_limit_reached");
  });

  it("maps agent state into the frontend investigation contract", () => {
    const state = createInitialState("test objective");
    const payload = toApiInvestigationResponse(state, "model_error", 4);

    expect(payload.status).toBe("failed");
    expect(payload.maxSteps).toBe(4);
    expect(payload.objective).toBe("test objective");
  });

  it("exposes deterministic scenario summaries for the frontend selector", () => {
    expect(getScenarioSummaries().map((scenario) => scenario.id)).toEqual([
      "success",
      "tool_failure_recovery",
      "step_limit",
    ]);
  });
});
