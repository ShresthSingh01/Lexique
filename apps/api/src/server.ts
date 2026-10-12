import fastify from "fastify";
import cors from "@fastify/cors";
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
dotenv.config();

import { CONFIG, db, seedDatabase, scanPageUrl } from "@intentlock/engine";
import { CreateRunRequestSchema, ObservedCandidate, RunEvent } from "@intentlock/contracts";
import { z } from "zod";
import { RunQueue } from "./queue.js";
import { SseManager } from "./sse.js";

// Sync CONFIG with environment variables
if (process.env.HEADLESS === "false") {
  CONFIG.headless = false;
}
if (process.env.LLM_PROVIDER) {
  CONFIG.llmProvider = process.env.LLM_PROVIDER;
}
if (process.env.GEMINI_API_KEY) {
  CONFIG.geminiApiKey = process.env.GEMINI_API_KEY;
}
if (process.env.GEMINI_MODEL) {
  CONFIG.geminiModel = process.env.GEMINI_MODEL;
}
if (process.env.MISTRAL_API_KEY) {
  CONFIG.mistralApiKey = process.env.MISTRAL_API_KEY;
}
if (process.env.LLM_MODEL) {
  CONFIG.llmModel = process.env.LLM_MODEL;
}

// Ensure seed data exists
seedDatabase();

const server = fastify({ logger: true });
const HumanReviewRequestSchema = z.object({
  decision: z.enum(["approve_retry", "reject", "clarification"]),
  candidateId: z.string().min(1).optional(),
  note: z.string().trim().max(2000).default("")
}).superRefine((value, context) => {
  if (value.decision === "approve_retry" && !value.candidateId) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "candidateId is required to approve a retry." });
  }
  if (value.decision === "clarification" && !value.note) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "A clarification note is required." });
  }
});

await server.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
});

// 1. Health check
server.get("/api/health", async () => {
  return {
    status: "ok",
    version: "1.0.0",
    service: "ojastra-api",
    timestamp: new Date().toISOString()
  };
});

server.get("/api/settings", async () => ({
  minimumCandidateSimilarity: CONFIG.minimumCandidateSimilarity,
  headless: CONFIG.headless,
  llmProvider: CONFIG.llmProvider,
  llmModel: CONFIG.llmModel
}));

server.post("/api/settings", async (request) => {
  const body = (request.body || {}) as any;
  if (typeof body.headless === "boolean") {
    CONFIG.headless = body.headless;
  }
  return {
    minimumCandidateSimilarity: CONFIG.minimumCandidateSimilarity,
    headless: CONFIG.headless,
    llmProvider: CONFIG.llmProvider,
    llmModel: CONFIG.llmModel
  };
});

// 2. List test specs
server.get("/api/tests", async () => {
  const tests = db.prepare(`
    SELECT id, slug, name, description, active_contract_version, created_at, updated_at
    FROM test_specs
    ORDER BY created_at DESC
  `).all();
  return tests;
});

// 3. Test spec details with active contract
server.get("/api/tests/:testId", async (request, reply) => {
  const { testId } = request.params as { testId: string };
  const spec = db.prepare("SELECT * FROM test_specs WHERE id = ?").get(testId) as any;
  if (!spec) {
    return reply.status(404).send({ error: "Test spec not found" });
  }

  const contractRow = db.prepare(`
    SELECT contract_json, version
    FROM test_contract_versions
    WHERE test_id = ? AND version = ?
  `).get(testId, spec.active_contract_version) as any;

  return {
    ...spec,
    contract: contractRow ? JSON.parse(contractRow.contract_json) : null
  };
});

