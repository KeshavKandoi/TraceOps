import type { ToolEvidence } from "../types";
import { StatusBadge } from "./StatusBadge";

interface EvidenceCardProps {
  evidence: ToolEvidence;
}

function summarizeResult(evidence: ToolEvidence): string {
  if (!evidence.result.ok) {
    return evidence.result.error;
  }
  const data = evidence.result.data;
  if (Array.isArray(data)) {
    return `${data.length} record${data.length === 1 ? "" : "s"} returned`;
  }
  if (data && typeof data === "object") {
    const keys = Object.keys(data as Record<string, unknown>);
    return `Object with ${keys.length} field${keys.length === 1 ? "" : "s"}`;
  }
  return String(data);
}

export function EvidenceCard({ evidence }: EvidenceCardProps) {
  const time = new Date(evidence.collectedAt).toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <article className="evidence-card">
      <div className="evidence-card-head">
        <span className="evidence-tool-name">{evidence.toolName}</span>
        {evidence.result.ok ? (
          <StatusBadge label="Success" tone="success" />
        ) : (
          <StatusBadge label="Error" tone="danger" />
        )}
      </div>
      <div className="evidence-meta">
        <span>{evidence.id}</span>
        <span>
          step {evidence.stepNumber} · {time}
        </span>
      </div>
      <div className="kv-block">
        <div className="kv-label">Input</div>
        <div className="kv-value">{JSON.stringify(evidence.input)}</div>
      </div>
      <div className="kv-block">
        <div className="kv-label">{evidence.result.ok ? "Result summary" : "Error"}</div>
        <div className="kv-value">{summarizeResult(evidence)}</div>
      </div>
    </article>
  );
}
