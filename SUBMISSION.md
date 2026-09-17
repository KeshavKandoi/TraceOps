# Caygnus Product Engineer Challenge - Submission

Problem selected: Problem 4 - Observable Agent Loop
Project name: TraceOps
Repository: KeshavKandoi/TraceOps
Local directory: observable-agent (kept unchanged; see README "Package name vs directory name")

## Solution summary

TraceOps is a LangGraph-orchestrated investigation agent that repeatedly decides whether to call a deterministic evidence-gathering tool or produce a final root-cause conclusion, backed by a Zod-validated tool execution boundary, an immutable typed AgentState, a hard execution-step limit, and a secret-safe operational trace of the entire investigation. It supports two interchangeable Model implementations - a deterministic FakeModel for testing and a real GeminiModel for live use - behind one shared interface, so the orchestration code is identical either way.

## Architecture

See README.md, sections "Architecture" and "Project structure". In short: Model.decide(state) is called by the LangGraph model node, which is Zod-validated, and then either a tool node (executeTool(), Zod-validated tool input) or a final response follows; the loop continues or reaches END. Every transition is recorded by the tracer.

## Model and tool interfaces

Model.decide(state: AgentState): Promise<ModelResponse> - ModelResponse is a discriminated union of tool_call (toolName, arguments) and final (response: InvestigationResponse).

ToolDefinition<Input, Output> - name, description, inputSchema (a Zod schema), execute(input) returning a ToolResult, registered centrally in src/tools/registry.ts.

Gemini's FunctionDeclarations are derived from the same registry/schemas via src/model/gemini-schema-adapter.ts, so tool metadata cannot drift between what Gemini is told and what executeTool() actually accepts.

## Validation approach

Two independent Zod boundaries (detailed in README): (1) tool input validation inside executeTool(), applied to every tool call regardless of which Model produced it; (2) a z.discriminatedUnion boundary in graph.ts that validates the raw shape returned by Model.decide() before it is ever treated as a trusted ModelResponse.

## State management

AgentState is an immutable, JSON-serializable record (objective, messages, evidence, conclusions, stepCount, trace, finalResponse). All transitions go through pure helper functions in src/agent/state.ts that return a new state object.

## Execution limits

runInvestigation(objective, { model, maxSteps }) halts with stopReason: step_limit_reached once the step count reaches maxSteps, traced as an execution_limit_reached event, before any further model/tool call.

## Failure handling

Tool failures, model-call failures, and malformed model responses are each handled distinctly and safely (never an unhandled crash), with a dedicated StopReason and trace event for each: model_error, malformed_response, step_limit_reached, final_response. Details in README.md, section "Failure handling".

## Trace design

src/trace/events.ts and src/trace/tracer.ts define eight event types (TraceEventTypeValue, now the compile-time type for TraceEvent.type) covering objective-set, model decisions, tool calls/results/errors, execution-limit termination, model errors, and final response. Tracer functions are wrapped so a formatting failure degrades to a minimal safe event instead of aborting the investigation.

## Secret-safe logging

redactSensitiveValues() recursively redacts by sensitive key name and by token-shaped string value before anything is written into a trace event; verified by a dedicated test asserting a fake API-key-shaped string never appears in serialized trace output. GEMINI_API_KEY is read only from the environment or an explicit override and is never logged or traced.

## Deterministic testing strategy

All automated tests run against FakeModel (scripted, deterministic ModelResponse sequences) or an injected fake GeminiApiClient. No test performs a real network call or requires GEMINI_API_KEY; this is verified structurally (GeminiModel accepts a client override) and by inspection of every test file under tests/.

## Remote execution portability

The project has no local-machine-specific paths (data is loaded relative to the module via import.meta.url), no hardcoded secrets, and a single environment variable (GEMINI_API_KEY) gates the only network-dependent code path. npm install, npm run build, npm start (offline) or npm run start:gemini (with .env configured) should run identically on any machine with Node.js installed.

## Known limitations and tradeoffs

- get_metrics uses overlap-based, not strict-containment, time-window filtering (intentional; see README).
- AnyToolDefinition uses any to type-erase the heterogeneous tool registry array; the actual execution path remains fully validated.
- The dataset is synthetic and fictional with 2024 timestamps; it is not live or real incident data.
- No frontend, database, or distributed tracing platform is included by design - out of scope for this challenge.

## How to run

See README.md, sections "Install dependencies", "Run the offline deterministic demo", "Run the real Gemini-backed investigation", "Run tests".

## Test results

npm run typecheck: PASS - no errors, strict mode clean.
npm test: PASS - 13 test files, 72 tests, all passed.
npm run build: PASS - compiled src/ into dist/ with no errors.
npm run dev: PASS - offline FakeModel demo ran to stopReason final_response (3 steps, 2 evidence entries, 9 trace events).
npm run start:gemini (manual): not run - no GEMINI_API_KEY available in this environment.

## AI usage disclosure

This project was built iteratively with Claude (Anthropic) as a pair-programming assistant: the author directed each phase via detailed prompts (project setup, tools and validation, AgentState, FakeModel, LangGraph orchestration, GeminiModel integration, tracing, and this final correctness and submission pass), and Claude generated the corresponding TypeScript implementation, tests, and documentation for the author to review, run, and verify locally. All verification (typecheck, test, build, dev, and any real Gemini run) was executed by the author on their own machine.

## Final checklist

[x] npm run typecheck passes with no errors
[x] npm test passes, all suites green, no test requires network or API key
[x] npm run build passes
[x] npm run dev produces a complete offline final response
[x] No .env, API key, node_modules, dist, or .DS_Store is tracked in git
[ ] FILL IN AFTER VERIFICATION - Demo video URL: PLACEHOLDER
[ ] FILL IN AFTER VERIFICATION - Resume link: PLACEHOLDER
[ ] FILL IN AFTER VERIFICATION - Submission form or other required links: PLACEHOLDER

Submission-ready status: to be confirmed only after the verification sequence is actually run and all boxes above are checked truthfully.