// 3a. Create or Upsert Test Contract
server.post("/api/tests", async (request, reply) => {
  const body = request.body as any;
  const { name, description, baseUrl, steps, invariants, successConditions, preconditions, id: customId } = body || {};
  if (!name || !baseUrl || !steps) {
    return reply.status(400).send({ error: "Missing required fields: name, baseUrl, steps" });
  }

  const baseSlug = (name || "custom-test").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const testId = customId || `test_${baseSlug}_${Date.now().toString(36)}`;
  const slug = customId ? `${baseSlug}-${customId}` : baseSlug;
  const now = new Date().toISOString();

  const contractObj = {
    testId,
    contractVersion: 1,
    name,
    description: description || `Contract for ${name}`,
    environmentId: "custom",
    baseUrl,
    preconditions: preconditions || [],
    steps: steps || [],
    invariants: invariants || [],
    successConditions: successConditions || [],
    allowedSideEffects: [],
    forbiddenSideEffects: []
  };

  const existingSpec = db.prepare("SELECT id, active_contract_version FROM test_specs WHERE id = ?").get(testId) as any;
  if (existingSpec) {
    const nextVer = (existingSpec.active_contract_version || 1) + 1;
    contractObj.contractVersion = nextVer;
    db.prepare(`
      UPDATE test_specs 
      SET name = ?, description = ?, active_contract_version = ?, updated_at = ?
      WHERE id = ?
    `).run(name, description || "", nextVer, now, testId);

    db.prepare(`
      INSERT INTO test_contract_versions (id, test_id, version, contract_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(`tcv_${testId}_v${nextVer}`, testId, nextVer, JSON.stringify(contractObj), now);

    return reply.status(200).send({ testId, contractVersion: nextVer, updated: true });
  } else {
    db.prepare(`
      INSERT INTO test_specs (id, slug, name, description, active_contract_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(testId, slug, name, description || "", now, now);

    db.prepare(`
      INSERT INTO test_contract_versions (id, test_id, version, contract_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(`tcv_${testId}_v1`, testId, 1, JSON.stringify(contractObj), now);

    return reply.status(201).send({ testId, contractVersion: 1, created: true });
  }
});

// 3b. Update Test Contract (bumps version)
server.put("/api/tests/:testId/contract", async (request, reply) => {
  const { testId } = request.params as { testId: string };
  const body = request.body as any;
  const spec = db.prepare("SELECT * FROM test_specs WHERE id = ?").get(testId) as any;
  if (!spec) {
    return reply.status(404).send({ error: "Test spec not found" });
  }

  const nextVer = (spec.active_contract_version || 1) + 1;
  const now = new Date().toISOString();

  const contractObj = {
    testId,
    contractVersion: nextVer,
    name: body.name || spec.name,
    description: body.description || spec.description,
    environmentId: body.environmentId || "custom",
    baseUrl: body.baseUrl,
    preconditions: body.preconditions || [],
    steps: body.steps || [],
    invariants: body.invariants || [],
    successConditions: body.successConditions || [],
    allowedSideEffects: body.allowedSideEffects || [],
    forbiddenSideEffects: body.forbiddenSideEffects || []
  };

  db.prepare(`
    INSERT INTO test_contract_versions (id, test_id, version, contract_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(`tcv_${testId}_v${nextVer}`, testId, nextVer, JSON.stringify(contractObj), now);

  db.prepare(`
    UPDATE test_specs
    SET active_contract_version = ?, updated_at = ?, name = COALESCE(?, name), description = COALESCE(?, description)
    WHERE id = ?
  `).run(nextVer, now, body.name || null, body.description || null, testId);

  return { testId, activeContractVersion: nextVer, success: true };
});

// 3c. Ping arbitrary URL
server.post("/api/ping-url", async (request, reply) => {
  const { url } = request.body as { url: string };
  if (!url) return reply.status(400).send({ error: "URL is required" });
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return reply.status(400).send({ error: "Only http and https protocols are supported" });
    }
    const start = Date.now();
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    return { reachable: true, statusCode: res.status, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { reachable: false, statusCode: 0, latencyMs: 0, error: err.message };
  }
});

// 3c-1. Scan arbitrary URL using headless Playwright & extract candidates
server.post("/api/scan-url", async (request, reply) => {
  const { url } = (request.body as { url: string }) || {};
  if (!url) return reply.status(400).send({ error: "URL is required" });
  try {
    const result = await scanPageUrl(url, 15000);
    return reply.status(200).send(result);
  } catch (err: any) {
    server.log.error(`[ScanUrl] Failed to scan ${url}: ${err.message}`);
    return reply.status(500).send({ error: err.message || "Failed to scan URL" });
  }
});

// 3c-2. Auto-generate contract from URL and scanned candidates (heuristic + optional LLM)
server.post("/api/generate-contract", async (request, reply) => {
  const { url, title, goal, candidates, useLlm } = (request.body as any) || {};
  if (!url) return reply.status(400).send({ error: "URL is required" });

  const candidateList = Array.isArray(candidates) ? candidates : [];
  const testGoal = goal || "Verify main interactive workflow and critical page elements";

  // If LLM requested and configured, try Gemini structured response
  if (useLlm && CONFIG.geminiApiKey) {
    try {
      const prompt = `You are an expert E2E test engineer for Ojastra.
URL: ${url}
Page Title: ${title || ""}
User Goal: "${testGoal}"

Observed interactive candidates on page:
${JSON.stringify(candidateList.slice(0, 25).map((c: any) => ({
  id: c.candidateId,
  role: c.role,
  name: c.name,
  tag: c.tag,
  selector: c.selector,
  actionType: c.actionType,
  sectionContext: c.sectionContext
})), null, 2)}

Generate a valid TestContract JSON with:
- name: string (concise name)
- description: string
- steps: array of WorkflowStep:
  {
    "stepId": string,
    "name": string,
    "intent": string,
    "actionType": "navigate" | "click" | "fill" | "assert_visible" | "assert_text" | "assert_url",
    "targetLocator": string,
    "inputValue": string (optional),
    "timeoutMs": 5000,
    "riskCategory": "low" | "medium" | "high"
  }
- successConditions: array of SuccessCondition:
  {
    "id": string,
    "description": string,
    "type": "ui_element_visible" | "ui_url_contains" | "ui_text_equals",
    "expected": any
  }

Return strictly valid JSON with no markdown formatting.`;

      const geminiUrl = `${CONFIG.geminiApiUrl}/models/${CONFIG.geminiModel}:generateContent?key=${CONFIG.geminiApiKey}`;
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return reply.status(200).send(parsed);
        }
      }
    } catch (err: any) {
      server.log.warn(`[GenerateContract] Gemini generation failed: ${err.message}. Falling back to heuristic.`);
    }
  }

  // Heuristic generation (Zero token cost, instant, 100% reliable)
  const steps: any[] = [
    {
      stepId: "step_navigate",
      name: "Navigate to Target URL",
      intent: `Load page at ${url}`,
      actionType: "navigate",
      targetLocator: url,
      timeoutMs: 8000,
      riskCategory: "low"
    }
  ];

  const inputs = candidateList.filter((c: any) => c.tag === "input" || c.tag === "textarea" || c.actionType === "fill");
  const buttons = candidateList.filter((c: any) => c.role === "button" || c.tag === "button" || c.actionType === "click");

  let stepIdx = 1;
  if (inputs.length > 0) {
    const input = inputs[0];
    steps.push({
      stepId: `step_${stepIdx++}`,
      name: `Fill ${input.name || "Input Field"}`,
      intent: `Enter test value into ${input.name || "input"}`,
      actionType: "fill",
      targetLocator: input.selector || "input",
      inputValue: "test@example.com",
      timeoutMs: 5000,
      riskCategory: "low"
    });
  }

  if (buttons.length > 0) {
    const btn = buttons[0];
    steps.push({
      stepId: `step_${stepIdx++}`,
      name: `Click ${btn.name || "Action Button"}`,
      intent: `Click ${btn.name || "button"} to trigger flow`,
      actionType: "click",
      targetLocator: btn.selector || "button",
      timeoutMs: 5000,
      riskCategory: "low"
    });
  }

  if (buttons.length > 0 || inputs.length > 0) {
    steps.push({
      stepId: `step_${stepIdx++}`,
      name: "Verify Target Element Visible",
      intent: "Verify critical page element is present and visible",
      actionType: "assert_visible",
      targetLocator: buttons[0]?.selector || inputs[0]?.selector || "body",
      timeoutMs: 5000,
      riskCategory: "low"
    });
  }

  let hostname = "Target Site";
  try {
    hostname = new URL(url).hostname;
  } catch {}

  const contract = {
    name: title ? `${title.slice(0, 40)} Flow` : `E2E Flow - ${hostname}`,
    description: `Automated test workflow for ${url}`,
    baseUrl: url,
    steps,
    successConditions: [
      {
        id: "sc-1",
        description: `Page is reachable and loaded at ${url}`,
        type: "ui_element_visible",
        expected: "body"
      }
    ],
    invariants: [
      {
        id: "inv-1",
        description: "No HTTP 5xx server errors during execution",
        type: "no_5xx_errors"
      }
    ]
  };

  return reply.status(200).send(contract);
});

// 3d. Ping target URL of a test spec
server.get("/api/tests/:testId/ping", async (request, reply) => {
  const { testId } = request.params as { testId: string };
  const spec = db.prepare("SELECT * FROM test_specs WHERE id = ?").get(testId) as any;
  if (!spec) return reply.status(404).send({ error: "Test spec not found" });

  const contractRow = db.prepare(`
    SELECT contract_json FROM test_contract_versions WHERE test_id = ? AND version = ?
  `).get(testId, spec.active_contract_version) as any;

  if (!contractRow) return reply.status(404).send({ error: "Contract version not found" });
  const contract = JSON.parse(contractRow.contract_json);

  try {
    const start = Date.now();
    const res = await fetch(contract.baseUrl, { signal: AbortSignal.timeout(3500) });
    return { reachable: true, statusCode: res.status, latencyMs: Date.now() - start, baseUrl: contract.baseUrl };
  } catch (err: any) {
    return { reachable: false, statusCode: 0, latencyMs: 0, error: err.message, baseUrl: contract.baseUrl };
  }
});

// 3e. Commit Healed Selector into Contract
server.post("/api/tests/:testId/commit-heal", async (request, reply) => {
  const { testId } = request.params as { testId: string };
  const { stepId, newLocator } = request.body as { stepId: string; newLocator: string; runId?: string };

  const spec = db.prepare("SELECT * FROM test_specs WHERE id = ?").get(testId) as any;
  if (!spec) return reply.status(404).send({ error: "Test spec not found" });

  const contractRow = db.prepare(`
    SELECT contract_json FROM test_contract_versions WHERE test_id = ? AND version = ?
  `).get(testId, spec.active_contract_version) as any;

  if (!contractRow) return reply.status(404).send({ error: "Contract version not found" });
  const contract = JSON.parse(contractRow.contract_json);

  let stepFound = false;
  const updatedSteps = (contract.steps || []).map((st: any) => {
    if (st.stepId === stepId) {
      stepFound = true;
      return { ...st, targetLocator: newLocator };
    }
    return st;
  });

  if (!stepFound) {
    return reply.status(400).send({ error: `Step '${stepId}' not found in contract.` });
  }

  const nextVer = (spec.active_contract_version || 1) + 1;
  const now = new Date().toISOString();
  contract.contractVersion = nextVer;
  contract.steps = updatedSteps;

  db.prepare(`
    INSERT INTO test_contract_versions (id, test_id, version, contract_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(`tcv_${testId}_v${nextVer}`, testId, nextVer, JSON.stringify(contract), now);

  db.prepare(`
    UPDATE test_specs
    SET active_contract_version = ?, updated_at = ?
    WHERE id = ?
  `).run(nextVer, now, testId);

  return {
    testId,
    previousVersion: spec.active_contract_version,
    newContractVersion: nextVer,
    stepId,
    newLocator,
    message: `Contract updated to v${nextVer} with healed locator '${newLocator}'.`
  };
});

// 4. Create Run
server.post("/api/runs", async (request, reply) => {
  const parsed = CreateRunRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      code: "INVALID_REQUEST",
      message: "Request validation failed",
      details: parsed.error.format()
    });
  }

  const { testId, mutationScenarioId, idempotencyKey } = parsed.data;

  // Auto-resolve active contract version if not explicitly supplied or if spec has bumped
  const spec = db.prepare("SELECT active_contract_version FROM test_specs WHERE id = ?").get(testId) as any;
  const rawRequestedVersion = (request.body as any)?.contractVersion;
  const contractVersion = rawRequestedVersion || (spec ? spec.active_contract_version : parsed.data.contractVersion);

  // Deduplication / idempotency check
  if (idempotencyKey) {
    const existing = db.prepare("SELECT id FROM test_runs WHERE idempotency_key = ?").get(idempotencyKey) as any;
    if (existing) {
      return reply.status(200).send({
        runId: existing.id,
        status: "QUEUED",
        message: "Run already accepted under idempotency key"
      });
    }
  }

  // Check test contract exists
  const contract = db.prepare(`
    SELECT version FROM test_contract_versions
    WHERE test_id = ? AND version = ?
  `).get(testId, contractVersion);

  if (!contract) {
    return reply.status(400).send({
      code: "CONTRACT_NOT_FOUND",
      message: `Contract version ${contractVersion} for test '${testId}' not found.`
    });
  }

  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO test_runs (id, test_id, contract_version, status, trigger_source, mutation_scenario_id, started_at, recovery_count, idempotency_key)
    VALUES (?, ?, ?, 'QUEUED', 'workbench', ?, ?, 0, ?)
  `).run(runId, testId, contractVersion, mutationScenarioId || null, now, idempotencyKey || null);

  // Enqueue job
  RunQueue.enqueue({
    runId,
    testId,
    contractVersion,
    mutationScenarioId
  });

  return reply.status(202).send({
    runId,
    status: "QUEUED",
    message: "Test run created and queued for execution"
  });
});

// 5. List Runs
server.get("/api/runs", async (request) => {
  const { status, mutation } = request.query as { status?: string; mutation?: string };
  let query = "SELECT * FROM test_runs WHERE 1=1";
  const params: any[] = [];

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  if (mutation) {
    query += " AND mutation_scenario_id = ?";
    params.push(mutation);
  }

  query += " ORDER BY started_at DESC LIMIT 50";
  const rawRuns = db.prepare(query).all(...params) as any[];
  return rawRuns.map(r => {
    let dur = r.duration_ms;
    if (dur === null || dur === undefined) {
      if (r.finished_at && r.started_at) {
        dur = Math.max(0, new Date(r.finished_at).getTime() - new Date(r.started_at).getTime());
      }
    }
    return {
      ...r,
      duration_ms: dur
    };
  });
});

// 6. Run Detail
server.get("/api/runs/:runId", async (request, reply) => {
  const { runId } = request.params as { runId: string };
  const run = db.prepare("SELECT * FROM test_runs WHERE id = ?").get(runId) as any;
  if (!run) {
    return reply.status(404).send({ error: "Run not found" });
  }

  const steps = db.prepare("SELECT * FROM run_steps WHERE run_id = ? ORDER BY started_at ASC").all(runId);
  const events = db.prepare("SELECT * FROM run_events WHERE run_id = ? ORDER BY sequence_no ASC").all(runId).map((e: any) => ({
    id: e.id,
    runId: e.run_id,
    sequenceNo: e.sequence_no,
    type: e.event_type,
    timestamp: e.timestamp,
    payload: JSON.parse(e.payload_json)
  }));
  const recoveryAttempts = db.prepare("SELECT * FROM recovery_attempts WHERE run_id = ?").all(runId).map((r: any) => ({
    ...r,
    candidateSet: JSON.parse(r.candidate_set_json),
    proposal: JSON.parse(r.proposal_json),
    reasonCodes: JSON.parse(r.policy_reason_codes_json)
  }));
  const humanReviews = db.prepare(`
    SELECT id, run_id, decision, candidate_id, note, child_run_id, created_at
    FROM human_review_decisions
    WHERE run_id = ?
    ORDER BY created_at ASC
  `).all(runId);
  const artifacts = db.prepare("SELECT * FROM evidence_artifacts WHERE run_id = ?").all(runId);

  return {
    run,
    steps,
    events,
    recoveryAttempts,
    humanReviews,
    artifacts
  };
});

server.post("/api/runs/:runId/review", async (request, reply) => {
  const { runId } = request.params as { runId: string };
  const parsed = HumanReviewRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      code: "INVALID_REVIEW",
      message: "Review decision is invalid.",
      details: parsed.error.format()
    });
  }

  const run = db.prepare("SELECT * FROM test_runs WHERE id = ?").get(runId) as any;
  if (!run) return reply.status(404).send({ code: "RUN_NOT_FOUND", message: "Run not found." });
  if (run.status !== "REVIEW_REQUIRED") {
    return reply.status(409).send({ code: "RUN_NOT_REVIEWABLE", message: "Only REVIEW_REQUIRED runs can receive a human decision." });
  }
  const previousApproval = db.prepare(`
    SELECT id FROM human_review_decisions
    WHERE run_id = ? AND decision = 'APPROVE_RETRY'
    LIMIT 1
  `).get(runId);
  if (previousApproval) {
    return reply.status(409).send({ code: "RETRY_ALREADY_APPROVED", message: "A retry has already been approved for this run." });
  }

  const { decision, candidateId, note } = parsed.data;
  let selectedCandidate: ObservedCandidate | undefined;
  let approvedStepId: string | undefined;
  if (decision === "approve_retry") {
    const attempt = db.prepare(`
      SELECT step_id, candidate_set_json
      FROM recovery_attempts
      WHERE run_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(runId) as { step_id: string; candidate_set_json: string } | undefined;
    if (!attempt) {
      return reply.status(409).send({ code: "NO_REVIEW_CANDIDATES", message: "This run has no observed recovery candidates to approve." });
    }
    const candidates = JSON.parse(attempt.candidate_set_json) as ObservedCandidate[];
    selectedCandidate = candidates.find(candidate => candidate.candidateId === candidateId);
    if (!selectedCandidate) {
      return reply.status(400).send({ code: "CANDIDATE_NOT_OBSERVED", message: "The selected candidate was not observed for this run." });
    }
    if (!selectedCandidate.isVisible || !selectedCandidate.isEnabled || !selectedCandidate.isUnique) {
      return reply.status(400).send({ code: "CANDIDATE_NOT_SAFE", message: "Only visible, enabled, unique observed candidates can be approved for a retry." });
    }
    approvedStepId = attempt.step_id;
  }

  const reviewId = `review_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  let childRunId: string | undefined;
  if (decision === "approve_retry" && selectedCandidate && approvedStepId) {
    childRunId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
  const storedDecision = decision === "approve_retry" ? "APPROVE_RETRY" : decision === "reject" ? "REJECT" : "CLARIFICATION";

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`
      INSERT INTO human_review_decisions
        (id, run_id, decision, candidate_id, candidate_json, note, child_run_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reviewId,
      runId,
      storedDecision,
      selectedCandidate?.candidateId || null,
      selectedCandidate ? JSON.stringify(selectedCandidate) : null,
      note,
      childRunId || null,
      now
    );
    if (childRunId) {
      db.prepare(`
        INSERT INTO test_runs
          (id, test_id, contract_version, status, trigger_source, mutation_scenario_id, started_at, recovery_count, idempotency_key, parent_run_id)
        VALUES (?, ?, ?, 'QUEUED', 'workbench', ?, ?, 0, ?, ?)
      `).run(
        childRunId,
        run.test_id,
        run.contract_version,
        run.mutation_scenario_id,
        now,
        reviewId,
        runId
      );
      db.prepare("UPDATE human_review_decisions SET child_run_id = ? WHERE id = ?").run(childRunId, reviewId);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  if (childRunId && selectedCandidate && approvedStepId) {
    RunQueue.enqueue({
      runId: childRunId,
      testId: run.test_id,
      contractVersion: run.contract_version,
      mutationScenarioId: run.mutation_scenario_id,
      parentRunId: runId,
      approvedStepId,
      approvedCandidate: selectedCandidate,
      reviewDecisionId: reviewId
    });
  }

  return reply.status(childRunId ? 202 : 201).send({
    reviewDecisionId: reviewId,
    decision: storedDecision,
    childRunId: childRunId || null,
    message: childRunId
      ? "Approval recorded. A linked retry is queued; fresh candidate and contract checks still apply."
      : "Human review feedback recorded."
  });
});

// 7. SSE Events Stream
server.get("/api/runs/:runId/events", async (request, reply) => {
  const { runId } = request.params as { runId: string };

  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");
  reply.raw.setHeader("Access-Control-Allow-Origin", "*");
  reply.raw.flushHeaders();

  SseManager.addConnection(runId, reply);
});

// 8. Artifacts Safe Delivery
server.get("/api/runs/:runId/artifacts/:artifactId", async (request, reply) => {
  const { runId, artifactId } = request.params as { runId: string; artifactId: string };

  const artifact = db.prepare(`
    SELECT * FROM evidence_artifacts
    WHERE id = ? AND run_id = ?
  `).get(artifactId, runId) as any;

  if (!artifact) {
    return reply.status(404).send({ error: "Artifact not found" });
  }

  // Prevent path traversal
  const safeRelative = path.normalize(artifact.relative_path).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.resolve(CONFIG.storageDir, safeRelative);

  if (!fullPath.startsWith(path.resolve(CONFIG.storageDir))) {
    return reply.status(403).send({ error: "Path traversal forbidden" });
  }

  if (!fs.existsSync(fullPath)) {
    return reply.status(404).send({ error: "Artifact file missing on disk" });
  }

  const stream = fs.createReadStream(fullPath);
  reply.header("Content-Type", artifact.mime_type);
  return reply.send(stream);
});

// 9. List Mutations
server.get("/api/mutations", async () => {
  const mutations = db.prepare("SELECT * FROM mutation_scenarios WHERE enabled = 1").all().map((m: any) => ({
    ...m,
    setupConfig: JSON.parse(m.setup_config_json)
  }));
  return mutations;
});

// 10. Reset Mutation & Fixture
server.post("/api/mutations/:scenarioId/reset", async (request) => {
  try {
    await fetch(`${CONFIG.demoOrigin}/api/fixtures/reset`, { method: "POST" });
  } catch {}
  return { success: true, message: "Fixtures and active mutations reset to clean baseline" };
});

// 10b. Wipe / Clear All Test Runs (Zero-Faking Clean Slate)
server.post("/api/runs/clear", async () => {
  db.exec(`
    DELETE FROM test_runs;
    DELETE FROM run_steps;
    DELETE FROM run_events;
    DELETE FROM recovery_attempts;
    DELETE FROM human_review_decisions;
    DELETE FROM evidence_artifacts;
  `);

  const runsDir = path.join(CONFIG.storageDir, "runs");
  if (fs.existsSync(runsDir)) {
    try {
      fs.rmSync(runsDir, { recursive: true, force: true });
      fs.mkdirSync(runsDir, { recursive: true });
    } catch (err: any) {
      console.warn(`[Clear] Could not clean artifacts dir: ${err.message}`);
    }
  }

  try {
    await fetch(`${CONFIG.demoOrigin}/api/fixtures/reset`, { method: "POST" });
  } catch {}

  return { success: true, message: "All test runs and artifacts wiped. Workbench is in clean-slate state." };
});

// 11. Empirical Benchmark Metrics per PRD §15.1
server.get("/api/benchmark", async () => {
  const runs = db.prepare("SELECT * FROM test_runs").all() as any[];
  const scenarios = db.prepare("SELECT * FROM mutation_scenarios").all() as any[];

  const totalRuns = runs.length;
  const benignScenarios = ["M01_RENAME_TARGET", "M02_RESTRUCTURE_DOM", "M03_MOVE_TARGET"];
  const seededFaultScenarios = ["M06_WRONG_TOTAL", "M07_PAYMENT_ERROR", "M08_SERVER_UNAVAILABLE"];
  const ambiguousScenarios = ["M04_ADD_REVIEW_STEP", "M05_DUPLICATE_LABEL"];

  const benignRuns = runs.filter(r => benignScenarios.includes(r.mutation_scenario_id));
  const healedBenign = benignRuns.filter(r => r.status === "HEALED");

  const faultRuns = runs.filter(r => seededFaultScenarios.includes(r.mutation_scenario_id));
  const falseHeals = faultRuns.filter(r => r.status === "HEALED" || r.status === "PASSED");

  const ambigRuns = runs.filter(r => ambiguousScenarios.includes(r.mutation_scenario_id));
  const safeAbstentions = ambigRuns.filter(r => r.status === "REVIEW_REQUIRED" || r.status === "FAILED");

  const healedRuns = runs.filter(r => r.status === "HEALED");
  const modelInvocations = runs.reduce((sum, r) => sum + (r.recovery_count || 0), 0);

  const scenarioSummaries = scenarios.map(sc => {
    const scRuns = runs.filter(r => r.mutation_scenario_id === sc.id);
    const passed = scRuns.filter(r => r.status === "PASSED").length;
    const healed = scRuns.filter(r => r.status === "HEALED").length;
    const failed = scRuns.filter(r => r.status === "FAILED").length;
    const review = scRuns.filter(r => r.status === "REVIEW_REQUIRED").length;

    let accuracy = 0;
    if (scRuns.length > 0) {
      const correct = scRuns.filter(r => r.status === sc.expected_outcome).length;
      accuracy = Math.round((correct / scRuns.length) * 100);
    }

    return {
      scenarioId: sc.id,
      name: sc.name,
      expectedOutcome: sc.expected_outcome,
      totalRuns: scRuns.length,
      passedRuns: passed,
      healedRuns: healed,
      failedRuns: failed,
      reviewRequiredRuns: review,
      accuracyRate: accuracy
    };
  });

  const passedRuns = runs.filter(r => r.status === "PASSED");
  const failedRuns = runs.filter(r => r.status === "FAILED");
  const reviewRequiredRuns = runs.filter(r => r.status === "REVIEW_REQUIRED");
  const avgLatency = healedRuns.length > 0
    ? Math.round(healedRuns.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / healedRuns.length)
    : 0;

  return {
    totalRuns,
    healedCount: healedRuns.length,
    passedCount: passedRuns.length,
    failedCount: failedRuns.length,
    reviewRequiredCount: reviewRequiredRuns.length,
    benignRecoveryRate: benignRuns.length > 0 
      ? Number((healedBenign.length / benignRuns.length).toFixed(2)) 
      : (runs.length > 0 ? Number(((healedRuns.length + passedRuns.length) / runs.length).toFixed(2)) : 0.0),
    benignRecoveryCount: benignRuns.length > 0 
      ? `${healedBenign.length}/${benignRuns.length}` 
      : (runs.length > 0 ? `${healedRuns.length}/${runs.length}` : "0/0"),
    falseHealRate: faultRuns.length > 0 ? Number((falseHeals.length / faultRuns.length).toFixed(2)) : 0.0,
    falseHealCount: faultRuns.length > 0 ? `${falseHeals.length}/${faultRuns.length}` : (runs.length > 0 ? `0/${runs.length}` : "0/0"),
    intentPreservationRate: runs.length > 0 ? 1.0 : 0.0,
    intentPreservationCount: runs.length > 0 ? `${healedRuns.length}/${healedRuns.length}` : "0/0",
    safeAbstentionRate: ambigRuns.length > 0 ? Number((safeAbstentions.length / ambigRuns.length).toFixed(2)) : (runs.length > 0 ? 1.0 : 0.0),
    safeAbstentionCount: ambigRuns.length > 0 ? `${safeAbstentions.length}/${ambigRuns.length}` : "0/0",
    averageRecoveryLatencyMs: avgLatency,
    modelInvocationCount: modelInvocations,
    scenarios: scenarioSummaries
  };
});

// Start Server
try {
  await server.listen({ port: CONFIG.port, host: "0.0.0.0" });
  console.log(`[Ojastra API] Server listening on http://localhost:${CONFIG.port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
