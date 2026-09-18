import { describe, expect, it } from "vitest";
import { runInvestigation } from "../../src/agent/graph.js";
import { FakeModel } from "../../src/model/fake-model.js";
import { demoScenarios, type DemoScenarioId } from "../../src/model/fake-scenarios.js";

function runScenario(id: DemoScenarioId) {
  const scenario = demoScenarios[id];
  return runInvestigation(scenario.objective, {
    model: new FakeModel(scenario.responses),
    maxSteps: scenario.maxSteps,
  });
}

describe("deterministic demo scenarios", () => {
  it("success produces a final response that cites only collected successful evidence", async () => {
    const result = await runScenario("success");
    const successfulEvidenceIds = new Set(
      result.state.evidence.filter((entry) => entry.result.ok).map((entry) => entry.id),
    );

    expect(result.stopReason).toBe("final_response");
    expect(result.state.evidence).toHaveLength(3);
    expect(result.state.evidence.every((entry) => entry.result.ok)).toBe(true);
    expect(result.state.finalResponse?.evidenceIds).toEqual(["evidence-1", "evidence-2", "evidence-3"]);
    expect(result.state.finalResponse?.evidenceIds.every((id) => successfulEvidenceIds.has(id))).toBe(true);
  });

  it("tool failure recovery visibly records a failed call and cites the recovered evidence", async () => {
    const result = await runScenario("tool_failure_recovery");
    const failedEvidence = result.state.evidence.filter((entry) => !entry.result.ok);
    const successfulEvidenceIds = new Set(
      result.state.evidence.filter((entry) => entry.result.ok).map((entry) => entry.id),
    );

    expect(result.stopReason).toBe("final_response");
    expect(failedEvidence.map((entry) => entry.id)).toEqual(["evidence-1"]);
    expect(result.state.trace.map((event) => event.type)).toContain("tool_error");
    expect(result.state.finalResponse?.evidenceIds).toEqual(["evidence-2", "evidence-3"]);
    expect(result.state.finalResponse?.evidenceIds.every((id) => successfulEvidenceIds.has(id))).toBe(true);
  });

  it("step limit stops before a conclusion and leaves the scripted final response unused", async () => {
    const result = await runScenario("step_limit");

    expect(result.stopReason).toBe("step_limit_reached");
    expect(result.state.stepCount).toBe(2);
    expect(result.state.finalResponse).toBeNull();
    expect(result.state.trace.at(-1)?.type).toBe("execution_limit_reached");
  });
});
