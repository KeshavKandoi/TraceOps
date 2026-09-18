import { runInvestigation } from "./agent/graph.js";
import { FakeModel } from "./model/fake-model.js";
import { getDemoScenario } from "./model/fake-scenarios.js";

async function main(): Promise<void> {
  console.log("TraceOps - Observable Agent (offline deterministic demo, no network required)");

  const scenario = getDemoScenario("success");
  const objective = scenario.objective;
  const model = new FakeModel(scenario.responses);

  const result = await runInvestigation(objective, { model, maxSteps: scenario.maxSteps });

  console.log(`Stop reason: ${result.stopReason}`);
  console.log(`Steps taken: ${result.state.stepCount}`);
  console.log(`Evidence collected: ${result.state.evidence.length}`);
  console.log(`Trace events recorded: ${result.state.trace.length}`);
  if (result.state.finalResponse) {
    console.log("Final response:");
    console.log(JSON.stringify(result.state.finalResponse, null, 2));
  }
  console.log('For the real Gemini-backed path run: npm run start:gemini -- "<objective>" (requires GEMINI_API_KEY)');
}

main().catch((error) => {
  console.error("Demo run failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
