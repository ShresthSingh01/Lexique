import { chromium, Browser, BrowserContext, Page } from "playwright";
import {
  EventType,
  ObservedCandidate,
  PolicyEvaluationResult,
  RecoveryProposal,
  RunEvent,
  RunStatus,
  TestContract,
  WorkflowStep
} from "@intentlock/contracts";
import { db } from "./db.js";
import { EvidenceRecorder } from "./evidence-recorder.js";
import { FailureClassifier } from "./failure-classifier.js";
import { StagehandAdapter } from "./stagehand-adapter.js";
import { LlmAdapter } from "./llm-adapter.js";
import { RecoveryPolicyGate } from "./recovery-policy.js";
import { OutcomeVerifier } from "./outcome-verifier.js";
import { CONFIG } from "./config.js";
import { SemanticVectorEngine } from "./semantic-vsm.js";

export type EventCallback = (event: RunEvent) => void;

export interface RunOptions {
  runId: string;
  contract: TestContract;
  mutationScenarioId?: string | null;
  parentRunId?: string;
  approvedStepId?: string;
  approvedCandidate?: ObservedCandidate;
  reviewDecisionId?: string;
  onEvent?: EventCallback;
}

export class RunOrchestrator {
  private runId: string;
  private contract: TestContract;
  private mutationScenarioId: string | null;
  private parentRunId?: string;
  private approvedStepId?: string;
  private approvedCandidate?: ObservedCandidate;
  private reviewDecisionId?: string;
  private onEvent?: EventCallback;
  private sequenceNo: number = 0;
  private currentStatus: RunStatus = "QUEUED";
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private recorder: EvidenceRecorder;
  private startTime: number = Date.now();

  constructor(options: RunOptions) {
    this.runId = options.runId;
    this.contract = options.contract;
    this.mutationScenarioId = options.mutationScenarioId || null;
    this.parentRunId = options.parentRunId;
    this.approvedStepId = options.approvedStepId;
    this.approvedCandidate = options.approvedCandidate;
    this.reviewDecisionId = options.reviewDecisionId;
    this.onEvent = options.onEvent;
    this.recorder = new EvidenceRecorder(this.runId);
  }

