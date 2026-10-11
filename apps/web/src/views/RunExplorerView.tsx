import React, { useState } from "react";
import { RunDetail } from "../types.js";
import { StatusBadge } from "../components/StatusBadge.js";

interface Props {
  runDetail: RunDetail | null;
  onRefresh: () => void;
}

export const RunExplorerView: React.FC<Props> = ({ runDetail, onRefresh }) => {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"diagnostics" | "recovery" | "verifier" | "events">("diagnostics");

  if (!runDetail) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-tertiary)" }}>
        Select a run from the Overview or Mutation Lab to inspect step evidence and recovery audit trails.
      </div>
    );
  }

  const { run, steps, events, recoveryAttempts, artifacts } = runDetail;

  // Selected step or first failed/healed step or first step
  const activeStep = steps.find(s => s.step_id === selectedStepId) ||
    steps.find(s => s.status === "FAILED" || s.status === "HEALED") ||
    steps[0];

  // Artifacts for current step
  const stepArtifacts = artifacts.filter(a => !a.step_id || a.step_id === activeStep?.step_id);
  const screenshotArtifact = stepArtifacts.find(a => a.artifact_type === "screenshot") || artifacts.find(a => a.artifact_type === "screenshot");

  // Recovery attempt for this step
  const recoveryAttempt = recoveryAttempts.find(r => r.step_id === activeStep?.step_id) || recoveryAttempts[0];

  // Failure event
  const failureEvent = events.find(e => e.type === "FAILURE_CLASSIFIED");
  const verifierEvents = events.filter(e => e.type === "VERIFICATION_CHECK_PASSED" || e.type === "VERIFICATION_CHECK_FAILED");

  return (
    <div style={{ height: "calc(100vh - 65px)", display: "flex", flexDirection: "column" }}>
      {/* Run Top Summary Bar */}
      <div style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <StatusBadge status={run.status} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
              Run ID: <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-cyan)" }}>{run.id}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {run.mutation_scenario_id ? `Mutation: ${run.mutation_scenario_id}` : "Baseline Test (Version A)"} | Started {new Date(run.started_at).toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {run.final_summary && (
            <div style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid var(--border-medium)",
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 12,
              color: run.status === "HEALED" ? "var(--accent-cyan)" : (run.status === "PASSED" ? "var(--accent-green)" : "var(--accent-rose)")
            }}>
              {run.final_summary}
            </div>
          )}

          <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      {/* 3-Pane Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "300px 1fr 420px", overflow: "hidden" }}>
        {/* Pane 1: Left Step Timeline */}
        <div style={{
          background: "var(--bg-app)",
          borderRight: "1px solid var(--border-subtle)",
          overflowY: "auto",
          padding: 16
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 12, letterSpacing: "0.05em" }}>
            Execution Step Timeline ({steps.length})
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {steps.map((step, idx) => {
              const isSelected = activeStep?.id === step.id;
              return (
                <div
                  key={step.id}
                  onClick={() => setSelectedStepId(step.step_id)}
                  style={{
                    background: isSelected ? "var(--bg-card)" : "rgba(15, 23, 42, 0.4)",
                    border: `1px solid ${isSelected ? "var(--border-active)" : "var(--border-subtle)"}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      STEP {idx + 1} (ATTEMPT {step.attempt_number})
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      {step.duration_ms}ms
                    </span>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 6 }}>
                    {step.step_name}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <StatusBadge status={step.status} />
                    {step.status === "HEALED" && (
                      <span style={{ fontSize: 10, color: "var(--accent-cyan)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                        ✨ REPLAY HEALED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pane 2: Center Evidence Viewer */}
        <div style={{
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
          overflowY: "auto",
          padding: 20,
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                Browser Evidence Capture
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Actual Playwright Chromium viewport recorded during failure / verification milestone.
              </p>
            </div>

            {screenshotArtifact && (
              <a
                href={`/api/runs/${run.id}/artifacts/${screenshotArtifact.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: 11, padding: "4px 10px" }}
              >
                Open Fullscreen PNG ↗
              </a>
            )}
          </div>

          {screenshotArtifact ? (
            <div style={{
              background: "#000",
              border: "1px solid var(--border-medium)",
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 20,
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
            }}>
              <div style={{
                background: "#1e293b",
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)"
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }}></span>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }}></span>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }}></span>
                <span style={{ marginLeft: 8 }}>http://localhost:3001/cart</span>
              </div>
              <img
                src={`/api/runs/${run.id}/artifacts/${screenshotArtifact.id}`}
                alt="Run screenshot"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          ) : (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)", marginBottom: 20 }}>
              No visual screenshot captured for this step (test passed directly without failure trigger).
            </div>
          )}

          {/* Step Failure Error Box if failed */}
          {activeStep?.error_summary && (
            <div style={{
              background: "rgba(244, 63, 94, 0.08)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              borderRadius: 8,
              padding: 14,
              marginBottom: 16
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-rose)", marginBottom: 4 }}>
                ORIGINAL STEP ERROR
              </div>
              <pre style={{ fontSize: 11, color: "#fecdd3", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {activeStep.error_summary}
              </pre>
            </div>
          )}
        </div>

        {/* Pane 3: Right Audit & Verification Panel */}
        <div style={{
          background: "var(--bg-app)",
          overflowY: "auto",
          padding: 18,
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, background: "var(--bg-surface)", padding: 4, borderRadius: 6, marginBottom: 16 }}>
            {[
              { id: "diagnostics", label: "Diagnostics" },
              { id: "recovery", label: "Recovery Audit" },
              { id: "verifier", label: "Oracle Verifier" },
              { id: "events", label: "Raw Events" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  background: activeTab === tab.id ? "var(--bg-card)" : "transparent",
                  color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
                  border: "none",
                  borderRadius: 4,
                  padding: "6px 8px",
                  fontSize: 11,
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  cursor: "pointer"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Failure Diagnostics */}
          {activeTab === "diagnostics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {failureEvent ? (
                <>
                  <div className="card">
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 4 }}>
                      Rule-First Classification
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
                      {failureEvent.payload.category}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      Confidence: {Math.round((failureEvent.payload.confidence || 0) * 100)}% | Recoverable: {failureEvent.payload.isRecoverable ? "YES (UI Drift)" : "NO (Hard Bug)"}
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 6 }}>
                      Classification Rationale
                    </div>
                    <p style={{ fontSize: 13, color: "#fff", lineHeight: 1.5 }}>
                      {failureEvent.payload.reason}
                    </p>
                  </div>

                  <div className="card">
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 6 }}>
                      Evidence Signals
                    </div>
                    <ul style={{ paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
                      {(failureEvent.payload.signals || []).map((sig: string, idx: number) => (
                        <li key={idx}>{sig}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="card" style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
                  No failure classified. Test completed without triggering diagnostic handler.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Recovery Audit */}
          {activeTab === "recovery" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {recoveryAttempt ? (
                <>
                  <div className="card" style={{ borderLeft: "3px solid var(--accent-cyan)" }}>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 4 }}>
                      Policy Gate Decision
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
                      {recoveryAttempt.policy_decision}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {recoveryAttempt.reasonCodes.map((code: string, idx: number) => (
                        <span key={idx} style={{
                          background: "#1e293b",
                          color: "var(--accent-cyan)",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontFamily: "var(--font-mono)"
                        }}>
                          ✓ {code}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 4 }}>
                      LLM Candidate Proposal
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                      Selected: <span style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>{recoveryAttempt.proposal.targetCandidateId || "NONE"}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                      {recoveryAttempt.proposal.rationale}
                    </p>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      Model: {recoveryAttempt.model_name} ({recoveryAttempt.model_latency_ms}ms)
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 6 }}>
                      Stagehand Observed Candidates ({recoveryAttempt.candidateSet.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                      {recoveryAttempt.candidateSet.map((cand: any) => (
                        <div key={cand.candidateId} style={{
                          background: "rgba(15, 23, 42, 0.6)",
                          padding: "6px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          display: "flex",
                          justifyContent: "space-between",
                          fontFamily: "var(--font-mono)"
                        }}>
                          <span style={{ color: "var(--accent-cyan)" }}>{cand.candidateId}: {cand.name || cand.role}</span>
                          <span style={{ color: cand.isUnique ? "var(--accent-green)" : "var(--accent-rose)" }}>
                            {cand.isUnique ? "UNIQUE" : "DUPLICATE"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="card" style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
                  No recovery attempt recorded for this step.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Oracle Verifier */}
          {activeTab === "verifier" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                Independent Backend Checks Evaluated:
              </div>
              {verifierEvents.map((ev, idx) => {
                const passed = ev.type === "VERIFICATION_CHECK_PASSED";
                return (
                  <div key={idx} style={{
                    background: passed ? "rgba(16, 185, 129, 0.08)" : "rgba(244, 63, 94, 0.08)",
                    border: `1px solid ${passed ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.3)"}`,
                    borderRadius: 6,
                    padding: "10px 12px",
                    fontSize: 12
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: passed ? "#34d399" : "#fb7185" }}>
                        {passed ? "✓ VERIFIED" : "✗ FAILED"}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
                        {ev.payload.checkId}
                      </span>
                    </div>
                    <div style={{ color: "#fff", marginBottom: 2 }}>{ev.payload.description}</div>
                    {ev.payload.actual !== undefined && (
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                        Expected: {JSON.stringify(ev.payload.expected)} | Actual: {JSON.stringify(ev.payload.actual)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 4: Raw Events */}
          {activeTab === "events" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 600, overflowY: "auto" }}>
              {events.map((e) => (
                <div key={e.id} style={{
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 4,
                  padding: "6px 8px",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)"
                }}>
                  <div style={{ color: "var(--accent-cyan)", display: "flex", justifyContent: "space-between" }}>
                    <span>#{e.sequenceNo} {e.type}</span>
                    <span style={{ color: "var(--text-tertiary)" }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <pre style={{ color: "var(--text-secondary)", fontSize: 10, marginTop: 4, whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
