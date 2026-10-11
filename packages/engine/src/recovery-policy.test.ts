import { describe, expect, it } from "vitest";
import { ObservedCandidate, RecoveryProposal, WorkflowStep } from "@intentlock/contracts";
import { RecoveryPolicyGate } from "./recovery-policy.js";

const step: WorkflowStep = {
  stepId: "checkout",
  name: "Proceed to Checkout",
  intent: "Proceed to Checkout",
  actionType: "click",
  targetLocator: "#checkout",
  expectedTransition: "confirmation",
  timeoutMs: 5000,
  riskCategory: "low"
};

const candidate: ObservedCandidate = {
  candidateId: "cand_01",
  role: "button",
  name: "Place order",
  text: "Place order",
  selector: "#place-order",
  actionType: "click",
  isVisible: true,
  isEnabled: true,
  isUnique: true
};

const proposal: RecoveryProposal = {
  decision: "SELECT_CANDIDATE",
  targetCandidateId: candidate.candidateId,
  actionType: "click",
  rationale: "The observed button appears to match checkout intent.",
  evidenceRefs: []
};

describe("RecoveryPolicyGate semantic threshold", () => {
  it("requires human review when an otherwise safe candidate is below the configured threshold", () => {
    const result = RecoveryPolicyGate.evaluate(proposal, [candidate], step, 1, 0.85);

    expect(result.decision).toBe("REVIEW_REQUIRED");
    expect(result.reasonCodes).toContain("SIMILARITY_BELOW_THRESHOLD");
    expect(result.similarityScore).toBeDefined();
    expect(result.similarityScore).toBeLessThan(0.85);
    expect(result.minimumSimilarity).toBe(0.85);
    expect(result.explanation).toContain("below the configured auto-acceptance threshold (0.85)");
  });

  it("allows an explicitly approved candidate past the similarity threshold but retains safety checks", () => {
    const result = RecoveryPolicyGate.evaluate(proposal, [candidate], step, 1, 0.85, candidate.candidateId);

    expect(result.decision).toBe("APPROVED");
    expect(result.reasonCodes).toContain("HUMAN_APPROVED_CANDIDATE");
    expect(result.humanApproved).toBe(true);
    expect(result.validatedCandidate).toEqual(candidate);
  });

  it("does not let human approval bypass duplicate or destructive-action checks", () => {
    const ambiguousCandidate = { ...candidate, isUnique: false };
    const ambiguousResult = RecoveryPolicyGate.evaluate(
      proposal,
      [ambiguousCandidate],
      step,
      1,
      0.85,
      candidate.candidateId
    );
    expect(ambiguousResult.decision).toBe("REVIEW_REQUIRED");
    expect(ambiguousResult.reasonCodes).toContain("AMBIGUOUS_DUPLICATE_CANDIDATES");

    const destructiveCandidate = { ...candidate, name: "Remove order" };
    const destructiveResult = RecoveryPolicyGate.evaluate(
      { ...proposal, targetCandidateId: destructiveCandidate.candidateId },
      [destructiveCandidate],
      step,
      1,
      0.85,
      destructiveCandidate.candidateId
    );
    expect(destructiveResult.decision).toBe("REJECTED");
    expect(destructiveResult.reasonCodes).toContain("DESTRUCTIVE_ACTION_FORBIDDEN");
  });
});
