import React from "react";

interface Props {
  contract: any;
}

export const ContractView: React.FC<Props> = ({ contract }) => {
  if (!contract) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>Loading contract...</div>;
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
      {/* Immutability Seal */}
      <div style={{
        background: "rgba(59, 130, 246, 0.08)",
        border: "1px solid rgba(59, 130, 246, 0.25)",
        borderRadius: 8,
        padding: "14px 20px",
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            background: "var(--accent-blue)",
            color: "#fff",
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 800
          }}>
            🔒 IMMUTABLE INTENT
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Intent contracts cannot be relaxed or rewritten by AI during recovery. Correctness is strictly preserved.
          </div>
        </div>

        <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--accent-cyan)" }}>
          SPEC: {contract.testId} (v{contract.contractVersion})
        </div>
      </div>

      {/* Contract Header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
          {contract.name}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 18 }}>
          {contract.description}
        </p>

        <div style={{ display: "flex", gap: 20, borderTop: "1px solid var(--border-subtle)", paddingTop: 14 }}>
          <div>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", display: "block" }}>Environment:</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "var(--font-mono)" }}>{contract.environmentId}</span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", display: "block" }}>Base URL:</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>{contract.baseUrl}</span>
          </div>
        </div>
      </div>

      {/* Preconditions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Preconditions</h2>
        <ul style={{ paddingLeft: 20, color: "var(--text-secondary)", fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
          {contract.preconditions.map((p: string, idx: number) => (
            <li key={idx}>{p}</li>
          ))}
        </ul>
      </div>

      {/* Workflow Steps */}
      <div className="card" style={{ marginBottom: 24, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", background: "rgba(15, 23, 42, 0.4)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Workflow Steps (Executable Contract)</h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "rgba(15, 23, 42, 0.6)", color: "var(--text-tertiary)", borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={{ padding: "10px 18px", textAlign: "left" }}>STEP</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>ACTION TYPE</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>INTENT DESCRIPTION</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>TARGET LOCATOR</th>
              <th style={{ padding: "10px 18px", textAlign: "left" }}>RISK POLICY</th>
            </tr>
          </thead>
          <tbody>
            {contract.steps.map((step: any, idx: number) => (
              <tr key={step.stepId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "12px 18px", fontWeight: 700, color: "#fff" }}>
                  {idx + 1}. {step.name}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{
                    background: "#1e293b",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--accent-blue)"
                  }}>
                    {step.actionType}
                  </span>
                </td>
                <td style={{ padding: "12px 14px", color: "var(--text-secondary)" }}>
                  {step.intent}
                </td>
                <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent-cyan)" }}>
                  {step.targetLocator}
                </td>
                <td style={{ padding: "12px 18px" }}>
                  <span style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    fontFamily: "var(--font-mono)",
                    color: step.riskCategory === "high" ? "var(--accent-rose)" : "var(--text-tertiary)"
                  }}>
                    {step.riskCategory}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Success Conditions & Invariants */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            Machine-Checkable Success Conditions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {contract.successConditions.map((cond: any) => (
              <div key={cond.id} style={{
                background: "rgba(15, 23, 42, 0.5)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
                padding: "10px 12px",
                fontSize: 13
              }}>
                <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>{cond.description}</div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                  Type: <span style={{ color: "var(--accent-cyan)" }}>{cond.type}</span> | Expected: <span style={{ color: "#fff" }}>{JSON.stringify(cond.expected)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            Required System Invariants
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {contract.invariants.map((inv: any) => (
              <div key={inv.id} style={{
                background: "rgba(15, 23, 42, 0.5)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
                padding: "10px 12px",
                fontSize: 13
              }}>
                <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>{inv.description}</div>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                  Invariant ID: <span style={{ color: "var(--accent-purple)" }}>{inv.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
