import type { ToolResult } from "../tools/types.js";
import type { TraceEventTypeValue } from "../trace/events.js";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
}

export interface ToolEvidence {
  id: string;
  stepNumber: number;
  toolName: string;
  input: unknown;
  result: ToolResult<unknown>;
  collectedAt: string;
}

export type ConfidenceLevel = "low" | "medium" | "high";

export interface AgentConclusion {
  id: string;
  stepNumber: number;
  summary: string;
  confidence?: ConfidenceLevel;
  createdAt: string;
}

export interface TraceEvent {
  id: string;
  timestamp: string;
  type: TraceEventTypeValue;
  details?: Record<string, unknown>;
}

export interface InvestigationResponse {
  objective: string;
  rootCause: string;
  summary: string;
  evidenceIds: string[];
  createdAt: string;
}

export interface AgentState {
  objective: string;
  messages: AgentMessage[];
  evidence: ToolEvidence[];
  conclusions: AgentConclusion[];
  stepCount: number;
  trace: TraceEvent[];
  finalResponse: InvestigationResponse | null;
}

export function createInitialState(objective: string): AgentState {
  return {
    objective,
    messages: [],
    evidence: [],
    conclusions: [],
    stepCount: 0,
    trace: [],
    finalResponse: null,
  };
}

export interface AddMessageInput {
  role: MessageRole;
  content: string;
}

export function addMessage(
  state: AgentState,
  message: AddMessageInput,
  timestamp: string = new Date().toISOString(),
): AgentState {
  const newMessage: AgentMessage = {
    id: `msg-${state.messages.length + 1}`,
    role: message.role,
    content: message.content,
    timestamp,
  };

  return {
    ...state,
    messages: [...state.messages, newMessage],
  };
}

export interface AddEvidenceInput {
  toolName: string;
  input: unknown;
  result: ToolResult<unknown>;
}

export function addEvidence(
  state: AgentState,
  evidence: AddEvidenceInput,
  timestamp: string = new Date().toISOString(),
): AgentState {
  const newEvidence: ToolEvidence = {
    id: `evidence-${state.evidence.length + 1}`,
    stepNumber: state.stepCount,
    toolName: evidence.toolName,
    input: evidence.input,
    result: evidence.result,
    collectedAt: timestamp,
  };

  return {
    ...state,
    evidence: [...state.evidence, newEvidence],
  };
}

export interface AddConclusionInput {
  summary: string;
  confidence?: ConfidenceLevel;
}

export function addConclusion(
  state: AgentState,
  conclusion: AddConclusionInput,
  timestamp: string = new Date().toISOString(),
): AgentState {
  const newConclusion: AgentConclusion = {
    id: `conclusion-${state.conclusions.length + 1}`,
    stepNumber: state.stepCount,
    summary: conclusion.summary,
    createdAt: timestamp,
    ...(conclusion.confidence !== undefined ? { confidence: conclusion.confidence } : {}),
  };

  return {
    ...state,
    conclusions: [...state.conclusions, newConclusion],
  };
}

export function incrementStep(state: AgentState): AgentState {
  return {
    ...state,
    stepCount: state.stepCount + 1,
  };
}

export function setFinalResponse(state: AgentState, response: InvestigationResponse): AgentState {
  return {
    ...state,
    finalResponse: response,
  };
}

export interface AddTraceEventInput {
  type: TraceEventTypeValue;
  details?: Record<string, unknown>;
}

export function addTraceEvent(
  state: AgentState,
  event: AddTraceEventInput,
  timestamp: string = new Date().toISOString(),
): AgentState {
  const newEvent: TraceEvent = {
    id: `trace-${state.trace.length + 1}`,
    timestamp,
    type: event.type,
    ...(event.details !== undefined ? { details: event.details } : {}),
  };

  return {
    ...state,
    trace: [...state.trace, newEvent],
  };
}
