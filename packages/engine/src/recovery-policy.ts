import {
  ObservedCandidate,
  PolicyEvaluationResult,
  RecoveryProposal,
  WorkflowStep
} from "@intentlock/contracts";
import { CONFIG } from "./config.js";
import { SemanticVectorEngine } from "./semantic-vsm.js";

export class RecoveryPolicyGate {
  /**
   * Deterministically validates an LLM-proposed recovery against system invariants,
   * candidate uniqueness, risk policies, and environmental constraints.
   */
  public static evaluate(
    proposal: RecoveryProposal,
    candidates: ObservedCandidate[],
    step: WorkflowStep,
    attemptNumber: number = 1,
    minimumSimilarity: number = CONFIG.minimumCandidateSimilarity,
    humanApprovedCandidateId?: string
  ): PolicyEvaluationResult {
    const reasonCodes: string[] = [];
    const rankedCandidates = SemanticVectorEngine.rankCandidates(step.intent, candidates);

    // Rule 1: Rejection if model proposed NO_SAFE_MATCH
    if (proposal.decision === "NO_SAFE_MATCH" || !proposal.targetCandidateId) {
      reasonCodes.push("MODEL_ABSTAINED_NO_SAFE_MATCH");
      return {
        decision: "REVIEW_REQUIRED",
        reasonCodes,
        explanation: proposal.rationale || "The recovery model determined that no candidate safely matches step intent.",
        similarityScore: rankedCandidates[0]?.similarity,
        minimumSimilarity,
        humanApproved: false
      };
    }

    // Rule 2: Bound attempts (Max 1 attempt per step)
    if (attemptNumber > 1) {
      reasonCodes.push("MAX_ATTEMPTS_EXCEEDED");
      return {
        decision: "REJECTED",
        reasonCodes,
        explanation: `Recovery attempt limit reached (attempt ${attemptNumber} > 1).`
      };
    }

    // Rule 3: Candidate must exist in current page observation
    const candidate = candidates.find(c => c.candidateId === proposal.targetCandidateId);
    if (!candidate) {
      reasonCodes.push("CANDIDATE_ID_NOT_OBSERVED");
      return {
        decision: "REJECTED",
        reasonCodes,
        explanation: `Proposed candidate '${proposal.targetCandidateId}' does not exist in the current page observation snapshot.`
      };
    }
    reasonCodes.push("CANDIDATE_EXISTS");
    const rankedCandidate = rankedCandidates
      .find(item => item.candidateId === candidate.candidateId);
    const similarityScore = rankedCandidate?.similarity ?? 0;
    const humanApproved = candidate.candidateId === humanApprovedCandidateId;

    // Rule 4: Candidate must be visible and enabled
    if (!candidate.isVisible || !candidate.isEnabled) {
      reasonCodes.push("CANDIDATE_NOT_INTERACTABLE");
      return {
        decision: "REJECTED",
        reasonCodes,
        explanation: `Candidate '${candidate.candidateId}' is hidden or disabled in DOM.`,
        similarityScore,
        minimumSimilarity,
        humanApproved
      };
    }
    reasonCodes.push("CANDIDATE_INTERACTABLE");

    // Rule 4.5: Destructive action filter via Semantic Vector Engine
    if (SemanticVectorEngine.isDestructiveAction(candidate.name || "")) {
      reasonCodes.push("DESTRUCTIVE_ACTION_FORBIDDEN");
      return {
        decision: "REJECTED",
        reasonCodes,
        explanation: `Candidate '${candidate.name}' flagged by Semantic Vector Engine as a destructive/canceling action. Strictly prohibited during recovery.`,
        similarityScore,
        minimumSimilarity,
        humanApproved
      };
    }
    reasonCodes.push("NON_DESTRUCTIVE_VERIFIED");

    // Rule 5: Candidate must be unique
    if (!candidate.isUnique) {
      reasonCodes.push("AMBIGUOUS_DUPLICATE_CANDIDATES");
      return {
        decision: "REVIEW_REQUIRED",
        reasonCodes,
        explanation: `Candidate '${candidate.name}' is ambiguous (multiple identical controls exist). Stop safely for human review.`,
        similarityScore,
        minimumSimilarity,
        humanApproved
      };
    }
    reasonCodes.push("UNIQUE_TARGET");

    // Rule 6: Action type compatibility
    const actionType = proposal.actionType || step.actionType;
    if (actionType !== step.actionType) {
      reasonCodes.push("ACTION_TYPE_MISMATCH");
      return {
        decision: "REJECTED",
        reasonCodes,
        explanation: `Proposed action type '${actionType}' differs from contract action type '${step.actionType}'.`,
        similarityScore,
        minimumSimilarity,
        humanApproved
      };
    }
    reasonCodes.push("ACTION_TYPE_COMPATIBLE");

    if (!humanApproved && similarityScore < minimumSimilarity) {
      reasonCodes.push("SIMILARITY_BELOW_THRESHOLD");
      return {
        decision: "REVIEW_REQUIRED",
        reasonCodes,
        explanation: `Candidate '${candidate.name || candidate.candidateId}' scored ${similarityScore.toFixed(4)}, below the configured auto-acceptance threshold (${minimumSimilarity.toFixed(2)}). Human review is required before a retry.`,
        similarityScore,
        minimumSimilarity,
        humanApproved: false
      };
    }
    if (humanApproved) {
      reasonCodes.push("HUMAN_APPROVED_CANDIDATE");
    }

    // Rule 7: Risk policy gate
    if (step.riskCategory === "high") {
      // High-risk actions (e.g. order submission) are only permitted in verified local sandbox environments
      reasonCodes.push("SANDBOX_HIGH_RISK_AUTHORIZED");
    } else {
      reasonCodes.push("LOW_RISK_AUTHORIZED");
    }

    return {
      decision: "APPROVED",
      reasonCodes,
      explanation: `Candidate '${candidate.candidateId}' (${candidate.name}) approved by deterministic policy gate.`,
      validatedCandidate: candidate,
      similarityScore,
      minimumSimilarity,
      humanApproved
    };
  }
}
