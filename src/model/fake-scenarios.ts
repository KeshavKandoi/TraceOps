import type { ModelResponse } from "./model.js";

export type DemoScenarioId = "success" | "tool_failure_recovery" | "step_limit";

export interface DemoScenario {
  id: DemoScenarioId;
  label: string;
  objective: string;
  maxSteps: number;
  responses: ModelResponse[];
}

const createdAt = "2024-01-15T10:20:00.000Z";

export const demoScenarios: Record<DemoScenarioId, DemoScenario> = {
  success: {
    id: "success",
    label: "Multi-step success",
    objective: "Investigate elevated payment errors around 10:00 UTC",
    maxSteps: 8,
    responses: [
      { type: "tool_call", toolName: "get_service_status", arguments: { service: "payment" } },
      { type: "tool_call", toolName: "search_logs", arguments: { service: "payment", level: "error" } },
      { type: "tool_call", toolName: "get_metrics", arguments: { service: "payment" } },
      {
        type: "final",
        response: {
          objective: "Investigate elevated payment errors around 10:00 UTC",
          rootCause: "payment-db connection pool exhaustion",
          summary:
            "The payment service is degraded because payment-db is nearly saturated, with queued connections and matching timeout errors in the logs.",
          evidenceIds: ["evidence-1", "evidence-2", "evidence-3"],
          createdAt,
        },
      },
    ],
  },
  tool_failure_recovery: {
    id: "tool_failure_recovery",
    label: "Tool failure recovery",
    objective: "Investigate payment latency while recovering from a bad metrics call",
    maxSteps: 8,
    responses: [
      { type: "tool_call", toolName: "get_metrics", arguments: { service: "payment", from: "yesterday" } },
      { type: "tool_call", toolName: "get_service_status", arguments: { service: "payment" } },
      { type: "tool_call", toolName: "search_logs", arguments: { service: "payment", level: "error" } },
      {
        type: "final",
        response: {
          objective: "Investigate payment latency while recovering from a bad metrics call",
          rootCause: "payment-db connection pool exhaustion",
          summary:
            "The first metrics request failed validation, but the loop continued and found degraded payment-db status plus connection timeout errors.",
          evidenceIds: ["evidence-2", "evidence-3"],
          createdAt,
        },
      },
    ],
  },
  step_limit: {
    id: "step_limit",
    label: "Execution limit",
    objective: "Investigate order latency with a two-step budget",
    maxSteps: 2,
    responses: [
      { type: "tool_call", toolName: "get_service_status", arguments: { service: "order" } },
      { type: "tool_call", toolName: "search_logs", arguments: { service: "order", level: "warn" } },
      { type: "tool_call", toolName: "get_metrics", arguments: { service: "order" } },
      {
        type: "final",
        response: {
          objective: "Investigate order latency with a two-step budget",
          rootCause: "Should not be reached",
          summary: "The execution limit should stop this scenario before a conclusion.",
          evidenceIds: ["evidence-1"],
          createdAt,
        },
      },
    ],
  },
};

export function getDemoScenario(id: DemoScenarioId): DemoScenario {
  return demoScenarios[id];
}
