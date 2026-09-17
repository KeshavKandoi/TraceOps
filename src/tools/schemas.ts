import { z } from "zod";

export const LogLevelSchema = z.enum(["info", "warn", "error"]);

export const SearchLogsInputSchema = z
  .object({
    service: z.string().min(1, "service is required").describe("The service name to search logs for."),
    level: LogLevelSchema.optional().describe("Optional log level filter."),
  })
  .strict();

export const GetMetricsInputSchema = z
  .object({
    service: z.string().min(1, "service is required").describe("The service name to fetch metrics for."),
    from: z
      .string()
      .datetime()
      .optional()
      .describe(
        "Optional ISO 8601 UTC datetime. Metric windows are included if the window overlaps the [from, to] range: a window is included when its window_end is after this value.",
      ),
    to: z
      .string()
      .datetime()
      .optional()
      .describe(
        "Optional ISO 8601 UTC datetime. Metric windows are included if the window overlaps the [from, to] range: a window is included when its window_start is before this value.",
      ),
  })
  .strict();

export const GetServiceStatusInputSchema = z
  .object({
    service: z.string().min(1, "service is required").describe("The service name to check status for."),
  })
  .strict();
