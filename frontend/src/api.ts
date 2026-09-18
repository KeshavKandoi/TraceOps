import type { InvestigationState, ToolMeta } from "./types";

const API_BASE_URL = import.meta.env.VITE_TRACEOPS_API_URL ?? "";

export interface DemoScenario {
  id: "success" | "tool_failure_recovery" | "step_limit";
  label: string;
  objective: string;
  maxSteps: number;
}

export type ModelMode = "offline" | "gemini";

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    issues?: Array<{ path: string; message: string }>;
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T;
  if (!response.ok) {
    const errorPayload = data as ApiErrorPayload;
    const detail = errorPayload.error?.issues
      ?.map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ");
    throw new Error(
      [errorPayload.error?.message ?? `Request failed with ${response.status}`, detail]
        .filter(Boolean)
        .join(" "),
    );
  }
  return data;
}

export async function fetchTools(): Promise<ToolMeta[]> {
  const response = await fetch(`${API_BASE_URL}/api/tools`);
  const data = await readJson<{ tools: ToolMeta[] }>(response);
  return data.tools;
}

export async function fetchScenarios(): Promise<DemoScenario[]> {
  const response = await fetch(`${API_BASE_URL}/api/scenarios`);
  const data = await readJson<{ scenarios: DemoScenario[] }>(response);
  return data.scenarios;
}

export async function runInvestigationRequest(params: {
  objective: string;
  scenario: DemoScenario["id"];
  maxSteps?: number;
  model?: ModelMode;
}): Promise<InvestigationState> {
  const response = await fetch(`${API_BASE_URL}/api/investigate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      objective: params.objective,
      scenario: params.scenario,
      model: params.model === "gemini" ? "gemini" : "fake",
      ...(params.maxSteps !== undefined ? { maxSteps: params.maxSteps } : {}),
    }),
  });
  return readJson<InvestigationState>(response);
}
