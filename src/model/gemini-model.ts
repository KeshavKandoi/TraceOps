import {
  GoogleGenAI,
  Type,
  FunctionCallingConfigMode,
  type FunctionDeclaration,
} from "@google/genai";
import type { AgentState } from "../agent/state.js";
import type { Model, ModelResponse } from "./model.js";
import { listTools, listToolSchemas } from "../tools/registry.js";
import { toFunctionDeclarations } from "./gemini-schema-adapter.js";
import { loadServices } from "../tools/data-loader.js";

export class GeminiModelError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "GeminiModelError";
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export interface GeminiFunctionCall {
  name?: string;
  args?: Record<string, unknown>;
}

export interface GeminiGenerateContentResult {
  functionCalls?: GeminiFunctionCall[] | undefined;
}

export interface GeminiDecideParams {
  model: string;
  contents: string;
  functionDeclarations: FunctionDeclaration[];
}

export interface GeminiApiClient {
  generateContent(params: GeminiDecideParams): Promise<GeminiGenerateContentResult>;
}

const FINAL_RESPONSE_FUNCTION_NAME = "submit_final_response";
const DEFAULT_MODEL_NAME = "gemini-3.6-flash";

const TOOL_FUNCTION_DECLARATIONS: FunctionDeclaration[] = toFunctionDeclarations(listToolSchemas());

const FINAL_RESPONSE_FUNCTION_DECLARATION: FunctionDeclaration = {
  name: FINAL_RESPONSE_FUNCTION_NAME,
  description: "Submit the final investigation conclusion once the root cause is known.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      rootCause: { type: Type.STRING, description: "The identified root cause of the incident." },
      summary: { type: Type.STRING, description: "A concise summary of the investigation findings." },
      evidenceIds: {
        type: Type.ARRAY,
        description: "IDs of the evidence entries that support this conclusion.",
        items: { type: Type.STRING },
      },
    },
    required: ["rootCause", "summary", "evidenceIds"],
  },
};

const ALL_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  ...TOOL_FUNCTION_DECLARATIONS,
  FINAL_RESPONSE_FUNCTION_DECLARATION,
];

const KNOWN_SERVICE_NAMES = loadServices().map((service) => service.name);

function buildPrompt(state: AgentState): string {
  const evidenceSummary = state.evidence
    .map(
      (entry) =>
        `- [step ${entry.stepNumber}] ${entry.toolName}(${JSON.stringify(entry.input)}) => ${JSON.stringify(entry.result)}`,
    )
    .join("\n");

  const sections = [
    "You are TraceOps, an incident investigation agent.",
    `Objective: ${state.objective}`,
    `Available synthetic service names: ${KNOWN_SERVICE_NAMES.join(", ")}. Use these exact names in tool arguments.`,
    state.evidence.length > 0
      ? `Evidence collected so far:\n${evidenceSummary}`
      : "No evidence has been collected yet.",
    `Decide the single next best action: call exactly one of the available tools to gather more evidence, or call ${FINAL_RESPONSE_FUNCTION_NAME} once you have enough evidence to state the root cause.`,
  ];

  return sections.join("\n\n");
}

function toModelResponse(result: GeminiGenerateContentResult, objective: string): ModelResponse {
  const call = result.functionCalls?.[0];

  if (!call || typeof call.name !== "string") {
    throw new GeminiModelError("Gemini did not return a function call decision.");
  }

  if (call.name === FINAL_RESPONSE_FUNCTION_NAME) {
    const args = call.args ?? {};
    const rootCause = args.rootCause;
    const summary = args.summary;
    const evidenceIds = args.evidenceIds;

    if (typeof rootCause !== "string" || typeof summary !== "string" || !Array.isArray(evidenceIds)) {
      throw new GeminiModelError("Gemini returned a malformed final response.");
    }

    return {
      type: "final",
      response: {
        objective,
        rootCause,
        summary,
        evidenceIds: evidenceIds.filter((id): id is string => typeof id === "string"),
        createdAt: new Date().toISOString(),
      },
    };
  }

  const knownToolNames = listTools().map((tool) => tool.name);

  if (!knownToolNames.includes(call.name)) {
    throw new GeminiModelError(`Gemini returned an unsupported tool decision: "${call.name}".`);
  }

  return {
    type: "tool_call",
    toolName: call.name,
    arguments: call.args ?? {},
  };
}

function makeDefaultClient(apiKey: string): GeminiApiClient {
  const ai = new GoogleGenAI({ apiKey });

  return {
    generateContent: (params: GeminiDecideParams) =>
      ai.models.generateContent({
        model: params.model,
        contents: params.contents,
        config: {
          tools: [{ functionDeclarations: params.functionDeclarations }],
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
        },
      }),
  };
}

export interface GeminiModelOptions {
  apiKey: string;
  modelName?: string;
  client?: GeminiApiClient;
}

export class GeminiModel implements Model {
  private readonly client: GeminiApiClient;
  private readonly modelName: string;

  constructor(options: GeminiModelOptions) {
    if (!options.apiKey) {
      throw new GeminiModelError("A Gemini API key is required to construct GeminiModel.");
    }

    this.modelName = options.modelName ?? DEFAULT_MODEL_NAME;
    this.client = options.client ?? makeDefaultClient(options.apiKey);
  }

  async decide(state: AgentState): Promise<ModelResponse> {
    let result: GeminiGenerateContentResult;

    try {
      result = await this.client.generateContent({
        model: this.modelName,
        contents: buildPrompt(state),
        functionDeclarations: ALL_FUNCTION_DECLARATIONS,
      });
    } catch (error) {
      if (error instanceof GeminiModelError) {
        throw error;
      }
      throw new GeminiModelError("Gemini API request failed.", { cause: error });
    }

    return toModelResponse(result, state.objective);
  }
}

export function createGeminiModel(overrides: Partial<GeminiModelOptions> = {}): GeminiModel {
  const apiKey = overrides.apiKey ?? process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new GeminiModelError(
      "GEMINI_API_KEY environment variable is not set. Add it to your environment or a .env file.",
    );
  }

  return new GeminiModel({ ...overrides, apiKey });
}
