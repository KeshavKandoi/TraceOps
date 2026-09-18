import type { InvestigationState } from "../types";
import { investigationStatusBadge, stopReasonBadge } from "./StatusBadge";

interface InvestigationSummaryProps {
  investigation: InvestigationState;
}

interface Metric {
  label: string;
  value: string;
}

export function InvestigationSummary({ investigation }: InvestigationSummaryProps) {
  const errorCount = investigation.evidence.filter((entry) => !entry.result.ok).length;

  const metrics: Metric[] = [
    { label: "Steps", value: `${investigation.stepCount} / ${investigation.maxSteps}` },
    { label: "Evidence", value: String(investigation.evidence.length) },
    { label: "Trace events", value: String(investigation.trace.length) },
    { label: "Tool errors", value: String(errorCount) },
    { label: "Conclusion", value: investigation.finalResponse ? "Ready" : "Pending" },
  ];

  return (
    <header className="header">
      <div className="header-top">
        <div className="header-objective-block">
          <div className="header-eyebrow">Active investigation</div>
          <h1 className="header-objective">{investigation.objective || "No objective set"}</h1>
        </div>
        <div className="header-badges" role="group" aria-label="Investigation status">
          {investigationStatusBadge(investigation.status)}
          {stopReasonBadge(investigation.stopReason)}
        </div>
      </div>
      <dl className="telemetry-row" aria-label="Investigation metrics">
        {metrics.map((metric, index) => (
          <div className="telemetry-item" key={metric.label}>
            {index > 0 && <span className="telemetry-divider" aria-hidden="true" />}
            <dt className="telemetry-label">{metric.label}</dt>
            <dd className="telemetry-value">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
