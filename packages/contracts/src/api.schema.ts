import { z } from "zod";
import { MutationIdSchema } from "./mutation.schema.js";

export const CreateRunRequestSchema = z.object({
  testId: z.string(),
  contractVersion: z.number().int().positive().default(1),
  environmentId: z.string().default("local-demo"),
  mutationScenarioId: MutationIdSchema.nullable().optional(),
  idempotencyKey: z.string().optional()
});

export type CreateRunRequest = z.infer<typeof CreateRunRequestSchema>;

export const CreateRunResponseSchema = z.object({
  runId: z.string(),
  status: z.literal("QUEUED"),
  message: z.string()
});

export type CreateRunResponse = z.infer<typeof CreateRunResponseSchema>;

export const BenchmarkScenarioSummarySchema = z.object({
  scenarioId: z.string(),
  name: z.string(),
  expectedOutcome: z.string(),
  totalRuns: z.number(),
  passedRuns: z.number(),
  healedRuns: z.number(),
  failedRuns: z.number(),
  reviewRequiredRuns: z.number(),
  accuracyRate: z.number()
});

export type BenchmarkScenarioSummary = z.infer<typeof BenchmarkScenarioSummarySchema>;

export const BenchmarkMetricsSchema = z.object({
  totalRuns: z.number(),
  benignRecoveryRate: z.number(), // e.g. 0.95 (95%)
  benignRecoveryCount: z.string(), // "9/10"
  falseHealRate: z.number(), // 0.0 (0%)
  falseHealCount: z.string(), // "0/5"
  intentPreservationRate: z.number(),
  intentPreservationCount: z.string(),
  safeAbstentionRate: z.number(),
  safeAbstentionCount: z.string(),
  averageRecoveryLatencyMs: z.number(),
  modelInvocationCount: z.number(),
  scenarios: z.array(BenchmarkScenarioSummarySchema)
});

export type BenchmarkMetrics = z.infer<typeof BenchmarkMetricsSchema>;
