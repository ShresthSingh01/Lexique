import { z } from "zod";

export const ActionTypeSchema = z.enum([
  "navigate",
  "click",
  "fill",
  "select",
  "press",
  "assert_visible",
  "assert_text",
  "assert_url"
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

export const RiskCategorySchema = z.enum([
  "low",
  "medium",
  "high",
  "unknown"
]);

export type RiskCategory = z.infer<typeof RiskCategorySchema>;

export const WorkflowStepSchema = z.object({
  stepId: z.string(),
  name: z.string(),
  intent: z.string(),
  actionType: ActionTypeSchema,
  targetLocator: z.string(), // Resilient selector/role/label/test-id
  inputValue: z.string().optional(),
  expectedTransition: z.string().optional(),
  timeoutMs: z.number().default(5000),
  riskCategory: RiskCategorySchema.default("low")
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const SuccessConditionSchema = z.object({
  id: z.string(),
  description: z.string(),
  type: z.enum([
    "ui_element_visible",
    "ui_text_equals",
    "backend_order_state",
    "sku_quantity_match",
    "order_total_match",
    "payment_status_match",
    "no_duplicate_orders"
  ]),
  expected: z.any()
});

export type SuccessCondition = z.infer<typeof SuccessConditionSchema>;

export const InvariantSchema = z.object({
  id: z.string(),
  description: z.string(),
  type: z.enum([
    "no_5xx_errors",
    "no_duplicate_submits",
    "total_equals_subtotal_plus_tax"
  ])
});

export type Invariant = z.infer<typeof InvariantSchema>;

export const TestContractSchema = z.object({
  testId: z.string(),
  contractVersion: z.number().int().positive(),
  name: z.string(),
  description: z.string(),
  environmentId: z.string().default("local-demo"),
  baseUrl: z.string(),
  preconditions: z.array(z.string()),
  steps: z.array(WorkflowStepSchema),
  invariants: z.array(InvariantSchema),
  successConditions: z.array(SuccessConditionSchema),
  allowedSideEffects: z.array(z.string()).default([]),
  forbiddenSideEffects: z.array(z.string()).default([])
});

export type TestContract = z.infer<typeof TestContractSchema>;

export const TestSpecSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  activeContractVersion: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type TestSpecSummary = z.infer<typeof TestSpecSummarySchema>;
