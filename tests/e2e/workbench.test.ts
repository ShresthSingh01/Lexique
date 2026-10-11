import { describe, it, expect, beforeAll } from "vitest";

const API_BASE = "http://localhost:3000/api";
const DEMO_BASE = "http://localhost:3001/api";

describe("IntentLock 100% Real Verification Suite", () => {
  beforeAll(async () => {
    // Check services are reachable
    const health = await fetch(`${API_BASE}/health`).then(r => r.json());
    expect(health.status).toBe("ok");
  });

  it("1. Baseline checkout passes and independently verifies contract (PASSED)", async () => {
    // Reset fixtures
    await fetch(`${DEMO_BASE}/fixtures/reset`, { method: "POST" });

    // Submit baseline run
    const createRes = await fetch(`${API_BASE}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: "checkout-valid-card", contractVersion: 1 })
    }).then(r => r.json());

    expect(createRes.status).toBe("QUEUED");
    const runId = createRes.runId;

    // Poll until terminal
    let run: any = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await fetch(`${API_BASE}/runs/${runId}`).then(r => r.json());
      if (["PASSED", "HEALED", "FAILED", "REVIEW_REQUIRED"].includes(res.run.status)) {
        run = res;
        break;
      }
    }

    expect(run).not.toBeNull();
    expect(run.run.status).toBe("PASSED");
    expect(run.steps.length).toBe(5);
    expect(run.run.recovery_count).toBe(0);
  }, 35000);

  it("2. M01_RENAME_TARGET detects drift and heals via Stagehand/policy/replay (HEALED)", async () => {
    await fetch(`${DEMO_BASE}/fixtures/reset`, { method: "POST" });

    const createRes = await fetch(`${API_BASE}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testId: "checkout-valid-card",
        contractVersion: 1,
        mutationScenarioId: "M01_RENAME_TARGET"
      })
    }).then(r => r.json());

    expect(createRes.status).toBe("QUEUED");
    const runId = createRes.runId;

    let run: any = null;
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await fetch(`${API_BASE}/runs/${runId}`).then(r => r.json());
      if (["PASSED", "HEALED", "FAILED", "REVIEW_REQUIRED"].includes(res.run.status)) {
        run = res;
        break;
      }
    }

    expect(run).not.toBeNull();
    expect(run.run.status).toBe("HEALED");
    expect(run.run.recovery_count).toBe(1);
    expect(run.recoveryAttempts.length).toBeGreaterThan(0);
    expect(run.recoveryAttempts[0].policy_decision).toBe("APPROVED");
    expect(run.artifacts.length).toBeGreaterThanOrEqual(2);
  }, 35000);

  it("3. M06_WRONG_TOTAL refuses to heal real business bug (FAILED)", async () => {
    await fetch(`${DEMO_BASE}/fixtures/reset`, { method: "POST" });

    const createRes = await fetch(`${API_BASE}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testId: "checkout-valid-card",
        contractVersion: 1,
        mutationScenarioId: "M06_WRONG_TOTAL"
      })
    }).then(r => r.json());

    expect(createRes.status).toBe("QUEUED");
    const runId = createRes.runId;

    let run: any = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await fetch(`${API_BASE}/runs/${runId}`).then(r => r.json());
      if (["PASSED", "HEALED", "FAILED", "REVIEW_REQUIRED"].includes(res.run.status)) {
        run = res;
        break;
      }
    }

    expect(run).not.toBeNull();
    expect(run.run.status).toBe("FAILED");
    expect(run.run.error_code).toBe("VERIFIER_CONDITION_FAILED");
    expect(run.run.recovery_count).toBe(0); // Zero false heals!
  }, 35000);

  it("4. M05_DUPLICATE_LABEL stops safely on ambiguity (REVIEW_REQUIRED)", async () => {
    await fetch(`${DEMO_BASE}/fixtures/reset`, { method: "POST" });

    const createRes = await fetch(`${API_BASE}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testId: "checkout-valid-card",
        contractVersion: 1,
        mutationScenarioId: "M05_DUPLICATE_LABEL"
      })
    }).then(r => r.json());

    expect(createRes.status).toBe("QUEUED");
    const runId = createRes.runId;

    let run: any = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await fetch(`${API_BASE}/runs/${runId}`).then(r => r.json());
      if (["PASSED", "HEALED", "FAILED", "REVIEW_REQUIRED"].includes(res.run.status)) {
        run = res;
        break;
      }
    }

    expect(run).not.toBeNull();
    expect(run.run.status).toBe("REVIEW_REQUIRED");
    expect(run.run.recovery_count).toBe(0);
  }, 35000);

  it("5. Contract Studio API: create custom test, ping URL, and commit heal", async () => {
    // Ping URL
    const pingRes = await fetch(`${API_BASE}/ping-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "http://localhost:3000/api/health" })
    }).then(r => r.json());
    expect(pingRes.reachable).toBe(true);

    // Create custom test
    const customTestId = `custom-test-${Date.now()}`;
    const createTestRes = await fetch(`${API_BASE}/tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: customTestId,
        name: "Custom Target Flow",
        description: "Testing dynamic contract creation",
        baseUrl: "http://localhost:3001",
        steps: [
          {
            stepId: "step-custom-1",
            name: "Navigate Home",
            intent: "Open root page",
            actionType: "navigate",
            targetLocator: "/",
            timeoutMs: 5000,
            riskCategory: "low"
          }
        ],
        successConditions: [
          {
            id: "cond-1",
            description: "Check URL contains root",
            type: "ui_url_contains",
            expected: "3001"
          }
        ]
      })
    }).then(r => r.json());

    expect(createTestRes.testId).toBe(customTestId);
    expect(createTestRes.contractVersion).toBe(1);

    // Commit a healed locator
    const healRes = await fetch(`${API_BASE}/tests/${customTestId}/commit-heal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepId: "step-custom-1",
        newLocator: "/catalog"
      })
    }).then(r => r.json());

    expect(healRes.newContractVersion).toBe(2);
    expect(healRes.newLocator).toBe("/catalog");

    // Verify fetched contract reflects v2 and updated selector
    const fetchedSpec = await fetch(`${API_BASE}/tests/${customTestId}`).then(r => r.json());
    expect(fetchedSpec.active_contract_version).toBe(2);
    expect(fetchedSpec.contract.steps[0].targetLocator).toBe("/catalog");
  });
});
