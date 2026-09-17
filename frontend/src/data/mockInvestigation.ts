import type { InvestigationState, ToolMeta } from "../types";

export const mockInvestigation: InvestigationState = {
  objective: "Investigate elevated payment errors around 10:00 UTC",
  status: "completed",
  stepCount: 3,
  maxSteps: 8,
  stopReason: "final_response",
  evidence: [
    {
      id: "evidence-1",
      stepNumber: 1,
      toolName: "get_service_status",
      input: { service: "payment" },
      result: {
        ok: true,
        data: {
          name: "payment",
          status: "degraded",
          description: "Elevated latency and error rate on the payment service.",
          dependencies: ["payment-db", "fraud-check"],
          database: {
            name: "payment-db",
            status: "degraded",
            max_connections: 100,
            active_connections: 98,
            queued_connections: 42,
            last_healthy_at: "2024-01-15T09:40:00Z",
          },
          last_updated: "2024-01-15T10:05:00Z",
          on_call: "keshav.kandoi",
        },
      },
      collectedAt: "2024-01-15T10:16:02Z",
    },
    {
      id: "evidence-2",
      stepNumber: 2,
      toolName: "search_logs",
      input: { service: "payment", level: "error" },
      result: {
        ok: true,
        data: [
          {
            id: "log-0091",
            timestamp: "2024-01-15T09:58:12Z",
            service: "payment",
            level: "error",
            message: "Connection pool exhausted for payment-db, 42 requests queued",
          },
          {
            id: "log-0094",
            timestamp: "2024-01-15T10:01:47Z",
            service: "payment",
            level: "error",
            message: "Timed out waiting for a payment-db connection after 5000ms",
          },
        ],
      },
      collectedAt: "2024-01-15T10:16:09Z",
    },
    {
      id: "evidence-3",
      stepNumber: 3,
      toolName: "get_metrics",
      input: { service: "payment" },
      result: {
        ok: false,
        error: 'Invalid "from" timestamp: "yesterday"',
      },
      collectedAt: "2024-01-15T10:16:15Z",
    },
  ],
  trace: [
    {
      id: "trace-1",
      timestamp: "2024-01-15T10:16:00Z",
      type: "objective_set",
      details: { objective: "Investigate elevated payment errors around 10:00 UTC" },
    },
    {
      id: "trace-2",
      timestamp: "2024-01-15T10:16:01Z",
      type: "model_decision",
      details: {
        decision: "tool_call",
        toolName: "get_service_status",
        arguments: { service: "payment" },
      },
    },
    {
      id: "trace-3",
      timestamp: "2024-01-15T10:16:02Z",
      type: "tool_call",
      details: { toolName: "get_service_status", arguments: { service: "payment" } },
    },
    {
      id: "trace-4",
      timestamp: "2024-01-15T10:16:02Z",
      type: "tool_result",
      details: { toolName: "get_service_status", result: { ok: true } },
    },
    {
      id: "trace-5",
      timestamp: "2024-01-15T10:16:08Z",
      type: "model_decision",
      details: {
        decision: "tool_call",
        toolName: "search_logs",
        arguments: { service: "payment", level: "error" },
      },
    },
    {
      id: "trace-6",
      timestamp: "2024-01-15T10:16:09Z",
      type: "tool_call",
      details: { toolName: "search_logs", arguments: { service: "payment", level: "error" } },
    },
    {
      id: "trace-7",
      timestamp: "2024-01-15T10:16:09Z",
      type: "tool_result",
      details: { toolName: "search_logs", result: { ok: true } },
    },
    {
      id: "trace-8",
      timestamp: "2024-01-15T10:16:14Z",
      type: "model_decision",
      details: {
        decision: "tool_call",
        toolName: "get_metrics",
        arguments: { service: "payment", from: "yesterday" },
      },
    },
    {
      id: "trace-9",
      timestamp: "2024-01-15T10:16:15Z",
      type: "tool_call",
      details: { toolName: "get_metrics", arguments: { service: "payment", from: "yesterday" } },
    },
    {
      id: "trace-10",
      timestamp: "2024-01-15T10:16:15Z",
      type: "tool_error",
      details: { toolName: "get_metrics", error: 'Invalid "from" timestamp: "yesterday"' },
    },
    {
      id: "trace-11",
      timestamp: "2024-01-15T10:16:22Z",
      type: "model_decision",
      details: { decision: "final", rootCause: "payment-db connection pool exhaustion" },
    },
    {
      id: "trace-12",
      timestamp: "2024-01-15T10:16:22Z",
      type: "final_response",
      details: {
        rootCause: "payment-db connection pool exhaustion",
        summary:
          "Payment errors were traced to the payment-db connection pool being exhausted, causing timeouts and queued requests.",
        evidenceIds: ["evidence-1", "evidence-2"],
      },
    },
  ],
  finalResponse: {
    objective: "Investigate elevated payment errors around 10:00 UTC",
    rootCause: "payment-db connection pool exhaustion",
    summary:
      "Payment errors were traced to the payment-db connection pool being exhausted (98/100 active, 42 queued), which caused elevated latency and connection timeouts starting around 09:58 UTC.",
    evidenceIds: ["evidence-1", "evidence-2"],
    createdAt: "2024-01-15T10:16:22Z",
  },
};

export const mockTools: ToolMeta[] = [
  {
    name: "get_service_status",
    description: "Get the current health, dependency, and database status for a service.",
    fields: [{ name: "service", type: "string", required: true, description: "The service name to check status for." }],
  },
  {
    name: "search_logs",
    description: "Search service logs, optionally filtered by log level.",
    fields: [
      { name: "service", type: "string", required: true, description: "The service name to search logs for." },
      { name: "level", type: '"info" | "warn" | "error"', required: false, description: "Optional log level filter." },
    ],
  },
  {
    name: "get_metrics",
    description: "Get baseline and windowed metrics for a service, optionally filtered by a time range.",
    fields: [
      { name: "service", type: "string", required: true, description: "The service name to fetch metrics for." },
      { name: "from", type: "ISO 8601 datetime", required: false, description: "Optional start of the time range." },
      { name: "to", type: "ISO 8601 datetime", required: false, description: "Optional end of the time range." },
    ],
  },
];

export const emptyInvestigation: InvestigationState = {
  objective: "",
  status: "idle",
  stepCount: 0,
  maxSteps: 8,
  stopReason: null,
  evidence: [],
  trace: [],
  finalResponse: null,
};
