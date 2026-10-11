import { db } from "./db.js";
import { TestContract } from "@intentlock/contracts";
import { CONFIG } from "./config.js";

export const DEFAULT_CHECKOUT_CONTRACT: TestContract = {
  testId: "checkout-valid-card",
  contractVersion: 1,
  name: "Complete checkout with a valid test card",
  description: "End-to-end checkout flow verifying cart addition, customer details entry, payment authorization, and independent backend order state verification.",
  environmentId: "local-demo",
  baseUrl: CONFIG.demoOrigin,
  preconditions: [
    "Cart must be empty at start",
    "Test product SKU-PROD-001 must exist with unit price $49.00",
    "Synthetic test card 4242424242424242 must be accepted"
  ],
  steps: [
    {
      stepId: "step-1-nav-catalog",
      name: "Navigate to Catalog",
      intent: "Open catalog page",
      actionType: "navigate",
      targetLocator: "/",
      expectedTransition: "catalog_view",
      timeoutMs: 5000,
      riskCategory: "low"
    },
    {
      stepId: "step-2-add-to-cart",
      name: "Add Pro Suite to Cart",
      intent: "Add test product SKU-PROD-001 to shopping cart",
      actionType: "click",
      targetLocator: "[data-testid='add-to-cart-btn']",
      expectedTransition: "cart_view",
      timeoutMs: 5000,
      riskCategory: "low"
    },
    {
      stepId: "step-3-proceed-to-checkout",
      name: "Proceed to Checkout",
      intent: "Click the primary checkout button from cart page",
      actionType: "click",
      targetLocator: "[data-testid='checkout-btn']",
      expectedTransition: "checkout_form",
      timeoutMs: 5000,
      riskCategory: "low"
    },
    {
      stepId: "step-4-fill-customer-name",
      name: "Enter Customer Full Name",
      intent: "Fill customer full name field in checkout form",
      actionType: "fill",
      targetLocator: "#customerName",
      inputValue: "Alex Tester",
      timeoutMs: 5000,
      riskCategory: "medium"
    },
    {
      stepId: "step-5-submit-order",
      name: "Complete Purchase",
      intent: "Submit final checkout order payment form",
      actionType: "click",
      targetLocator: "[data-testid='submit-order-btn']",
      expectedTransition: "confirmation_view",
      timeoutMs: 6000,
      riskCategory: "high"
    }
  ],
  invariants: [
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
  ],
  successConditions: [
    {
      id: "cond-ui-confirmation",
      description: "UI displays order confirmation banner with confirmed status",
      type: "ui_element_visible",
      expected: "[data-testid='confirmation-banner']"
    },
    {
      id: "cond-order-sku-qty",
      description: "Backend order recorded with SKU-PROD-001 and quantity 1",
      type: "sku_quantity_match",
      expected: { sku: "SKU-PROD-001", quantity: 1 }
    },
    {
      id: "cond-order-total",
      description: "Backend verified order total is exactly $54.00 ($49 item + $5 tax)",
      type: "order_total_match",
      expected: 54.00
    },
    {
      id: "cond-payment-approved",
      description: "Mock payment status is approved",
      type: "payment_status_match",
      expected: "approved"
    },
    {
      id: "cond-no-duplicates",
      description: "No duplicate orders exist in backend for this test run",
      type: "no_duplicate_orders",
      expected: 1
    }
  ],
  allowedSideEffects: ["create_test_order"],
  forbiddenSideEffects: ["modify_production_inventory", "charge_real_credit_card"]
};

