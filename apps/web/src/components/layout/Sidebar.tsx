import React from "react";
import {
  LayoutDashboard,
  FileCode2,
  PlayCircle,
  FlaskConical,
  Store,
  Settings,
  ShieldCheck,
  Cpu
} from "lucide-react";

export type TabId = "overview" | "tests" | "runs" | "mutation-lab" | "demo-app" | "settings";

interface Props {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  isRunning?: boolean;
}

export const Sidebar: React.FC<Props> = ({ activeTab, onSelectTab, isRunning }) => {
  const navItems: { id: TabId; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
    { id: "tests", label: "Tests", icon: <FileCode2 size={18} /> },
    { id: "runs", label: "Runs", icon: <PlayCircle size={18} />, badge: isRunning ? "LIVE" : undefined },
    { id: "mutation-lab", label: "Mutation Lab", icon: <FlaskConical size={18} /> },
    { id: "demo-app", label: "Demo App", icon: <Store size={18} /> },
    { id: "settings", label: "Settings", icon: <Settings size={18} /> }
  ];

  return (
    <aside style={{
      width: 240,
      background: "var(--bg-sidebar)",
      color: "var(--text-secondary)",
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid var(--border-light)",
      height: "100vh",
      position: "sticky",
      top: 0,
      userSelect: "none"
    }}>
      {/* Brand Header */}
      <div style={{
        padding: "20px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: "1px solid var(--border-light)"
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          boxShadow: "0 3px 10px rgba(79, 70, 229, 0.35)",
          flexShrink: 0
        }}>
          <ShieldCheck size={20} />
        </div>
        <div>
          <div style={{
            fontSize: 16,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2
          }}>
            IntentLock
          </div>
          <div style={{
            display: "inline-block",
            fontSize: 9,
            fontWeight: 700,
            color: "#4f46e5",
            background: "#eef2ff",
            border: "1px solid #c7d2fe",
            padding: "1px 5px",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            marginTop: 3,
            letterSpacing: "0.04em"
          }}>
            EVIDENCE-GATED E2E
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav style={{ padding: "16px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "9px 12px",
                borderRadius: 9,
                background: isActive ? "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)" : "transparent",
                color: isActive ? "#4338ca" : "var(--text-secondary)",
                border: isActive ? "1px solid rgba(199, 210, 254, 0.9)" : "1px solid transparent",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                transition: "all 0.14s cubic-bezier(0.16, 1, 0.3, 1)",
                textAlign: "left",
                boxShadow: isActive ? "0 1px 3px rgba(79, 70, 229, 0.08)" : "none"
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  color: isActive ? "#4f46e5" : "#64748b",
                  display: "flex",
                  alignItems: "center"
                }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 9999,
                  background: "#ecfdf5",
                  color: "#047857",
                  border: "1px solid #6ee7b7",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}>
                  <span className="pulsing-emerald-dot" style={{ width: 5, height: 5 }} />
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Real System Telemetry Footer */}
      <div style={{
        padding: "14px 14px",
        borderTop: "1px solid var(--border-light)"
      }}>
        <div style={{
          background: "#f8fafc",
          border: "1px solid var(--border-light)",
          borderRadius: 10,
          padding: "9px 11px",
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
            flexShrink: 0
          }}>
            <Cpu size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 5
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>
                IntentLock Engine
              </span>
              <span className="pulsing-emerald-dot" style={{ width: 5, height: 5 }} />
            </div>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
              marginTop: 1
            }}>
              Localhost :3000 • Headless
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
