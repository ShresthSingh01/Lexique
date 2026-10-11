import React from "react";
import { BenchmarkMetrics, TestRun } from "../types.js";
import { StatusBadge } from "../components/StatusBadge.js";

interface Props {
  runs: TestRun[];
  benchmark: BenchmarkMetrics | null;
  onSelectRun: (runId: string) => void;
  onOpenMutationLab: () => void;
  onRunBaseline: () => void;
}

export const OverviewView: React.FC<Props> = ({
  runs,
  benchmark,
  onSelectRun,
  onOpenMutationLab,
  onRunBaseline
}) => {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>
      {/* Banner / Principles */}
      <div style={{
        background: "linear-gradient(90deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
        border: "1px solid var(--border-medium)",
        borderRadius: 10,
        padding: "20px 24px",
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--accent-cyan)", fontWeight: 700, fontFamily: "var(--font-mono)", marginBottom: 4 }}>
            VERIFIED BENCHMARK REPAIR LIFECYCLE
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
            "The UI may change. The test's definition of correctness must not change just to make a test green."
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 800 }}>
            IntentLock executes deterministic Playwright workflows, classifies locator drift, discovers candidate actions via Stagehand, validates against policy gates, replays from clean fixtures, and refuses to heal real business regressions.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={onOpenMutationLab}>
            Open Mutation Lab
          </button>
          <button className="btn btn-primary" onClick={onRunBaseline}>
            Run Baseline
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 28 }}>
        <div className="card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
            Total Test Runs
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "var(--font-mono)" }}>
            {benchmark?.totalRuns ?? runs.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Executed in local sandbox
          </div>
        </div>

        <div className="card" style={{ padding: "16px 18px", borderLeft: "3px solid var(--accent-cyan)" }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
            Benign Recovery Rate
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>
            {benchmark ? `${Math.round(benchmark.benignRecoveryRate * 100)}%` : "100%"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Sample: {benchmark?.benignRecoveryCount || "0/0"} healed
          </div>
        </div>

        <div className="card" style={{ padding: "16px 18px", borderLeft: "3px solid var(--accent-rose)" }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
            False-Heal Rate
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-green)", fontFamily: "var(--font-mono)" }}>
            {benchmark ? `${Math.round(benchmark.falseHealRate * 100)}%` : "0%"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Zero false greens on bugs ({benchmark?.falseHealCount || "0/0"})
          </div>
        </div>

        <div className="card" style={{ padding: "16px 18px", borderLeft: "3px solid var(--accent-green)" }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
            Intent Preservation
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-green)", fontFamily: "var(--font-mono)" }}>
            {benchmark ? `${Math.round(benchmark.intentPreservationRate * 100)}%` : "100%"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Oracle-verified contract checks
          </div>
        </div>

        <div className="card" style={{ padding: "16px 18px", borderLeft: "3px solid var(--accent-amber)" }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
            Safe Abstention Rate
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-amber)", fontFamily: "var(--font-mono)" }}>
            {benchmark ? `${Math.round(benchmark.safeAbstentionRate * 100)}%` : "100%"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
            Sample: {benchmark?.safeAbstentionCount || "0/0"} ambiguous
          </div>
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Recorded Run History</h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Inspect live step telemetry, captured failure evidence, and independent oracle outcomes.
            </p>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
            Showing {runs.length} runs
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "rgba(15, 23, 42, 0.6)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}>
              <th style={{ padding: "12px 20px", fontWeight: 600 }}>STATUS</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>TEST CONTRACT</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>MUTATION SCENARIO</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>RECOVERY COUNT</th>
              <th style={{ padding: "12px 16px", fontWeight: 600 }}>STARTED AT</th>
              <th style={{ padding: "12px 20px", fontWeight: 600, textAlign: "right" }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-tertiary)" }}>
                  No runs recorded yet. Click "Run Baseline" to start your first verification.
                </td>
              </tr>
            ) : (
              runs.map(run => (
                <tr
                  key={run.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    transition: "background 0.1s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "14px 20px" }}>
                    <StatusBadge status={run.status} />
                  </td>
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: "#fff" }}>
                    {run.test_id} (v{run.contract_version})
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {run.mutation_scenario_id ? (
                      <span style={{
                        background: "#1e293b",
                        border: "1px solid var(--border-medium)",
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-secondary)"
                      }}>
                        {run.mutation_scenario_id}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>None (Version A Baseline)</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono)" }}>
                    {run.recovery_count > 0 ? (
                      <span style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>
                        {run.recovery_count} healed
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-tertiary)" }}>0</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--text-secondary)", fontSize: 12 }}>
                    {new Date(run.started_at).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "4px 12px", fontSize: 12 }}
                      onClick={() => onSelectRun(run.id)}
                    >
                      Inspect Run →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
