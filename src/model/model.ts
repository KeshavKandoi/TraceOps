import type { AgentState, InvestigationResponse } from "../agent/state.js";

export interface ToolCallResponse {
  readonly type: "tool_call";
  readonly toolName: string;
  readonly arguments: Record<string, unknown>;
}

export interface FinalResponse {
  readonly type: "final";
  readonly response: InvestigationResponse;
}

export type ModelResponse = ToolCallResponse | FinalResponse;

export interface Model {
  decide(state: AgentState): Promise<ModelResponse>;
}
