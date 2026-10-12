import React, { useEffect, useState } from "react";
import { ShieldCheck, Cpu, Eye, Monitor, CheckCircle2 } from "lucide-react";
import { fetchSettings, updateSettings } from "../api.js";

export const SettingsView: React.FC = () => {
  const [minimumSimilarity, setMinimumSimilarity] = useState<number | null>(null);
  const [headless, setHeadless] = useState<boolean>(false);
  const [llmProvider, setLlmProvider] = useState<string>("gemini");
  const [llmModel, setLlmModel] = useState<string>("gemini-3.8-flash");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    fetchSettings()
      .then(settings => {
        setMinimumSimilarity(settings.minimumCandidateSimilarity);
        setHeadless(settings.headless ?? false);
        if (settings.llmProvider) setLlmProvider(settings.llmProvider);
        if (settings.llmModel) setLlmModel(settings.llmModel);
      })
      .catch(error => setSettingsError(error.message));
  }, []);

  return (
    <div className="workbench-container" style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid var(--border-light)" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
          Settings
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
          Heuristic thresholds, database verification rules, and service configurations
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
                  Candidate auto-acceptance threshold
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  Candidates below this semantic similarity require human approval before a retry
                </div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#2563eb" }}>
                {minimumSimilarity === null
                  ? settingsError || "Loading policy…"
                  : `${minimumSimilarity.toFixed(2)} (server policy)`}
              </span>
            </div>
          </div>
        </div>

        {/* Chromium Browser Visibility (Side-by-Side Execution) */}
        <div className="card-clean" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Monitor size={18} color="#4f46e5" />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Chromium Browser Visibility (Side-by-Side Process Window)
              </h2>
            </div>
            {savedSuccess && (
              <span style={{ fontSize: 11, color: "#059669", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                <CheckCircle2 size={13} /> Setting saved
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>Launch Visible Chromium Desktop Window (Headed Mode)</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 9999,
                    background: !headless ? "#e0e7ff" : "#f1f5f9",
                    color: !headless ? "#4338ca" : "#64748b"
                  }}>
                    {!headless ? "HEADED (LIVE VISIBLE)" : "HEADLESS"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                  When enabled, Playwright opens a live physical Chromium window on your screen with <strong>350ms slow-motion</strong> and glowing interaction highlights (<strong>#6366f1 indigo</strong> before clicking, <strong>#10b981 emerald</strong> before input fills) so you can directly watch every step and recovery.
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
                  💡 <em>You can also open the <strong>Demo App</strong> tab in the sidebar at any time to view the target storefront running live in an embedded panel.</em>
                </div>
              </div>

              <button
                className={!headless ? "btn btn-primary" : "btn btn-secondary"}
                onClick={async () => {
                  const newHeadless = !headless;
                  setHeadless(newHeadless);
                  try {
                    await updateSettings({ headless: newHeadless });
                    setSavedSuccess(true);
                    setTimeout(() => setSavedSuccess(false), 2500);
                  } catch (err: any) {
                    setSettingsError(err.message);
                  }
                }}
                style={{
                  fontSize: 12,
                  padding: "8px 16px",
                  whiteSpace: "nowrap",
                  flexShrink: 0
                }}
              >
                {!headless ? "Switch to Headless" : "Enable Visible Chromium"}
              </button>
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
