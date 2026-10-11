import React, { useState } from "react";
import {
  FlaskConical,
  RotateCw,
  Play,
  ShieldAlert,
  Sparkles,
  Layers,
  Database,
  CheckCircle2,
  AlertOctagon,
  ArrowRight
} from "lucide-react";
import { BenchmarkMetrics, MutationScenario } from "../types.js";

interface Props {
  mutations?: MutationScenario[];
  benchmark?: BenchmarkMetrics | null;
  onRunMutation: (scenarioId: string) => Promise<void>;
  onResetFixtures: () => Promise<void>;
  onSelectRun?: (runId: string) => void;
}

export const MutationLabView: React.FC<Props> = ({
  mutations = [],
  benchmark,
  onRunMutation,
  onResetFixtures,
  onSelectRun
}) => {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [resetting, setResetting] = useState<boolean>(false);

  // Synchronized with packages/engine/src/seed.ts MUTATION_SCENARIOS
  const scenarios = [
    {
      id: "M01_RENAME_TARGET",
      name: "1. Rename Checkout Button Locator",
      category: "ui" as const,
      typeLabel: "UI Drift",
      description: "Checkout button ID renamed from '#checkout-button' to '#place-order-action' and label to 'Place order' while preserving action semantics.",
      expected: "HEALED",
      expectedLabel: "Auto-Heals & Passes",
      difficulty: "Semantic Role Match",
      invariants: "Price $54.00 preserved"
    },
    {
      id: "M02_RESTRUCTURE_DOM",
      name: "2. Restructure DOM Hierarchy",
      category: "ui" as const,
      typeLabel: "UI Drift",
      description: "Wraps checkout action in nested layout containers and custom CSS wrapper classes without changing page semantics.",
      expected: "HEALED",
      expectedLabel: "Auto-Heals & Passes",
      difficulty: "Layout Tree Match",
      invariants: "Price $54.00 preserved"
    },
    {
      id: "M03_MOVE_TARGET",
      name: "3. Relocate Checkout Button Section",
      category: "ui" as const,
      typeLabel: "UI Drift",
      description: "Moves checkout action into an alternate 'Fast Order Routing' section below the cart summary table.",
      expected: "HEALED",
      expectedLabel: "Auto-Heals & Passes",
      difficulty: "Spatial Viewport Match",
      invariants: "Price $54.00 preserved"
    },
    {
      id: "M04_ADD_REVIEW_STEP",
      name: "4. Inject Intermediate Review Step",
      category: "workflow" as const,
      typeLabel: "Workflow Drift",
      description: "Inserts a new intermediate review confirmation step between cart and checkout form that is not in the original contract.",
      expected: "REVIEW_REQUIRED",
      expectedLabel: "Policy Rejection / Review",
      difficulty: "Step Expansion",
      invariants: "Uncontracted transition"
    },
    {
      id: "M05_DUPLICATE_LABEL",
      name: "5. Ambiguous Duplicate Action Labels",
      category: "workflow" as const,
      typeLabel: "Ambiguity Drift",
      description: "Renders two conflicting 'Place order' buttons on cart (Express vs Standard), causing locator ambiguity.",
      expected: "REVIEW_REQUIRED",
      expectedLabel: "Policy Rejection / Review",
      difficulty: "Policy Uniqueness Gate",
      invariants: "Prevents accidental branch"
    },
    {
      id: "M06_WRONG_TOTAL",
      name: "6. Seeded Price Inflation Regression",
      category: "bugs" as const,
      typeLabel: "Real Bug",
      description: "Application bug charges $64.00 instead of $54.00 agreed in the contractual spec. Engine refuses to heal.",
      expected: "FAILED",
      expectedLabel: "Refuses Heal / Hard Fail",
      difficulty: "Financial Invariant",
      invariants: "Violated: +$10.00 Overcharge"
    },
    {
      id: "M07_PAYMENT_ERROR",
      name: "7. Mock Payment Gateway Failure",
      category: "bugs" as const,
      typeLabel: "Real Bug",
      description: "Payment gateway returns declined. Engine must classify as assertion failure and refuse to heal.",
      expected: "FAILED",
      expectedLabel: "Refuses Heal / Hard Fail",
      difficulty: "Gateway Invariant",
      invariants: "Violated: Payment declined"
    },
    {
      id: "M08_SERVER_UNAVAILABLE",
      name: "8. Force 503 Service Unavailable",
      category: "bugs" as const,
      typeLabel: "Infrastructure Bug",
      description: "Simulates backend service crash. Engine must classify as infrastructure/network error without attempting locator repair.",
      expected: "FAILED",
      expectedLabel: "Refuses Heal / Hard Fail",
      difficulty: "Network Invariant",
      invariants: "Violated: HTTP 503 returned"
    }
  ];

  const handleRun = async (id: string) => {
    setRunningId(id);
    try {
      await onRunMutation(id);
    } finally {
      setRunningId(null);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await onResetFixtures();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>
      {/* Header Banner (Linear Alabaster Luminous Card) */}
      <div className="hero-card-alabaster" style={{
        padding: "28px 32px",
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
            border: "1px solid #c7d2fe",
            padding: "4px 12px",
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: 800,
            color: "#4f46e5",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 10,
            boxShadow: "0 1px 3px rgba(79, 70, 229, 0.1)"
          }}>
            <FlaskConical size={14} color="#4f46e5" />
            Deterministic Evaluation Suite • 8 Controlled Scenarios
          </div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginBottom: 6,
            color: "var(--text-primary)"
          }}>
            Mutation Lab — Controlled Drift & Bug Injection
          </h1>
          <p style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            maxWidth: 760,
            lineHeight: 1.6
          }}>
            Inject real DOM changes and application bugs into the local ShopMart store.
            Watch IntentLock auto-heal benign UI drift in seconds, and strictly refuse to heal real business regressions.
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={resetting}
          style={{
            padding: "10px 18px",
            fontSize: 12,
            fontWeight: 600
          }}
        >
          <RotateCw size={14} color="#4f46e5" className={resetting ? "pulsing-dot" : ""} />
          <span>{resetting ? "Resetting Store Fixtures..." : "Reset Store Baseline (Version A)"}</span>
        </button>
      </div>

      {/* Grid of 8 Scenario Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
        {scenarios.map(sc => {
          const isRunning = runningId === sc.id;
          const isHealable = sc.expected === "HEALED";

          return (
            <div
              key={sc.id}
              className="card-interactive"
              style={{
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                borderLeft: `4px solid ${isHealable ? "#4f46e5" : "#e11d48"}`
              }}
            >
              <div>
                {/* Card Header Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: sc.category === "ui" ? "#eef2ff" : (sc.category === "workflow" ? "#f5f3ff" : "#fff1f2"),
                      color: sc.category === "ui" ? "#4f46e5" : (sc.category === "workflow" ? "#6d28d9" : "#e11d48"),
                      border: `1px solid ${sc.category === "ui" ? "#c7d2fe" : (sc.category === "workflow" ? "#ddd6fe" : "#fecdd3")}`
                    }}>
                      {sc.typeLabel}
                    </span>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                      {sc.name}
                    </h3>
                  </div>

                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 9999,
                    background: isHealable ? "#ecfdf5" : (sc.expected === "REVIEW_REQUIRED" ? "#fffbeb" : "#fff1f2"),
                    color: isHealable ? "#047857" : (sc.expected === "REVIEW_REQUIRED" ? "#b45309" : "#be123c"),
                    border: `1px solid ${isHealable ? "#6ee7b7" : (sc.expected === "REVIEW_REQUIRED" ? "#fde68a" : "#fca5a5")}`
                  }}>
                    {sc.expectedLabel}
                  </span>
                </div>

                {/* Description */}
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 14 }}>
                  {sc.description}
                </p>

                {/* Invariant Tag */}
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid var(--border-light)",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 11,
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#475569",
                  marginBottom: 16
                }}>
                  <span><strong>Invariant Target:</strong> {sc.invariants}</span>
                  <span style={{ color: "#64748b", fontFamily: "var(--font-mono)", fontSize: 10 }}>{sc.id}</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                className="btn btn-primary"
                onClick={() => handleRun(sc.id)}
                disabled={isRunning}
                style={{
                  width: "100%",
                  background: isHealable
                    ? "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)"
                    : (sc.expected === "REVIEW_REQUIRED"
                      ? "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)"
                      : "linear-gradient(135deg, #e11d48 0%, #be123c 100%)"),
                  borderColor: isHealable ? "#4338ca" : (sc.expected === "REVIEW_REQUIRED" ? "#6d28d9" : "#be123c"),
                  boxShadow: isHealable ? "0 2px 8px rgba(79, 70, 229, 0.3)" : "0 2px 8px rgba(225, 29, 72, 0.3)",
                  fontSize: 12,
                  padding: "8px 14px"
                }}
              >
                {isRunning ? (
                  <>
                    <RotateCw size={13} className="pulsing-dot" />
                    <span>Executing Live Run in Playwright...</span>
                  </>
                ) : (
                  <>
                    <Play size={13} fill="#ffffff" />
                    <span>Inject Mutation & Run Test</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
