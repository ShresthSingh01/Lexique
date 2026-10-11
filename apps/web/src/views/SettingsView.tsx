import React from "react";
import { Settings, ShieldCheck, Sliders, Database, Cpu } from "lucide-react";

export const SettingsView: React.FC = () => {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px" }}>
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid var(--border-light)" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
          Workbench Settings & Policy Configuration
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
          Tune IntentLock heuristic thresholds, database verification rules, and healing policies
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Policy Gate */}
        <div className="card-clean" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <ShieldCheck size={18} color="#2563eb" />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              Self-Healing Policy Gate
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  Require Independent Database Oracle Verification
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  Healing candidate will be rejected if SQLite backend record does not confirm order state
                </div>
              </div>
              <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  Strict Financial Invariant Assertion
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  Abort healing immediately if price charged differs from contract (prevents bug masking)
                </div>
              </div>
              <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  Minimum Semantic Cosine Similarity Threshold
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  Discard candidate elements with confidence lower than 0.85
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#2563eb" }}>
                0.85 (Strict)
              </span>
            </div>
          </div>
        </div>

        {/* Local Services */}
        <div className="card-clean" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Cpu size={18} color="#059669" />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              Local Services & Endpoints
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>API Server</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                http://localhost:3000
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>ShopMart Demo Store</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                http://localhost:3001
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
