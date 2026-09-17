export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  level: LogLevel;
  message: string;
}

export interface MetricsWindow {
  service: string;
  window_start: string;
  window_end: string;
  error_rate: number;
  avg_latency_ms: number;
  p99_latency_ms: number;
  requests_per_window: number;
}

export interface ServiceBaseline {
  error_rate: number;
  avg_latency_ms: number;
  p99_latency_ms: number;
  requests_per_window: number;
}

export interface DatabaseStatus {
  name: string;
  status: string;
  max_connections: number;
  active_connections: number;
  queued_connections: number;
  last_healthy_at: string;
}

export interface ServiceStatus {
  name: string;
  status: string;
  description: string;
  dependencies: string[];
  database: DatabaseStatus;
  last_updated: string;
  on_call: string;
}

export type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
