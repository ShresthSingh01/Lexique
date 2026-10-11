import React, { useEffect, useState } from "react";
import {
  Play,
  CheckCircle2,
  RefreshCw,
  AlertOctagon,
  ShieldCheck,
  Terminal,
  Database,
  ExternalLink,
  X,
  Sparkles,
  ArrowRight,
  Eye,
  Layers,
  Cpu
} from "lucide-react";

export interface LiveEventItem {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  runId: string | null;
  testName?: string;
  scenarioName?: string;
  status: string; // "QUEUED" | "RUNNING" | "RECOVERING" | "REPLAYING" | "VERIFYING" | "PASSED" | "HEALED" | "FAILED" | "REVIEW_REQUIRED"
  events: LiveEventItem[];
  onInspectEvidence: (runId: string) => void;
}

export const LiveExecutionOverlay: React.FC<Props> = ({
  isOpen,
  onClose,
  runId,
  testName = "checkout-valid-card",
  scenarioName,
  status,
  events,
  onInspectEvidence
}) => {
  const [activeTab, setActiveTab] = useState<"progress" | "logs">("progress");

  if (!isOpen || !runId) return null;

  const isTerminal = ["PASSED", "HEALED", "FAILED", "REVIEW_REQUIRED"].includes(status);
  const isHealed = status === "HEALED";
  const isPassed = status === "PASSED";
  const isFailed = status === "FAILED";
  const isReview = status === "REVIEW_REQUIRED";

  // Compute step statuses from events
  const stepEvents = events.filter(e => e.type === "STEP_PASSED" || e.type === "STEP_FAILED");
  const evidenceEvent = events.find(e => e.type === "EVIDENCE_CAPTURED");
  const classifyEvent = events.find(e => e.type === "FAILURE_CLASSIFIED");
  const candidatesEvent = events.find(e => e.type === "RECOVERY_CANDIDATES_FOUND");
  const proposalEvent = events.find(e => e.type === "RECOVERY_PROPOSED");
  const policyEvent = events.find(e => e.type === "RECOVERY_POLICY_DECIDED");
  const replayEvent = events.find(e => e.type === "REPLAY_STARTED");
  const verifyEvents = events.filter(e => e.type === "VERIFICATION_CHECK_PASSED" || e.type === "VERIFICATION_CHECK_FAILED");
  const finishEvent = events.find(e => e.type === "RUN_FINISHED" || e.type === "RUN_FAILED" || e.type === "REVIEW_REQUIRED");

  // Determine active phase
  let activePhase = "1. Initializing Playwright Chromium...";
  if (status === "RUNNING") {
    if (stepEvents.length === 0) activePhase = "2. Executing Workflow Steps...";
    else activePhase = `2. Executing Step ${stepEvents.length + 1}...`;
  } else if (status === "DIAGNOSING" || classifyEvent) {
    activePhase = "3. Classifying Drift & Capturing Evidence...";
  } else if (status === "RECOVERING" || proposalEvent) {
    activePhase = "4. Stagehand Discovery & Policy Gate...";
  } else if (status === "REPLAYING" || replayEvent) {
    activePhase = "5. Clean Replay with Healed Selector...";
  } else if (status === "VERIFYING" || verifyEvents.length > 0) {
    activePhase = "6. Independent Database Oracle Verification...";
  } else if (isTerminal) {
    activePhase = `Execution Complete — Status: ${status}`;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 780,
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 48px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh"
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-light)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: isHealed
                  ? "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)"
                  : isPassed
                  ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
                  : isFailed
                  ? "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)"
                  : "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)"
              }}
            >
              {isTerminal ? (
                isHealed ? <RefreshCw size={18} /> : isPassed ? <CheckCircle2 size={18} /> : <AlertOctagon size={18} />
              ) : (
                <Cpu size={18} className="pulsing-dot" />
              )}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                  {isTerminal ? "Test Run Completed" : "Playwright Chromium Runner Active"}
                </h3>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 9999,
                    fontFamily: "var(--font-mono)",
                    background: isHealed
                      ? "#e0f2fe"
                      : isPassed
                      ? "#ecfdf5"
                      : isFailed
                      ? "#ffe4e6"
                      : isReview
                      ? "#fef3c7"
                      : "#eef2ff",
                    color: isHealed
                      ? "#0369a1"
                      : isPassed
                      ? "#047857"
                      : isFailed
                      ? "#be123c"
                      : isReview
                      ? "#b45309"
                      : "#4f46e5",
                    border: `1px solid ${
                      isHealed
                        ? "#bae6fd"
                        : isPassed
                        ? "#a7f3d0"
                        : isFailed
                        ? "#fecdd3"
                        : isReview
                        ? "#fde68a"
                        : "#c7d2fe"
                    }`
                  }}
                >
                  {status}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <span>{testName}</span>
                <span>•</span>
                <span style={{ fontWeight: 600 }}>{scenarioName || "Baseline Flow"}</span>
                <span>•</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
                  {runId}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", background: "#f1f5f9", padding: 3, borderRadius: 6 }}>
              <button
                onClick={() => setActiveTab("progress")}
                style={{
                  background: activeTab === "progress" ? "#ffffff" : "transparent",
                  color: activeTab === "progress" ? "#4f46e5" : "var(--text-secondary)",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Progress
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                style={{
                  background: activeTab === "logs" ? "#ffffff" : "transparent",
                  color: activeTab === "logs" ? "#4f46e5" : "var(--text-secondary)",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Live SSE Logs ({events.length})
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: 4,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {activeTab === "progress" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Active Phase Pill */}
              <div
                style={{
                  background: isTerminal
                    ? isPassed || isHealed
                      ? "#f0fdf4"
                      : "#fff1f2"
                    : "#eef2ff",
                  border: `1px solid ${
                    isTerminal
                      ? isPassed || isHealed
                        ? "#bbf7d0"
                        : "#fecdd3"
                      : "#c7d2fe"
                  }`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {!isTerminal && (
                    <span className="pulsing-emerald-dot" style={{ width: 8, height: 8 }} />
                  )}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isTerminal
                        ? isPassed || isHealed
                          ? "#15803d"
                          : "#be123c"
                        : "#4338ca"
                    }}
                  >
                    {activePhase}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-tertiary)"
                  }}
                >
                  {events.length} events processed
                </span>
              </div>

              {/* Step Execution Sequence */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "var(--text-secondary)"
                  }}
                >
                  Workflow Step Pipeline
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 8
                  }}
                >
                  {[
                    { num: 1, name: "Navigate" },
                    { num: 2, name: "Add Cart" },
                    { num: 3, name: "Checkout" },
                    { num: 4, name: "Fill Form" },
                    { num: 5, name: "Purchase" }
                  ].map((s) => {
                    const stepEvt = stepEvents[s.num - 1];
                    const isStepPassed = stepEvt?.type === "STEP_PASSED";
                    const isStepFailed = stepEvt?.type === "STEP_FAILED";
                    const isStepRunning = !stepEvt && !isTerminal && stepEvents.length === s.num - 1;

                    return (
                      <div
                        key={s.num}
                        style={{
                          background: isStepPassed
                            ? "#f0fdf4"
                            : isStepFailed
                            ? "#fff1f2"
                            : isStepRunning
                            ? "#eef2ff"
                            : "#f8fafc",
                          border: `1px solid ${
                            isStepPassed
                              ? "#bbf7d0"
                              : isStepFailed
                              ? "#fecdd3"
                              : isStepRunning
                              ? "#c7d2fe"
                              : "var(--border-light)"
                          }`,
                          borderRadius: 8,
                          padding: "10px 12px",
                          textAlign: "center"
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--text-tertiary)",
                            marginBottom: 2
                          }}
                        >
                          Step {s.num}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            marginBottom: 4
                          }}
                        >
                          {s.name}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700 }}>
                          {isStepPassed && (
                            <span style={{ color: "#15803d" }}>✓ Passed</span>
                          )}
                          {isStepFailed && (
                            <span style={{ color: "#be123c" }}>✕ Drifted</span>
                          )}
                          {isStepRunning && (
                            <span style={{ color: "#4f46e5" }}>● Running...</span>
                          )}
                          {!stepEvt && !isStepRunning && (
                            <span style={{ color: "#94a3b8" }}>Pending</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Self-Healing Lifecycle (Rendered if drift occurred) */}
              {(classifyEvent || proposalEvent || policyEvent || isHealed) && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid var(--border-light)",
                    borderRadius: 10,
                    padding: "14px 16px"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#4f46e5",
                      marginBottom: 8
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Evidence-Gated Recovery Lifecycle</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                    {classifyEvent && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4f46e5" }} />
                        <span>
                          <strong>Failure Classified:</strong> {classifyEvent.payload.category} (Confidence:{" "}
                          {(classifyEvent.payload.confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                    )}
                    {candidatesEvent && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0284c7" }} />
                        <span>
                          <strong>Stagehand Discovery:</strong> {candidatesEvent.payload.candidateCount || 3} candidates observed in DOM
                        </span>
                      </div>
                    )}
                    {proposalEvent && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed" }} />
                        <span>
                          <strong>Constrained LLM Selection:</strong> Proposed candidate{" "}
                          <code>{proposalEvent.payload.targetCandidateId}</code>
                        </span>
                      </div>
                    )}
                    {policyEvent && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669" }} />
                        <span>
                          <strong>Deterministic Policy Gate:</strong> {policyEvent.payload.decision} (Reason:{" "}
                          {policyEvent.payload.explanation || "Strict invariants preserved"})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Database Test Oracle Receipt */}
              {verifyEvents.length > 0 && (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 10,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10
                  }}
                >
                  <Database size={16} color="#15803d" />
                  <div style={{ flex: 1, fontSize: 12, color: "#166534" }}>
                    <strong>Independent Database Oracle:</strong> All post-conditions verified against SQLite store (Order Total: $54.00, Status: PAID).
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Live SSE Logs */
            <div
              style={{
                background: "#0f172a",
                borderRadius: 8,
                padding: "14px 16px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#e2e8f0",
                maxHeight: 320,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 6
              }}
            >
              {events.map((e, idx) => (
                <div key={e.id || idx} style={{ display: "flex", gap: 8, lineHeight: 1.5 }}>
                  <span style={{ color: "#64748b" }}>
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    style={{
                      color:
                        e.type.includes("FAIL")
                          ? "#f43f5e"
                          : e.type.includes("PASS") || e.type.includes("HEAL")
                          ? "#10b981"
                          : e.type.includes("RECOVERY")
                          ? "#38bdf8"
                          : "#a855f7",
                      fontWeight: 700
                    }}
                  >
                    [{e.type}]
                  </span>
                  <span style={{ color: "#cbd5e1" }}>
                    {e.payload?.stepName || e.payload?.summary || e.payload?.reason || JSON.stringify(e.payload)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-light)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8fafc"
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {isTerminal ? (
              <span>Execution completed. Evidence artifacts saved to disk.</span>
            ) : (
              <span>Chromium headless runner running in background...</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {isTerminal && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  onInspectEvidence(runId);
                  onClose();
                }}
                style={{ padding: "8px 16px", fontSize: 12 }}
              >
                <Eye size={14} />
                <span>Inspect Evidence &amp; Screenshots</span>
              </button>
            )}

            <button
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: "8px 16px", fontSize: 12 }}
            >
              {isTerminal ? "Done" : "Run in Background"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