  private emit(type: EventType, payload: Record<string, any>): void {
    this.sequenceNo += 1;
    const now = new Date().toISOString();
    const eventId = `evt_${this.runId}_${this.sequenceNo}`;

    const event: RunEvent = {
      id: eventId,
      runId: this.runId,
      sequenceNo: this.sequenceNo,
      type,
      timestamp: now,
      payload
    };

    // Persist to database
    db.prepare(`
      INSERT INTO run_events (id, run_id, sequence_no, event_type, timestamp, payload_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(eventId, this.runId, this.sequenceNo, type, now, JSON.stringify(payload));

    if (this.onEvent) {
      try {
        this.onEvent(event);
      } catch (err: any) {
        console.warn(`[RunOrchestrator] Event listener error: ${err.message}`);
      }
    }
  }

  private updateStatus(status: RunStatus, summary?: string, errorCode?: string): void {
    this.currentStatus = status;
    const isTerminal = ["PASSED", "HEALED", "FAILED", "REVIEW_REQUIRED"].includes(status);
    const now = new Date().toISOString();
    const durationMs = isTerminal ? Math.max(1, Date.now() - this.startTime) : null;

    db.prepare(`
      UPDATE test_runs
      SET status = ?,
          finished_at = CASE WHEN ? = 1 THEN ? ELSE finished_at END,
          duration_ms = CASE WHEN ? = 1 THEN ? ELSE duration_ms END,
          final_summary = COALESCE(?, final_summary),
          error_code = COALESCE(?, error_code)
      WHERE id = ?
    `).run(status, isTerminal ? 1 : 0, now, isTerminal ? 1 : 0, durationMs, summary || null, errorCode || null, this.runId);
  }

  public async execute(): Promise<RunStatus> {
    this.startTime = Date.now();
    this.emit("RUN_STARTED", {
      testId: this.contract.testId,
      contractVersion: this.contract.contractVersion,
      mutationScenarioId: this.mutationScenarioId,
      parentRunId: this.parentRunId || null,
      humanReviewDecisionId: this.reviewDecisionId || null,
      targetBaseUrl: this.contract.baseUrl
    });
    this.updateStatus("RUNNING");

    try {
      // 1. Reset demo fixtures and set active mutation
      await this.resetDemoState();

      // 2. Launch Chromium browser
      this.browser = await chromium.launch({
        headless: CONFIG.headless,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 }
      });
      this.page = await this.context.newPage();

      // 3. Execute baseline workflow steps
      const baselineResult = await this.executeWorkflowSteps(this.page, false);

      if (baselineResult.success) {
        // Run outcome verifier for baseline
        this.emit("VERIFICATION_STARTED", { runId: this.runId, mode: "baseline" });
        const outcome = await OutcomeVerifier.verify(this.page, this.contract.successConditions, this.runId);

        for (const check of outcome.checks) {
          if (check.passed) {
            this.emit("VERIFICATION_CHECK_PASSED", {
              checkId: check.checkId,
              description: check.description,
              type: check.type,
              expected: check.expected,
              actual: check.actual,
              evidenceRef: check.evidenceRef
            });
          } else {
            this.emit("VERIFICATION_CHECK_FAILED", {
              checkId: check.checkId,
              description: check.description,
              type: check.type,
              expected: check.expected,
              actual: check.actual,
              evidenceRef: check.evidenceRef
            });
          }
        }

        if (outcome.allPassed) {
          this.updateStatus("PASSED", "Baseline test execution passed and all success conditions independently verified.");
          this.emit("RUN_FINISHED", { status: "PASSED", summary: outcome.summary, durationMs: Date.now() - this.startTime });
          return "PASSED";
        } else {
          this.updateStatus("FAILED", outcome.summary, "VERIFIER_CONDITION_FAILED");
          this.emit("RUN_FAILED", { status: "FAILED", reason: outcome.summary });
          return "FAILED";
        }
      }

      // Step failed during baseline!
      const failedStep = baselineResult.failedStep!;
      const errorMsg = baselineResult.errorMessage || "Unknown error";

      // 5. Classify Failure
      this.updateStatus("DIAGNOSING");
      const classification = FailureClassifier.classify({
        stepId: failedStep.stepId,
        stepIntent: failedStep.intent,
        actionType: failedStep.actionType,
        errorMessage: errorMsg
      });

      this.emit("FAILURE_CLASSIFIED", {
        stepId: failedStep.stepId,
        category: classification.category,
        confidence: classification.confidence,
        isRecoverable: classification.isRecoverable,
        reason: classification.reason,
        signals: classification.evidenceSignals
      });

      // Check if failure is an assertion failure, 5xx, or non-recoverable
      if (!classification.isRecoverable || classification.category !== "LOCATOR_DRIFT") {
        const finalStatus: RunStatus = classification.category === "AMBIGUOUS_OR_UNKNOWN" ? "REVIEW_REQUIRED" : "FAILED";
        this.updateStatus(finalStatus, classification.reason, classification.category);
        if (finalStatus === "REVIEW_REQUIRED") {
          this.emit("REVIEW_REQUIRED", { reason: classification.reason });
        } else {
          this.emit("RUN_FAILED", { status: "FAILED", category: classification.category, reason: classification.reason });
        }
        return finalStatus;
      }

      // 6. Recovery Lifecycle: Observe Candidates
      this.updateStatus("RECOVERING");
      this.emit("RECOVERY_STARTED", { stepId: failedStep.stepId, intent: failedStep.intent });

      const candidates = await StagehandAdapter.observeCandidates(this.page, failedStep.actionType);
      const candidateScores = new Map(
        SemanticVectorEngine.rankCandidates(failedStep.intent, candidates)
          .map(candidate => [candidate.candidateId, candidate.similarity])
      );
      this.emit("RECOVERY_CANDIDATES_FOUND", {
        stepId: failedStep.stepId,
        count: candidates.length,
        minimumSimilarity: CONFIG.minimumCandidateSimilarity,
        candidates: candidates.map(c => ({
          id: c.candidateId,
          name: c.name,
          role: c.role,
          isUnique: c.isUnique,
          selector: c.selector,
          similarity: candidateScores.get(c.candidateId) ?? 0
        }))
      });

      // 7. Recovery Proposal via LLM
      let proposal: RecoveryProposal;
      let modelName: string;
      let latencyMs: number;
      let approvedCandidateId: string | undefined;
      if (this.approvedCandidate && this.reviewDecisionId) {
        const matches = failedStep.stepId === this.approvedStepId
          ? candidates.filter(candidate =>
            candidate.selector === this.approvedCandidate?.selector &&
            candidate.name === this.approvedCandidate?.name &&
            candidate.role === this.approvedCandidate?.role
          )
          : [];
        if (matches.length === 1) {
          approvedCandidateId = matches[0].candidateId;
          proposal = {
            decision: "SELECT_CANDIDATE",
            targetCandidateId: approvedCandidateId,
            actionType: failedStep.actionType,
            expectedTransition: failedStep.expectedTransition || "next_state",
            rationale: `A reviewer approved '${matches[0].name || matches[0].candidateId}'. The candidate was freshly observed and will still pass all deterministic safety checks.`,
            evidenceRefs: []
          };
          modelName = "human-review";
          latencyMs = 0;
        } else {
          const reason = failedStep.stepId !== this.approvedStepId
            ? `The approved retry failed at unexpected step '${failedStep.name}', not the reviewed step. No other candidate was proposed.`
            : `The human-approved target '${this.approvedCandidate.name || this.approvedCandidate.candidateId}' was not uniquely present with the same selector, name, and role in the fresh page observation. No action was taken.`;
          proposal = {
            decision: "NO_SAFE_MATCH",
            rationale: reason,
            evidenceRefs: []
          };
          modelName = "human-review-stale-candidate";
          latencyMs = 0;
        }
      } else {
        const result = await LlmAdapter.proposeRecovery(failedStep, candidates);
        proposal = result.proposal;
        modelName = result.modelName;
        latencyMs = result.latencyMs;
      }
      this.emit("RECOVERY_PROPOSED", {
        stepId: failedStep.stepId,
        decision: proposal.decision,
        targetCandidateId: proposal.targetCandidateId,
        rationale: proposal.rationale,
        modelName,
        latencyMs,
        humanReviewDecisionId: this.reviewDecisionId || null
      });

      // 8. Deterministic Policy Gate
      const policyResult = RecoveryPolicyGate.evaluate(
        proposal,
        candidates,
        failedStep,
        1,
        CONFIG.minimumCandidateSimilarity,
        approvedCandidateId
      );
      this.emit("RECOVERY_POLICY_DECIDED", {
        stepId: failedStep.stepId,
        decision: policyResult.decision,
        reasonCodes: policyResult.reasonCodes,
        explanation: policyResult.explanation,
        similarityScore: policyResult.similarityScore,
        minimumSimilarity: policyResult.minimumSimilarity ?? CONFIG.minimumCandidateSimilarity,
        humanApproved: policyResult.humanApproved || false,
        humanReviewDecisionId: this.reviewDecisionId || null
      });

      // Record recovery attempt in DB
      db.prepare(`
        INSERT INTO recovery_attempts (id, run_id, step_id, candidate_set_json, proposal_json, policy_decision, policy_reason_codes_json, model_name, model_latency_ms, created_at, result_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `rec_${Date.now()}`,
        this.runId,
        failedStep.stepId,
        JSON.stringify(candidates),
        JSON.stringify(proposal),
        policyResult.decision,
        JSON.stringify(policyResult.reasonCodes),
        modelName,
        latencyMs,
        new Date().toISOString(),
        policyResult.decision
      );

      if (policyResult.decision !== "APPROVED" || !policyResult.validatedCandidate) {
        const finalStatus: RunStatus = policyResult.decision === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "FAILED";
        this.updateStatus(finalStatus, policyResult.explanation, "RECOVERY_POLICY_REJECTED");
        if (finalStatus === "REVIEW_REQUIRED") {
          this.emit("REVIEW_REQUIRED", { reason: policyResult.explanation });
        } else {
          this.emit("RUN_FAILED", { status: "FAILED", reason: policyResult.explanation });
        }
        return finalStatus;
      }

      // 9. Clean Replay: Reset fixtures, then re-execute from step 0 with the approved override
      this.updateStatus("REPLAYING");
      this.emit("REPLAY_STARTED", {
        stepId: failedStep.stepId,
        replacementSelector: policyResult.validatedCandidate.selector,
        candidateName: policyResult.validatedCandidate.name
      });

      // Reset clean data
      await this.resetDemoState(false); // preserve mutation
      await this.page.goto(this.contract.baseUrl);

      const replayResult = await this.executeWorkflowSteps(
        this.page,
        true,
        failedStep.stepId,
        policyResult.validatedCandidate.selector
      );

      if (!replayResult.success) {
        this.updateStatus("FAILED", `Replay execution failed at step '${replayResult.failedStep?.name}': ${replayResult.errorMessage}`, "REPLAY_FAILED");
        this.emit("RUN_FAILED", { status: "FAILED", reason: replayResult.errorMessage });
        return "FAILED";
      }

      // 10. Independent Outcome Verification on Replay
      this.updateStatus("VERIFYING");
      this.emit("VERIFICATION_STARTED", { runId: this.runId, mode: "recovered_replay" });
      const verifierOutcome = await OutcomeVerifier.verify(this.page, this.contract.successConditions, this.runId);

      for (const check of verifierOutcome.checks) {
        if (check.passed) {
          this.emit("VERIFICATION_CHECK_PASSED", {
            checkId: check.checkId,
            description: check.description,
            type: check.type,
            expected: check.expected,
            actual: check.actual,
            evidenceRef: check.evidenceRef
          });
        } else {
          this.emit("VERIFICATION_CHECK_FAILED", {
            checkId: check.checkId,
            description: check.description,
            type: check.type,
            expected: check.expected,
            actual: check.actual,
            evidenceRef: check.evidenceRef
          });
        }
      }

      if (verifierOutcome.allPassed) {
        // Success! Final HEALED state
        this.updateStatus("HEALED", `Self-healing succeeded. Broken locator safely recovered via '${policyResult.validatedCandidate.name}' and independently verified by test oracle.`);
        db.prepare("UPDATE test_runs SET recovery_count = 1 WHERE id = ?").run(this.runId);
        this.emit("RUN_FINISHED", {
          status: "HEALED",
          recoveredStepId: failedStep.stepId,
          replacementCandidate: policyResult.validatedCandidate.name,
          summary: verifierOutcome.summary,
          durationMs: Date.now() - this.startTime
        });
        return "HEALED";
      } else {
        this.updateStatus("FAILED", verifierOutcome.summary, "VERIFIER_CONDITION_FAILED");
        this.emit("RUN_FAILED", { status: "FAILED", reason: verifierOutcome.summary });
        return "FAILED";
      }

    } catch (err: any) {
      this.updateStatus("FAILED", `Unhandled execution exception: ${err.message}`, "UNHANDLED_EXCEPTION");
      this.emit("RUN_FAILED", { status: "FAILED", reason: err.message });
      return "FAILED";
    } finally {
      // Cleanup browser resources reliably
      if (this.browser) {
        try {
          await this.browser.close();
        } catch {}
      }
    }
  }

