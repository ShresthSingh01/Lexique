// Automated End-to-End Verification Harness for All 8 Mutation Scenarios + Baseline
// Runs against http://localhost:3000 (API) and http://localhost:3001 (Demo App)
// Zero token burn - uses local vector space engine & Playwright instances

const API_BASE = "http://localhost:3000/api";
const DEMO_BASE = "http://localhost:3001/api";
const TERMINAL_STATUSES = new Set(["PASSED", "HEALED", "FAILED", "REVIEW_REQUIRED"]);

const SCENARIOS = [
  {
    id: "BASELINE",
    name: "0. Canonical Baseline Checkout",
    category: "Baseline",
    scenarioId: null,
    expected: "PASSED",
    acceptable: ["PASSED"],
    description: "Vanilla contract v1 against unmutated storefront"
  },
  {
    id: "M01_RENAME_TARGET",
    name: "1. Rename Checkout Button Locator",
    category: "UI Drift",
    scenarioId: "M01_RENAME_TARGET",
    expected: "HEALED / REVIEW_REQUIRED",
    acceptable: ["HEALED", "REVIEW_REQUIRED"],
    description: "ID changed to #place-order-action, label changed to 'Place order'"
  },
  {
    id: "M02_RESTRUCTURE_DOM",
    name: "2. Restructure DOM Hierarchy",
    category: "UI Drift",
    scenarioId: "M02_RESTRUCTURE_DOM",
    expected: "HEALED",
    acceptable: ["HEALED"],
    description: "Wrapped in nested divs, ID is #checkout-action-restructured"
  },
  {
    id: "M03_MOVE_TARGET",
    name: "3. Relocate Checkout Button",
    category: "UI Drift",
    scenarioId: "M03_MOVE_TARGET",
    expected: "HEALED",
    acceptable: ["HEALED"],
    description: "Relocated to separate fast routing card, ID #checkout-relocated"
  },
  {
    id: "M04_ADD_REVIEW_STEP",
    name: "4. Inject Intermediate Review Step",
    category: "Workflow Drift",
    scenarioId: "M04_ADD_REVIEW_STEP",
    expected: "REVIEW_REQUIRED",
    acceptable: ["REVIEW_REQUIRED"],
    description: "Navigates to unexpected /checkout/review instead of checkout form"
  },
  {
    id: "M05_DUPLICATE_LABEL",
    name: "5. Ambiguous Duplicate Action Labels",
    category: "Ambiguity Drift",
    scenarioId: "M05_DUPLICATE_LABEL",
    expected: "REVIEW_REQUIRED",
    acceptable: ["REVIEW_REQUIRED"],
    description: "Two conflicting 'Place order' buttons with duplicate labels"
  },
  {
    id: "M06_WRONG_TOTAL",
    name: "6. Seeded Price Inflation Regression",
    category: "Real Bug",
    scenarioId: "M06_WRONG_TOTAL",
    expected: "FAILED",
    acceptable: ["FAILED"],
    description: "Cart charges $64 instead of $54; oracle assertion fails"
  },
  {
    id: "M07_PAYMENT_ERROR",
    name: "7. Mock Payment Gateway Failure",
    category: "Real Bug",
    scenarioId: "M07_PAYMENT_ERROR",
    expected: "FAILED",
    acceptable: ["FAILED"],
    description: "Payment gateway returns declined; paymentStatus match fails"
  },
  {
    id: "M08_SERVER_UNAVAILABLE",
    name: "8. Force 503 Service Unavailable",
    category: "Infrastructure Bug",
    scenarioId: "M08_SERVER_UNAVAILABLE",
    expected: "FAILED",
    acceptable: ["FAILED"],
    description: "Server throws 503; network/infrastructure error classified"
  }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runScenario(scenario) {
  console.log(`\n------------------------------------------------------------`);
  console.log(`Running: ${scenario.name}`);
  console.log(`Category: ${scenario.category} | Expected: ${scenario.expected}`);

  // 1. Reset fixtures
  try {
    await fetch(`${DEMO_BASE}/fixtures/reset`, { method: "POST" });
  } catch (e) {
    // ignore
  }

  // 2. Create Run
  const createRes = await fetch(`${API_BASE}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      testId: "checkout-valid-card",
      contractVersion: 1,
      mutationScenarioId: scenario.scenarioId,
      idempotencyKey: `verify_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    })
  }).then(r => r.json());

  const runId = createRes.runId;
  process.stdout.write(`Queued Run ID: ${runId} `);

  // 3. Poll until terminal
  let runDetail = null;
  for (let i = 0; i < 35; i++) {
    await sleep(1000);
    process.stdout.write(".");
    try {
      const res = await fetch(`${API_BASE}/runs/${runId}`).then(r => r.json());
      if (TERMINAL_STATUSES.has(res.run.status)) {
        runDetail = res;
        break;
      }
    } catch (e) {
      // transient poll error
    }
  }
  console.log("");

  if (!runDetail) {
    console.error(`FAILED: Run ${runId} timed out before reaching terminal status.`);
    return {
      id: scenario.id,
      name: scenario.name,
      category: scenario.category,
      expected: scenario.expected,
      actual: "TIMEOUT",
      verified: false,
      durationMs: 0
    };
  }

  const run = runDetail.run;
  const verified = scenario.acceptable.includes(run.status);

  console.log(`  -> Actual Status: ${run.status} (${verified ? "✅ PASS" : "❌ FAIL"})`);
  console.log(`  -> Duration: ${run.duration_ms}ms | Steps: ${runDetail.steps?.length || 0} | Events: ${runDetail.events?.length || 0} | Artifacts: ${runDetail.artifacts?.length || 0}`);
  if (run.final_summary) {
    console.log(`  -> Summary: ${run.final_summary}`);
  }

  return {
    id: scenario.id,
    name: scenario.name,
    category: scenario.category,
    expected: scenario.expected,
    actual: run.status,
    verified,
    durationMs: run.duration_ms,
    steps: runDetail.steps?.length || 0,
    events: runDetail.events?.length || 0,
    artifacts: runDetail.artifacts?.length || 0
  };
}

