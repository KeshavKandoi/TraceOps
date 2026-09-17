import { useMemo, useState } from "react";
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

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="section-title">
      {title}
      {count !== undefined && <span className="section-title-count">{count}</span>}
    </div>
  );
}

function InvestigationView({ investigation }: { investigation: InvestigationState }) {
  if (investigation.trace.length === 0) {
    return (
      <EmptyState
        icon={IconInbox}
        title="No active investigation"
        description="Start an investigation from the backend to see its objective, trace, evidence, and conclusion here."
      />
    );
  }

  return (
    <>
      <section>
        <SectionHeading title="Trace timeline" count={investigation.trace.length} />
        <TraceTimeline trace={investigation.trace} />
      </section>
      <section>
        <SectionHeading title="Evidence" count={investigation.evidence.length} />
        <EvidencePanel evidence={investigation.evidence} />
      </section>
      <section>
        <SectionHeading title="Final conclusion" />
        <ConclusionPanel finalResponse={investigation.finalResponse} />
      </section>
    </>
  );
}

export default function App() {
  const [section, setSection] = useState<NavSection>("investigation");
  const [useMock, setUseMock] = useState(true);

  const investigation = useMemo(
    () => (useMock ? mockInvestigation : emptyInvestigation),
    [useMock],
  );

  return (
    <div className="app-shell">
      <Sidebar active={section} onSelect={setSection} />
      <div className="main">
        <InvestigationSummary investigation={investigation} />
        <div className="content">
          {section === "investigation" && <InvestigationView investigation={investigation} />}

          {section === "traces" && (
            <section>
              <SectionHeading title="Trace timeline" count={investigation.trace.length} />
              <TraceTimeline trace={investigation.trace} />
            </section>
          )}

          {section === "evidence" && (
            <section>
              <SectionHeading title="Evidence" count={investigation.evidence.length} />
              <EvidencePanel evidence={investigation.evidence} />
            </section>
          )}

          {section === "tools" && (
            <section>
              <SectionHeading title="Registered tools" count={mockTools.length} />
              <ToolRegistry tools={mockTools} />
            </section>
          )}

          {section === "settings" && (
            <section>
              <SectionHeading title="Settings" />
              <div className="tool-card" style={{ maxWidth: 420 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
                  <IconSettings />
                  Display options
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={useMock}
                    onChange={(event) => setUseMock(event.target.checked)}
                  />
                  Show sample investigation data
                </label>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
