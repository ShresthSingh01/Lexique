import React from "react";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRunBaseline: () => void;
  isRunningBaseline: boolean;
}

export const Header: React.FC<Props> = ({ activeTab, setActiveTab, onRunBaseline, isRunningBaseline }) => {
  return (
    <header style={{
      background: "var(--bg-surface)",
      borderBottom: "1px solid var(--border-subtle)",
      padding: "12px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(59, 130, 246, 0.4)"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
              IntentLock
            </div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              EVIDENCE-GATED SELF-HEALING E2E
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 4, background: "var(--bg-app)", padding: 4, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
          {[
            { id: "overview", label: "Overview" },
            { id: "contract", label: "Intent Contract" },
            { id: "explorer", label: "Run Explorer" },
            { id: "mutation-lab", label: "Mutation Lab" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? "var(--bg-card)" : "transparent",
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.3)" : "none"
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          padding: "4px 10px",
          borderRadius: 14,
          fontSize: 12,
          color: "#34d399",
          fontFamily: "var(--font-mono)"
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }}></span>
          SANDBOX (PORT 3001)
        </div>

        <button
          className="btn btn-primary"
          onClick={onRunBaseline}
          disabled={isRunningBaseline}
          style={{ opacity: isRunningBaseline ? 0.7 : 1 }}
        >
          {isRunningBaseline ? (
            <>
              <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
              Running...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Run Baseline Test
            </>
          )}
        </button>
      </div>
    </header>
  );
};
