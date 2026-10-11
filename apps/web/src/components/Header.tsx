import React from "react";
import { OjastraLogo } from "./shared/OjastraLogo.js";

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
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            border: "1px solid var(--border-medium)",
            flexShrink: 0
          }}>
            <OjastraLogo size={30} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.01em", color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
              Ojastra
            </div>
            <div style={{ fontSize: 10, color: "var(--accent-gold)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", fontWeight: 600 }}>
              TEST AUTOMATION WORKBENCH
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
