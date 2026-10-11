import { z } from "zod";
import { ActionTypeSchema } from "./test-spec.schema.js";

export const ObservedCandidateSchema = z.object({
  candidateId: z.string(),
  role: z.string().optional(),
  name: z.string().optional(),
  text: z.string().optional(),
  tag: z.string().optional(),
  selector: z.string(),
  xpath: z.string().optional(),
  actionType: ActionTypeSchema,
  isVisible: z.boolean(),
  isEnabled: z.boolean(),
  isUnique: z.boolean(),
  boundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }).optional(),
  sectionContext: z.string().optional()
});

export type ObservedCandidate = z.infer<typeof ObservedCandidateSchema>;

export const CandidateSelectionDecisionSchema = z.enum([
  "SELECT_CANDIDATE",
  "NO_SAFE_MATCH"
]);

export type CandidateSelectionDecision = z.infer<typeof CandidateSelectionDecisionSchema>;

export const RecoveryProposalSchema = z.object({
  decision: CandidateSelectionDecisionSchema,
  targetCandidateId: z.string().optional(),
  actionType: ActionTypeSchema.optional(),
  expectedTransition: z.string().optional(),
  rationale: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  evidenceRefs: z.array(z.string()).default([])
});

export type RecoveryProposal = z.infer<typeof RecoveryProposalSchema>;

export const PolicyDecisionSchema = z.enum([
  "APPROVED",
  "REJECTED",
  "REVIEW_REQUIRED"
]);

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export const PolicyEvaluationResultSchema = z.object({
  decision: PolicyDecisionSchema,
  reasonCodes: z.array(z.string()),
  explanation: z.string(),
  validatedCandidate: ObservedCandidateSchema.optional(),
  similarityScore: z.number().min(0).max(1).optional(),
  minimumSimilarity: z.number().min(0).max(1).optional(),
  humanApproved: z.boolean().optional()
});

export type PolicyEvaluationResult = z.infer<typeof PolicyEvaluationResultSchema>;
