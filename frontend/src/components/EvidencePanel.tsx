import type { ToolEvidence } from "../types";
import { EvidenceCard } from "./EvidenceCard";
import { EmptyState } from "./EmptyState";
import { IconLayers } from "../icons";

interface EvidencePanelProps {
  evidence: ToolEvidence[];
  supportingIds?: string[];
  highlightedId?: string | null;
}

export function EvidencePanel({ evidence, supportingIds, highlightedId }: EvidencePanelProps) {
  if (evidence.length === 0) {
    return (
      <EmptyState
        icon={IconLayers}
        title="No evidence collected yet"
        description="Tool results gathered during the investigation will appear here as factual evidence, separate from the agent's conclusion."
      />
    );
  }

  const errorCount = evidence.filter((entry) => !entry.result.ok).length;
  const citedCount = supportingIds
    ? evidence.filter((entry) => supportingIds.includes(entry.id)).length
    : 0;

  return (
    <>
      <div className="evidence-summary-bar" aria-label="Evidence summary">
        <div className="evidence-summary-stat">
          <span className="evidence-summary-stat-value">{evidence.length}</span>
          <span className="evidence-summary-stat-label">
            {evidence.length === 1 ? "item collected" : "items collected"}
          </span>
        </div>
        <span className="evidence-summary-divider" aria-hidden="true" />
        <div className="evidence-summary-stat">
          <span className="evidence-summary-stat-value">{citedCount}</span>
          <span className="evidence-summary-stat-label">cited in conclusion</span>
        </div>
        {errorCount > 0 && (
          <>
            <span className="evidence-summary-divider" aria-hidden="true" />
            <div className="evidence-summary-stat">
              <span className="evidence-summary-stat-value telemetry-value-danger">{errorCount}</span>
              <span className="evidence-summary-stat-label">
                {errorCount === 1 ? "tool call failed" : "tool calls failed"}
              </span>
            </div>
          </>
        )}
      </div>
      <div className="card-grid">
        {evidence.map((entry) => (
          <EvidenceCard
            key={entry.id}
            evidence={entry}
            supportsConclusion={supportingIds?.includes(entry.id)}
            highlighted={highlightedId === entry.id}
          />
        ))}
      </div>
    </>
  );
}
