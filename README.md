# TraceOps - Observable Agent Loop

TraceOps is a solution to the Caygnus Product Engineer Challenge, Problem 4: Observable Agent Loop. It implements a LangGraph-orchestrated incident investigation loop with a React/Vite TypeScript frontend and a Node `http` API.

All data under `data/` is synthetic challenge data. The 2024 timestamps are fictional incident timestamps and the project does not connect to real company systems.

## What It Demonstrates

- A model-driven loop that chooses between tool calls and a final answer.
- A central tool registry with Zod schemas as the single source of truth.
- Validated model responses, validated tool inputs, collected evidence, immutable agent state, ordered trace events, and final conclusions.
- Safe termination on step limits, malformed model responses, model errors, and tool failures.
- A frontend that separates operational trace, observed evidence, and agent conclusion without exposing chain-of-thought or secrets.

## Architecture

```text
React/Vite UI -> Node http API -> LangGraph model node -> Model.decide(state)
  -> tool_call -> Tool Registry -> Zod validation -> Tool -> Evidence -> AgentState -> Trace -> model node
  -> final -> evidence ID validation -> Final Response -> Trace -> END
```

The same graph runs with either `FakeModel` for deterministic offline demos/tests or `GeminiModel` for a live Gemini-backed investigation.

## Project Structure

- `src/agent/graph.ts` - LangGraph loop, step-limit routing, model-response validation, evidence-ID validation.
- `src/agent/state.ts` - immutable `AgentState`, messages, evidence, trace, final response helpers.
- `src/model/fake-model.ts` and `src/model/fake-scenarios.ts` - deterministic demo/test model paths.
- `src/model/gemini-model.ts` - Gemini model adapter; API key stays server-side.
- `src/model/gemini-schema-adapter.ts` - derives Gemini function declarations from registered Zod schemas.
- `src/tools/registry.ts`, `src/tools/schemas.ts`, `src/tools/metadata.ts` - canonical tool registry, validation boundary, frontend-safe metadata.
- `src/trace/events.ts`, `src/trace/tracer.ts` - operational trace events, redaction, truncation.
- `src/api.ts` - Node `http` API for health, tools, scenarios, and investigations.
- `frontend/` - React/Vite TypeScript UI consuming the API.
- `tests/` - Vitest coverage for graph behavior, tools, trace safety, model adapters, scenarios, and API handling.

## API

Default API port: `8787`.

- `GET /api/health` -> `{ "ok": true }`
- `GET /api/tools` -> registered tool metadata derived from the registry.
- `GET /api/scenarios` -> deterministic demo scenario summaries.
- `POST /api/investigate`

Example request:

```json
{
  "objective": "Investigate elevated payment errors",
  "scenario": "success",
  "maxSteps": 8,
  "model": "fake"
}
```

`model` defaults to `fake`. `gemini` is accepted only by the server and reads `GEMINI_API_KEY` from server-side environment. The browser never receives the key.

Validation behavior:

- Malformed JSON: `400 invalid_json`
- Invalid objective, `maxSteps`, model, or scenario: `400 invalid_request`
- Unsupported method on a known route: `405 method_not_allowed`
- Unknown route: `404 not_found`
- Missing/unavailable Gemini path: `503 model_unavailable`
- Unexpected server failure: `500 internal_error` with a generic message

## Deterministic Scenarios

- `success`: payment-service incident, three successful evidence entries, final response cites `evidence-1`, `evidence-2`, and `evidence-3`.
- `tool_failure_recovery`: starts with an invalid metrics timestamp, records a `tool_error`, continues with status/log tools, and final response cites only recovered successful evidence (`evidence-2`, `evidence-3`).
- `step_limit`: investigates the known `order` service with a two-step budget, collects two successful evidence entries, then stops with `step_limit_reached` and no final response.

## Commands

Install backend dependencies:

```bash
npm install
```

Run backend checks:

```bash
npm run typecheck
npm test
npm run build
npm run dev
```

Run the API:

```bash
npm run api
# or after build:
npm run start:api
```

Run the Gemini CLI path:

```bash
cp .env.example .env
# set GEMINI_API_KEY in .env
npm run start:gemini -- "Investigate elevated payment errors"
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
npm run build
```

During frontend development, Vite proxies `/api` to `http://localhost:8787`. For a separately hosted API, set `VITE_TRACEOPS_API_URL`.

## Current Verification

Last verification in this workspace:

- `npm run typecheck`: PASS
- `npm test`: PASS, 16 test files, 88 tests
- `cd frontend && npm run build`: PASS
- `npm run build`: PASS
- `npm run dev`: PASS, offline demo reached `final_response` with 4 steps, 3 evidence entries, 12 trace events
- Compiled API on alternate local port `8797`: PASS for `/api/health`, `/api/tools`, `/api/scenarios`, invalid request validation, `success`, `tool_failure_recovery`, and `step_limit`
- `npm run start:gemini -- "Investigate elevated payment errors"`: executed with configured credentials; Gemini selected the valid `payment` service and collected one evidence item, then the next Gemini request failed and the graph stopped safely with `model_error`
- Browser-to-API UI flow: not performed in this session because no browser automation tool was available; frontend production build and live API checks passed separately

## Safety Notes

- `.env`, API keys, `node_modules`, `dist`, and `.DS_Store` are git-ignored and were checked as not tracked.
- Trace events redact sensitive key names and token-shaped string values and truncate large payloads.
- The frontend and API expose operational decisions, tool inputs/results/errors, evidence IDs, and conclusions, but not hidden chain-of-thought.
- Final responses are rejected if they cite evidence IDs that were not actually collected.