export const MUTATION_SCENARIOS = [
  {
    id: "M01_RENAME_TARGET",
    name: "Rename Checkout Button",
    description: "Renames 'Checkout' button label to 'Place order' and updates element ID/classes while preserving action intent.",
    mutationType: "LOCATOR_RENAME",
    expectedOutcome: "HEALED",
    riskCategory: "low",
    setupConfig: { variant: "rename" },
    enabled: 1
  },
  {
    id: "M02_RESTRUCTURE_DOM",
    name: "Restructure DOM Hierarchy",
    description: "Wraps checkout button in nested layout containers and updates parent CSS classes without changing page semantics.",
    mutationType: "DOM_RESTRUCTURE",
    expectedOutcome: "HEALED",
    riskCategory: "low",
    setupConfig: { variant: "nested_dom" },
    enabled: 1
  },
  {
    id: "M03_MOVE_TARGET",
    name: "Relocate Checkout Button",
    description: "Moves checkout action into an alternate 'Fast Order Routing' section below the summary card.",
    mutationType: "LAYOUT_MOVE",
    expectedOutcome: "HEALED",
    riskCategory: "low",
    setupConfig: { variant: "relocated_section" },
    enabled: 1
  },
  {
    id: "M04_ADD_REVIEW_STEP",
    name: "Inject Intermediate Review Step",
    description: "Inserts a new intermediate review page between cart and checkout form that is not in the original contract.",
    mutationType: "WORKFLOW_STEP",
    expectedOutcome: "REVIEW_REQUIRED",
    riskCategory: "medium",
    setupConfig: { variant: "add_step" },
    enabled: 1
  },
  {
    id: "M05_DUPLICATE_LABEL",
    name: "Duplicate Action Labels",
    description: "Renders two conflicting 'Place order' buttons on cart (Express vs Standard), causing locator ambiguity.",
    mutationType: "AMBIGUOUS_DUPLICATE",
    expectedOutcome: "REVIEW_REQUIRED",
    riskCategory: "medium",
    setupConfig: { variant: "duplicate_buttons" },
    enabled: 1
  },
  {
    id: "M06_WRONG_TOTAL",
    name: "Seed Incorrect Order Total",
    description: "Backend charges $64.00 instead of $54.00. Recovery must NOT heal this real business regression.",
    mutationType: "BUSINESS_LOGIC_BUG",
    expectedOutcome: "FAILED",
    riskCategory: "high",
    setupConfig: { variant: "faulty_total" },
    enabled: 1
  },
  {
    id: "M07_PAYMENT_ERROR",
    name: "Seed Mock Payment Failure",
    description: "Payment gateway returns declined. Engine must classify as assertion failure and refuse to heal.",
    mutationType: "PAYMENT_FAILURE",
    expectedOutcome: "FAILED",
    riskCategory: "high",
    setupConfig: { variant: "payment_declined" },
    enabled: 1
  },
  {
    id: "M08_SERVER_UNAVAILABLE",
    name: "Force 503 Service Unavailable",
    description: "Simulates backend service crash. Engine must classify as infrastructure/network error without attempting locator repair.",
    mutationType: "BACKEND_503",
    expectedOutcome: "FAILED",
    riskCategory: "high",
    setupConfig: { variant: "service_503" },
    enabled: 1
  }
];

export function seedDatabase(): void {
  const now = new Date().toISOString();

  // Seed default test spec
  const existingSpec = db.prepare("SELECT id FROM test_specs WHERE id = ?").get("checkout-valid-card");
  if (!existingSpec) {
    db.prepare(`
      INSERT INTO test_specs (id, slug, name, description, active_contract_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "checkout-valid-card",
      "checkout-valid-card",
      DEFAULT_CHECKOUT_CONTRACT.name,
      DEFAULT_CHECKOUT_CONTRACT.description,
      DEFAULT_CHECKOUT_CONTRACT.contractVersion,
      now,
      now
    );

    db.prepare(`
      INSERT INTO test_contract_versions (id, test_id, version, contract_json, content_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      "contract-checkout-v1",
      "checkout-valid-card",
      1,
      JSON.stringify(DEFAULT_CHECKOUT_CONTRACT),
      "hash-v1-initial",
      now
    );
  }

  // Seed mutations
  for (const scenario of MUTATION_SCENARIOS) {
    const existing = db.prepare("SELECT id FROM mutation_scenarios WHERE id = ?").get(scenario.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO mutation_scenarios (id, name, description, mutation_type, expected_outcome, risk_category, setup_config_json, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        scenario.id,
        scenario.name,
        scenario.description,
        scenario.mutationType,
        scenario.expectedOutcome,
        scenario.riskCategory,
        JSON.stringify(scenario.setupConfig),
        scenario.enabled
      );
    }
  }
}
