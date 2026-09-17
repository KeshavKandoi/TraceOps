import type { MetricsWindow, ServiceBaseline, ToolResult } from "./types.js";
import { loadMetrics, loadServices } from "./data-loader.js";

export interface GetMetricsInput {
  service: string;
  from?: string;
  to?: string;
}

export interface GetMetricsOutput {
  baseline: ServiceBaseline;
  windows: MetricsWindow[];
}

export function getMetrics(input: GetMetricsInput): ToolResult<GetMetricsOutput> {
  const knownServices = loadServices().map((service) => service.name);

  if (!knownServices.includes(input.service)) {
    return {
      ok: false,
      error: `Unknown service: "${input.service}". Known services: ${knownServices.join(", ")}`,
    };
  }

  const metricsFile = loadMetrics();
  const baseline = metricsFile.baselines[input.service];

  if (!baseline) {
    return {
      ok: false,
      error: `No baseline metrics found for service: "${input.service}"`,
    };
  }

  let windows = metricsFile.metrics.filter((window) => window.service === input.service);

  if (input.from !== undefined) {
    const fromTime = new Date(input.from).getTime();
    if (Number.isNaN(fromTime)) {
      return { ok: false, error: `Invalid "from" timestamp: "${input.from}"` };
    }
    windows = windows.filter((window) => new Date(window.window_end).getTime() > fromTime);
  }

  if (input.to !== undefined) {
    const toTime = new Date(input.to).getTime();
    if (Number.isNaN(toTime)) {
      return { ok: false, error: `Invalid "to" timestamp: "${input.to}"` };
    }
    windows = windows.filter((window) => new Date(window.window_start).getTime() < toTime);
  }

  return { ok: true, data: { baseline, windows } };
}
