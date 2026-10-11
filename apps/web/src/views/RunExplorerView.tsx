import React, { useEffect, useState } from "react";
import { RunDetail } from "../types.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { commitHeal, submitHumanReview } from "../api.js";
import {
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  ExternalLink,
  Database,
  ArrowRight,
  FileCode2,
  Terminal,
  Activity,
  Layers,
  UserRoundCheck,
  XCircle,
  MessageSquareText,
  GitCompare,
  Eye
} from "lucide-react";
import { VersionSplitView } from "../components/shared/VersionSplitView.js";

interface Props {
  runDetail: RunDetail | null;
  onRefresh: () => void;
  onRunBaseline?: () => void;
  onOpenRun?: (runId: string) => void;
  isRunning?: boolean;
}

export const RunExplorerView: React.FC<Props> = ({
  runDetail,
  onRefresh,
  onRunBaseline,
  onOpenRun,
  isRunning = false
}) => {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"diagnostics" | "split" | "recovery" | "verifier" | "events">("diagnostics");
  const [centerViewMode, setCenterViewMode] = useState<"split" | "viewport">("split");
  const [committing, setCommitting] = useState(false);
  const [commitStatus, setCommitStatus] = useState<string | null>(null);
  const [reviewCandidateId, setReviewCandidateId] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedStepId(null);
    setReviewCandidateId("");
    setReviewNote("");
    setReviewMessage(null);
  }, [runDetail?.run.id]);

  useEffect(() => {
    if (runDetail?.run.status === "REVIEW_REQUIRED") setActiveTab("diagnostics");
  }, [runDetail?.run.id, runDetail?.run.status]);

  if (!runDetail) {
    return (
      <div style={{ maxWidth: 900, margin: "60px auto", padding: "40px 24px", textAlign: "center" }}>
        <div className="icon-pod icon-pod-indigo" style={{ width: 48, height: 48, margin: "0 auto 16px auto" }}>
          <Activity size={24} color="#4f46e5" />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
          No Active Test Run Selected
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto 24px auto", lineHeight: 1.6 }}>
          Select a test execution from the Runs table, or launch a baseline run to inspect viewport screenshots, candidate sets, and database verification results.
        </p>
        {onRunBaseline && (
          <button className="btn btn-primary" onClick={onRunBaseline} disabled={isRunning} style={{ padding: "10px 22px" }}>
            <RefreshCw size={14} className={isRunning ? "pulsing-dot" : ""} />
            <span>{isRunning ? "Executing Playwright..." : "Run Baseline Suite"}</span>
          </button>
        )}
      </div>
    );
  }

  const { run, steps, events, recoveryAttempts, artifacts } = runDetail;

  // Selected step or first failed/healed step or first step
  const activeStep = steps.find(s => s.id === selectedStepId) ||
    steps.find(s => s.status === "FAILED" || s.status === "HEALED") ||
    (run.status === "FAILED" ? steps[steps.length - 1] : steps[0]);

  // Artifacts for current step
  const stepArtifacts = artifacts
    .filter(a =>
      a.step_id === activeStep?.step_id &&
      (a.attempt_number ?? 1) === activeStep?.attempt_number
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const screenshotArtifact = stepArtifacts.find(a => a.artifact_type === "screenshot");
  const domArtifact = stepArtifacts.find(a => a.artifact_type === "dom_snapshot");

  // Recovery attempt for this step
  const recoveryAttempt = recoveryAttempts.find(r => r.step_id === activeStep?.step_id);
  const reviewCandidates = recoveryAttempt?.candidateSet || [];
  const selectedReviewCandidateId = reviewCandidateId ||
    recoveryAttempt?.proposal?.targetCandidateId ||
    reviewCandidates[0]?.candidateId ||
    "";
  const humanReviews = runDetail.humanReviews || [];
  const approvedRetryExists = humanReviews.some(review => review.decision === "APPROVE_RETRY");

  // Find chosen candidate and healed selector
  const chosenCandidate = recoveryAttempt?.candidateSet?.find(
    (c: any) => c.candidateId === recoveryAttempt?.proposal?.targetCandidateId
  );
  const healedSelector = chosenCandidate?.selector || recoveryAttempt?.proposal?.targetCandidateId;

  const handleCommitHeal = async () => {
    if (!recoveryAttempt?.step_id || !healedSelector) return;
    setCommitting(true);
    try {
      const res = await commitHeal(run.test_id, recoveryAttempt.step_id, healedSelector, run.id);
      setCommitStatus(`Contract successfully updated to v${res.newContractVersion} with healed locator '${healedSelector}'!`);
      onRefresh();
    } catch (err: any) {
      setCommitStatus(`Failed to commit healed locator: ${err.message}`);
    } finally {
      setCommitting(false);
    }
  };

  const handleHumanReview = async (decision: "approve_retry" | "reject" | "clarification") => {
    if (decision === "clarification" && !reviewNote.trim()) {
      setReviewMessage("Add a note describing what needs clarification.");
      return;
    }
    if (decision === "approve_retry" && !selectedReviewCandidateId) {
      setReviewMessage("Select an observed candidate before approving a retry.");
      return;
    }
    setReviewSubmitting(true);
    setReviewMessage(null);
    try {
      const result = await submitHumanReview(run.id, {
        decision,
        candidateId: decision === "approve_retry" ? selectedReviewCandidateId : undefined,
        note: reviewNote.trim()
      });
      setReviewNote("");
      setReviewMessage(result.message);
      await onRefresh();
      if (result.childRunId) onOpenRun?.(result.childRunId);
    } catch (error: any) {
      setReviewMessage(`Could not submit review: ${error.message}`);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Failure and verifier events
  const failureEvent = events.find(e => e.type === "FAILURE_CLASSIFIED");
  const verifierEvents = events.filter(e => e.type === "VERIFICATION_CHECK_PASSED" || e.type === "VERIFICATION_CHECK_FAILED");
  const failedVerifierEvents = verifierEvents.filter(e => e.type === "VERIFICATION_CHECK_FAILED");
  const verificationStarted = events.some(e => e.type === "VERIFICATION_STARTED");
  const recoveryStarted = events.find(e => e.type === "RECOVERY_STARTED");
  const candidateEvidence = [...events].reverse().find(e =>
    e.type === "RECOVERY_CANDIDATES_FOUND" && e.payload.stepId === activeStep?.step_id
  );
  const candidateSimilarityById = new Map<string, number>(
    (candidateEvidence?.payload.candidates || []).map((candidate: any) => [candidate.id, candidate.similarity])
  );
  const evidenceEvent = [...events].reverse().find(e =>
    e.type === "EVIDENCE_CAPTURED" && e.payload.stepId === activeStep?.step_id
  );

  return (
    <div style={{ height: "calc(100vh - 65px)", display: "flex", flexDirection: "column" }}>
      {/* Top Run Header Bar */}
      <div style={{
        background: "#ffffff",
        borderBottom: "1px solid var(--border-light)",
        padding: "14px 28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "var(--shadow-sm)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <StatusBadge status={run.status} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
              Run ID: <span style={{ fontFamily: "var(--font-mono)", color: "#4f46e5" }}>{run.id}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {run.mutation_scenario_id ? `Mutation Scenario: ${run.mutation_scenario_id}` : "Baseline Test (Canonical Contract)"} • Started {new Date(run.started_at).toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {run.final_summary && (
            <div style={{
              background: "#f8fafc",
              border: "1px solid var(--border-light)",
              padding: "5px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: run.status === "HEALED" ? "#059669" : (run.status === "PASSED" ? "#2563eb" : "#e11d48")
            }}>
              {run.final_summary}
            </div>
          )}

          <button className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={onRefresh}>
            <RefreshCw size={13} color="#4f46e5" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* 3-Pane Evidence Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "310px 1fr 430px", overflow: "hidden" }}>
        {/* Pane 1: Left Step Execution Timeline */}
        <div style={{
          background: "#ffffff",
          borderRight: "1px solid var(--border-light)",
          overflowY: "auto",
          padding: 16
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#4f46e5",
            textTransform: "uppercase",
            marginBottom: 12,
            letterSpacing: "0.05em",
            fontFamily: "var(--font-mono)"
          }}>
            Execution Steps ({steps.length})
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {steps.map((step, idx) => {
              const isSelected = activeStep?.id === step.id;
              return (
                <div
                  key={step.id}
                  onClick={() => setSelectedStepId(step.id)}
                  style={{
                    background: isSelected ? "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)" : "#f8fafc",
                    border: isSelected ? "1px solid #c7d2fe" : "1px solid var(--border-light)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                    boxShadow: isSelected ? "0 2px 6px rgba(79, 70, 229, 0.1)" : "none"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: isSelected ? "#4f46e5" : "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                      STEP {idx + 1}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {step.duration_ms}ms
                    </span>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                    {step.step_name}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <StatusBadge status={step.status} />
                    {step.status === "HEALED" && (
                      <span style={{ fontSize: 10, color: "#059669", fontWeight: 800, fontFamily: "var(--font-mono)" }}>
                        ✨ REPLAY HEALED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pane 2: Center Evidence & Screenshot Viewer */}
        <div style={{
          background: "var(--bg-app)",
          borderRight: "1px solid var(--border-light)",
          overflowY: "auto",
          padding: 22,
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Autonomous Healed Banner */}
          {(run.status === "HEALED" || activeStep?.status === "HEALED") && healedSelector && (
            <div style={{
              background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
              border: "1px solid #6ee7b7",
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 20,
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.15)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    background: "#059669",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    padding: "3px 8px",
                    borderRadius: 4,
                    letterSpacing: "0.04em"
                  }}>
                    ✨ AUTONOMOUS RECOVERY
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#065f46" }}>
                    Healed Selector Discovered & Validated
                  </span>
                </div>

                {!commitStatus && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCommitHeal}
                    disabled={committing}
                    style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700 }}
                  >
                    {committing ? "Updating Contract..." : `Commit to Contract v${run.contract_version + 1} ↗`}
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12, marginBottom: commitStatus ? 10 : 0 }}>
                <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: 6, border: "1px solid #a7f3d0" }}>
                  <span style={{ color: "#065f46", textTransform: "uppercase", fontSize: 10, display: "block", marginBottom: 4, fontWeight: 700 }}>
                    Original Target (Drifted):
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "#e11d48", fontWeight: 700, wordBreak: "break-all" }}>
                    {activeStep?.step_name || "Target Step"}
                  </span>
                </div>
                <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: 6, border: "1px solid #a7f3d0" }}>
                  <span style={{ color: "#065f46", textTransform: "uppercase", fontSize: 10, display: "block", marginBottom: 4, fontWeight: 700 }}>
                    Healed Locator (Passed Clean Replay):
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "#059669", fontWeight: 800, wordBreak: "break-all" }}>
                    {healedSelector}
                  </span>
                </div>
              </div>

              {commitStatus && (
                <div style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  background: "#ffffff",
                  border: "1px solid #059669",
                  borderRadius: 6,
                  color: "#059669",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}>
                  <CheckCircle2 size={16} />
                  <span>{commitStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* Screenshot Evidence / Split View Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                {centerViewMode === "split" ? "Version A vs Version B Visual Markup" : "Playwright Viewport Evidence Capture"}
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {centerViewMode === "split"
                  ? "Side-by-side comparative split with marked up changes and invariant verification."
                  : "Real browser viewport captured for this Playwright step attempt."}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* View Mode Toggle */}
              <div style={{ display: "flex", gap: 3, background: "#f1f5f9", padding: 3, borderRadius: 8 }}>
                <button
                  type="button"
                  onClick={() => setCenterViewMode("split")}
                  style={{
                    background: centerViewMode === "split" ? "#ffffff" : "transparent",
                    color: centerViewMode === "split" ? "#4f46e5" : "var(--text-secondary)",
                    border: "none",
                    borderRadius: 6,
                    padding: "5px 10px",
                    fontSize: 11,
                    fontWeight: centerViewMode === "split" ? 700 : 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    boxShadow: centerViewMode === "split" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"
                  }}
                >
                  <GitCompare size={12} />
                  <span>A/B Split Markup</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCenterViewMode("viewport")}
                  style={{
                    background: centerViewMode === "viewport" ? "#ffffff" : "transparent",
                    color: centerViewMode === "viewport" ? "#4f46e5" : "var(--text-secondary)",
                    border: "none",
                    borderRadius: 6,
                    padding: "5px 10px",
                    fontSize: 11,
                    fontWeight: centerViewMode === "viewport" ? 700 : 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    boxShadow: centerViewMode === "viewport" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"
                  }}
                >
                  <Eye size={12} />
                  <span>Viewport Evidence</span>
                </button>
              </div>

              {domArtifact && (
                <a
                  href={`/api/runs/${run.id}/artifacts/${domArtifact.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: 11, padding: "5px 10px" }}
                >
                  <FileCode2 size={12} color="#4f46e5" />
                  <span>DOM</span>
                </a>
              )}
              {screenshotArtifact && (
                <a
                  href={`/api/runs/${run.id}/artifacts/${screenshotArtifact.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: 11, padding: "5px 10px" }}
                >
                  <ExternalLink size={12} color="#4f46e5" />
                  <span>PNG</span>
                </a>
              )}
            </div>
          </div>

          {/* Conditional Center Content: Split Markup vs Viewport Screenshot */}
          {centerViewMode === "split" ? (
            <VersionSplitView
              scenarioId={run.mutation_scenario_id}
              activeStepName={activeStep?.step_name}
              originalLocator={activeStep?.step_name}
              healedLocator={healedSelector}
              screenshotUrl={screenshotArtifact ? `/api/runs/${run.id}/artifacts/${screenshotArtifact.id}` : undefined}
              runStatus={run.status}
              onOpenScreenshot={() => setCenterViewMode("viewport")}
            />
          ) : (
            <>
              {screenshotArtifact ? (
                <div className="card-clean" style={{ overflow: "hidden", marginBottom: 20 }}>
                  <div style={{
                    background: "#f8fafc",
                    borderBottom: "1px solid var(--border-light)",
                    padding: "8px 14px",
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
                    <span style={{ marginLeft: 6, color: "#4f46e5", fontWeight: 600 }}>
                      Playwright Chromium • {activeStep?.step_name || "No step selected"} • Attempt {activeStep?.attempt_number || 1}
                    </span>
                  </div>
                  <img
                    src={`/api/runs/${run.id}/artifacts/${screenshotArtifact.id}`}
                    alt="Playwright viewport capture"
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              ) : (
                <div className="card-clean" style={{ padding: 48, textAlign: "center", color: "var(--text-tertiary)", marginBottom: 20 }}>
                  {evidenceEvent?.payload.captureFailed
                    ? (evidenceEvent.payload.captureErrors || []).join("; ") || "Evidence capture failed for this attempt. Check the run events for artifact recorder details."
                    : `No screenshot was recorded for ${activeStep?.step_name || "this step"} in this run. Earlier runs do not create retroactive evidence.`}
                </div>
              )}

              {/* Real Playwright Error Summary Box */}
              {activeStep?.error_summary && (
                <div style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 16
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#e11d48", marginBottom: 6, letterSpacing: "0.05em", fontFamily: "var(--font-mono)" }}>
                    PLAYWRIGHT EXCEPTION STACK TRACE
                  </div>
                  <pre style={{ fontSize: 11, color: "#be123c", whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "var(--font-mono)" }}>
                    {activeStep.error_summary}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pane 3: Right Audit & Verification Panel */}
        <div style={{
          background: "#ffffff",
          overflowY: "auto",
          padding: 18,
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Segmented Audit Tabs */}
          <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 3, borderRadius: 8, marginBottom: 16 }}>
            {[
              { id: "diagnostics", label: "Diagnostics" },
              { id: "split", label: "A/B Diff" },
              { id: "recovery", label: "Recovery Audit" },
              { id: "verifier", label: "Oracle Verifier" },
              { id: "events", label: "Raw Events" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  background: activeTab === tab.id ? "#ffffff" : "transparent",
                  color: activeTab === tab.id ? "#4f46e5" : "var(--text-secondary)",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 8px",
                  fontSize: 11,
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  cursor: "pointer",
                  boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.12s ease"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Failure Diagnostics */}
          {activeTab === "diagnostics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {run.status === "REVIEW_REQUIRED" && (
                <div className="card-clean" style={{ padding: 14, borderLeft: "4px solid #d97706", background: "#fffbeb" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#92400e", fontWeight: 800, marginBottom: 6 }}>
                    <UserRoundCheck size={16} />
                    Human review required
                  </div>
                  <p style={{ fontSize: 12, color: "#78350f", lineHeight: 1.5, marginBottom: 10 }}>
                    Automation stopped safely because no candidate met policy or the observed target was ambiguous. Review the captured candidate evidence below. Approval queues a linked retry; it does not mark this run healed or bypass fresh candidate checks and the original contract verifier.
                  </p>
                  {reviewCandidates.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                      {reviewCandidates.map((candidate: any) => (
                        <label key={candidate.candidateId} style={{
                          display: "grid",
                          gridTemplateColumns: "18px 1fr",
                          gap: 8,
                          alignItems: "start",
                          padding: 8,
                          background: "#fff",
                          border: `1px solid ${selectedReviewCandidateId === candidate.candidateId ? "#f59e0b" : "#e5e7eb"}`,
                          borderRadius: 6,
                          cursor: "pointer"
                        }}>
                          <input
                            type="radio"
                            name={`review-candidate-${run.id}`}
                            value={candidate.candidateId}
                            checked={selectedReviewCandidateId === candidate.candidateId}
                            onChange={() => setReviewCandidateId(candidate.candidateId)}
                            style={{ marginTop: 2, accentColor: "#d97706" }}
                          />
                          <span>
                            <strong style={{ fontSize: 12, color: "#111827" }}>{candidate.name || candidate.role || candidate.candidateId}</strong>
                            <span style={{ display: "block", fontSize: 10, color: "#475569", marginTop: 2 }}>
                              {candidate.candidateId} · {candidate.role || "unknown role"} · {candidate.isVisible ? "visible" : "hidden"} · {candidate.isEnabled ? "enabled" : "disabled"} · {candidate.isUnique ? "unique" : "ambiguous"}
                            </span>
                            {candidateSimilarityById.has(candidate.candidateId) && (
                              <span style={{ display: "block", fontSize: 10, color: "#92400e", marginTop: 2 }}>
                                Semantic similarity: {candidateSimilarityById.get(candidate.candidateId)?.toFixed(4)} · automatic threshold: {candidateEvidence?.payload.minimumSimilarity?.toFixed(2)}
                              </span>
                            )}
                            {candidate.selector && (
                              <code style={{ display: "block", fontSize: 10, color: "#64748b", marginTop: 3, overflowWrap: "anywhere" }}>
                                {candidate.selector}
                              </code>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: "#78350f", marginBottom: 10 }}>
                      No recovery candidates were captured for this run. You can reject the proposal or record what needs clarification; an approval retry is unavailable.
                    </p>
                  )}
                  <textarea
                    value={reviewNote}
                    onChange={event => setReviewNote(event.target.value)}
                    placeholder="Optional review note; required for clarification"
                    rows={2}
                    maxLength={2000}
                    style={{ width: "100%", resize: "vertical", padding: 8, border: "1px solid #fcd34d", borderRadius: 6, font: "inherit", fontSize: 12, marginBottom: 8 }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <button
                      className="btn btn-primary"
                      disabled={reviewSubmitting || approvedRetryExists || reviewCandidates.length === 0 || !reviewCandidates.some((candidate: any) => candidate.candidateId === selectedReviewCandidateId && candidate.isVisible && candidate.isEnabled && candidate.isUnique)}
                      onClick={() => handleHumanReview("approve_retry")}
                      style={{ padding: "6px 9px", fontSize: 11 }}
                    >
                      <UserRoundCheck size={13} />
                      Approve safe retry
                    </button>
                    <button className="btn btn-secondary" disabled={reviewSubmitting || approvedRetryExists} onClick={() => handleHumanReview("reject")} style={{ padding: "6px 9px", fontSize: 11 }}>
                      <XCircle size={13} />
                      Reject
                    </button>
                    <button className="btn btn-secondary" disabled={reviewSubmitting || approvedRetryExists} onClick={() => handleHumanReview("clarification")} style={{ padding: "6px 9px", fontSize: 11 }}>
                      <MessageSquareText size={13} />
                      Request clarification
                    </button>
                  </div>
                  {approvedRetryExists && (
                    <p style={{ fontSize: 11, color: "#92400e", marginTop: 8 }}>
                      A retry was already approved for this run. Review decision history remains available below.
                    </p>
                  )}
                  {reviewMessage && <p role="status" style={{ fontSize: 11, color: "#78350f", marginTop: 8 }}>{reviewMessage}</p>}
                  {humanReviews.length > 0 && (
                    <div style={{ borderTop: "1px solid #fde68a", marginTop: 10, paddingTop: 8 }}>
                      <strong style={{ fontSize: 11, color: "#78350f" }}>Review history</strong>
                      {humanReviews.map(review => (
                        <div key={review.id} style={{ fontSize: 10, color: "#78350f", marginTop: 5 }}>
                          {review.decision.replaceAll("_", " ")} · {new Date(review.created_at).toLocaleString()}
                          {review.note ? ` — ${review.note}` : ""}
                          {review.child_run_id && (
                            <button
                              onClick={() => onOpenRun?.(review.child_run_id!)}
                              style={{ display: "block", border: 0, padding: 0, background: "none", color: "#4f46e5", cursor: "pointer", font: "inherit", textDecoration: "underline" }}
                            >
                              Open retry run {review.child_run_id}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {failureEvent ? (
                <>
                  <div className="card-clean" style={{ padding: 14, borderLeft: "4px solid #4f46e5" }}>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 4, fontWeight: 700, letterSpacing: "0.05em" }}>
                      Failure Classifier Category
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#4f46e5", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
                      {failureEvent.payload.category}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      Confidence: {Math.round((failureEvent.payload.confidence || 0) * 100)}% • Recoverable: {failureEvent.payload.isRecoverable ? "YES (Benign Drift)" : "NO (True Regression)"}
                    </div>
                  </div>

                  <div className="card-clean" style={{ padding: 14 }}>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 6, fontWeight: 700, letterSpacing: "0.05em" }}>
                      Classification Rationale
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
                      {failureEvent.payload.reason}
                    </p>
                  </div>

                  <div className="card-clean" style={{ padding: 14 }}>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 6, fontWeight: 700, letterSpacing: "0.05em" }}>
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
                <div className="card-clean" style={{ padding: 16, borderLeft: `4px solid ${run.status === "FAILED" ? "#e11d48" : "#2563eb"}` }}>
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 6, fontWeight: 700, letterSpacing: "0.05em" }}>
                    {run.status === "FAILED" ? "Run failed" : "No classified step failure"}
                  </div>
                  {run.error_code && (
                    <div style={{ fontSize: 12, color: "#be123c", fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 6 }}>
                      {run.error_code}
                    </div>
                  )}
                  <p style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5 }}>
                    {run.final_summary || activeStep?.error_summary || (run.status === "FAILED"
                      ? "The run failed without a persisted summary. Inspect Raw Events and the failed step evidence."
                      : "No step failure was classified for this run.")}
                  </p>
                  {failedVerifierEvents.length > 0 && (
                    <ul style={{ paddingLeft: 18, marginTop: 10, fontSize: 12, color: "#be123c", display: "flex", flexDirection: "column", gap: 5 }}>
                      {failedVerifierEvents.map((event) => (
                        <li key={event.id}>{event.payload.description}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab: A/B Split Markup Quick Panel */}
          {activeTab === "split" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="card-clean" style={{ padding: 14, borderLeft: "4px solid #4f46e5" }}>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 4, fontWeight: 700, letterSpacing: "0.05em" }}>
                  A/B Comparative Mode
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#4f46e5", marginBottom: 6 }}>
                  {run.mutation_scenario_id || "Baseline Canonical Workflow"}
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                  Detailed side-by-side visual comparison, DOM tree diff, and attribute markup are active in the center viewport.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: 12, width: "100%", padding: "7px 12px", fontSize: 11 }}
                  onClick={() => setCenterViewMode("split")}
                >
                  <GitCompare size={12} />
                  <span>Show Full Split View in Center</span>
                </button>
              </div>

              <div className="card-clean" style={{ padding: 14 }}>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 8, fontWeight: 700, letterSpacing: "0.05em" }}>
                  Active Contract Invariants
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Base Contract:</span>
                    <strong style={{ color: "#2563eb" }}>Version A (v{run.contract_version})</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Observed Run:</span>
                    <strong style={{ color: run.status === "HEALED" ? "#059669" : (run.status === "FAILED" ? "#e11d48" : "#d97706") }}>
                      Version B ({run.status})
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Target Locator:</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-primary)" }}>
                      {activeStep?.step_name || "Checkout Button"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Healed Locator:</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#059669", fontWeight: 700 }}>
                      {healedSelector || "None"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Recovery Audit */}
          {activeTab === "recovery" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {recoveryAttempt ? (
                <>
                  <div className="card-clean" style={{ padding: 14, borderLeft: "4px solid #059669" }}>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 4, fontWeight: 700, letterSpacing: "0.05em" }}>
                      Policy Gate Decision
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#059669", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
                      {recoveryAttempt.policy_decision}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {recoveryAttempt.reasonCodes.map((code: string, idx: number) => (
                        <span key={idx} style={{
                          background: "#ecfdf5",
                          color: "#047857",
                          border: "1px solid #a7f3d0",
                          padding: "2px 7px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)"
                        }}>
                          ✓ {code}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="card-clean" style={{ padding: 14 }}>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 4, fontWeight: 700, letterSpacing: "0.05em" }}>
                      LLM Candidate Proposal
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                      Selected: <span style={{ color: "#4f46e5", fontFamily: "var(--font-mono)" }}>{recoveryAttempt.proposal.targetCandidateId || "NONE"}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.5 }}>
                      {recoveryAttempt.proposal.rationale}
                    </p>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                      Model: {recoveryAttempt.model_name} ({recoveryAttempt.model_latency_ms}ms)
                    </div>
                  </div>

                  <div className="card-clean" style={{ padding: 14 }}>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 6, fontWeight: 700, letterSpacing: "0.05em" }}>
                      Stagehand Observed Candidates ({recoveryAttempt.candidateSet.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                      {recoveryAttempt.candidateSet.map((cand: any) => (
                        <div key={cand.candidateId} style={{
                          background: "#f8fafc",
                          border: "1px solid var(--border-light)",
                          padding: "6px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          display: "flex",
                          justifyContent: "space-between",
                          fontFamily: "var(--font-mono)"
                        }}>
                          <span style={{ color: "#0f172a", fontWeight: 600 }}>{cand.candidateId}: {cand.name || cand.role}</span>
                          <span style={{ color: cand.isUnique ? "#059669" : "#e11d48", fontWeight: 700 }}>
                            {cand.isUnique ? "UNIQUE" : "DUPLICATE"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="card-clean" style={{ padding: 24, textAlign: "center", color: "var(--text-tertiary)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>
                    {recoveryStarted ? "Recovery started, but no policy attempt was persisted." : "No recovery attempt was recorded."}
                  </div>
                  <p style={{ fontSize: 12, lineHeight: 1.5 }}>
                    {recoveryStarted
                      ? recoveryStarted.payload.intent || recoveryStarted.payload.reason || "Inspect Raw Events for the last recorded recovery phase."
                      : failedVerifierEvents.length > 0
                        ? `The workflow reached verification; locator recovery was not needed. The oracle reported: ${failedVerifierEvents.map(event => event.payload.description).join("; ")}`
                        : failureEvent?.payload.reason || run.final_summary || "No failed locator or recovery event was recorded for this run."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Oracle Verifier */}
          {activeTab === "verifier" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 2 }}>
                Independent Backend Checks Evaluated:
              </div>
              {verifierEvents.length === 0 ? (
                <div className="card-clean" style={{ padding: 20, textAlign: "center", color: "var(--text-tertiary)" }}>
                  {verificationStarted
                    ? "Oracle verification started, but no check results were persisted. Inspect Raw Events for the run outcome."
                    : ["FAILED", "REVIEW_REQUIRED"].includes(run.status)
                      ? run.final_summary || run.error_code || "The run ended before oracle checks were recorded."
                      : "Oracle verification has not started for this run yet."}
                </div>
              ) : (
                verifierEvents.map((ev, idx) => {
                  const passed = ev.type === "VERIFICATION_CHECK_PASSED";
                  return (
                    <div key={idx} style={{
                      background: passed ? "#f0fdf4" : "#fff1f2",
                      border: `1px solid ${passed ? "#bbf7d0" : "#fecdd3"}`,
                      borderRadius: 6,
                      padding: "10px 12px",
                      fontSize: 12
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, color: passed ? "#059669" : "#e11d48", fontFamily: "var(--font-mono)" }}>
                          {passed ? "✓ VERIFIED" : "✗ FAILED"}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
                          {ev.payload.checkId}
                        </span>
                      </div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: 2 }}>
                        {ev.payload.description}
                      </div>
                      {ev.payload.actual !== undefined && (
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                          Expected: {JSON.stringify(ev.payload.expected)} | Actual: {JSON.stringify(ev.payload.actual)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 4: Raw Events */}
          {activeTab === "events" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 600, overflowY: "auto" }}>
              {events.map((e) => (
                <div key={e.id} style={{
                  background: "#f8fafc",
                  border: "1px solid var(--border-light)",
                  borderRadius: 4,
                  padding: "6px 8px",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)"
                }}>
                  <div style={{ color: "#4f46e5", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                    <span>#{e.sequenceNo} {e.type}</span>
                    <span style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
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
