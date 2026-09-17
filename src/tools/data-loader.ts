import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type {
  LogEntry,
  MetricsWindow,
  ServiceBaseline,
  ServiceStatus,
} from "./types.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(currentDir, "..", "..", "data");

function readJsonFile<T>(filename: string): T {
  const filePath = join(dataDir, filename);
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

interface LogsFile {
  generated_at: string;
  logs: LogEntry[];
}

interface MetricsFile {
  generated_at: string;
  window_minutes: number;
  baselines: Record<string, ServiceBaseline>;
  metrics: MetricsWindow[];
}

interface ServicesFile {
  generated_at: string;
  services: ServiceStatus[];
}

export function loadLogs(): LogEntry[] {
  return readJsonFile<LogsFile>("logs.json").logs;
}

export function loadMetrics(): MetricsFile {
  return readJsonFile<MetricsFile>("metrics.json");
}

export function loadServices(): ServiceStatus[] {
  return readJsonFile<ServicesFile>("services.json").services;
}
