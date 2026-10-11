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
      borderBottom: "1px solid var(--border-medium)",
      padding: "14px 28px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: "0 2px 0px rgba(0,0,0,0.5)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 4,
            background: "linear-gradient(135deg, #e0a96d 0%, #b88349 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "2px 2px 0px #000",
            border: "1px solid #f0be85"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12100d" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.01em", color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              IntentLock
            </div>
            <div style={{ fontSize: 10, color: "var(--accent-gold)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", fontWeight: 600 }}>
              EVIDENCE-GATED E2E ORACLE
            </div>
          </div>
        </div>

        <nav style={{
          display: "flex",
          gap: 4,
          background: "var(--bg-app)",
          padding: 4,
          borderRadius: 4,
          border: "1px solid var(--border-subtle)",
          boxShadow: "inset 1px 1px 0px #000"
        }}>
          {[
            { id: "studio", label: "⚡ Contract Studio" },
            { id: "mutations", label: "🧪 Version B Lab" },
            { id: "explorer", label: "🔍 Live Inspector" },
            { id: "overview", label: "📊 Run History & Metrics" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? "var(--bg-card)" : "transparent",
                color: activeTab === tab.id ? "var(--accent-gold)" : "var(--text-secondary)",
                border: activeTab === tab.id ? "1px solid var(--border-medium)" : "1px solid transparent",
                borderRadius: 4,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.12s ease",
                boxShadow: activeTab === tab.id ? "2px 2px 0px #000" : "none",
                fontFamily: "var(--font-sans)"
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(94, 184, 133, 0.12)",
          border: "1px solid rgba(94, 184, 133, 0.35)",
          padding: "5px 10px",
          borderRadius: 3,
          fontSize: 11,
          fontWeight: 700,
          color: "#6ec493",
          fontFamily: "var(--font-mono)",
          boxShadow: "1px 1px 0px #000"
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-green)", boxShadow: "0 0 6px var(--accent-green)" }}></span>
          HEADLESS=FALSE (LIVE)
        </div>

        <button
          className="btn btn-primary"
          onClick={onRunBaseline}
          disabled={isRunningBaseline}
          style={{ opacity: isRunningBaseline ? 0.7 : 1 }}
        >
          {isRunningBaseline ? (
            <>
              <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #12100d", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
              Executing Test Run...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Run Active Test
            </>
          )}
        </button>
      </div>
    </header>
  );
};
