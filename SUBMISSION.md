# Caygnus Product Engineer Challenge — Submission

## Problem Selected

**Problem 4 — Observable Agent Loop**

**Project:** TraceOps

---

## 1. Project Summary

TraceOps is an observable investigation agent that implements a multi-step model-driven loop for investigating service incidents.

The system receives an objective, allows the model to select an appropriate investigation tool, validates the structured tool arguments, executes the tool through a centralized registry, stores the resulting evidence, records an operational trace, and returns the evidence to the model for the next decision.

The loop continues until the model produces a grounded final response or the configured execution limit is reached.

The implementation uses:

- TypeScript
- LangGraph
- Zod
- Google Gemini
- Node.js HTTP API
- React
- Vite
- Vitest

All investigation data in the repository is synthetic challenge data.

---

## 2. Core Architecture

```text
                         ┌─────────────────────┐
                         │     React / Vite     │
                         │     TypeScript UI    │
                         └──────────┬──────────┘
                                    │
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
                         │    Model.decide()   │
                         │                     │
                         │ FakeModel / Gemini  │
                         └──────────┬──────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                     tool_call               final
                         │                     │
                         ▼                     ▼
                ┌─────────────────┐    ┌──────────────────┐
                │  Tool Registry  │    │ Evidence ID      │
                └────────┬────────┘    │ Validation       │
                         │             └────────┬─────────┘
                         ▼                      │
                ┌─────────────────┐             ▼
                │  Zod Validation │    ┌──────────────────┐
                └────────┬────────┘    │  Final Response  │
                         │             └──────────────────┘
                         ▼
                ┌─────────────────┐
                │      Tool       │
                │                 │
                │ search_logs     │
                │ get_metrics     │
                │ get_service_   │
                │ status          │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │     Evidence    │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │    AgentState   │
                │                 │
                │ objective       │
                │ messages        │
                │ evidence        │
                │ conclusions     │
                │ trace           │
                │ stepCount       │
                │ finalResponse   │
                │ stopReason      │
                └────────┬────────┘
                         │
                         ▼
                    LangGraph
                         │
                         └──────────► Next model decision