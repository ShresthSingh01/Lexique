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
    <header style={{
      background: "#ffffff",
      borderBottom: "1px solid var(--border-light)",
      padding: "12px 28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "var(--shadow-sm)"
    }}>
      {/* Top Search & Actions Row */}
      <div style={{ display: "flex", flex: 1, width: "100%", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        {/* Search Bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#f8fafc",
          border: "1px solid var(--border-light)",
          borderRadius: 8,
          padding: "7px 14px",
          width: 360,
          transition: "border-color 0.15s ease, box-shadow 0.15s ease"
        }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search tests, runs, or mutations..."
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
        </div>

        {/* Right Action Cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: "auto" }}>
          {/* Live Service Pill with Pulsing Glow */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
            border: "1px solid #6ee7b7",
            padding: "5px 12px",
            borderRadius: 9999,
            fontSize: 12,
            color: "#047857",
            fontWeight: 700,
            boxShadow: "0 1px 3px rgba(16, 185, 129, 0.12)"
          }}>
            <span className="pulsing-emerald-dot" />
            ShopMart :3001 & API :3000 Active
          </div>

          {/* Primary Action Button (Electric Indigo) */}
          <button
            className="btn btn-primary"
            onClick={onRunDemoTest}
            disabled={isRunning}
            style={{ padding: "8px 18px" }}
          >
            {isRunning ? (
              <>
                <RefreshCw size={14} className="pulsing-dot" />
                <span>Running Test...</span>
              </>
            ) : (
              <>
                <Play size={14} fill="#ffffff" />
                <span>Run Demo Test</span>
              </>
            )}
          </button>

        </div>
      </div>
    </header>
  );
};
