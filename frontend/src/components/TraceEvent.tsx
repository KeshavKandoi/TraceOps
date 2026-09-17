import { useState, type ReactElement } from "react";
import type { TraceEvent as TraceEventData, TraceEventType } from "../types";
import {
  IconTarget,
  IconBrain,
  IconWrench,
  IconCheck,
  IconX,
  IconStop,
  IconAlertTriangle,
  IconFlag,
  IconChevronRight,
} from "../icons";

interface TraceEventProps {
  event: TraceEventData;
  stepNumber: number | null;
  isLast: boolean;
}

type IconRenderer = (props: { className?: string }) => ReactElement;

interface EventMeta {
  label: string;
  icon: IconRenderer;
  tone: string;
}

const EVENT_META: Record<TraceEventType, EventMeta> = {
  objective_set: { label: "Objective set", icon: IconTarget, tone: "var(--accent)" },
  model_decision: { label: "Model decision", icon: IconBrain, tone: "var(--accent)" },
  tool_call: { label: "Tool call", icon: IconWrench, tone: "var(--text-secondary)" },
  tool_result: { label: "Tool result", icon: IconCheck, tone: "var(--success)" },
  tool_error: { label: "Tool error", icon: IconX, tone: "var(--danger)" },
  execution_limit_reached: { label: "Execution limit reached", icon: IconStop, tone: "var(--warning)" },
  model_error: { label: "Model error", icon: IconAlertTriangle, tone: "var(--danger)" },
  final_response: { label: "Final response", icon: IconFlag, tone: "var(--success)" },
};

function describeEvent(event: TraceEventData): string {
  const details = event.details ?? {};
  switch (event.type) {
    case "objective_set":
      return typeof details.objective === "string" ? details.objective : "Objective recorded";
    case "model_decision":
      return details.decision === "tool_call"
        ? `Selected tool "${String(details.toolName)}"`
        : "Decided to submit a final response";
    case "tool_call":
      return `Calling "${String(details.toolName)}"`;
    case "tool_result":
      return `"${String(details.toolName)}" returned evidence`;
    case "tool_error":
      return `"${String(details.toolName)}" failed`;
    case "execution_limit_reached":
      return `Stopped at step ${String(details.stepCount)} of ${String(details.maxSteps)}`;
    case "model_error":
      return typeof details.message === "string" ? details.message : "Model failed to respond";
    case "final_response":
      return typeof details.rootCause === "string" ? details.rootCause : "Investigation concluded";
    default:
      return "Trace event";
  }
}

export function TraceEventRow({ event, stepNumber, isLast }: TraceEventProps) {
  const [open, setOpen] = useState(false);
  const meta = EVENT_META[event.type];
  const Icon = meta.icon;
  const time = new Date(event.timestamp).toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="timeline-item">
      <div className="timeline-rail">
        <div className="timeline-icon" style={{ color: meta.tone }}>
          <Icon />
        </div>
        {!isLast && <div className="timeline-line" />}
      </div>
      <div className="timeline-card">
        <button
          type="button"
          className="timeline-card-head"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <div className="timeline-card-head-left">
            <span className={`timeline-chevron${open ? " open" : ""}`}>
              <IconChevronRight />
            </span>
            {stepNumber !== null && <span className="timeline-step">step {stepNumber}</span>}
            <span className="badge badge-neutral">{meta.label}</span>
            <span className="timeline-desc">{describeEvent(event)}</span>
          </div>
          <span className="timeline-time">{time}</span>
        </button>
        {open && (
          <div className="timeline-detail">
            <pre>{JSON.stringify(event.details ?? {}, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
