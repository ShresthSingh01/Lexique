import React from "react";
import {
  GitCompare,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Layers,
  Code2,
  Sparkles,
  ExternalLink
} from "lucide-react";

interface Props {
  scenarioId?: string | null;
  activeStepName?: string;
  originalLocator?: string;
  healedLocator?: string;
  screenshotUrl?: string;
  runStatus?: string;
  onOpenScreenshot?: () => void;
}

export const VersionSplitView: React.FC<Props> = ({
  scenarioId = "M01_RENAME_TARGET",
  activeStepName = "Proceed to Checkout",
  originalLocator = "[data-testid='checkout-btn']",
  healedLocator = "#place-order-action",
  screenshotUrl,
  runStatus = "HEALED",
  onOpenScreenshot
}) => {
  // Scenario-specific markup metadata
  const scenarioMap: Record<string, {
    title: string;
    category: string;
    diffType: string;
    versionA: {
      label: string;
      locator: string;
      domSnippet: string;
      price: string;
      placement: string;
    };
    versionB: {
      label: string;
      locator: string;
      domSnippet: string;
      price: string;
      placement: string;
      changedTags: string[];
    };
    markupDiff: {
      field: string;
      before: string;
      after: string;
      status: "drift_healed" | "ambiguous" | "real_bug" | "uncontracted";
    }[];
    policyVerdict: string;
    resolution: string;
  }> = {
    M01_RENAME_TARGET: {
      title: "M01: Rename Checkout Button Locator",
      category: "Harmless UI Drift",
      diffType: "Locator & Label Renamed",
      versionA: {
        label: "Checkout",
        locator: "#checkout-button / [data-testid='checkout-btn']",
        domSnippet: `<div class="card summary-card">\n  <div id="cart-total">$54.00</div>\n  <a id="checkout-button" data-testid="checkout-btn" class="btn btn-primary">\n    Checkout\n  </a>\n</div>`,
        price: "$54.00",
        placement: "Cart Summary Action Bar"
      },
      versionB: {
        label: "Place order",
        locator: "#place-order-action / [data-testid='place-order-btn']",
        domSnippet: `<div class="card summary-card">\n  <div id="cart-total">$54.00</div>\n  <!-- MARKUP CHANGE: ID and InnerText Drift -->\n  <a id="place-order-action" data-testid="place-order-btn" class="btn btn-primary">\n    Place order  <-- [RENAMED LABEL]\n  </a>\n</div>`,
        price: "$54.00",
        placement: "Cart Summary Action Bar (Preserved)",
        changedTags: ["ID: #place-order-action", "Label: 'Place order'", "TestID: place-order-btn"]
      },
      markupDiff: [
        { field: "Element ID", before: "#checkout-button", after: "#place-order-action", status: "drift_healed" },
        { field: "Button Label", before: "'Checkout'", after: "'Place order'", status: "drift_healed" },
        { field: "Data-TestID", before: "checkout-btn", after: "place-order-btn", status: "drift_healed" },
        { field: "Role & Tag", before: "role=button (<a>)", after: "role=button (<a>)", status: "drift_healed" },
        { field: "Backend Price", before: "$54.00 (Verified)", after: "$54.00 (Verified)", status: "drift_healed" }
      ],
      policyVerdict: "APPROVED • 7/7 Invariants Verified (Unique, Non-Destructive, Role-Matched)",
      resolution: "Clean Fixture Replay & One-Step Override to '#place-order-action'"
    },
    M02_RESTRUCTURE_DOM: {
      title: "M02: Restructure DOM Hierarchy",
      category: "Layout Structure Drift",
      diffType: "Nested Container Wrappers Added",
      versionA: {
        label: "Checkout",
        locator: "[data-testid='checkout-btn']",
        domSnippet: `<div class="card summary-card">\n  <a id="checkout-button" data-testid="checkout-btn">\n    Checkout\n  </a>\n</div>`,
        price: "$54.00",
        placement: "Direct Child of .card"
      },
      versionB: {
        label: "Checkout",
        locator: "#checkout-action-restructured",
        domSnippet: `<div class="custom-dom-restructure-wrapper-outer">       <-- [WRAPPER 1]\n  <div class="summary-action-container-inner">          <-- [WRAPPER 2]\n    <div class="nested-interactive-slot">              <-- [WRAPPER 3]\n      <a id="checkout-action-restructured">Checkout</a>\n    </div>\n  </div>\n</div>`,
        price: "$54.00",
        placement: "Nested in 3 custom layout wrappers",
        changedTags: ["DOM Depth: +3 Levels", "ID: #checkout-action-restructured", "CSS Classes Changed"]
      },
      markupDiff: [
        { field: "DOM Depth", before: "Depth 2 (Direct Container)", after: "Depth 5 (3 Nested Wrappers)", status: "drift_healed" },
        { field: "Element ID", before: "#checkout-button", after: "#checkout-action-restructured", status: "drift_healed" },
        { field: "Button Label", before: "'Checkout'", after: "'Checkout' (Unchanged)", status: "drift_healed" },
        { field: "Backend Price", before: "$54.00 (Verified)", after: "$54.00 (Verified)", status: "drift_healed" }
      ],
      policyVerdict: "APPROVED • Layout tree relocated, but interactive intent preserved",
      resolution: "StagehandAdapter discovers target in nested slot; Clean Replay succeeds"
    },
    M03_MOVE_TARGET: {
      title: "M03: Relocate Action Section",
      category: "Spatial Viewport Drift",
      diffType: "Relocated to Floating Action Card",
      versionA: {
        label: "Checkout",
        locator: "#checkout-button",
        domSnippet: `<div class="card summary-card">\n  <a id="checkout-button">Checkout</a>\n</div>`,
        price: "$54.00",
        placement: "Bottom Right of Summary Card"
      },
      versionB: {
        label: "Checkout",
        locator: "#checkout-relocated",
        domSnippet: `<!-- RELOCATED BELOW CART SUMMARY TABLE -->\n<div class="fast-order-routing-section" style="border: 1px dashed #6366f1;">\n  <span>⚡ Fast Order Routing Section</span>\n  <a id="checkout-relocated">Checkout</a>\n</div>`,
        price: "$54.00",
        placement: "Moved 140px down to 'Fast Order Routing' card",
        changedTags: ["Spatial Viewport: +140px Y-Offset", "Parent: .fast-order-routing-section", "ID: #checkout-relocated"]
      },
      markupDiff: [
        { field: "Section Context", before: "Cart Summary Card", after: "⚡ Fast Order Routing Section", status: "drift_healed" },
        { field: "Element ID", before: "#checkout-button", after: "#checkout-relocated", status: "drift_healed" },
        { field: "Y-Coordinate", before: "y: 420px", after: "y: 560px (+140px)", status: "drift_healed" },
        { field: "Backend Price", before: "$54.00 (Verified)", after: "$54.00 (Verified)", status: "drift_healed" }
      ],
      policyVerdict: "APPROVED • Spatial section changed; intent matches unique action",
      resolution: "Replays with override to '#checkout-relocated'; Oracle verifies database"
    },
    M04_ADD_REVIEW_STEP: {
      title: "M04: Inject Intermediate Review Step",
      category: "Workflow Drift",
      diffType: "Uncontracted Screen Injected",
      versionA: {
        label: "Direct Checkout Form",
        locator: "/checkout",
        domSnippet: `Cart Summary --> Direct Payment & Customer Form (/checkout)`,
        price: "$54.00",
        placement: "1-Click Direct Transition"
      },
      versionB: {
        label: "Proceed to Review",
        locator: "#proceed-to-review-btn",
        domSnippet: `Cart Summary --> [INJECTED SCREEN: /checkout/review] --> /checkout\n<a id="proceed-to-review-btn">Proceed to Review</a>`,
        price: "$54.00",
        placement: "Intermediate Page: /checkout/review",
        changedTags: ["URL: /checkout/review", "Uncontracted Transition", "Action: Proceed to Review"]
      },
      markupDiff: [
        { field: "Workflow Steps", before: "Step 3 -> Step 4 Direct", after: "Intermediate Review Step Injected", status: "uncontracted" },
        { field: "Contracted Route", before: "/checkout", after: "/checkout/review (Uncontracted)", status: "uncontracted" },
        { field: "Safety Policy", before: "Permitted Transitions", after: "Fails Closed (Requires Human Approval)", status: "uncontracted" }
      ],
      policyVerdict: "REVIEW_REQUIRED • Uncontracted workflow screen; engine refuses arbitrary bypass",
      resolution: "Halts safely for human review. To accept, promote contract in Contract Studio."
    },
    M05_DUPLICATE_LABEL: {
      title: "M05: Ambiguous Duplicate Action Labels",
      category: "Ambiguity Drift",
      diffType: "Duplicate Conflicting Buttons",
      versionA: {
        label: "Checkout (Single Unique Button)",
        locator: "#checkout-button",
        domSnippet: `<a id="checkout-button">Checkout</a> <!-- SINGLE UNIQUE ELEMENT -->`,
        price: "$54.00",
        placement: "Single Primary Button"
      },
      versionB: {
        label: "Place order (Two Conflicting Buttons)",
        locator: "#dup-action-1 vs #dup-action-2",
        domSnippet: `<div style="display: flex; gap: 12px;">\n  <a id="dup-action-1">Place order</a> <-- [EXPRESS MODE]\n  <a id="dup-action-2">Place order</a> <-- [STANDARD MODE]\n</div>`,
        price: "$54.00",
        placement: "Two Identical Labels (Express vs Standard)",
        changedTags: ["Ambiguity Detected", "Duplicate Label Count: 2", "isUnique: false"]
      },
      markupDiff: [
        { field: "Button Count", before: "1 Unique Action", after: "2 Identical Conflicting Buttons", status: "ambiguous" },
        { field: "Target Uniqueness", before: "isUnique: true", after: "isUnique: false (Violation)", status: "ambiguous" },
        { field: "Policy Rule 5", before: "Passes Uniqueness Gate", after: "Trigger AMBIGUOUS_DUPLICATE Rejection", status: "ambiguous" }
      ],
      policyVerdict: "REVIEW_REQUIRED • Policy Gate Rule 5 Rejection: Ambiguous duplicate elements",
      resolution: "Fails closed to prevent accidental branching (Express vs Standard)."
    },
    M06_WRONG_TOTAL: {
      title: "M06: Seeded Price Inflation Bug",
      category: "Real Application Bug",
      diffType: "Financial Invariant Violated (+$10 Overcharge)",
      versionA: {
        label: "Total: $54.00",
        locator: "#cart-total",
        domSnippet: `Subtotal: $49.00 + Tax: $5.00 = Total: $54.00 [CORRECT]`,
        price: "$54.00",
        placement: "Cart Summary Calculation"
      },
      versionB: {
        label: "Total: $64.00 (+$10 Bug)",
        locator: "#cart-total",
        domSnippet: `Subtotal: $49.00 + Tax: $5.00 = Total: $64.00 <-- [BUG: +$10 OVERCHARGE!]`,
        price: "$64.00",
        placement: "Backend computes wrong total ($64.00)",
        changedTags: ["Price Discrepancy: +$10.00", "Total: $64.00", "Invariant: Violated"]
      },
      markupDiff: [
        { field: "Calculated Total", before: "$54.00 ($49 item + $5 tax)", after: "$64.00 (Overcharge Bug)", status: "real_bug" },
        { field: "Database Order Total", before: "54.00", after: "64.00 (Mismatch!)", status: "real_bug" },
        { field: "Outcome Verifier", before: "order_total_match: PASSED", after: "order_total_match: FAILED", status: "real_bug" }
      ],
      policyVerdict: "HARD FAIL • Refuses to heal real business defect (0 False Heals Guarantee)",
      resolution: "Test marked FAILED (VERIFIER_CONDITION_FAILED). Preserves bug report for developers."
    },
    M07_PAYMENT_ERROR: {
      title: "M07: Seed Mock Payment Failure",
      category: "Real Application Bug",
      diffType: "Gateway Authorization Failure",
      versionA: {
        label: "Payment Status: Approved",
        locator: "#order-payment-status",
        domSnippet: `Payment Status: approved\nConfirmation: Banner Visible`,
        price: "$54.00",
        placement: "Payment Gateway Sandbox"
      },
      versionB: {
        label: "Payment Status: Declined",
        locator: "#order-payment-status",
        domSnippet: `Payment Status: declined <-- [GATEWAY REJECTED TRANSACTION]\nBanner: Failed`,
        price: "$54.00",
        placement: "Gateway Returns Error",
        changedTags: ["Payment Status: declined", "Gateway Error", "Invariant: Violated"]
      },
      markupDiff: [
        { field: "Payment Status", before: "approved", after: "declined (Gateway Failure)", status: "real_bug" },
        { field: "UI Confirmation", before: "Banner Visible (#confirmed-order-id)", after: "Payment Error Banner", status: "real_bug" },
        { field: "Outcome Verifier", before: "payment_status_match: PASSED", after: "payment_status_match: FAILED", status: "real_bug" }
      ],
      policyVerdict: "HARD FAIL • Business logic assertion failed; recovery strictly prohibited",
      resolution: "Test marked FAILED. Ojastra refuses to mark declined payments green."
    },
    M08_SERVER_UNAVAILABLE: {
      title: "M08: Force HTTP 503 Crash",
      category: "Infrastructure Defect",
      diffType: "Backend Service 503 Outage",
      versionA: {
        label: "HTTP 200 OK",
        locator: "POST /checkout/submit",
        domSnippet: `Backend Service Healthy (HTTP 200 OK)`,
        price: "$54.00",
        placement: "Express Order Handler"
      },
      versionB: {
        label: "HTTP 503 Service Unavailable",
        locator: "POST /checkout/submit",
        domSnippet: `<h1>503 Service Unavailable</h1> <-- [BACKEND SERVICE DOWN]`,
        price: "N/A",
        placement: "Database Service Offline",
        changedTags: ["HTTP Status: 503", "Backend Offline", "Recovery: Bypassed"]
      },
      markupDiff: [
        { field: "HTTP Status Code", before: "200 OK", after: "503 Service Unavailable", status: "real_bug" },
        { field: "Classifier Category", before: "NORMAL_EXECUTION", after: "APPLICATION_OR_NETWORK_ERROR", status: "real_bug" },
        { field: "Recovery Eligibility", before: "N/A", after: "isRecoverable: false (Bypassed)", status: "real_bug" }
      ],
      policyVerdict: "HARD FAIL • Infrastructure error; candidate discovery bypassed completely",
      resolution: "Test marked FAILED (APPLICATION_OR_NETWORK_ERROR). Alerts DevOps/SRE."
    }
  };

  const currentScenario = scenarioMap[scenarioId || ""] || scenarioMap.M01_RENAME_TARGET;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top Banner: Scenario Title & Mode */}
      <div className="card-clean" style={{
        padding: "14px 18px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="icon-pod icon-pod-cobalt" style={{ width: 36, height: 36 }}>
            <GitCompare size={18} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              {currentScenario.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#1d4ed8",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 4,
                padding: "1px 6px"
              }}>
                {currentScenario.category}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#475569",
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                borderRadius: 4,
                padding: "1px 6px"
              }}>
                {currentScenario.diffType}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`badge ${runStatus === "HEALED" ? "badge-healed" : (runStatus === "PASSED" ? "badge-passed" : (runStatus === "REVIEW_REQUIRED" ? "badge-review" : "badge-failed"))}`}>
            OUTCOME: {runStatus}
          </span>
        </div>
      </div>

      {/* Side-by-Side Version A vs Version B Split Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
        {/* LEFT COLUMN: Version A (Baseline) */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #bfdbfe",
          borderRadius: 10,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minWidth: 0,
          overflow: "hidden",
          boxSizing: "border-box",
          boxShadow: "var(--shadow-card)"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 10,
            borderBottom: "1px solid #dbeafe"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                background: "#2563eb",
                color: "#ffffff",
                fontSize: 10,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 4,
                fontFamily: "var(--font-mono)"
              }}>
                VERSION A
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#1e3a8a" }}>
                Canonical Contract Baseline
              </span>
            </div>
            <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700 }}>
              Expected State
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Target Element Locator:</div>
              <div style={{ fontFamily: "var(--font-mono)", color: "#2563eb", fontWeight: 700, marginTop: 2, wordBreak: "break-all" }}>
                {currentScenario.versionA.locator}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Visible Action Label:</div>
              <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                "{currentScenario.versionA.label}"
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Placement / Structure:</div>
              <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>
                {currentScenario.versionA.placement}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Verified Total Price:</div>
              <div style={{ fontWeight: 800, color: "#059669", marginTop: 2 }}>
                {currentScenario.versionA.price}
              </div>
            </div>
          </div>

          {/* Version A DOM Preview */}
          <div style={{ marginTop: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1e3a8a", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Code2 size={13} />
              <span>Version A Baseline DOM Snapshot:</span>
            </div>
            <pre style={{
              background: "#0f172a",
              color: "#38bdf8",
              fontSize: 10,
              padding: 10,
              borderRadius: 6,
              overflowX: "auto",
              fontFamily: "var(--font-mono)",
              lineHeight: 1.4,
              margin: 0,
              maxWidth: "100%"
            }}>
              {currentScenario.versionA.domSnippet}
            </pre>
          </div>
        </div>

        {/* RIGHT COLUMN: Version B (Observed / Mutated) */}
        <div style={{
          background: "#ffffff",
          border: runStatus === "HEALED" ? "1px solid #a7f3d0" : (runStatus === "FAILED" ? "1px solid #fecdd3" : "1px solid #fde68a"),
          borderRadius: 10,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minWidth: 0,
          overflow: "hidden",
          boxSizing: "border-box",
          boxShadow: runStatus === "HEALED" ? "0 2px 8px rgba(16, 185, 129, 0.08)" : "0 2px 8px rgba(225, 29, 72, 0.08)"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 10,
            borderBottom: "1px solid var(--border-light)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                background: runStatus === "HEALED" ? "#059669" : (runStatus === "FAILED" ? "#e11d48" : "#d97706"),
                color: "#ffffff",
                fontSize: 10,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 4,
                fontFamily: "var(--font-mono)"
              }}>
                VERSION B
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                Mutated / Observed Page State
              </span>
            </div>
            <span style={{
              fontSize: 11,
              color: runStatus === "HEALED" ? "#059669" : (runStatus === "FAILED" ? "#e11d48" : "#d97706"),
              fontWeight: 800
            }}>
              {runStatus === "HEALED" ? "Auto-Recovered" : (runStatus === "FAILED" ? "Defect Preserved" : "Review Required")}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Discovered / Observed Locator:</div>
              <div style={{ fontFamily: "var(--font-mono)", color: runStatus === "HEALED" ? "#059669" : "#e11d48", fontWeight: 700, marginTop: 2, wordBreak: "break-all" }}>
                {currentScenario.versionB.locator}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Discovered Action Label:</div>
              <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                "{currentScenario.versionB.label}"
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Mutated Structure / Placement:</div>
              <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>
                {currentScenario.versionB.placement}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Observed Order Total:</div>
              <div style={{ fontWeight: 800, color: currentScenario.versionB.price === "$64.00" ? "#e11d48" : "#059669", marginTop: 2 }}>
                {currentScenario.versionB.price} {currentScenario.versionB.price === "$64.00" ? "⚠️ (+10 Bug)" : "✓ Verified"}
              </div>
            </div>
          </div>

          {/* Version B DOM Preview */}
          <div style={{ marginTop: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Code2 size={13} color="#4f46e5" />
                <span>Version B Mutated DOM Snapshot:</span>
              </div>
              {screenshotUrl && onOpenScreenshot && (
                <button
                  type="button"
                  onClick={onOpenScreenshot}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#4f46e5",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  <ExternalLink size={11} />
                  <span>View Screenshot</span>
                </button>
              )}
            </div>
            <pre style={{
              background: "#0f172a",
              color: runStatus === "HEALED" ? "#4ade80" : (runStatus === "FAILED" ? "#f87171" : "#fbbf24"),
              fontSize: 10,
              padding: 10,
              borderRadius: 6,
              overflowX: "auto",
              fontFamily: "var(--font-mono)",
              lineHeight: 1.4,
              margin: 0,
              maxWidth: "100%"
            }}>
              {currentScenario.versionB.domSnippet}
            </pre>
          </div>
        </div>
      </div>

      {/* Semantic Markup Diff Matrix Card */}
      <div className="card-clean" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Sparkles size={16} color="#4f46e5" />
          <h4 style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            Visual Semantic Markup Diff & Resolution Invariants
          </h4>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 14 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--border-light)" }}>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-tertiary)", fontSize: 11, fontWeight: 700 }}>ATTRIBUTE</th>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "#2563eb", fontSize: 11, fontWeight: 700 }}>VERSION A (BASELINE)</th>
              <th style={{ textAlign: "center", padding: "8px 6px", width: 30 }}></th>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-primary)", fontSize: 11, fontWeight: 700 }}>VERSION B (MUTATED)</th>
              <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-tertiary)", fontSize: 11, fontWeight: 700 }}>CLASSIFICATION</th>
            </tr>
          </thead>
          <tbody>
            {currentScenario.markupDiff.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td style={{ padding: "8px 12px", fontWeight: 700, color: "var(--text-secondary)" }}>
                  {row.field}
                </td>
                <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", color: "#1e40af", fontWeight: 600 }}>
                  {row.before}
                </td>
                <td style={{ textAlign: "center", padding: "8px 6px", color: "var(--text-tertiary)" }}>
                  <ArrowRight size={13} />
                </td>
                <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", color: row.status === "real_bug" ? "#e11d48" : (row.status === "drift_healed" ? "#059669" : "#d97706"), fontWeight: 700 }}>
                  {row.after}
                </td>
                <td style={{ textAlign: "right", padding: "8px 12px" }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: 9999,
                    fontFamily: "var(--font-mono)",
                    background: row.status === "drift_healed" ? "#ecfdf5" : (row.status === "real_bug" ? "#fff1f2" : "#fffbeb"),
                    color: row.status === "drift_healed" ? "#047857" : (row.status === "real_bug" ? "#be123c" : "#b45309"),
                    border: `1px solid ${row.status === "drift_healed" ? "#a7f3d0" : (row.status === "real_bug" ? "#fecdd3" : "#fde68a")}`
                  }}>
                    {row.status.toUpperCase().replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Resolution Bar */}
        <div style={{
          background: "#f8fafc",
          border: "1px solid var(--border-light)",
          borderRadius: 8,
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
              Policy Gate Decision:
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
              {currentScenario.policyVerdict}
            </span>
          </div>

          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
              Resolution Strategy:
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5" }}>
              {currentScenario.resolution}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
