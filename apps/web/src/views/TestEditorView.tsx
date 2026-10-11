import React, { useState } from "react";
import {
  Play,
  CheckCircle2,
  ShieldCheck,
  Code2,
  Copy,
  Database,
  ExternalLink,
  Layers,
  Lock,
  AlertTriangle,
  Sparkles
} from "lucide-react";

interface Props {
  testId?: string;
  contract?: any;
  onRunTest: () => void;
  isRunning?: boolean;
}

interface StepItem {
  num: number;
  id: string;
  action: string;
  name: string;
  description: string;
  target: string;
  value?: string;
  risk: string;
  code: string;
}

export const TestEditorView: React.FC<Props> = ({
  testId = "checkout-valid-card",
  contract,
  onRunTest,
  isRunning
}) => {
  const [activeTab, setActiveTab] = useState<"steps" | "code">("steps");
  const [copied, setCopied] = useState(false);

  const displayTestId = contract?.testId || testId;
  const versionBadge = contract?.contractVersion
    ? `CONTRACT V${contract.contractVersion} (ACTIVE)`
    : "CONTRACT V1 (ACTIVE)";
  const title = contract?.name || "Complete checkout with a valid test card";
  const goalDescription =
    contract?.description ||
    "End-to-end checkout flow verifying cart addition, customer details entry, payment authorization, and independent backend order state verification.";
  const baseUrl = contract?.baseUrl || "http://localhost:3001";

  // Preconditions from real contract
  const preconditions: string[] = contract?.preconditions || [
    "Cart must be empty at start",
    "Test product SKU-PROD-001 must exist with unit price $49.00",
    "Synthetic test card 4242424242424242 must be accepted"
  ];

  // Steps matching real contract or canonical baseline
  const displaySteps: StepItem[] =
    contract?.steps && contract.steps.length > 0
      ? contract.steps.map((s: any, idx: number) => ({
          num: idx + 1,
          id: s.stepId || `step-${idx + 1}`,
          action: s.actionType || "click",
          name: s.name || s.intent || `Step ${idx + 1}`,
          description: s.intent || s.name || "Execute step action",
          target: s.targetLocator,
          value: s.inputValue ? `"${s.inputValue}"` : undefined,
          risk: s.riskCategory || "low",
          code:
            s.actionType === "navigate"
              ? `await page.goto("${s.targetLocator?.startsWith("http") ? s.targetLocator : `${baseUrl}${s.targetLocator}`}");`
              : s.actionType === "fill"
              ? `await page.locator("${s.targetLocator}").fill("${s.inputValue || ""}");`
              : `await page.locator("${s.targetLocator}").click();`
        }))
      : [
          {
            num: 1,
            id: "step-1-nav-catalog",
            action: "navigate",
            name: "Navigate to Catalog",
            description: "Open catalog page",
            target: "/",
            value: undefined,
            risk: "low",
            code: 'await page.goto("http://localhost:3001/");'
          },
          {
            num: 2,
            id: "step-2-add-to-cart",
            action: "click",
            name: "Add Pro Suite to Cart",
            description: "Add test product SKU-PROD-001 to shopping cart",
            target: "[data-testid='add-to-cart-btn']",
            value: undefined,
            risk: "low",
            code: 'await page.locator("[data-testid=\'add-to-cart-btn\']").click();'
          },
          {
            num: 3,
            id: "step-3-proceed-to-checkout",
            action: "click",
            name: "Proceed to Checkout",
            description: "Click the primary checkout button from cart page",
            target: "[data-testid='checkout-btn']",
            value: undefined,
            risk: "low",
            code: 'await page.locator("[data-testid=\'checkout-btn\']").click();'
          },
          {
            num: 4,
            id: "step-4-fill-customer-name",
            action: "fill",
            name: "Enter Customer Full Name",
            description: "Fill customer full name field in checkout form",
            target: "#customerName",
            value: '"Alex Tester"',
            risk: "medium",
            code: 'await page.locator("#customerName").fill("Alex Tester");'
          },
          {
            num: 5,
            id: "step-5-submit-order",
            action: "click",
            name: "Complete Purchase",
            description: "Submit final checkout order payment form",
            target: "[data-testid='submit-order-btn']",
            value: undefined,
            risk: "high",
            code: 'await page.locator("[data-testid=\'submit-order-btn\']").click();'
          }
        ];

  // Invariants from real contract
  const invariants = contract?.invariants || [
    {
      id: "inv-no-5xx",
      description: "No HTTP 5xx responses encountered during test execution",
      type: "no_5xx_errors"
    },
    {
      id: "inv-no-dup-submits",
      description: "No duplicate order submissions created for this test run",
      type: "no_duplicate_submits"
    },
    {
      id: "inv-total-calc",
      description: "Calculated total must equal subtotal plus estimated tax ($54.00)",
      type: "total_equals_subtotal_plus_tax"
    }
  ];

  // Success conditions from real contract
  const successConditions = contract?.successConditions || [
    {
      id: "cond-ui-confirmation",
      description: "UI displays order confirmation banner with confirmed status",
      type: "ui_element_visible",
      expected: "[data-testid='confirmation-banner']"
    },
    {
      id: "cond-order-sku-qty",
      description: "Backend order recorded with SKU-PROD-001 and quantity 1",
      type: "sku_quantity_match"
    },
    {
      id: "cond-order-total",
      description: "Backend verified order total is exactly $54.00 ($49 item + $5 tax)",
      type: "order_total_match"
    },
    {
      id: "cond-payment-approved",
      description: "Mock payment status is approved",
      type: "payment_status_match"
    },
    {
      id: "cond-no-duplicates",
      description: "No duplicate orders exist in backend for this test run",
      type: "no_duplicate_orders"
    }
  ];

  // Dynamically generated Playwright code from contract
  const generatedCode = `import { test, expect } from '@playwright/test';
import { IntentLockOracle } from '@intentlock/oracle';

test.describe('E2E Checkout - IntentLock Protected', () => {
  test('${title}', async ({ page }) => {
    const oracle = new IntentLockOracle({ apiUrl: 'http://localhost:3000' });

${displaySteps
  .map(
    (s) =>
      `    // Step ${s.num}: ${s.name} (${s.description})\n    ${s.code}`
  )
  .join("\n\n")}

    // Step ${displaySteps.length + 1}: Wait for confirmation UI
    await expect(page.locator("[data-testid='confirmation-banner']")).toBeVisible({ timeout: 5000 });

    // Step ${displaySteps.length + 2}: Independent Test Oracle verification
    const verification = await oracle.verifyBackendOrder({
      expectedTotal: 54.00,
      sku: 'SKU-PROD-001',
      expectedCharges: 1
    });

    expect(verification.dbMatch).toBe(true);
    expect(verification.invariantsPreserved).toBe(true);
  });
});`;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: "1px solid var(--border-light)"
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 4
            }}
          >
            <span>Tests</span>
            <span>/</span>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              {displayTestId}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 4,
                background: "#eef2ff",
                color: "#4f46e5",
                border: "1px solid #c7d2fe",
                fontFamily: "var(--font-mono)"
              }}
            >
              {versionBadge}
            </span>
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em"
            }}
          >
            Intent Contract & Test Generator
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={handleCopy}
            style={{ fontSize: 12 }}
          >
            {copied ? (
              <CheckCircle2 size={14} color="#059669" />
            ) : (
              <Copy size={14} />
            )}
            <span>{copied ? "Copied Code!" : "Copy Test"}</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={onRunTest}
            disabled={isRunning}
            style={{ padding: "8px 18px" }}
          >
            <Play size={14} fill="#ffffff" />
            <span>{isRunning ? "Executing..." : "Execute Test"}</span>
          </button>
        </div>
      </div>

      {/* Split 2-Column Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.25fr",
          gap: 24
        }}
      >
        {/* Left Column: Intent Contract Specification */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Main Intent Card */}
          <div className="card-clean" style={{ padding: "22px 24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "#eef2ff",
                  color: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <ShieldCheck size={16} />
              </div>
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)"
                }}
              >
                Intent Contract Specification
              </h2>
            </div>

            {/* Goal */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 6
                }}
              >
                High-Level User Goal
              </label>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid var(--border-light)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  lineHeight: 1.5
                }}
              >
                {goalDescription}
              </div>
            </div>

            {/* Target URL */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 6
                }}
              >
                Target App Base URL
              </label>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid var(--border-light)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  color: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <span>{baseUrl}</span>
                <a
                  href={baseUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#64748b" }}
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>

            {/* Preconditions */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 6
                }}
              >
                Preconditions (Clean State)
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {preconditions.map((prec, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: "var(--text-primary)"
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#10b981",
                        flexShrink: 0
                      }}
                    />
                    <span>{prec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Independent Test Oracle Card */}
          <div className="card-clean" style={{ padding: "22px 24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Database size={16} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text-primary)"
                  }}
                >
                  Independent Test Oracle (Post-Conditions)
                </h2>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  Verified directly against backend database &amp; invariants
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 12
              }}
            >
              {successConditions.map((cond: any) => (
                <div
                  key={cond.id}
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    padding: "8px 12px",
                    borderRadius: 6,
                    color: "#166534"
                  }}
                >
                  <strong>{cond.id}:</strong> {cond.description}
                </div>
              ))}
            </div>
          </div>

          {/* Business Invariants Card */}
          <div
            className="card-clean"
            style={{
              padding: "20px 24px",
              borderLeft: "4px solid #ef4444"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8
              }}
            >
              <AlertTriangle size={15} color="#dc2626" />
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#991b1b"
                }}
              >
                Protected Business Invariants (Strict Policy Gate)
              </h3>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                marginBottom: 10
              }}
            >
              If order total deviates from $54.00, or duplicate submissions
              occur, IntentLock <strong>abstained from healing</strong> and flags
              a hard business regression.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {invariants.map((inv: any) => (
                <div
                  key={inv.id}
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "#991b1b",
                    background: "#fef2f2",
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: "1px solid #fecaca"
                  }}
                >
                  {inv.id} • {inv.description}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Generated Playwright Steps */}
        <div
          className="card-clean"
          style={{ padding: "22px 24px", display: "flex", flexDirection: "column" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "#f1f5f9",
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Code2 size={16} />
              </div>
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)"
                }}
              >
                Generated Test Steps (Playwright Chromium)
              </h2>
            </div>

            {/* Steps vs Raw Code Toggle */}
            <div
              style={{
                display: "flex",
                background: "#f1f5f9",
                padding: 3,
                borderRadius: 7
              }}
            >
              <button
                onClick={() => setActiveTab("steps")}
                style={{
                  background: activeTab === "steps" ? "#ffffff" : "transparent",
                  color: activeTab === "steps" ? "#4f46e5" : "var(--text-secondary)",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: activeTab === "steps" ? "var(--shadow-sm)" : "none"
                }}
              >
                Visual Steps ({displaySteps.length})
              </button>
              <button
                onClick={() => setActiveTab("code")}
                style={{
                  background: activeTab === "code" ? "#ffffff" : "transparent",
                  color: activeTab === "code" ? "#4f46e5" : "var(--text-secondary)",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: activeTab === "code" ? "var(--shadow-sm)" : "none"
                }}
              >
                Playwright TypeScript
              </button>
            </div>
          </div>

          {activeTab === "steps" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flex: 1,
                overflowY: "auto"
              }}
            >
              {displaySteps.map((s) => {
                const actionColor =
                  s.action === "navigate"
                    ? "#2563eb"
                    : s.action === "fill"
                    ? "#059669"
                    : s.action === "click"
                    ? "#4f46e5"
                    : "#d97706";

                return (
                  <div
                    key={s.num}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid var(--border-light)",
                      borderRadius: 8,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: "#ffffff",
                        border: "1px solid var(--border-medium)",
                        color: "var(--text-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        marginTop: 2,
                        flexShrink: 0
                      }}
                    >
                      {s.num}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 5
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            color: actionColor,
                            background: "#ffffff",
                            border: `1px solid ${actionColor}33`,
                            padding: "2px 6px",
                            borderRadius: 4
                          }}
                        >
                          {s.action}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--text-primary)"
                          }}
                        >
                          {s.name}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)"
                          }}
                        >
                          — {s.description}
                        </span>
                      </div>

                      <div
                        style={{
                          background: "#ffffff",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: 6,
                          padding: "6px 10px",
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          color: "#334155",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <span>{s.target}</span>
                        {s.value && (
                          <span style={{ color: "#059669", fontWeight: 600 }}>
                            {s.value}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ flex: 1, position: "relative" }}>
              <pre
                style={{
                  background: "#0f172a",
                  color: "#e2e8f0",
                  padding: "16px 20px",
                  borderRadius: 8,
                  fontSize: 12,
                  lineHeight: 1.6,
                  overflowX: "auto",
                  height: "100%",
                  minHeight: 460
                }}
              >
                <code>{generatedCode}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