  private async resetDemoState(clearMutation: boolean = true): Promise<void> {
    try {
      // Unconditionally reset fixtures on every run so baseline and mutations start clean
      await fetch(`${CONFIG.demoOrigin}/api/fixtures/reset`, { method: "POST" });
      if (this.mutationScenarioId) {
        // Activate requested mutation on demo server
        await fetch(`${CONFIG.demoOrigin}/api/mutations/active`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioId: this.mutationScenarioId })
        });
      }
    } catch (err: any) {
      console.warn(`[RunOrchestrator] Failed to reset demo state: ${err.message}`);
    }
  }

  private async executeWorkflowSteps(
    page: Page,
    isReplay: boolean,
    overrideStepId?: string,
    overrideSelector?: string
  ): Promise<{ success: boolean; failedStep?: WorkflowStep; errorMessage?: string }> {
    for (const step of this.contract.steps) {
      const stepStartTime = Date.now();
      const isTargetOverridden = isReplay && overrideStepId === step.stepId && overrideSelector;
      const effectiveSelector = isTargetOverridden ? overrideSelector! : step.targetLocator;

      this.emit("STEP_STARTED", {
        stepId: step.stepId,
        stepName: step.name,
        actionType: step.actionType,
        isReplay,
        effectiveSelector
      });

      const stepRecordId = `step_${this.runId}_${step.stepId}_${isReplay ? 2 : 1}`;
      db.prepare(`
        INSERT INTO run_steps (id, run_id, step_id, step_name, attempt_number, status, started_at)
        VALUES (?, ?, ?, ?, ?, 'RUNNING', ?)
      `).run(stepRecordId, this.runId, step.stepId, step.name, isReplay ? 2 : 1, new Date().toISOString());

      try {
        switch (step.actionType) {
          case "navigate": {
            const url = step.targetLocator.startsWith("http")
              ? step.targetLocator
              : `${this.contract.baseUrl}${step.targetLocator}`;
            await page.goto(url, { timeout: step.timeoutMs, waitUntil: "domcontentloaded" });
            break;
          }

          case "click": {
            // Find element with bounded timeout
            await page.waitForSelector(effectiveSelector, { timeout: step.timeoutMs, state: "visible" });
            await page.click(effectiveSelector, { timeout: step.timeoutMs });
            // Brief pause for DOM transition
            await page.waitForTimeout(400);
            break;
          }

          case "fill": {
            await page.waitForSelector(effectiveSelector, { timeout: step.timeoutMs, state: "visible" });
            await page.fill(effectiveSelector, step.inputValue || "", { timeout: step.timeoutMs });
            break;
          }

          case "assert_visible": {
            await page.waitForSelector(effectiveSelector, { timeout: step.timeoutMs, state: "visible" });
            break;
          }

          case "assert_text": {
            await page.waitForSelector(effectiveSelector, { timeout: step.timeoutMs, state: "visible" });
            const text = (await page.innerText(effectiveSelector)).trim();
            const expectedText = (step.inputValue || "").trim();
            if (expectedText && !text.includes(expectedText)) {
              throw new Error(`Text assertion failed: element text '${text}' does not contain '${expectedText}'`);
            }
            break;
          }

          case "assert_url": {
            const currentUrl = page.url();
            const expectedUrl = step.inputValue || step.targetLocator;
            if (!currentUrl.includes(expectedUrl)) {
              throw new Error(`URL assertion failed: current URL '${currentUrl}' does not contain '${expectedUrl}'`);
            }
            break;
          }

          default:
            throw new Error(`Unsupported action type '${step.actionType}'`);
        }

        const durationMs = Date.now() - stepStartTime;
        const evidence = await this.captureStepEvidence(page, step, isReplay, stepRecordId);
        db.prepare(`
          UPDATE run_steps
          SET status = ?, finished_at = ?, duration_ms = ?,
              screenshot_artifact_id = ?, dom_artifact_id = ?
          WHERE id = ?
        `).run(
          isTargetOverridden ? "HEALED" : "PASSED",
          new Date().toISOString(),
          durationMs,
          evidence.screenshotArtifactId || null,
          evidence.domArtifactId || null,
          stepRecordId
        );

        this.emit("STEP_PASSED", {
          stepId: step.stepId,
          stepName: step.name,
          durationMs,
          healed: Boolean(isTargetOverridden)
        });

      } catch (err: any) {
        const durationMs = Date.now() - stepStartTime;
        const evidence = await this.captureStepEvidence(page, step, isReplay, stepRecordId);
        db.prepare(`
          UPDATE run_steps
          SET status = 'FAILED', finished_at = ?, duration_ms = ?, error_summary = ?,
              screenshot_artifact_id = ?, dom_artifact_id = ?
          WHERE id = ?
        `).run(
          new Date().toISOString(),
          durationMs,
          err.message,
          evidence.screenshotArtifactId || null,
          evidence.domArtifactId || null,
          stepRecordId
        );

        this.emit("STEP_FAILED", {
          stepId: step.stepId,
          stepName: step.name,
          durationMs,
          errorMessage: err.message
        });

        return {
          success: false,
          failedStep: step,
          errorMessage: err.message
        };
      }
    }
    return { success: true };
  }

  private async captureStepEvidence(
    page: Page,
    step: WorkflowStep,
    isReplay: boolean,
    stepRecordId: string
  ): Promise<{ screenshotArtifactId: string; domArtifactId: string }> {
    const label = `${isReplay ? "replay" : "step"}_${step.stepId}`;
    const attemptNumber = isReplay ? 2 : 1;
    const captureErrors: string[] = [];
    const [screenshotArtifactId, domArtifactId] = await Promise.all([
      this.recorder.captureScreenshot(page, step.stepId, label, attemptNumber).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        captureErrors.push(`Screenshot: ${message}`);
        return "";
      }),
      this.recorder.captureDomSnapshot(page, step.stepId, attemptNumber).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        captureErrors.push(`DOM snapshot: ${message}`);
        return "";
      })
    ]);

    for (const error of captureErrors) {
      console.warn(`[EvidenceRecorder] Run ${this.runId}, step ${step.stepId}: ${error}`);
    }

    db.prepare(`
      UPDATE run_steps
      SET screenshot_artifact_id = ?, dom_artifact_id = ?
      WHERE id = ?
    `).run(screenshotArtifactId || null, domArtifactId || null, stepRecordId);

    this.emit("EVIDENCE_CAPTURED", {
      stepId: step.stepId,
      stepName: step.name,
      attempt: attemptNumber,
      screenshotArtifactId: screenshotArtifactId || null,
      domArtifactId: domArtifactId || null,
      captureFailed: captureErrors.length > 0,
      captureErrors
    });

    return { screenshotArtifactId, domArtifactId };
  }
}
