import type { InvestigationResponse } from "../types";
import { EmptyState } from "./EmptyState";
import { IconFlag, IconTarget } from "../icons";

interface ConclusionPanelProps {
  finalResponse: InvestigationResponse | null;
  onSelectEvidence?: (evidenceId: string) => void;
}

export function ConclusionPanel({ finalResponse, onSelectEvidence }: ConclusionPanelProps) {
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
      <div className="conclusion-status-row">
        <span className="badge badge-success">
          <span className="badge-dot" />
          Agent conclusion
        </span>
        <span className="conclusion-status-note">Derived from evidence below, not observed directly</span>
      </div>

      <div>
        <div className="conclusion-observed-label">
          <IconTarget aria-hidden="true" />
          Investigation objective
        </div>
        <div className="conclusion-objective">
          <span>{finalResponse.objective}</span>
        </div>
      </div>

      <div>
        <div className="conclusion-derivation" aria-hidden="true">
          <span className="conclusion-derivation-line" />
          <span className="header-eyebrow" style={{ marginBottom: 0 }}>
            Root cause
          </span>
        </div>
        <div className="conclusion-root-cause">{finalResponse.rootCause}</div>
      </div>

      <p className="conclusion-summary">{finalResponse.summary}</p>

      <div>
        <div className="header-eyebrow" style={{ marginBottom: 8 }}>
          Supporting evidence
        </div>
        <div className="evidence-chip-row">
          {finalResponse.evidenceIds.length === 0 && (
            <span className="evidence-chip">No evidence referenced</span>
          )}
          {finalResponse.evidenceIds.map((id) =>
            onSelectEvidence ? (
              <button
                key={id}
                type="button"
                className="evidence-chip evidence-chip-link"
                onClick={() => onSelectEvidence(id)}
              >
                {id}
              </button>
            ) : (
              <span key={id} className="evidence-chip">
                {id}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
