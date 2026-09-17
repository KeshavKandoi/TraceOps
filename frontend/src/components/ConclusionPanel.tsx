import type { InvestigationResponse } from "../types";
import { EmptyState } from "./EmptyState";
import { IconFlag } from "../icons";

interface ConclusionPanelProps {
  finalResponse: InvestigationResponse | null;
}

export function ConclusionPanel({ finalResponse }: ConclusionPanelProps) {
  if (!finalResponse) {
    return (
      <EmptyState
        icon={IconFlag}
        title="No conclusion yet"
        description="Once the agent has gathered enough evidence, its final root-cause conclusion will appear here."
      />
    );
  }

  return (
    <div className="conclusion-panel">
      <div>
        <div className="header-eyebrow">Root cause</div>
        <div className="conclusion-root-cause">{finalResponse.rootCause}</div>
      </div>
      <div className="conclusion-summary">{finalResponse.summary}</div>
      <div>
        <div className="header-eyebrow" style={{ marginBottom: 8 }}>
          Supporting evidence
        </div>
        <div className="evidence-chip-row">
          {finalResponse.evidenceIds.length === 0 && (
            <span className="evidence-chip">No evidence referenced</span>
          )}
          {finalResponse.evidenceIds.map((id) => (
            <span key={id} className="evidence-chip">
              {id}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
