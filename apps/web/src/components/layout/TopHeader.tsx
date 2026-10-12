import React from "react";
import { Search, Play, RefreshCw } from "lucide-react";

interface Props {
  onRunDemoTest: () => void;
  isRunning?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

export const TopHeader: React.FC<Props> = ({
  onRunDemoTest,
  isRunning,
  searchQuery = "",
  onSearchQueryChange
}) => {
  return (
    <header className="frosted-header" style={{
      padding: "11px 28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "var(--shadow-sm)"
    }}>
      {/* Top Search & Actions Row */}
      <div style={{ display: "flex", flex: 1, width: "100%", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        {/* Search Bar with Keyboard Hint */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          background: "var(--bg-app)",
          border: "1px solid var(--border-light)",
          borderRadius: 8,
          padding: "6px 12px",
          width: 380,
          transition: "border-color 0.15s ease, box-shadow 0.15s ease"
        }}>
          <Search size={15} color="#64748b" />
          <input
            type="text"
            placeholder="Search tests, runs, and invariants..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange?.(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "var(--text-primary)",
              width: "100%",
              fontFamily: "var(--font-sans)"
            }}
          />
          <span className="kbd-hint">/</span>
        </div>

        {/* Right Action Cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
          {/* Live Service Pill with Pulsing Halo */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
            border: "1px solid #a7f3d0",
            padding: "5px 12px",
            borderRadius: 9999,
            fontSize: 12,
            color: "#047857",
            fontWeight: 700,
            boxShadow: "0 1px 3px rgba(16, 185, 129, 0.12)"
          }}>
            <span className="pulsing-emerald-dot" />
            <span>Telemetry Online</span>
          </div>

          {/* Primary Action Button (Electric Cobalt Gradient) */}
          <button
            className="btn btn-primary"
            onClick={onRunDemoTest}
            disabled={isRunning}
            style={{ padding: "7px 18px", height: 34 }}
          >
            {isRunning ? (
              <>
                <RefreshCw size={13} className="pulsing-dot" />
                <span>Running Suite...</span>
              </>
            ) : (
              <>
                <Play size={13} fill="#ffffff" />
                <span>Run Baseline Suite</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
