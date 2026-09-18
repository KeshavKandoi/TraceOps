# TraceOps — Observable Agent Loop

TraceOps is an implementation of the **Caygnus Product Engineer Challenge — Problem 4: Observable Agent Loop**.

It implements a model-driven incident investigation loop using **LangGraph**, a centralized **tool registry with Zod validation**, deterministic offline scenarios, an optional **Gemini model adapter**, and a **React/Vite TypeScript frontend**.

The system is designed around one core principle:

> The model decides what to do. The application validates and executes the decision. The resulting evidence is returned to the loop. The process continues until a grounded final response or a safety limit is reached.

All data under `data/` is synthetic challenge data. The incident timestamps are fictional and the project does not connect to real company infrastructure.

---

## Features

- Model-driven investigation loop
- Multiple tool calls in a single investigation
- Centralized tool registry
- Strict Zod validation for tool inputs
- Zod validation for model responses
- Deterministic fake model for offline execution and testing
- Gemini integration through a dedicated model adapter
- Structured evidence collection
- Immutable agent state
- Ordered operational trace
- Tool failure recovery
- Execution step limits
- Model error handling
- Malformed model response handling
- Evidence-reference validation
- Sensitive-data redaction in traces
- Request validation and request-size protection
- React/Vite TypeScript frontend
- HTTP API for running investigations
- No paid API required for the deterministic scenarios

---

## Architecture

```text
                         ┌─────────────────────┐
                         │     React / Vite     │
                         │     TypeScript UI    │
                         └──────────┬──────────┘
                                    │ HTTP
                                    ▼
                         ┌─────────────────────┐
                         │      Node API       │
                         │     src/api.ts      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     LangGraph       │
                         │   Agent Orchestrator│
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Model.decide()    │
                         │                     │
                         │ FakeModel / Gemini  │
                         └──────────┬──────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                 tool_call                       final
                     │                             │
                     ▼                             ▼
          ┌─────────────────────┐       ┌──────────────────┐
          │    Tool Registry    │       │ Evidence ID      │
          │                     │       │ Validation       │
          └──────────┬──────────┘       └────────┬─────────┘
                     │                           │
                     ▼                           ▼
          ┌─────────────────────┐       ┌──────────────────┐
          │   Zod Validation    │       │  Final Response  │
          └──────────┬──────────┘       └────────┬─────────┘
                     │                           │
                     ▼                           ▼
          ┌─────────────────────┐       ┌──────────────────┐
          │        Tool         │       │       END        │
          │ search_logs         │       └──────────────────┘
          │ get_metrics         │
          │ get_service_status  │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │      Evidence       │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │     AgentState      │
          │                     │
          │ objective           │
          │ messages            │
          │ evidence            │
          │ conclusions         │
          │ trace               │
          │ stepCount           │
          │ finalResponse       │
          │ stopReason          │
          └──────────┬──────────┘
                     │
                     ▼
                  LangGraph
                     │
                     └──────────────► next model decision