async function main() {
  console.log("============================================================");
  console.log("    OJASTRA (LEXIQUE) — 8-SCENARIO VERIFICATION HARNESS     ");
  console.log("============================================================");

  // Verify health
  try {
    const health = await fetch(`${API_BASE}/health`).then(r => r.json());
    console.log(`[Health Check] Status: ${health.status} | Version: ${health.version}`);
  } catch (err) {
    console.error(`[Health Check Failed] Could not connect to ${API_BASE}. Ensure servers are running via 'npm run dev'.`);
    process.exit(1);
  }

  // Configure policy threshold to 0.60 to test autonomous healing for M02 and M03
  try {
    await fetch(`${API_BASE}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minimumCandidateSimilarity: 0.60 })
    });
    console.log("[Policy Config] Configured minimumCandidateSimilarity to 0.60 (Autonomous Healing)");
  } catch (err) {
    console.warn("[Policy Config Warning] Failed to set similarity threshold:", err.message);
  }

  const results = [];
  for (const sc of SCENARIOS) {
    const res = await runScenario(sc);
    results.push(res);
  }

  console.log("\n============================================================");
  console.log("              FINAL VERIFICATION SCOREBOARD                 ");
  console.log("============================================================");
  console.table(results.map(r => ({
    Scenario: r.id,
    Category: r.category,
    Expected: r.expected,
    Actual: r.actual,
    Result: r.verified ? "VERIFIED" : "MISMATCH",
    Duration: `${r.durationMs}ms`,
    Steps: r.steps,
    Artifacts: r.artifacts
  })));

  const allPassed = results.every(r => r.verified);
  if (allPassed) {
    console.log("\n🎉 ALL 8 SCENARIOS + BASELINE FULLY VERIFIED WITH 100% GENUINE OUTPUTS!");
  } else {
    console.log("\n⚠️ Some scenarios did not match expected outcomes. Check details above.");
  }
}

main().catch(console.error);
