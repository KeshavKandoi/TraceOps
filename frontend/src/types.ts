export type TraceEventType =
  | "objective_set"
  | "model_decision"
  | "tool_call"
  | "tool_result"
  | "tool_error"
  | "execution_limit_reached"
  | "model_error"
  | "final_response";

export interface TraceEvent {
  id: string;
  timestamp: string;
  type: TraceEventType;
  details?: Record<string, unknown>;
}

export type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface ToolEvidence {
  id: string;
  stepNumber: number;
  toolName: string;
  input: unknown;
  result: ToolResult<unknown>;
  collectedAt: string;
}

export interface InvestigationResponse {
  objective: string;
  rootCause: string;
  summary: string;
  evidenceIds: string[];
  createdAt: string;
}

export type StopReason =
  | "final_response"
  | "step_limit_reached"
  | "malformed_response"
  | "model_error";

export interface ToolFieldMeta {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface ToolMeta {
  name: string;
  description: string;
  fields: ToolFieldMeta[];
}

export interface InvestigationState {
  objective: string;
  status: "idle" | "running" | "completed" | "failed";
  stepCount: number;
  maxSteps: number;
  evidence: ToolEvidence[];
  trace: TraceEvent[];
  finalResponse: InvestigationResponse | null;
  stopReason: StopReason | null;
}
