# Caygnus Product Engineer Challenge — Submission

## Problem Selected

Problem 4 — Observable Agent Loop

Project: TraceOps

## Demo Video

[https://youtu.be/5tHj494YPTE](https://youtu.be/5tHj494YPTE)


## Project Summary

TraceOps receives an investigation objective and runs a multi-step agent loop. The model selects one tool or submits a final response. Tool arguments are validated before dispatch through the centralized registry; the tool result becomes evidence in `AgentState`, an operational trace records the loop events, and the updated state is supplied to the next model decision. The loop ends with a grounded final response or the configured execution limit.

All repository data is synthetic challenge data.

## Architecture

1. **React/Vite frontend** — Provides the investigation workspace, scenario controls, step limit, and Offline/Gemini Live switch. It calls the HTTP API.

2. **Node HTTP API** — Exposes health, tool metadata, scenario metadata, and investigation routes. It validates request bodies and selects the requested model.

3. **LangGraph** — Orchestrates model and tool nodes, routes tool calls back to the model, and terminates on a final response, model error, malformed response, or step limit.

4. **Model interface** — `Model.decide(state)` is the common contract for both model implementations.

5. **Offline deterministic model** — `FakeModel` replays named deterministic scenarios for reproducible demos and tests without a paid API.

6. **Gemini model adapter** — Converts state into a prompt and registered function declarations, then maps Gemini function calls into shared model response types.

7. **Tool Registry** — Owns registered tools, names, metadata, lookup, schema access, and dispatch.

8. **Zod validation** — Validates HTTP request bodies and every tool call's structured arguments before execution. Model responses are also checked by the graph.

9. **Tool execution** — Validated calls run `search_logs`, `get_metrics`, or `get_service_status` over synthetic data.

10. **AgentState** — Carries the objective, messages, evidence, conclusions, step count, trace, and final response through the graph.

11. **Evidence** — Each tool result receives a dynamic TraceOps ID such as `evidence-1`. IDs inside result payloads remain data and are not evidence references.

12. **Operational Trace** — Records model decisions, tool calls, tool results or errors, final responses, model errors, and execution-limit events across the loop.

13. **Execution limit** — `maxSteps` is bounded by request validation from 1 through 20 and stops the graph when reached.

### Control Flow

```text

objective -> model decision -> tool call -> Zod validation
         -> registry dispatch -> tool execution -> evidence/state update
         -> next model decision -> final response or step limit
```

The model does not directly execute tools. The application validates the structured call, dispatches it through the registry, records the result, and returns the resulting state to the loop.

## Failure Handling

- **Invalid tool:** Registry lookup returns an error result; the call is not executed.
- **Invalid tool arguments:** Zod rejects the input and returns a tool failure result.
- **Tool execution failure:** The failure is stored as evidence and the loop can continue.
- **Malformed model response:** The graph stops with `malformed_response` and records a model error trace.
- **Invalid evidence IDs:** Final responses may reference only evidence IDs currently collected in `AgentState`; unknown IDs are rejected.
- **Gemini/provider failure:** The adapter raises a controlled model error, and the API maps it to a model-unavailable response.
- **Missing API key:** Gemini model construction fails with a configuration error; the key remains server-side.
- **Execution step limit:** The graph stops with `step_limit_reached`.
- **HTTP request validation:** Invalid JSON, invalid fields, oversized bodies, unsupported methods, and unknown routes receive structured HTTP errors.

## Testing

The test suite covers tool registration, tool lookup, argument validation, single-step investigation, multi-step investigation, tool failure, unknown tools, malformed responses, invalid evidence references, execution limits, Gemini adapter behavior, API routes, and state immutability.

## Benchmark Evidence

The repository does not contain a dedicated problem-specific benchmark or performance harness. Verification is limited to the automated test suite, typecheck, backend build, frontend build, deterministic demo, API route checks, and manual Gemini verification when provider access is available. No benchmark numbers or production-performance claims are made.

## Acceptance Scenarios

- **Multi-step success** — Verified by the deterministic success scenario and graph tests; multiple tool calls produce evidence and a final response.
- **Tool failure recovery** — Verified by the deterministic recovery scenario and investigation tests; a failed tool result is retained as evidence and execution continues.
- **Execution limit** — Verified by the step-limit scenario and graph tests; the loop stops with `step_limit_reached`.
- **Unknown tool / invalid tool path** — Covered by registry and graph tests; unknown tools return a controlled tool error and invalid calls do not execute.
- **Malformed model response** — Covered by graph validation tests; malformed responses stop with `malformed_response`.
- **Evidence-reference validation** — Covered by graph validation tests; final responses referencing uncollected evidence IDs are rejected.

## Design Trade-off

The Offline deterministic model makes demos and tests reproducible, while Gemini provides the real model-driven path. Deterministic scenarios cannot reproduce every behavior of a real LLM. Both implementations use the same `Model` interface and LangGraph orchestration path.

## Assumptions

- Incident data is synthetic.
- Tool execution operates against local challenge data rather than real infrastructure.
- Gemini is optional; deterministic Offline scenarios do not require a paid API.
- Execution is intentionally bounded by `maxSteps`.
- The operational trace records execution events rather than hidden model reasoning.

## Limitations

- The incident data is synthetic.
- The Offline deterministic model does not reproduce all possible real LLM behavior.
- The Gemini path depends on configured provider and API availability.
- The tool set is intentionally small and challenge-specific.
- This is a focused challenge implementation, not a production observability platform.

## AI Usage

AI tools were used during parts of the development process for assistance with implementation, debugging, code review, documentation, and exploring alternative approaches.

I used AI assistance selectively rather than treating generated output as automatically correct. I reviewed the resulting code, integrated changes into the existing architecture, ran the test suite and type checks, manually verified application behavior, and investigated failures before keeping changes.

I remain responsible for the submitted implementation and can explain its architecture, state flow, tool registry, validation, failure handling, tracing, Offline model, and Gemini integration.

## Credibility Note

I worked on a distributed real-time WebSocket system where users could be connected to different application servers. My contribution included WebSocket server architecture, NATS-based cross-server message relay, connection registration, server discovery, metrics, and load testing.

One key engineering challenge was routing a message to the application server holding the target user's persistent WebSocket connection. NATS provided the cross-server communication layer, while connection state was handled separately from message distribution.

## Problem Requirement Mapping

| Requirement | Implementation |
| --- | --- |
| Model-driven loop | `Model.decide()` is called by the LangGraph model node on each step. |
| Tool selection and execution | Model responses select registry tools; the graph validates and dispatches them. |
| Structured validation | Zod validates request bodies, tool arguments, and graph model-response shapes. |
| Evidence collection | `addEvidence()` assigns dynamic `evidence-*` IDs to tool results. |
| Observability | Tracer functions record ordered operational events in `AgentState.trace`. |
| Failure handling | Tool failures become evidence; model, validation, provider, and limit failures have explicit stop paths. |
| Safety limit | `maxSteps` bounds execution and produces `step_limit_reached`. |
| User interface | React/Vite provides investigation controls and displays trace, evidence, and conclusion views. |

## Running the Project

```bash
npm install
cd frontend && npm install
```

From `observable-agent/`, start the backend:

```bash
npm run api
```

From `observable-agent/frontend/`, start the frontend:

```bash
npm run dev
```

The optional Gemini path requires `GEMINI_API_KEY` in the server-side root `.env`:

```bash
npm run start:gemini -- "Investigate the payment service"
```

The frontend sends `model: "fake"` for Offline and `model: "gemini"` for Gemini Live.

## Demo Scenarios

- **Multi-step success** — Runs several tool calls and reaches a final response.
- **Tool failure recovery** — Includes a failed tool call before the deterministic model continues with useful evidence.
- **Execution limit** — Demonstrates termination when the configured maximum step count is reached.
