import { z } from "zod";
import { TerminalRunStatusSchema } from "./run-event.schema.js";

export const MutationIdSchema = z.enum([
  "M01_RENAME_TARGET",
  "M02_RESTRUCTURE_DOM",
  "M03_MOVE_TARGET",
  "M04_ADD_REVIEW_STEP",
  "M05_DUPLICATE_LABEL",
  "M06_WRONG_TOTAL",
  "M07_PAYMENT_ERROR",
  "M08_SERVER_UNAVAILABLE"
]);

export type MutationId = z.infer<typeof MutationIdSchema>;

export const MutationScenarioSchema = z.object({
  id: MutationIdSchema,
  name: z.string(),
  description: z.string(),
  mutationType: z.enum([
    "LOCATOR_RENAME",
    "DOM_RESTRUCTURE",
    "LAYOUT_MOVE",
    "WORKFLOW_STEP",
    "AMBIGUOUS_DUPLICATE",
    "BUSINESS_LOGIC_BUG",
    "PAYMENT_FAILURE",
    "BACKEND_503"
  ]),
  expectedOutcome: TerminalRunStatusSchema,
  expectedFailureCategory: z.string().optional(),
  riskCategory: z.enum(["low", "medium", "high", "unknown"]),
  setupConfig: z.record(z.any()).default({}),
  enabled: z.boolean().default(true)
});

export type MutationScenario = z.infer<typeof MutationScenarioSchema>;
