import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { z } from "zod";
import type {
  AgentState,
  AgentMessage,
  ToolEvidence,
  AgentConclusion,
  TraceEvent,
  InvestigationResponse,
} from "./state.js";
import {
  createInitialState,
  addMessage,
  addEvidence,
  incrementStep,
  setFinalResponse,
} from "./state.js";
import type { Model, ModelResponse, ToolCallResponse } from "../model/model.js";
import { executeTool } from "../tools/registry.js";
import {
  traceObjective,
  traceModelDecision,
  traceToolCall,
  traceToolResult,
  traceToolError,
  traceExecutionLimitReached,
  traceModelError,
  traceFinalResponse,
} from "../trace/tracer.js";

export type StopReason =
  | "final_response"
  | "step_limit_reached"
  | "malformed_response"
  | "model_error";

export interface RunAgentOptions {
  model: Model;
  maxSteps: number;
}

export interface RunAgentResult {
  state: AgentState;
  stopReason: StopReason;
}

const GraphState = Annotation.Root({
  objective: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => "",
  }),
  messages: Annotation<AgentMessage[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
  evidence: Annotation<ToolEvidence[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
  conclusions: Annotation<AgentConclusion[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
  stepCount: Annotation<number>({
    reducer: (_current, update) => update,
    default: () => 0,
  }),
  trace: Annotation<TraceEvent[]>({
    reducer: (_current, update) => update,
    default: () => [],
  }),
  finalResponse: Annotation<InvestigationResponse | null>({
    reducer: (_current, update) => update,
    default: () => null,
  }),
  pendingToolCall: Annotation<ToolCallResponse | null>({
    reducer: (_current, update) => update,
    default: () => null,
  }),
  stopReason: Annotation<StopReason | null>({
    reducer: (_current, update) => update,
    default: () => null,
  }),
});

type GraphStateType = typeof GraphState.State;

function toAgentState(value: GraphStateType): AgentState {
  return {
    objective: value.objective,
    messages: value.messages,
    evidence: value.evidence,
    conclusions: value.conclusions,
    stepCount: value.stepCount,
    trace: value.trace,
    finalResponse: value.finalResponse,
  };
}

const InvestigationResponseSchema = z.object({
  objective: z.string(),
  rootCause: z.string(),
  summary: z.string(),
  evidenceIds: z.array(z.string()),
  createdAt: z.string(),
});

const ModelResponseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("tool_call"),
    toolName: z.string().min(1),
    arguments: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal("final"),
    response: InvestigationResponseSchema,
  }),
]);

function parseModelResponse(value: unknown): ModelResponse | null {
  const parsed = ModelResponseSchema.safeParse(value);
  return parsed.success ? (parsed.data as ModelResponse) : null;
}

function hasOnlyCollectedEvidenceIds(response: ModelResponse, state: AgentState): boolean {
  if (response.type !== "final") {
    return true;
  }

  const collectedIds = new Set(state.evidence.map((entry) => entry.id));
  return response.response.evidenceIds.every((id) => collectedIds.has(id));
}

