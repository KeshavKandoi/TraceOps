import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar, type NavSection } from "./components/Sidebar";
import { InvestigationSummary } from "./components/InvestigationSummary";
import { TraceTimeline } from "./components/TraceTimeline";
import { EvidencePanel } from "./components/EvidencePanel";
import { ConclusionPanel } from "./components/ConclusionPanel";
import { ToolRegistry } from "./components/ToolRegistry";
import { EmptyState } from "./components/EmptyState";
import { fetchScenarios, fetchTools, runInvestigationRequest, type DemoScenario, type ModelMode } from "./api";
import { IconSettings, IconInbox, IconTarget } from "./icons";
import type { InvestigationState, ToolMeta } from "./types";

const emptyInvestigation: InvestigationState = {
  objective: "",
  status: "idle",
  stepCount: 0,
  maxSteps: 8,
  evidence: [],
  trace: [],
  finalResponse: null,
  stopReason: null,
};

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
  const [investigation, setInvestigation] = useState<InvestigationState>(emptyInvestigation);
  const [tools, setTools] = useState<ToolMeta[]>([]);
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario["id"]>("success");
  const [modelMode, setModelMode] = useState<ModelMode>("offline");
  const [objective, setObjective] = useState("");
  const [maxSteps, setMaxSteps] = useState(8);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchScenarios(), fetchTools()])
      .then(([scenarioData, toolData]) => {
        if (cancelled) return;
        setScenarios(scenarioData);
        setTools(toolData);
        const firstScenario = scenarioData[0];
        if (firstScenario) {
          setSelectedScenario(firstScenario.id);
          setObjective(firstScenario.objective);
          setMaxSteps(firstScenario.maxSteps);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to reach the TraceOps API.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedScenarioData = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenario),
    [scenarios, selectedScenario],
  );

  const supportingIds = investigation.finalResponse?.evidenceIds ?? [];

  const handleScenarioChange = useCallback(
    (scenarioId: DemoScenario["id"]) => {
      const scenario = scenarios.find((entry) => entry.id === scenarioId);
      setSelectedScenario(scenarioId);
      if (scenario) {
        setObjective(scenario.objective);
        setMaxSteps(scenario.maxSteps);
      }
    },
    [scenarios],
  );

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setErrorMessage(null);
    setInvestigation({
      ...emptyInvestigation,
      objective,
      maxSteps,
      status: "running",
    });

    try {
      const result = await runInvestigationRequest({
        objective,
        scenario: selectedScenario,
        maxSteps,
        model: modelMode,
      });
      setInvestigation(result);
      setSection("investigation");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Investigation failed.");
      setInvestigation((current) => ({
        ...current,
        status: "failed",
      }));
    } finally {
      setIsRunning(false);
    }
  }, [maxSteps, modelMode, objective, selectedScenario]);

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
        <InvestigationSummary
          investigation={investigation}
          scenarioSelector={
            <form
              className="run-panel"
              onSubmit={(event) => {
                event.preventDefault();
                void handleRun();
              }}
            >
              <label className="run-field run-field-objective">
                <span>Objective</span>
                <input
                  value={objective}
                  onChange={(event) => setObjective(event.target.value)}
                  placeholder="Investigate elevated payment errors"
                  disabled={isRunning}
                />
              </label>
              <div className="run-field">
                <span>Model</span>
                <div className="model-switch" role="group" aria-label="Model">
                  <button
                    type="button"
                    className="model-switch-option"
                    aria-pressed={modelMode === "offline"}
                    disabled={isRunning}
                    onClick={() => setModelMode("offline")}
                  >
                    Offline
                  </button>
                  <button
                    type="button"
                    className="model-switch-option"
                    aria-pressed={modelMode === "gemini"}
                    disabled={isRunning}
                    onClick={() => setModelMode("gemini")}
                  >
                    Gemini Live
                  </button>
                </div>
              </div>
              <label className="run-field">
                <span>Scenario</span>
                <select
                  value={selectedScenario}
                  onChange={(event) => handleScenarioChange(event.target.value as DemoScenario["id"])}
                  disabled={isRunning || scenarios.length === 0}
                >
                  {scenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="run-field run-field-steps">
                <span>Max steps</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxSteps}
                  onChange={(event) => setMaxSteps(Number(event.target.value))}
                  disabled={isRunning}
                />
              </label>
              <button className="run-button" type="submit" disabled={isRunning || objective.trim().length === 0}>
                <IconTarget aria-hidden="true" />
                {isRunning ? "Running" : "Run"}
              </button>
            </form>
          }
        />
        <main className="content" id="main-content" tabIndex={-1}>
          {errorMessage && (
            <div className="error-banner" role="alert">
              {errorMessage}
            </div>
          )}

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
                <span className="section-title-count">{tools.length}</span>
              </h2>
              <ToolRegistry tools={tools} />
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
                    <div className="settings-row-title">Model: Offline or Gemini Live</div>
                    <p className="settings-row-desc">
                      Offline runs the real LangGraph agent loop against a deterministic scripted scenario, with no
                      network calls. Gemini Live runs the same loop against the real Gemini model on the server; the
                      API key is never exposed to the browser.
                    </p>
                    {selectedScenarioData && (
                      <p className="settings-row-desc settings-row-desc-extra">
                        Current scenario: {selectedScenarioData.label}, default budget {selectedScenarioData.maxSteps}.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
