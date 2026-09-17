import { runInvestigation } from "./agent/graph.js";
import { FakeModel } from "./model/fake-model.js";

async function main(): Promise<void> {
  console.log("TraceOps - Observable Agent (offline deterministic demo, no network required)");

  const objective = "Investigate elevated payment errors";
  const model = new FakeModel([
    { type: "tool_call", toolName: "get_service_status", arguments: { service: "payment" } },
    { type: "tool_call", toolName: "search_logs", arguments: { service: "payment", level: "error" } },
    {
      type: "final",
      response: {
        objective,
        rootCause: "Synthetic demo root cause: payment-db connection pool exhaustion",
        summary: "Deterministic offline demo using FakeModel; no GEMINI_API_KEY or network call is used.",
        evidenceIds: [],
        createdAt: new Date().toISOString(),
      },
    },
  ]);

  const result = await runInvestigation(objective, { model, maxSteps: 8 });

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
