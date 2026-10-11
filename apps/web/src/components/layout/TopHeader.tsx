import React from "react";
import { Search, Play, RefreshCw, Compass, ShieldCheck } from "lucide-react";

interface Props {
  onRunDemoTest: () => void;
  isRunning?: boolean;
  selectedStoryStep?: number;
  onSelectStoryStep?: (step: number) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

export const TopHeader: React.FC<Props> = ({
  onRunDemoTest,
  isRunning,
  selectedStoryStep,
  onSelectStoryStep,
  searchQuery = "",
  onSearchQueryChange
}) => {
  const storySteps = [
    { num: 1, label: "1. Dashboard" },
    { num: 2, label: "2. Intent Contract" },
    { num: 3, label: "3. Run (V1)" },
    { num: 4, label: "4. V2 UI Drift" },
    { num: 5, label: "5. AI Discovery" },
    { num: 6, label: "6. Replay & Healed" },
    { num: 7, label: "7. Healed Oracle" },
    { num: 8, label: "8. Mutation Lab" },
    { num: 9, label: "9. App Bug Reject" }
  ];

  return (
    <header style={{
      background: "#ffffff",
      borderBottom: "1px solid var(--border-light)",
      padding: "12px 28px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      boxShadow: "var(--shadow-sm)"
    }}>
      {/* Top Search & Actions Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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

          {/* Deterministic Policy Gate Badge */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "#f8fafc",
            border: "1px solid var(--border-light)",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-mono)"
          }}>
            <ShieldCheck size={14} color="#4f46e5" />
            <span>GATE: STRICT</span>
          </div>
        </div>
      </div>

      {/* Interactive Story Showcase Bar */}
      {onSelectStoryStep && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          paddingTop: 8,
          borderTop: "1px solid var(--border-subtle)",
          overflowX: "auto"
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginRight: 6,
            whiteSpace: "nowrap"
          }}>
            <Compass size={13} color="#4f46e5" />
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#4f46e5",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              Showcase Navigator:
            </span>
          </div>
          {storySteps.map(s => {
            const isSelected = selectedStoryStep === s.num;
            return (
              <button
                key={s.num}
                onClick={() => onSelectStoryStep(s.num)}
                style={{
                  background: isSelected
                    ? "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)"
                    : "#f8fafc",
                  color: isSelected ? "#ffffff" : "#475569",
                  border: isSelected ? "1px solid #4338ca" : "1px solid #e2e8f0",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.14s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: isSelected ? "0 2px 8px rgba(79, 70, 229, 0.32)" : "none",
                  transform: isSelected ? "translateY(-1px)" : "none"
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "#eef2ff";
                    e.currentTarget.style.color = "#4f46e5";
                    e.currentTarget.style.borderColor = "#c7d2fe";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.color = "#475569";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
