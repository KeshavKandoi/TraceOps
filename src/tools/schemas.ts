import { z } from "zod";

export const LogLevelSchema = z.enum(["info", "warn", "error"]);

export const SearchLogsInputSchema = z
  .object({
    service: z.string().min(1, "service is required"),
    level: LogLevelSchema.optional(),
  })
  .strict();

export const GetMetricsInputSchema = z
  .object({
    service: z.string().min(1, "service is required"),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strict();

export const GetServiceStatusInputSchema = z
  .object({
    service: z.string().min(1, "service is required"),
  })
  .strict();
