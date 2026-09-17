# TraceOps UI

React + TypeScript + Vite frontend for TraceOps (Phase 10). Visualizes the objective, trace timeline, evidence, conclusion, and tool registry from an investigation.

Run:

npm install
npm run dev

Build:

npm run build

Currently rendered with static demo data in src/data/mockInvestigation.ts since this phase is UI-only. The data shapes (InvestigationState, TraceEvent, ToolEvidence, InvestigationResponse) mirror the backend's AgentState/trace types exactly, so this can be wired to a real investigation result later without changing component code.
