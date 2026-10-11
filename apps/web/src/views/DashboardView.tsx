import React from "react";
import {
  Play,
  FlaskConical,
  CheckCircle2,
  RefreshCw,
  AlertOctagon,
  Database,
  ArrowRight,
  TrendingUp,
  Cpu,
  Trash2,
  Inbox
} from "lucide-react";
import { BenchmarkMetrics, TestRun } from "../types.js";

interface Props {
  runs: TestRun[];
  benchmark: BenchmarkMetrics | null;
  onSelectRun: (runId: string) => void;
  onOpenTestEditor: () => void;
  onOpenMutationLab: () => void;
  onRunBaseline: () => void;
  onClearRuns?: () => Promise<void>;
  isRunning?: boolean;
  searchQuery?: string;
}

export const DashboardView: React.FC<Props> = ({
  runs,
  benchmark,
  onSelectRun,
  onOpenTestEditor,
  onOpenMutationLab,
  onRunBaseline,
  onClearRuns,
  isRunning,
  searchQuery = ""
}) => {
  // Compute strictly from actual runs array (Zero-Faking)
  const totalRunsCount = runs.length;
  const healedCount = runs.filter(r => r.status === "HEALED").length;
  const passedCount = runs.filter(r => r.status === "PASSED").length;
  const failedCount = runs.filter(r => r.status === "FAILED").length;
  const passRate = totalRunsCount > 0 ? Math.round((passedCount / totalRunsCount) * 100) : 0;
  const healRate = totalRunsCount > 0 ? Math.round((healedCount / totalRunsCount) * 100) : 0;

  // Real runs display list (strictly from SQLite)
  const displayRuns = runs.slice(0, 10).map(r => {
    let durStr = "Running...";
    if (r.duration_ms && r.duration_ms > 0) {
      durStr = `${(r.duration_ms / 1000).toFixed(2)}s`;
    } else if (r.finished_at && r.started_at) {
      const diff = new Date(r.finished_at).getTime() - new Date(r.started_at).getTime();
      durStr = diff > 0 ? `${(diff / 1000).toFixed(2)}s` : "<1s";
    } else if (r.status !== "RUNNING" && r.status !== "QUEUED") {
      durStr = "<1s";
    }

    return {
      id: r.id,
      testName: r.test_id || "checkout-valid-card",
      scenario: r.mutation_scenario_id || "Baseline (Canonical Contract)",
      status: r.status,
      duration: durStr,
      oracleVerified: r.status === "HEALED" || r.status === "PASSED",
      timeAgo: new Date(r.started_at).toLocaleTimeString()
    };
  });

  const query = (searchQuery || "").trim().toLowerCase();
  const filteredRuns = query
    ? displayRuns.filter(
        r =>
          r.testName.toLowerCase().includes(query) ||
          r.scenario.toLowerCase().includes(query) ||
          r.status.toLowerCase().includes(query) ||
          r.id.toLowerCase().includes(query)
      )
    : displayRuns;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>
      {/* Dashboard Top Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24
      }}>
        <div>
          <h1 style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            margin: 0
          }}>
            Dashboard
          </h1>
          <p style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginTop: 4,
            marginBottom: 0
          }}>
            Real-time test execution metrics, pass rates, and self-healing telemetry
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onClearRuns && runs.length > 0 && (
            <button
              onClick={onClearRuns}
              className="btn btn-secondary"
              style={{
                fontSize: 12,
                padding: "8px 14px",
                color: "#64748b"
              }}
              title="Clear Run History"
            >
              <Trash2 size={13} />
              <span>Clear History</span>
            </button>
          )}

          <button
            className="btn btn-secondary"
            onClick={onOpenMutationLab}
            style={{
              fontSize: 12,
              padding: "8px 14px"
            }}
          >
            <FlaskConical size={14} color="#6366f1" />
            <span>Mutation Lab</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={onRunBaseline}
            disabled={isRunning}
            style={{
              padding: "8px 18px",
              fontWeight: 700,
              fontSize: 13
            }}
          >
            {isRunning ? (
              <>
                <RefreshCw size={14} className="pulsing-dot" />
                <span>Running Test...</span>
              </>
            ) : (
              <>
                <Play size={14} fill="#ffffff" />
                <span>Run Test Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 KPI Cards Strip (Strict Live Computations) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
        marginBottom: 32
      }}>
        {/* Total Tests */}
        <div className="card-interactive" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div className="icon-pod icon-pod-indigo">
              <Play size={16} />
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 9999,
              background: totalRunsCount > 0 ? "#eef2ff" : "#f1f5f9",
              color: totalRunsCount > 0 ? "#4f46e5" : "#64748b",
              border: `1px solid ${totalRunsCount > 0 ? "#c7d2fe" : "#e2e8f0"}`
            }}>
              {totalRunsCount > 0 ? "Active" : "Idle"}
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
            Total Runs
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)", lineHeight: 1.1 }}>
            {totalRunsCount}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <span>{totalRunsCount > 0 ? "Recorded test runs" : "No runs recorded"}</span>
          </div>
        </div>

        {/* Passed Tests */}
        <div className="card-interactive" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div className="icon-pod icon-pod-emerald">
              <CheckCircle2 size={16} />
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 9999,
              background: "#ecfdf5",
              color: "#059669",
              border: "1px solid #a7f3d0"
            }}>
              {passRate}%
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
            Passed
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#059669", fontFamily: "var(--font-mono)", lineHeight: 1.1 }}>
            {passedCount}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>
            Baseline verified
          </div>
        </div>

        {/* Healed Tests */}
        <div className="card-interactive" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div className="icon-pod icon-pod-blue">
              <RefreshCw size={16} />
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 9999,
              background: "#eff6ff",
              color: "#2563eb",
              border: "1px solid #bfdbfe"
            }}>
              {healRate}% Recovered
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
            Healed
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#2563eb", fontFamily: "var(--font-mono)", lineHeight: 1.1 }}>
            {healedCount}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>
            Auto-healed via drift policy
          </div>
        </div>

        {/* Failed (Real Bugs) */}
        <div className="card-interactive" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div className="icon-pod icon-pod-rose">
              <AlertOctagon size={16} />
            </div>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 9999,
              background: "#fff1f2",
              color: "#e11d48",
              border: "1px solid #fecdd3"
            }}>
              {failedCount > 0 ? `${failedCount} Failed` : "0 Failed"}
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
            Failed
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#e11d48", fontFamily: "var(--font-mono)", lineHeight: 1.1 }}>
            {failedCount}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>
            Unresolved regressions
          </div>
        </div>
      </div>

      {/* Recent Executions Section */}
      <div className="card-clean" style={{ padding: "24px 28px", marginBottom: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              Recent Test Executions
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Execution history, recovery actions, and verification status
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: totalRunsCount > 0 ? "#4f46e5" : "#64748b",
              background: totalRunsCount > 0 ? "#eef2ff" : "#f1f5f9",
              border: `1px solid ${totalRunsCount > 0 ? "#c7d2fe" : "#e2e8f0"}`,
              padding: "3px 9px",
              borderRadius: 9999
            }}>
              {totalRunsCount} runs
            </span>
          </div>
        </div>

        {/* If zero runs exist, show clean professional empty state */}
        {totalRunsCount === 0 ? (
          <div style={{
            padding: "54px 24px",
            textAlign: "center",
            background: "#f8fafc",
            borderRadius: 10,
            border: "1px dashed var(--border-medium)"
          }}>
            <div className="icon-pod icon-pod-indigo" style={{ width: 44, height: 44, margin: "0 auto 16px auto" }}>
              <Inbox size={22} color="#4f46e5" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              No Test Runs Yet
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto 20px auto", lineHeight: 1.6 }}>
              Execute the test suite to inspect execution telemetry, or inject controlled interface drift from Mutation Lab.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={onRunBaseline}
                disabled={isRunning}
                style={{ padding: "9px 20px" }}
              >
                <Play size={14} fill="#ffffff" />
                <span>Run Test Suite</span>
              </button>
              <button
                className="btn btn-secondary"
                onClick={onOpenMutationLab}
                style={{ padding: "9px 20px" }}
              >
                <FlaskConical size={14} color="#9333ea" />
                <span>Open Mutation Lab</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-light)", color: "var(--text-secondary)", background: "#f8fafc" }}>
                  <th style={{ padding: "10px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em" }}>Status</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em" }}>Test ID</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em" }}>Scenario</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em" }}>Duration</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em" }}>DB Oracle</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em" }}>Executed</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRuns.map((r, i) => {
                  const isHealed = r.status === "HEALED";
                  const isPassed = r.status === "PASSED";
                  const isFailed = r.status === "FAILED";

                  return (
                    <tr
                      key={r.id || i}
                      onClick={() => onSelectRun(r.id)}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                        transition: "background 0.12s ease"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <span className={`badge-clean ${
                          isHealed ? "badge-healed" : isPassed ? "badge-passed" : isFailed ? "badge-failed" : "badge-review"
                        }`}>
                          {isHealed && <RefreshCw size={11} />}
                          {isPassed && <CheckCircle2 size={11} />}
                          {isFailed && <AlertOctagon size={11} />}
                          <span>{r.status}</span>
                        </span>
                      </td>

                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                        {r.testName}
                      </td>

                      <td style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: 12 }}>
                        {r.scenario}
                      </td>

                      <td style={{ padding: "12px 14px", color: "#475569", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                        {r.duration}
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        {r.oracleVerified ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#059669", fontSize: 11, fontWeight: 700 }}>
                            <Database size={13} />
                            <span>DB Verified</span>
                          </div>
                        ) : (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#e11d48", fontSize: 11, fontWeight: 700 }}>
                            <AlertOctagon size={13} />
                            <span>Failed Assertion</span>
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: 12 }}>
                        {r.timeAgo}
                      </td>

                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRun(r.id);
                          }}
                        >
                          Inspect
                          <ArrowRight size={12} color="#4f46e5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System Infrastructure Status Strip */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16
      }}>
        <div className="card-interactive" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div className="icon-pod icon-pod-emerald">
            <Cpu size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              Test Engine
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Playwright Chromium • Port 3000
            </div>
          </div>
        </div>

        <div className="card-interactive" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div className="icon-pod icon-pod-indigo">
            <Database size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              Local Database
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              SQLite WAL • storage/ojastra.db
            </div>
          </div>
        </div>

        <div className="card-interactive" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div className="icon-pod icon-pod-purple">
            <TrendingUp size={18} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              Target Application
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              ShopMart Store • Port 3001
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
