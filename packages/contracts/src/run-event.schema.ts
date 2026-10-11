import { z } from "zod";
import { FailureCategorySchema, FailureClassificationSchema } from "./failure.schema.js";
import { ObservedCandidateSchema, RecoveryProposalSchema, PolicyEvaluationResultSchema } from "./recovery-proposal.schema.js";

export const RunStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "DIAGNOSING",
  "RECOVERING",
  "REPLAYING",
  "VERIFYING",
  "PASSED",
  "HEALED",
  "FAILED",
  "REVIEW_REQUIRED"
]);

export type RunStatus = z.infer<typeof RunStatusSchema>;

export const TerminalRunStatusSchema = z.enum([
  "PASSED",
  "HEALED",
  "FAILED",
  "REVIEW_REQUIRED"
]);

export type TerminalRunStatus = z.infer<typeof TerminalRunStatusSchema>;

export const EventTypeSchema = z.enum([
  "RUN_QUEUED",
  "RUN_STARTED",
  "STEP_STARTED",
  "STEP_PASSED",
  "STEP_FAILED",
  "EVIDENCE_CAPTURED",
  "FAILURE_CLASSIFIED",
  "RECOVERY_STARTED",
  "RECOVERY_CANDIDATES_FOUND",
  "RECOVERY_PROPOSED",
  "RECOVERY_POLICY_DECIDED",
  "REPLAY_STARTED",
  "VERIFICATION_STARTED",
  "VERIFICATION_CHECK_PASSED",
  "VERIFICATION_CHECK_FAILED",
  "RUN_FINISHED",
  "RUN_FAILED",
  "REVIEW_REQUIRED"
]);

export type EventType = z.infer<typeof EventTypeSchema>;

export const RunEventSchema = z.object({
  id: z.string(),
  runId: z.string(),
  sequenceNo: z.number().int().nonnegative(),
  type: EventTypeSchema,
  timestamp: z.string(),
  payload: z.record(z.any())
});

export type RunEvent = z.infer<typeof RunEventSchema>;

export const VerificationCheckResultSchema = z.object({
  checkId: z.string(),
  description: z.string(),
  type: z.string(),
  passed: z.boolean(),
  expected: z.any(),
  actual: z.any(),
  evidenceRef: z.string().optional()
});

export type VerificationCheckResult = z.infer<typeof VerificationCheckResultSchema>;

export const VerifierOutcomeSchema = z.object({
  allPassed: z.boolean(),
  checks: z.array(VerificationCheckResultSchema),
  summary: z.string()
});

export type VerifierOutcome = z.infer<typeof VerifierOutcomeSchema>;

export const RunStepRecordSchema = z.object({
  id: z.string(),
  runId: z.string(),
  stepId: z.string(),
  stepName: z.string(),
  attemptNumber: z.number().int().positive(),
  status: z.enum(["PENDING", "RUNNING", "PASSED", "FAILED", "HEALED", "SKIPPED"]),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  durationMs: z.number().optional(),
  failureCategory: FailureCategorySchema.optional(),
  errorSummary: z.string().optional(),
  screenshotArtifactId: z.string().optional(),
  domArtifactId: z.string().optional()
});

export type RunStepRecord = z.infer<typeof RunStepRecordSchema>;

export const TestRunRecordSchema = z.object({
  id: z.string(),
  testId: z.string(),
  contractVersion: z.number().int().positive(),
  status: RunStatusSchema,
  triggerSource: z.enum(["workbench", "cli", "ci"]).default("workbench"),
  mutationScenarioId: z.string().nullable().optional(),
  startedAt: z.string(),
  finishedAt: z.string().nullable().optional(),
  durationMs: z.number().nullable().optional(),
  finalSummary: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  recoveryCount: z.number().int().default(0),
  idempotencyKey: z.string().optional(),
  parentRunId: z.string().nullable().optional()
});

export type TestRunRecord = z.infer<typeof TestRunRecordSchema>;
