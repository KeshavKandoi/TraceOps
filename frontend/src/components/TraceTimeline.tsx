import type { TraceEvent as TraceEventData } from "../types";
import { TraceEventRow } from "./TraceEvent";
import { EmptyState } from "./EmptyState";
import { IconTimeline } from "../icons";

interface TraceTimelineProps {
  trace: TraceEventData[];
}

function computeStepNumber(events: TraceEventData[], index: number): number | null {
  let step = 0;
  for (let i = 0; i <= index; i += 1) {
    if (events[i].type === "tool_call") {
      step += 1;
    }
  }
  return events[index].type === "tool_call" || events[index].type === "tool_result" || events[index].type === "tool_error"
    ? step
    : null;
}

export function TraceTimeline({ trace }: TraceTimelineProps) {
  if (trace.length === 0) {
    return (
      <EmptyState
        icon={IconTimeline}
        title="No trace events yet"
        description="Run an investigation to see the ordered operational trace of model decisions and tool calls."
      />
    );
  }

  return (
    <div className="timeline">
      {trace.map((event, index) => (
        <TraceEventRow
          key={event.id}
          event={event}
          stepNumber={computeStepNumber(trace, index)}
          isLast={index === trace.length - 1}
        />
      ))}
    </div>
  );
}
