import { useCallback, useMemo, useRef, useState } from "react";
import { Sidebar, type NavSection } from "./components/Sidebar";
import { InvestigationSummary } from "./components/InvestigationSummary";
import { TraceTimeline } from "./components/TraceTimeline";
import { EvidencePanel } from "./components/EvidencePanel";
import { ConclusionPanel } from "./components/ConclusionPanel";
import { ToolRegistry } from "./components/ToolRegistry";
import { EmptyState } from "./components/EmptyState";
import { mockInvestigation, mockTools, emptyInvestigation } from "./data/mockInvestigation";
import { IconSettings, IconInbox } from "./icons";
import type { InvestigationState } from "./types";

interface WorkspaceProps {
  investigation: InvestigationState;
  supportingIds: string[];
  highlightedId: string | null;
  onSelectEvidence: (id: string) => void;
}

function InvestigationView({ investigation, supportingIds, highlightedId, onSelectEvidence }: WorkspaceProps) {
  if (investigation.trace.length === 0) {
    return (
      <EmptyState
        icon={IconInbox}
        title="No active investigation"
        description="TraceOps runs a LangGraph-orchestrated agent loop that gathers evidence with registered tools and settles on a root-cause conclusion. Once an investigation runs, this workspace will show:"
        steps={[
          "The objective and live execution status",
          "An ordered trace of every model decision and tool call",
          "Evidence cards for each tool result, including failures",
          "A final conclusion linked back to its supporting evidence",
        ]}
      />
    );
  }

  return (
    <>
      <section aria-labelledby="trace-heading">
        <h2 id="trace-heading" className="section-title">
          Trace timeline
          <span className="section-title-count">{investigation.trace.length}</span>
        </h2>
        <TraceTimeline trace={investigation.trace} />
      </section>
      <section aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className="section-title">
          Evidence
          <span className="section-title-count">{investigation.evidence.length}</span>
        </h2>
        <EvidencePanel
          evidence={investigation.evidence}
          supportingIds={supportingIds}
          highlightedId={highlightedId}
        />
      </section>
      <section aria-labelledby="conclusion-heading">
        <h2 id="conclusion-heading" className="section-title">
          Final conclusion
        </h2>
        <ConclusionPanel finalResponse={investigation.finalResponse} onSelectEvidence={onSelectEvidence} />
      </section>
    </>
  );
}

export default function App() {
  const [section, setSection] = useState<NavSection>("investigation");
  const [useMock, setUseMock] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimeout = useRef<number | undefined>(undefined);

  const investigation = useMemo(
    () => (useMock ? mockInvestigation : emptyInvestigation),
    [useMock],
  );

  const supportingIds = investigation.finalResponse?.evidenceIds ?? [];

  const handleSelectEvidence = useCallback((id: string) => {
    setSection("evidence");
    setHighlightedId(id);
    window.clearTimeout(highlightTimeout.current);
    requestAnimationFrame(() => {
      document.getElementById(`evidence-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById(`evidence-${id}`)?.focus();
    });
    highlightTimeout.current = window.setTimeout(() => setHighlightedId(null), 2400);
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar active={section} onSelect={setSection} />
      <div className="main">
        <InvestigationSummary investigation={investigation} />
        <main className="content" id="main-content" tabIndex={-1}>
          {section === "investigation" && (
            <InvestigationView
              investigation={investigation}
              supportingIds={supportingIds}
              highlightedId={highlightedId}
              onSelectEvidence={handleSelectEvidence}
            />
          )}

          {section === "traces" && (
            <section aria-labelledby="traces-heading">
              <h2 id="traces-heading" className="section-title">
                Trace timeline
                <span className="section-title-count">{investigation.trace.length}</span>
              </h2>
              <TraceTimeline trace={investigation.trace} />
            </section>
          )}

          {section === "evidence" && (
            <section aria-labelledby="evidence-only-heading">
              <h2 id="evidence-only-heading" className="section-title">
                Evidence
                <span className="section-title-count">{investigation.evidence.length}</span>
              </h2>
              <EvidencePanel
                evidence={investigation.evidence}
                supportingIds={supportingIds}
                highlightedId={highlightedId}
              />
            </section>
          )}

          {section === "tools" && (
            <section aria-labelledby="tools-heading">
              <h2 id="tools-heading" className="section-title">
                Registered tools
                <span className="section-title-count">{mockTools.length}</span>
              </h2>
              <ToolRegistry tools={mockTools} />
            </section>
          )}

          {section === "settings" && (
            <section aria-labelledby="settings-heading">
              <h2 id="settings-heading" className="section-title">
                Settings
              </h2>
              <div className="settings-panel">
                <div className="settings-row">
                  <div className="settings-row-icon" aria-hidden="true">
                    <IconSettings />
                  </div>
                  <div className="settings-row-body">
                    <div className="settings-row-title">Sample investigation data</div>
                    <p className="settings-row-desc">
                      Toggle the demo investigation used to preview the TraceOps workspace. Turning this off shows
                      the empty state a fresh session starts from.
                    </p>
                  </div>
                  <label className="switch" htmlFor="use-mock-toggle">
                    <input
                      id="use-mock-toggle"
                      type="checkbox"
                      checked={useMock}
                      onChange={(event) => setUseMock(event.target.checked)}
                    />
                    <span className="switch-track" aria-hidden="true">
                      <span className="switch-thumb" />
                    </span>
                    <span className="sr-only">Show sample investigation data</span>
                  </label>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
