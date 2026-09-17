import type { StopReason } from "../types";

type Tone = "success" | "danger" | "warning" | "neutral" | "accent";

interface StatusBadgeProps {
  label: string;
  tone: Tone;
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}

export function investigationStatusBadge(
  status: "idle" | "running" | "completed" | "failed",
) {
  switch (status) {
    case "idle":
      return <StatusBadge label="Idle" tone="neutral" />;
    case "running":
      return <StatusBadge label="Running" tone="accent" />;
    case "completed":
      return <StatusBadge label="Completed" tone="success" />;
    case "failed":
      return <StatusBadge label="Failed" tone="danger" />;
  }
}

export function stopReasonBadge(stopReason: StopReason | null) {
  if (!stopReason) {
    return <StatusBadge label="In progress" tone="accent" />;
  }
  switch (stopReason) {
    case "final_response":
      return <StatusBadge label="Final response" tone="success" />;
    case "step_limit_reached":
      return <StatusBadge label="Step limit reached" tone="warning" />;
    case "malformed_response":
      return <StatusBadge label="Malformed response" tone="danger" />;
    case "model_error":
      return <StatusBadge label="Model error" tone="danger" />;
  }
}
