import React, { useState } from "react";
import { BenchmarkMetrics, MutationScenario } from "../types.js";
import { StatusBadge } from "../components/StatusBadge.js";

interface Props {
  mutations: MutationScenario[];
  benchmark: BenchmarkMetrics | null;
  onRunMutation: (scenarioId: string) => Promise<void>;
  onResetFixtures: () => Promise<void>;
  onSelectRun: (runId: string) => void;
}

export const MutationLabView: React.FC<Props> = ({
  mutations,
  benchmark,
  onRunMutation,
  onResetFixtures
}) => {
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [resetting, setResetting] = useState<boolean>(false);

  const handleRun = async (id: string) => {
    setRunningScenarioId(id);
    try {
      await onRunMutation(id);
    } finally {
      setRunningScenarioId(null);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await onResetFixtures();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>
      {/* Top Banner */}
      <div style={{
        background: "linear-gradient(90deg, #131c31 0%, #0f172a 100%)",
        border: "1px solid var(--border-medium)",
        borderRadius: 10,
        padding: "20px 24px",
        marginBottom: 28,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--accent-cyan)", fontWeight: 700, fontFamily: "var(--font-mono)", marginBottom: 4 }}>
            DETERMINISTIC EVALUATION SUITE (P0 BENCHMARK)
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
            Mutation Lab — Controlled Drift & Bug Injection
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 760 }}>
            Trigger real UI mutations and seeded application regressions against the local demo. Observe IntentLock's real-time recovery on harmless locator drift, and its refusal to heal genuine defects.
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={resetting}
        >
          {resetting ? "Resetting..." : "↺ Reset Store Fixtures"}
        </button>
      </div>

      {/* 8 Scenario Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 36 }}>
        {mutations.map(m => {
          const isRunning = runningScenarioId === m.id;
          const stat = benchmark?.scenarios.find(s => s.scenarioId === m.id);

          return (
            <div
              key={m.id}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                borderLeft: `4px solid ${
                  m.expected_outcome === "HEALED" ? "var(--accent-cyan)" :
                  (m.expected_outcome === "FAILED" ? "var(--accent-rose)" : "var(--accent-amber)")
                }`
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <span style={{
                      background: "#1e293b",
                      color: "var(--accent-cyan)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)"
                    }}>
                      {m.id}
                    </span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                      {m.name}
                    </h3>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: 2 }}>
                      Expected Outcome:
                    </div>
                    <StatusBadge status={m.expected_outcome} />
                  </div>
                </div>

                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
                  {m.description}
                </p>

                <div style={{
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontSize: 11,
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 16
                }}>
                  <span style={{ color: "var(--text-tertiary)" }}>Type: <strong style={{ color: "#fff" }}>{m.mutation_type}</strong></span>
                  <span style={{ color: "var(--text-tertiary)" }}>Risk: <strong style={{ color: "#fff", textTransform: "uppercase" }}>{m.risk_category}</strong></span>
                  <span style={{ color: "var(--text-tertiary)" }}>Recorded: <strong style={{ color: "var(--accent-cyan)" }}>{stat?.totalRuns || 0} runs</strong></span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                <div style={{ fontSize: 12 }}>
                  {stat && stat.totalRuns > 0 ? (
                    <span style={{ color: stat.accuracyRate === 100 ? "var(--accent-green)" : "var(--accent-rose)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                      ✓ {stat.accuracyRate}% Empirical Accuracy ({stat.healedRuns || stat.failedRuns || stat.reviewRequiredRuns}/{stat.totalRuns})
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>Not yet executed in this session</span>
                  )}
                </div>

                <button
                  className="btn btn-primary"
                  style={{ padding: "6px 14px", fontSize: 12 }}
                  onClick={() => handleRun(m.id)}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
                      Executing Run...
                    </>
                  ) : (
                    "▶ Run Scenario"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Benchmark Summary Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", background: "rgba(15, 23, 42, 0.4)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
            Benchmark Metrics & Ground-Truth Verification
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Empirical results across all recorded runs. Sample size is strictly displayed with every percentage.
          </p>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
          <thead>
            <tr style={{ background: "rgba(15, 23, 42, 0.6)", color: "var(--text-tertiary)", borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={{ padding: "12px 20px" }}>SCENARIO ID</th>
              <th style={{ padding: "12px 16px" }}>NAME</th>
              <th style={{ padding: "12px 16px" }}>EXPECTED</th>
              <th style={{ padding: "12px 16px" }}>TOTAL RUNS</th>
              <th style={{ padding: "12px 16px" }}>HEALED</th>
              <th style={{ padding: "12px 16px" }}>FAILED</th>
              <th style={{ padding: "12px 16px" }}>REVIEW REQ.</th>
              <th style={{ padding: "12px 20px", textAlign: "right" }}>ACCURACY</th>
            </tr>
          </thead>
          <tbody>
            {(benchmark?.scenarios || []).map(sc => (
              <tr key={sc.scenarioId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "12px 20px", fontFamily: "var(--font-mono)", color: "var(--accent-cyan)" }}>
                  {sc.scenarioId}
                </td>
                <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 600 }}>
                  {sc.name}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <StatusBadge status={sc.expectedOutcome} />
                </td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)" }}>
                  {sc.totalRuns}
                </td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "var(--accent-cyan)" }}>
                  {sc.healedRuns}
                </td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "var(--accent-rose)" }}>
                  {sc.failedRuns}
                </td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "var(--accent-amber)" }}>
                  {sc.reviewRequiredRuns}
                </td>
                <td style={{ padding: "12px 20px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  {sc.totalRuns > 0 ? (
                    <span style={{ color: sc.accuracyRate === 100 ? "var(--accent-green)" : "var(--accent-rose)" }}>
                      {sc.accuracyRate}%
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-tertiary)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
