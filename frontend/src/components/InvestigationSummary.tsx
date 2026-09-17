import type { InvestigationState } from "../types";
import { investigationStatusBadge, stopReasonBadge } from "./StatusBadge";

interface InvestigationSummaryProps {
  investigation: InvestigationState;
}

export function InvestigationSummary({ investigation }: InvestigationSummaryProps) {
  const errorCount = investigation.evidence.filter((entry) => !entry.result.ok).length;

  return (
    <header className="header">
      <div className="header-top">
        <div>
          <div className="header-eyebrow">Active investigation</div>
          <div className="header-objective">
            {investigation.objective || "No objective set"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {investigationStatusBadge(investigation.status)}
          {stopReasonBadge(investigation.stopReason)}
        </div>
      </div>
      <div className="header-stats">
        <div className="stat-card">
          <div className="stat-label">Steps</div>
          <div className="stat-value">
            {investigation.stepCount} / {investigation.maxSteps}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Evidence</div>
          <div className="stat-value">{investigation.evidence.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Trace events</div>
          <div className="stat-value">{investigation.trace.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tool errors</div>
          <div className="stat-value">{errorCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Conclusion</div>
          <div className="stat-value">{investigation.finalResponse ? "Ready" : "Pending"}</div>
        </div>
      </div>
    </header>
  );
}
