import "./load-env.js";
import { runInvestigation } from "./agent/graph.js";
import { createGeminiModel, GeminiModelError } from "./model/gemini-model.js";

async function main(): Promise<void> {
  const objective = process.argv.slice(2).join(" ").trim() || "Investigate the payment service";

  let model;
  try {
    model = createGeminiModel();
  } catch (error) {
    if (error instanceof GeminiModelError) {
      console.error(`Configuration error: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  console.log(`Running manual Gemini investigation (this calls the real Gemini API): "${objective}"`);

  const result = await runInvestigation(objective, { model, maxSteps: 8 });

  console.log(`Stop reason: ${result.stopReason}`);
  console.log(`Steps taken: ${result.state.stepCount}`);
  console.log(`Evidence collected: ${result.state.evidence.length}`);
  for (const message of result.state.messages) {
    console.log(`[${message.role}] ${message.content}`);
  }
  if (result.state.finalResponse) {
    console.log("Final response:");
    console.log(JSON.stringify(result.state.finalResponse, null, 2));
  }
}

main().catch((error) => {
  console.error("Manual Gemini run failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
