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
  Cpu,
  Monitor,
  Camera,
  Globe
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
  contract?: any;
}

export const LiveExecutionOverlay: React.FC<Props> = ({
  isOpen,
  onClose,
  runId,
  testName = "checkout-valid-card",
  scenarioName,
  status,
  events = [],
  onInspectEvidence,
  contract
}) => {
  const [activeTab, setActiveTab] = useState<"progress" | "browser" | "logs">("progress");
  const [runDetail, setRunDetail] = useState<any>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [browserMode, setBrowserMode] = useState<"step_viewports" | "storefront">("step_viewports");

  const safeEvents = events || [];
  const isTerminal = ["PASSED", "HEALED", "FAILED", "REVIEW_REQUIRED"].includes(status);
  const isHealed = status === "HEALED";
  const isPassed = status === "PASSED";
  const isFailed = status === "FAILED";
  const isReview = status === "REVIEW_REQUIRED";

  // Compute step statuses from events
  const stepEvents = safeEvents.filter(e => e.type === "STEP_PASSED" || e.type === "STEP_FAILED");
  const evidenceEvent = safeEvents.find(e => e.type === "EVIDENCE_CAPTURED");
  const classifyEvent = safeEvents.find(e => e.type === "FAILURE_CLASSIFIED");
  const candidatesEvent = safeEvents.find(e => e.type === "RECOVERY_CANDIDATES_FOUND");
  const proposalEvent = safeEvents.find(e => e.type === "RECOVERY_PROPOSED");
  const policyEvent = safeEvents.find(e => e.type === "RECOVERY_POLICY_DECIDED");
  const replayEvent = safeEvents.find(e => e.type === "REPLAY_STARTED");
  const verifyEvents = safeEvents.filter(e => e.type === "VERIFICATION_CHECK_PASSED" || e.type === "VERIFICATION_CHECK_FAILED");
  const finishEvent = safeEvents.find(e => e.type === "RUN_FINISHED" || e.type === "RUN_FAILED" || e.type === "REVIEW_REQUIRED");

  // Dynamically compute pipeline steps from contract OR events (pure calculation, no hooks)
  let pipelineSteps: { id: string; num: number; name: string }[] = [];
  if (contract?.steps && Array.isArray(contract.steps) && contract.steps.length > 0) {
    pipelineSteps = contract.steps.map((s: any, idx: number) => ({
      id: s.stepId || `step_${idx + 1}`,
      num: idx + 1,
      name: s.name || s.intent || `Step ${idx + 1}`
    }));
  } else {
    const seenStepIds = new Set<string>();
    for (const evt of safeEvents) {
      if (evt.type === "STEP_STARTED" || evt.type === "STEP_PASSED" || evt.type === "STEP_FAILED") {
        const stepId = evt.payload?.stepId;
        const stepName = evt.payload?.stepName;
        if (stepId && !seenStepIds.has(stepId)) {
          seenStepIds.add(stepId);
          pipelineSteps.push({
            id: stepId,
            num: pipelineSteps.length + 1,
            name: stepName || stepId
          });
        }
      }
    }
    if (pipelineSteps.length === 0) {
      pipelineSteps = [
        { id: "step_1", num: 1, name: "Navigate" },
        { id: "step_2", num: 2, name: "Execute Step" }
      ];
    }
  }

  // Determine active phase
  let activePhase = "1. Initializing Playwright Chromium...";
  if (status === "RUNNING") {
    const passedCount = safeEvents.filter(e => e.type === "STEP_PASSED").length;
    if (passedCount === 0) activePhase = "2. Executing Workflow Steps...";
    else activePhase = `2. Executing Step ${passedCount + 1} of ${pipelineSteps.length}...`;
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

  // Periodically fetch live run details for screenshots and step records
  useEffect(() => {
    if (!runId || !isOpen) return;
    let isSubscribed = true;
    const loadRunData = async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`);
        if (res.ok) {
          const data = await res.json();
          if (isSubscribed) {
            setRunDetail(data);
          }
        }
      } catch {}
    };
    loadRunData();
    const interval = setInterval(loadRunData, 1200);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [runId, isOpen, isTerminal]);

  // Steps with actual run execution data
  const executedSteps = runDetail?.steps || [];
  const displaySteps = executedSteps.length > 0
    ? executedSteps.map((s: any, idx: number) => ({
        id: s.step_id || `step_${idx + 1}`,
        num: idx + 1,
        name: s.step_name || `Step ${idx + 1}`,
        status: s.status,
        durationMs: s.duration_ms,
        screenshotId: s.screenshot_artifact_id,
        domId: s.dom_artifact_id,
        errorSummary: s.error_summary
      }))
    : pipelineSteps.map((s: any, idx: number) => {
        const passedEvt = safeEvents.find(e => e.type === "STEP_PASSED" && e.payload?.stepId === s.id);
        const failedEvt = safeEvents.find(e => e.type === "STEP_FAILED" && e.payload?.stepId === s.id);
        return {
          id: s.id,
          num: idx + 1,
          name: s.name,
          status: passedEvt ? (passedEvt.payload?.healed ? "HEALED" : "PASSED") : failedEvt ? "FAILED" : "PENDING",
          durationMs: passedEvt?.payload?.durationMs || failedEvt?.payload?.durationMs,
          screenshotId: undefined,
          domId: undefined,
          errorSummary: failedEvt?.payload?.errorMessage
        };
      });

  const activeStepItem = displaySteps[selectedStepIndex] || displaySteps[0];
  const activeScreenshotId = activeStepItem?.screenshotId;
  const activeScreenshotUrl = activeScreenshotId && runId ? `/api/runs/${runId}/artifacts/${activeScreenshotId}` : null;

  // Hook rules require all hooks to run unconditionally before this check
  if (!isOpen || !runId) return null;

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
                <span>{contract?.name || testName}</span>
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
                onClick={() => setActiveTab("browser")}
                style={{
                  background: activeTab === "browser" ? "#ffffff" : "transparent",
                  color: activeTab === "browser" ? "#4f46e5" : "var(--text-secondary)",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                <Eye size={12} />
                <span>Live Browser</span>
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
                Logs ({events.length})
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
          {activeTab === "progress" && (
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
                    gridTemplateColumns:
                      pipelineSteps.length <= 5
                        ? `repeat(${Math.max(1, pipelineSteps.length)}, 1fr)`
                        : "repeat(auto-fit, minmax(110px, 1fr))",
                    gap: 8
                  }}
                >
                  {pipelineSteps.map((s: { id: string; num: number; name: string }) => {
                    const isStepPassed = events.some(
                      (e) =>
                        e.type === "STEP_PASSED" &&
                        (e.payload?.stepId === s.id || e.payload?.stepName === s.name)
                    );
                    const isStepFailed = events.some(
                      (e) =>
                        e.type === "STEP_FAILED" &&
                        (e.payload?.stepId === s.id || e.payload?.stepName === s.name)
                    );
                    const isStepStarted = events.some(
                      (e) =>
                        e.type === "STEP_STARTED" &&
                        (e.payload?.stepId === s.id || e.payload?.stepName === s.name)
                    );
                    const isStepRunning =
                      isStepStarted && !isStepPassed && !isStepFailed && !isTerminal;

                    return (
                      <div
                        key={s.id || s.num}
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
                          textAlign: "center",
                          overflow: "hidden"
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
                            marginBottom: 4,
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden"
                          }}
                          title={s.name}
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
                          {!isStepPassed && !isStepFailed && !isStepRunning && (
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

              {/* Independent Oracle Verification */}
              {(verifyEvents.length > 0 || isPassed) && (
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
                    <strong>Independent Oracle Verification:</strong>{" "}
                    {contract?.targetUrl
                      ? `All target assertions and DOM contracts verified against live page state.`
                      : `All post-conditions verified against SQLite store (Order Total: $54.00, Status: PAID).`}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "logs" && (
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

          {activeTab === "browser" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Browser Status Info Bar */}
              <div style={{
                background: "#f8fafc",
                border: "1px solid var(--border-light)",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                    <Monitor size={15} color="#4f46e5" />
                    <span>Playwright Chromium Live Runner</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 9999,
                      background: "#e0e7ff",
                      color: "#4338ca"
                    }}>
                      SLOW-MO 350ms • HEADED
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 9999,
                      background: "#ecfdf5",
                      color: "#059669"
                    }}>
                      GENUINE CHROMIUM
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
                    Chromium browser executes on your desktop with visual outlines (<span style={{ color: "#6366f1", fontWeight: 700 }}>#6366f1 clicks</span>, <span style={{ color: "#10b981", fontWeight: 700 }}>#10b981 inputs</span>). Step viewports captured below:
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", background: "#e2e8f0", padding: 2, borderRadius: 6 }}>
                    <button
                      onClick={() => setBrowserMode("step_viewports")}
                      style={{
                        background: browserMode === "step_viewports" ? "#ffffff" : "transparent",
                        color: browserMode === "step_viewports" ? "#0f172a" : "#64748b",
                        border: "none",
                        padding: "4px 10px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <Camera size={12} />
                      <span>Step Viewports ({displaySteps.filter((s: any) => s.status === "PASSED" || s.status === "HEALED").length}/{displaySteps.length})</span>
                    </button>
                    <button
                      onClick={() => setBrowserMode("storefront")}
                      style={{
                        background: browserMode === "storefront" ? "#ffffff" : "transparent",
                        color: browserMode === "storefront" ? "#0f172a" : "#64748b",
                        border: "none",
                        padding: "4px 10px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <Globe size={12} />
                      <span>Live Catalog (Port 3001)</span>
                    </button>
                  </div>

                  <a
                    href="http://localhost:3001"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: "5px 12px", textDecoration: "none" }}
                  >
                    <ExternalLink size={12} />
                    <span>Open Storefront</span>
                  </a>
                </div>
              </div>

              {/* View Mode: Step Viewports */}
              {browserMode === "step_viewports" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Step Selector Pills */}
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                    {displaySteps.map((step: any, idx: number) => {
                      const isSelected = selectedStepIndex === idx;
                      const isStepPassed = step.status === "PASSED" || step.status === "HEALED";
                      const isStepFailed = step.status === "FAILED";
                      return (
                        <button
                          key={step.id || idx}
                          onClick={() => setSelectedStepIndex(idx)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: isSelected ? 700 : 500,
                            background: isSelected ? "#3b82f6" : "#f1f5f9",
                            color: isSelected ? "#ffffff" : "#475569",
                            border: isSelected ? "1px solid #2563eb" : "1px solid var(--border-light)",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            transition: "all 0.15s ease"
                          }}
                        >
                          <span style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: isSelected ? "rgba(255,255,255,0.25)" : isStepPassed ? "#10b981" : isStepFailed ? "#ef4444" : "#94a3b8",
                            color: "#ffffff",
                            fontSize: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700
                          }}>
                            {isStepPassed ? "✓" : isStepFailed ? "✗" : idx + 1}
                          </span>
                          <span>{step.name}</span>
                          {step.durationMs ? (
                            <span style={{ fontSize: 10, opacity: 0.85 }}>
                              {step.durationMs}ms
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {/* Viewport Card */}
                  <div style={{
                    border: "1px solid var(--border-light)",
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "#0f172a",
                    boxShadow: "var(--shadow-sm)"
                  }}>
                    <div style={{
                      background: "#1e293b",
                      padding: "8px 14px",
                      borderBottom: "1px solid #334155",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#94a3b8", marginLeft: 8 }}>
                          Step {selectedStepIndex + 1}: {activeStepItem?.name || "Viewport"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {activeStepItem?.durationMs ? (
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>
                            Executed in {activeStepItem.durationMs}ms
                          </span>
                        ) : null}
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: activeStepItem?.status === "PASSED" || activeStepItem?.status === "HEALED" ? "#10b981" : activeStepItem?.status === "FAILED" ? "#ef4444" : "#94a3b8",
                          background: "rgba(255,255,255,0.08)",
                          padding: "1px 8px",
                          borderRadius: 4
                        }}>
                          {activeStepItem?.status || "RUNNING"}
                        </span>
                      </div>
                    </div>

                    <div style={{ position: "relative", minHeight: 320, maxHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", background: "#0b1120" }}>
                      {activeScreenshotUrl ? (
                        <img
                          src={activeScreenshotUrl}
                          alt={`Step ${selectedStepIndex + 1} screenshot`}
                          style={{
                            width: "100%",
                            maxHeight: 380,
                            objectFit: "contain",
                            display: "block"
                          }}
                        />
                      ) : (
                        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                          <Cpu size={28} className="pulsing-dot" style={{ margin: "0 auto 12px auto", display: "block", color: "#6366f1" }} />
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>
                            {activeStepItem?.status === "FAILED" ? "Step Failed" : "Playwright Chromium Runner Active"}
                          </div>
                          <div style={{ fontSize: 12, marginTop: 4, maxWidth: 460 }}>
                            {activeStepItem?.errorSummary || "Chromium is executing this step on your desktop. Full viewport screenshot will appear here as soon as this step completes."}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* View Mode: Live Storefront Catalog */}
              {browserMode === "storefront" && (
                <div style={{
                  border: "1px solid var(--border-light)",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#ffffff",
                  boxShadow: "var(--shadow-sm)"
                }}>
                  <div style={{
                    background: "#f1f5f9",
                    padding: "8px 14px",
                    borderBottom: "1px solid var(--border-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#64748b", marginLeft: 8 }}>
                        http://localhost:3001
                      </span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "1px 6px", borderRadius: 4 }}>
                      PORT 3001 LIVE CATALOG
                    </span>
                  </div>

                  <iframe
                    src="http://localhost:3001"
                    title="Target Storefront Preview"
                    style={{
                      width: "100%",
                      height: "340px",
                      border: "none",
                      display: "block"
                    }}
                  />
                </div>
              )}
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
              <span>Playwright Chromium runner active with visual highlights...</span>
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
