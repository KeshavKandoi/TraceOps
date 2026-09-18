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

  return (
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
  );
}
