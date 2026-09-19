import type { z } from "zod";
import type { ToolResult } from "./types.js";

export interface ToolDefinition<Input, Output> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: z.ZodType<Input>;
  execute(input: Input): ToolResult<Output>;
}

export type AnyToolDefinition = ToolDefinition<unknown, unknown>;
