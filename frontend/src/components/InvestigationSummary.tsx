import type { ReactNode } from "react";
import type { InvestigationState } from "../types";
import { investigationStatusBadge, stopReasonBadge } from "./StatusBadge";

interface InvestigationSummaryProps {
  investigation: InvestigationState;
  scenarioSelector?: ReactNode;
}

interface Metric {
  label: string;
  value: string;
  tone?: "danger" | "success";
}

export function InvestigationSummary({ investigation, scenarioSelector }: InvestigationSummaryProps) {
  const errorCount = investigation.evidence.filter((entry) => !entry.result.ok).length;

  const metrics: Metric[] = [
    { label: "Evidence", value: String(investigation.evidence.length) },
    { label: "Trace events", value: String(investigation.trace.length) },
    { label: "Tool errors", value: String(errorCount), tone: errorCount > 0 ? "danger" : undefined },
    {
      label: "Conclusion",
      value: investigation.finalResponse ? "Ready" : "Pending",
      tone: investigation.finalResponse ? "success" : undefined,
    },
  ];

  const segments = Array.from({ length: Math.max(investigation.maxSteps, 1) }, (_, index) => {
    const filled = index < investigation.stepCount;
    if (!filled) return "empty";
    const isLastFilled = index === investigation.stepCount - 1;
    if (isLastFilled && investigation.stopReason === "step_limit_reached") return "filled-warning";
    if (isLastFilled && (investigation.stopReason === "malformed_response" || investigation.stopReason === "model_error")) {
      return "filled-error";
    }
    return "filled";
  });

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

      <div className="telemetry-panel">
        <div className="step-progress" aria-label="Agent loop progress">
          <span className="step-progress-label">Loop</span>
          <div className="step-progress-track" role="img" aria-label={`${investigation.stepCount} of ${investigation.maxSteps} steps used`}>
            {segments.map((state, index) => (
              <div key={index} className={`step-progress-segment${state !== "empty" ? ` filled ${state}` : ""}`} />
            ))}
          </div>
          <span className="step-progress-count">
            {investigation.stepCount} / {investigation.maxSteps} steps
          </span>
        </div>

        <dl className="telemetry-row" aria-label="Investigation metrics">
          {metrics.map((metric, index) => (
            <div className="telemetry-item" key={metric.label}>
              {index > 0 && <span className="telemetry-divider" aria-hidden="true" />}
              <dt className="telemetry-label">{metric.label}</dt>
              <dd
                className={`telemetry-value${metric.tone ? ` telemetry-value-${metric.tone}` : ""}`}
              >
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>

        {scenarioSelector}
      </div>
    </header>
  );
}
