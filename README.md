# TraceOps — Observable Agent Loop

TraceOps is a solution to Caygnus Product Engineer Challenge, Problem 4: Observable Agent Loop. It implements a small, strongly typed, LangGraph-orchestrated agent that investigates synthetic service incidents by calling deterministic tools, and it produces a complete, secret-safe operational trace of every decision the agent made along the way.

Data notice: all logs, metrics, and service-status data under data/ are synthetic, fictional incident data generated for this challenge. Timestamps (e.g. 2024-01-15) do not represent a real current incident and the project does not use, store, or connect to any real company data.

## Caygnus Problem 4 objective

Build an agent loop that:
- Decides its next action (call a tool or produce a final answer) based on accumulated evidence.
- Executes tools through a validated boundary rather than trusting raw model output.
- Terminates safely under a step limit instead of looping forever.
- Produces an operational trace of the investigation without leaking chain-of-thought, secrets, or raw model internals.

## Architecture

Objective -> LangGraph model node -> Model.decide(state)
  -> tool_call -> tool node -> executeTool() [Zod-validated] -> evidence -> back to model
  -> final -> InvestigationResponse -> END

Every transition is recorded as a TraceEvent. Evidence (what tools returned) and conclusions (the model's final answer) are kept in separate arrays on AgentState.

## Project structure

src/agent/state.ts - AgentState, immutable state transition helpers, TraceEvent shape
src/agent/graph.ts - LangGraph StateGraph wiring: model node, tool node, routing, step limit, Zod response validation
src/model/model.ts - Model interface + ModelResponse union (tool_call | final)
src/model/fake-model.ts - Deterministic scripted model for tests
src/model/gemini-model.ts - Real Gemini-backed Model implementation
src/model/gemini-schema-adapter.ts - Converts canonical Zod tool schemas into Gemini FunctionDeclarations
src/tools/schemas.ts - Canonical Zod input schemas (single source of truth, incl. field descriptions)
src/tools/tool.ts - ToolDefinition interface
src/tools/registry.ts - Registered tools, executeTool() validation boundary, listTools()/listToolSchemas()
src/tools/search-logs.ts, get-metrics.ts, get-service-status.ts, data-loader.ts - tool implementations and data access
src/trace/events.ts - TraceEventType constants, redaction + truncation helpers
src/trace/tracer.ts - One tracing function per event type, integrated into graph.ts
src/index.ts - Offline deterministic demo entry point (npm run dev)
src/run-gemini.ts - Real Gemini-backed CLI entry point (npm run start:gemini)
data/ - Synthetic logs, metrics, service-status, knowledge-base JSON
tests/ - Vitest test suites mirroring src/

## Model, FakeModel, GeminiModel separation

Model is a single-method interface: decide(state: AgentState): Promise<ModelResponse>. ModelResponse is a discriminated union (tool_call | final) shared by every implementation.

FakeModel returns a pre-scripted sequence of ModelResponse values, one per call, and throws a controlled FakeModelExhaustedError if asked for more than were scripted. It performs no reasoning. All automated tests use this - no test requires network access or an API key.

GeminiModel wraps the real @google/genai SDK, builds a prompt from AgentState, asks Gemini to call one function, and translates the function call back into the same ModelResponse shape. graph.ts never knows which implementation it is talking to.

## Canonical tool metadata (single source of truth)

src/tools/schemas.ts defines each tool's Zod input schema, including a describe() on every field. src/tools/registry.ts is the source of truth for tool names, descriptions, and schemas (listToolSchemas()). src/model/gemini-schema-adapter.ts converts those same Zod schemas into Gemini FunctionDeclaration objects, so tool metadata can never drift between the registry and what Gemini is told is available. Gemini can only ever request a tool call - executeTool() in registry.ts still performs the actual Zod validation and execution; Gemini's declarations do not bypass that boundary.

## LangGraph control loop

buildAgentGraph() compiles a two-node StateGraph:
- model node: calls Model.decide(), validates the raw response against a Zod schema (see below), traces the decision, and either sets pendingToolCall or the final response.
- tool node: executes the pending tool call through executeTool(), records evidence, and traces the result/error.
- Routing returns to the model node after every tool call, and ends when a final response, a step-limit, a malformed response, or a model error is reached.

## Zod validation boundary

There are two independent Zod boundaries:
1. Tool input validation (registry.ts -> executeTool()): every tool call's arguments are parsed against that tool's canonical schema before execution, regardless of which Model produced them.
2. Model-response shape validation (graph.ts -> ModelResponseSchema, a z.discriminatedUnion): the raw value returned by Model.decide() is validated before it is trusted as a ModelResponse at all - a tool_call with a non-string toolName, non-object arguments, or an invalid final-response shape is rejected safely into the existing malformed_response stop reason rather than crashing or being cast unsafely.

## AgentState

AgentState is an immutable, serializable record: objective, messages (transcript), evidence (tool results, tagged with the step they were collected at), conclusions, stepCount, trace, and finalResponse. Every state-transition helper (addMessage, addEvidence, incrementStep, setFinalResponse, addTraceEvent) returns a new state object rather than mutating in place.

## Execution limits

runInvestigation(objective, { model, maxSteps }) stops the loop with stopReason: step_limit_reached once stepCount >= maxSteps, before another model or tool call is made. This is exercised by dedicated tests and traced as an execution_limit_reached event.

## Operational tracing

src/trace/events.ts defines the ordered event vocabulary: objective_set, model_decision, tool_call, tool_result, tool_error, execution_limit_reached, model_error, final_response (TraceEventTypeValue, the compile-time source of truth for TraceEvent.type). Each event carries only structured, operational information - a decided tool name and validated arguments, a concise result summary, an error message - never raw model chain-of-thought and never large raw payloads (anything over ~500 serialized characters is truncated to a truncated/preview shape). Tracing is wired directly into graph.ts's model and tool nodes and does not alter control flow: a formatting failure inside a tracer function is caught and degrades to a minimal unavailable event rather than failing the investigation.

## Secret-safe logging

redactSensitiveValues() in src/trace/events.ts recursively blanks any object key matching key, secret, token, password, credential, or authorization (case-insensitive), and independently blanks any raw string value that looks like a long mixed-case/alphanumeric token, even under an innocuous key name. Every value written into a trace event passes through this before serialization. GEMINI_API_KEY is only ever read from process.env or an explicit override and is never logged, traced, or printed - run-gemini.ts reports only a configuration error message on a missing key, never the key itself.

## Failure handling

- Tool failure (unknown service, invalid arguments, unknown tool name): executeTool() returns ok:false with an error; the graph records it as evidence and a tool_error trace event, and continues the loop.
- Model error (the Model implementation throws, e.g. a network failure): caught in the model node, recorded as a system message and a model_error trace event, and the investigation stops with stopReason: model_error.
- Malformed model response: rejected by the Zod boundary above, stops with stopReason: malformed_response.
- Step limit reached: stops with stopReason: step_limit_reached before further model/tool calls.

## get_metrics time-window semantics

get_metrics uses overlap-based filtering, not strict containment: a metrics window is included if it overlaps the from/to range at all - i.e. window_end is after from and window_start is before to - rather than requiring the whole window to fall inside the requested range. This is intentional: incident windows rarely align exactly with pre-aggregated metric buckets, so overlap filtering avoids silently dropping the bucket that actually contains the moment of interest. This behavior is unchanged from earlier phases and is covered by tests/tools/get-metrics.test.ts.

## Package name vs directory name

The npm package name is traceops (matching the project's name), but the local directory remains observable-agent intentionally, per the challenge requirements, to avoid breaking any existing local tooling, scripts, or references to the directory path.

## Install dependencies

    npm install

## Run the offline deterministic demo (no API key required)

    npm run dev

This runs a scripted FakeModel investigation end-to-end through the real LangGraph loop and prints the stop reason, evidence count, trace event count, and final response.

## Run the real Gemini-backed investigation

1. Copy .env.example to .env and set GEMINI_API_KEY:

       cp .env.example .env

2. Run:

       npm run start:gemini -- "Investigate elevated payment errors"

If GEMINI_API_KEY is missing, this fails with a controlled configuration error and makes no network call. .env is git-ignored; only .env.example (containing just the variable name) is committed.

## Run tests

    npm test

All tests use FakeModel or an injected fake GeminiApiClient - no test makes a real network call or requires GEMINI_API_KEY.

## Other commands

    npm run typecheck   - tsc --noEmit, strict mode
    npm run build       - compiles src/ into dist/
    npm run start       - runs the compiled dist/index.js demo

## Design tradeoffs

- Overlap-based get_metrics filtering (see above) favors not missing relevant windows over strict range containment.
- AnyToolDefinition = ToolDefinition<any, any> in src/tools/tool.ts uses any deliberately to allow a single heterogeneous array of tools with different input/output types in the registry; the actual execution boundary (executeTool) is fully type- and Zod-safe regardless.
- Two-node LangGraph loop (model/tool) was chosen over a more granular multi-node graph for clarity, since the challenge's core requirement is a clean decide -> act -> observe loop rather than a complex branching workflow.
- No frontend, database, or distributed tracing platform was added; the challenge asks for a correct, testable, in-process operational trace, not production observability infrastructure.

## Security notes

- GEMINI_API_KEY must never be committed. .env is git-ignored; only .env.example (with an empty value) is tracked.
- No trace event, log line, or error message ever includes the API key or another secret-shaped value - see Secret-safe logging above.
- .DS_Store and other OS/editor artifacts are git-ignored and are not tracked in this repository.
