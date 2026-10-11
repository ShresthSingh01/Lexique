import { z } from "zod";

export const FailureCategorySchema = z.enum([
  "LOCATOR_DRIFT",
  "LAYOUT_OR_STRUCTURE_DRIFT",
  "WORKFLOW_DRIFT",
  "ASSERTION_OR_BUSINESS_INVARIANT",
  "APPLICATION_OR_NETWORK_ERROR",
  "TEST_DATA_OR_FIXTURE_ERROR",
  "ENVIRONMENT_OR_INFRASTRUCTURE_ERROR",
  "AMBIGUOUS_OR_UNKNOWN"
]);

export type FailureCategory = z.infer<typeof FailureCategorySchema>;

export const FailureClassificationSchema = z.object({
  category: FailureCategorySchema,
  confidence: z.number().min(0).max(1),
  isRecoverable: z.boolean(),
  reason: z.string(),
  suggestedAction: z.string(),
  evidenceSignals: z.array(z.string())
});

export type FailureClassification = z.infer<typeof FailureClassificationSchema>;
