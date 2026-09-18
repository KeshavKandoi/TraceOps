# Caygnus Product Engineer Challenge - Submission

Problem selected: Problem 4 - Observable Agent Loop  
Project name: TraceOps  
Repository: KeshavKandoi/TraceOps  
Local directory: `observable-agent`

## Summary

TraceOps is a LangGraph-orchestrated investigation agent with a Node `http` API and React/Vite TypeScript frontend. The backend preserves the requested loop:

```text
LangGraph -> Model -> Tool Registry -> Zod validation -> Tool -> Evidence -> AgentState -> Trace -> Final Response
```

The UI calls the API, lets the reviewer choose deterministic scenarios, and displays execution status, trace events, tool evidence, and final conclusions as separate surfaces.

## Architecture

- `AgentState` is immutable and serializable.
- `Model.decide(state)` returns a `tool_call` or `final` response.
- Raw model responses are Zod-validated before use.
- Tool calls go through `executeTool()`, which validates arguments against the canonical Zod schema for the registered tool.
- Gemini function declarations and frontend tool metadata are derived from the same registry/schemas so metadata cannot drift.
- Tool results, tool failures, model errors, malformed responses, execution limits, and final responses are traced as structured operational events.
- Final responses are rejected if they reference evidence IDs that were not actually collected.

## API And Frontend

API endpoints:

- `GET /api/health`
- `GET /api/tools`
- `GET /api/scenarios`
- `POST /api/investigate`

The API validates malformed JSON, unknown routes, wrong methods, invalid objectives, invalid `maxSteps`, invalid scenarios, and missing Gemini credentials. `GEMINI_API_KEY` is read only on the server.

The frontend includes loading, error, empty, scenario-selection, objective-input, max-step, trace, evidence, tool registry, and conclusion states. Evidence chips in the conclusion jump to evidence cards. The UI shows operational trace and observed evidence, not hidden chain-of-thought.

## Deterministic Scenarios

- `success`: three successful payment evidence entries; final response cites `evidence-1`, `evidence-2`, `evidence-3`.
- `tool_failure_recovery`: invalid metrics call produces `tool_error`; loop recovers with status/log tools; final response cites only `evidence-2`, `evidence-3`.
- `step_limit`: known `order` service, two successful evidence entries, then `step_limit_reached` with no final response.

## Verification Actually Run

- `npm run typecheck`: PASS
- `npm test`: PASS, 16 test files, 88 tests
- `npm run build`: PASS
- `cd frontend && npm run build`: PASS
- `npm run dev`: PASS after elevated execution because sandbox blocked `tsx` IPC; result was `final_response`, 4 steps, 3 evidence entries, 12 trace events
- `PORT=8787 npm run start:api`: attempted; port 8787 was already in use
- `PORT=8797 npm run start:api`: PASS, compiled API served locally
- `curl http://localhost:8797/api/health`: PASS, `200 {"ok":true}`
- `curl http://localhost:8797/api/tools`: PASS, returned registry-derived metadata for `search_logs`, `get_metrics`, `get_service_status`
- `curl http://localhost:8797/api/scenarios`: PASS, returned the three deterministic scenarios
- `curl -X POST /api/investigate` with invalid objective/maxSteps/scenario: PASS, `400 invalid_request` with structured issues
- `curl -X POST /api/investigate` for `success`: PASS, `final_response`, 3 evidence entries, evidence IDs matched collected evidence
- `curl -X POST /api/investigate` for `tool_failure_recovery`: PASS, one `tool_error`, final response cited `evidence-2` and `evidence-3`
- `curl -X POST /api/investigate` for `step_limit`: PASS, 2 successful `order` evidence entries, final response `null`, `stopReason: step_limit_reached`
- `npm run start:gemini -- "Investigate elevated payment errors"`: executed with configured credentials after elevated execution because sandbox blocked `tsx` IPC. Gemini selected the valid `payment` service and collected one evidence item, then the next Gemini request failed; graph stopped safely with `model_error`.

## Not Verified

- Browser-to-API click-through was not performed because no browser automation tool was available in this session. The frontend production build and live API checks passed separately.
- A complete Gemini final response was not observed; the live Gemini path was exercised and failed safely with `model_error` after one successful tool call.

## Git / Artifact Check

`git ls-files .env node_modules dist .DS_Store frontend/node_modules frontend/dist frontend/.env` returned no tracked files. `.env`, API keys, `node_modules`, `dist`, `.DS_Store`, and generated/private artifacts are not tracked.

## AI Usage Disclosure

This project was prepared with AI pair-programming assistance. The final verification results above reflect commands actually run in this workspace during the hardening pass.

## Final Checklist

[x] Backend typecheck passes  
[x] Backend build passes  
[x] Frontend build passes  
[x] Full offline test suite passes, 88 tests  
[x] Offline deterministic demo passes  
[x] API endpoints and deterministic scenarios verified over HTTP  
[x] Gemini path exercised without printing credentials; failed safely after one evidence item  
[x] No private/generated artifacts tracked  
[ ] Demo video URL: placeholder for submitter  
[ ] Resume link: placeholder for submitter  
[ ] Submission form or other required links: placeholder for submitter
