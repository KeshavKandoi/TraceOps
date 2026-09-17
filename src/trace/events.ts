export const TraceEventType = {
  OBJECTIVE_SET: "objective_set",
  MODEL_DECISION: "model_decision",
  TOOL_CALL: "tool_call",
  TOOL_RESULT: "tool_result",
  TOOL_ERROR: "tool_error",
  EXECUTION_LIMIT_REACHED: "execution_limit_reached",
  MODEL_ERROR: "model_error",
  FINAL_RESPONSE: "final_response",
} as const;

export type TraceEventTypeValue = (typeof TraceEventType)[keyof typeof TraceEventType];

const SENSITIVE_KEY_PATTERN = /key|secret|token|password|credential|authorization/i;
const LONG_TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,}$/;

function looksLikeSecretValue(value: string): boolean {
  if (!LONG_TOKEN_PATTERN.test(value)) {
    return false;
  }
  return /[a-z]/.test(value) && /[A-Z0-9]/.test(value);
}

export function redactSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValues(item));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        result[key] = "[REDACTED]";
        continue;
      }
      result[key] = redactSensitiveValues(entryValue);
    }
    return result;
  }

  if (typeof value === "string" && looksLikeSecretValue(value)) {
    return "[REDACTED]";
  }

  return value;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return "[unserializable]";
  }
}

export function summarizeForTrace(value: unknown, maxLength = 500): unknown {
  try {
    const redacted = redactSensitiveValues(value);
    const json = safeStringify(redacted);
    if (json.length <= maxLength) {
      return redacted;
    }
    return { truncated: true, preview: `${json.slice(0, maxLength)}...` };
  } catch {
    return { unavailable: true };
  }
}
