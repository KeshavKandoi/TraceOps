import { z } from "zod";
import type { AnyToolDefinition } from "./tool.js";

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

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema;
  while (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
    current = current.unwrap() as z.ZodTypeAny;
  }
  return current;
}

function schemaType(schema: z.ZodTypeAny): string {
  const inner = unwrap(schema);

  if (inner instanceof z.ZodEnum) {
    return Object.values(inner.enum)
      .map((value) => JSON.stringify(value))
      .join(" | ");
  }

  if (inner instanceof z.ZodString) {
    return "string";
  }

  if (inner instanceof z.ZodNumber) {
    return "number";
  }

  if (inner instanceof z.ZodBoolean) {
    return "boolean";
  }

  return "unknown";
}

export function toToolMeta(tool: AnyToolDefinition): ToolMeta {
  const objectSchema = tool.inputSchema as z.ZodObject<z.ZodRawShape>;
  const fields = Object.entries(objectSchema.shape).map(([name, fieldSchema]) => {
    const typedField = fieldSchema as z.ZodTypeAny;
    return {
      name,
      type: schemaType(typedField),
      required: !typedField.isOptional(),
      ...(typedField.description !== undefined ? { description: typedField.description } : {}),
    };
  });

  return {
    name: tool.name,
    description: tool.description,
    fields,
  };
}