function buildModelNode(model: Model, maxSteps: number) {
  return async (value: GraphStateType): Promise<Partial<GraphStateType>> => {
    if (value.stepCount >= maxSteps) {
      const agentState = toAgentState(value);
      const traced = traceExecutionLimitReached(agentState, value.stepCount, maxSteps);
      return { trace: traced.trace, stopReason: "step_limit_reached", pendingToolCall: null };
    }

    const agentState = toAgentState(value);
    let rawResponse: unknown;

    try {
      rawResponse = await model.decide(agentState);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      const withMessage = addMessage(agentState, {
        role: "system",
        content: `Model decision failed: ${messageText}`,
      });
      const stepped = incrementStep(withMessage);
      const traced = traceModelError(stepped, messageText);
      return {
        messages: traced.messages,
        stepCount: traced.stepCount,
        trace: traced.trace,
        pendingToolCall: null,
        stopReason: "model_error",
      };
    }

    const response = parseModelResponse(rawResponse);

    if (response === null) {
      const withMessage = addMessage(agentState, {
        role: "system",
        content: "Model returned a malformed response.",
      });
      const stepped = incrementStep(withMessage);
      const traced = traceModelError(stepped, "Model returned a malformed response.");
      return {
        messages: traced.messages,
        stepCount: traced.stepCount,
        trace: traced.trace,
        pendingToolCall: null,
        stopReason: "malformed_response",
      };
    }

    if (!hasOnlyCollectedEvidenceIds(response, agentState)) {
      const invalidIds =
        response.type === "final"
          ? response.response.evidenceIds.filter(
              (id) => !agentState.evidence.some((entry) => entry.id === id),
            )
          : [];
      const message = `Model final response referenced unknown evidence IDs: ${invalidIds.join(", ")}`;
      const withMessage = addMessage(agentState, {
        role: "system",
        content: message,
      });
      const stepped = incrementStep(withMessage);
      const traced = traceModelError(stepped, message);
      return {
        messages: traced.messages,
        stepCount: traced.stepCount,
        trace: traced.trace,
        pendingToolCall: null,
        stopReason: "malformed_response",
      };
    }

    if (response.type === "final") {
      const withMessage = addMessage(agentState, {
        role: "assistant",
        content: response.response.summary,
      });
      const stepped = incrementStep(withMessage);
      const finalized = setFinalResponse(stepped, response.response);
      const withDecisionTrace = traceModelDecision(finalized, response);
      const traced = traceFinalResponse(withDecisionTrace, response.response);
      return {
        messages: traced.messages,
        stepCount: traced.stepCount,
        finalResponse: traced.finalResponse,
        trace: traced.trace,
        pendingToolCall: null,
        stopReason: "final_response",
      };
    }

    const withMessage = addMessage(agentState, {
      role: "assistant",
      content: `Calling tool "${response.toolName}" with arguments ${JSON.stringify(response.arguments)}`,
    });
    const stepped = incrementStep(withMessage);
    const traced = traceModelDecision(stepped, response);

    return {
      messages: traced.messages,
      stepCount: traced.stepCount,
      trace: traced.trace,
      pendingToolCall: response,
      finalResponse: null,
      stopReason: null,
    };
  };
}

function toolNode(value: GraphStateType): Partial<GraphStateType> {
  const pendingToolCall = value.pendingToolCall;

  if (!pendingToolCall) {
    return {};
  }

  const agentState = toAgentState(value);
  const withCallTrace = traceToolCall(agentState, pendingToolCall.toolName, pendingToolCall.arguments);
  const result = executeTool(pendingToolCall.toolName, pendingToolCall.arguments);
  const withEvidence = addEvidence(withCallTrace, {
    toolName: pendingToolCall.toolName,
    input: pendingToolCall.arguments,
    result,
  });

  const resultMessage = result.ok
    ? `Tool "${pendingToolCall.toolName}" returned evidence.`
    : `Tool "${pendingToolCall.toolName}" failed: ${result.error}`;

  const withMessage = addMessage(withEvidence, {
    role: "tool",
    content: resultMessage,
  });

  const traced = result.ok
    ? traceToolResult(withMessage, pendingToolCall.toolName, result)
    : traceToolError(withMessage, pendingToolCall.toolName, result);

  return {
    evidence: traced.evidence,
    messages: traced.messages,
    trace: traced.trace,
    pendingToolCall: null,
  };
}

function routeAfterModel(value: GraphStateType): "tool" | typeof END {
  if (value.pendingToolCall && value.stopReason === null) {
    return "tool";
  }
  return END;
}

export function buildAgentGraph(options: RunAgentOptions) {
  const graph = new StateGraph(GraphState)
    .addNode("model", buildModelNode(options.model, options.maxSteps))
    .addNode("tool", toolNode)
    .addEdge(START, "model")
    .addConditionalEdges("model", routeAfterModel, {
      tool: "tool",
      [END]: END,
    })
    .addEdge("tool", "model");

  return graph.compile();
}

export async function runInvestigation(
  objective: string,
  options: RunAgentOptions,
): Promise<RunAgentResult> {
  const compiled = buildAgentGraph(options);
  const initial = createInitialState(objective);
  const withObjective = traceObjective(initial, objective);

  const result = (await compiled.invoke({
    objective: withObjective.objective,
    messages: withObjective.messages,
    evidence: withObjective.evidence,
    conclusions: withObjective.conclusions,
    stepCount: withObjective.stepCount,
    trace: withObjective.trace,
    finalResponse: withObjective.finalResponse,
    pendingToolCall: null,
    stopReason: null,
  })) as GraphStateType;

  const stopReason: StopReason =
    result.stopReason ?? (result.finalResponse ? "final_response" : "step_limit_reached");

  return {
    state: toAgentState(result),
    stopReason,
  };
}
