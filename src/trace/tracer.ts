import type { AgentState, InvestigationResponse } from "../agent/state.js";
import { addTraceEvent } from "../agent/state.js";
import type { ModelResponse } from "../model/model.js";
import type { ToolResult } from "../tools/types.js";
import { TraceEventType, summarizeForTrace } from "./events.js";

function safeTrace(
  state: AgentState,
  type: string,
  details: Record<string, unknown> | undefined,
): AgentState {
  try {
    return addTraceEvent(state, {
      type,
      ...(details !== undefined ? { details } : {}),
    });
  } catch {
    try {
      return addTraceEvent(state, {
        type,
        details: { unavailable: true },
      });
    } catch {
      return state;
    }
  }
}

export function traceObjective(state: AgentState, objective: string): AgentState {
  return safeTrace(state, TraceEventType.OBJECTIVE_SET, {
    objective: summarizeForTrace(objective),
  });
}

export function traceModelDecision(state: AgentState, response: ModelResponse): AgentState {
  const details =
    response.type === "tool_call"
      ? {
          decision: "tool_call",
          toolName: response.toolName,
          arguments: summarizeForTrace(response.arguments),
        }
      : {
          decision: "final",
          rootCause: summarizeForTrace(response.response.rootCause),
        };

  return safeTrace(state, TraceEventType.MODEL_DECISION, details);
}

export function traceToolCall(state: AgentState, toolName: string, args: unknown): AgentState {
  return safeTrace(state, TraceEventType.TOOL_CALL, {
    toolName,
    arguments: summarizeForTrace(args),
  });
}

export function traceToolResult(
  state: AgentState,
  toolName: string,
  result: ToolResult<unknown>,
): AgentState {
  return safeTrace(state, TraceEventType.TOOL_RESULT, {
    toolName,
    result: summarizeForTrace(result),
  });
}

export function traceToolError(
  state: AgentState,
  toolName: string,
  result: Extract<ToolResult<unknown>, { ok: false }>,
): AgentState {
  return safeTrace(state, TraceEventType.TOOL_ERROR, {
    toolName,
    error: summarizeForTrace(result.error),
  });
}

export function traceExecutionLimitReached(
  state: AgentState,
  stepCount: number,
  maxSteps: number,
): AgentState {
  return safeTrace(state, TraceEventType.EXECUTION_LIMIT_REACHED, {
    stepCount,
    maxSteps,
  });
}

export function traceModelError(state: AgentState, message: string): AgentState {
  return safeTrace(state, TraceEventType.MODEL_ERROR, {
    message: summarizeForTrace(message),
  });
}

export function traceFinalResponse(state: AgentState, response: InvestigationResponse): AgentState {
  return safeTrace(state, TraceEventType.FINAL_RESPONSE, {
    rootCause: summarizeForTrace(response.rootCause),
    summary: summarizeForTrace(response.summary),
    evidenceIds: response.evidenceIds,
  });
}
