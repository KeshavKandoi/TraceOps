import { z } from "zod";
import { Type, type FunctionDeclaration, type Schema } from "@google/genai";
import type { AnyToolDefinition } from "../tools/tool.js";

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current: z.ZodTypeAny = schema;
  while (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
    current = current.unwrap() as z.ZodTypeAny;
  }
  return current;
}

function withDescription(base: Omit<Schema, "description">, description: string | undefined): Schema {
  if (description === undefined) {
    return base as Schema;
  }
  return { ...base, description } as Schema;
}

function fieldToGeminiSchema(fieldSchema: z.ZodTypeAny): Schema {
  const description = fieldSchema.description;
  const inner = unwrap(fieldSchema);

  if (inner instanceof z.ZodEnum) {
    return withDescription(
      { type: Type.STRING, enum: Object.values(inner.enum) as string[] },
      description,
    );
  }

  if (inner instanceof z.ZodString) {
    return withDescription({ type: Type.STRING }, description);
  }

  if (inner instanceof z.ZodNumber) {
    return withDescription({ type: Type.NUMBER }, description);
  }

  if (inner instanceof z.ZodBoolean) {
    return withDescription({ type: Type.BOOLEAN }, description);
  }

  return withDescription({ type: Type.STRING }, description);
}

export function toFunctionDeclaration(tool: AnyToolDefinition): FunctionDeclaration {
  const objectSchema = tool.inputSchema as z.ZodObject<z.ZodRawShape>;
  const shape = objectSchema.shape;

  const properties: Record<string, Schema> = {};
  const required: string[] = [];

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const typedField = fieldSchema as z.ZodTypeAny;
    properties[key] = fieldToGeminiSchema(typedField);
    if (!typedField.isOptional()) {
      required.push(key);
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: Type.OBJECT,
      properties,
      required,
    },
  };
}

export function toFunctionDeclarations(tools: AnyToolDefinition[]): FunctionDeclaration[] {
  return tools.map(toFunctionDeclaration);
}
