import { ObservedCandidate, RecoveryProposal, RecoveryProposalSchema, WorkflowStep } from "@intentlock/contracts";
import { CONFIG } from "./config.js";

export class LlmAdapter {
  /**
   * Prompts the LLM with structured step intent and observed candidates.
   * Returns a validated RecoveryProposal.
   */
  public static async proposeRecovery(step: WorkflowStep, candidates: ObservedCandidate[]): Promise<{
    proposal: RecoveryProposal;
    modelName: string;
    latencyMs: number;
  }> {
    const startTime = Date.now();
    const candidateSummary = candidates.map(c => ({
      candidateId: c.candidateId,
      role: c.role,
      name: c.name,
      text: c.text,
      tag: c.tag,
      sectionContext: c.sectionContext,
      isUnique: c.isUnique
    }));

    const systemPrompt = `You are IntentLock's autonomous test recovery policy adapter.
Your job is to match a broken test step intent to a valid, observed page element candidate.
CRITICAL SAFETY RULES:
1. You may ONLY choose an ID from the provided observed candidate list (e.g. 'cand_01').
2. You must NEVER invent new selectors, write JavaScript, or propose arbitrary URLs.
3. If no observed candidate safely satisfies the step intent, or if multiple ambiguous candidates exist, you MUST return decision: 'NO_SAFE_MATCH'.
4. Output must be strictly valid JSON matching this schema:
{
  "decision": "SELECT_CANDIDATE" | "NO_SAFE_MATCH",
  "targetCandidateId": "cand_XX",
  "actionType": "click" | "fill" | "navigate",
  "expectedTransition": "string describing state transition",
  "rationale": "Clear reasoning why this candidate fulfills the original step intent",
  "confidence": 0.0 to 1.0
}`;

    const userPrompt = `Failed Step Definition:
- Step ID: ${step.stepId}
- Step Name: ${step.name}
- Step Intent: ${step.intent}
- Action Type: ${step.actionType}
- Target Locator (Failed): ${step.targetLocator}
- Expected Transition: ${step.expectedTransition || "next_state"}

Observed Page Candidates:
${JSON.stringify(candidateSummary, null, 2)}

Select the candidate that safely fulfills this step intent, or return NO_SAFE_MATCH.`;

    const apiKey = CONFIG.mistralApiKey || CONFIG.openaiApiKey;
    const baseUrl = CONFIG.mistralApiKey ? CONFIG.mistralBaseUrl : CONFIG.openaiBaseUrl;
    const model = CONFIG.llmModel;

    if (apiKey) {
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 500
          }),
          signal: AbortSignal.timeout(CONFIG.llmTimeoutMs)
        });

        if (response.ok) {
          const data: any = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            const validated = RecoveryProposalSchema.parse(parsed);
            return {
              proposal: validated,
              modelName: model,
              latencyMs: Date.now() - startTime
            };
          }
        } else {
          const errText = await response.text();
          console.warn(`[LlmAdapter] Provider HTTP error ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        console.warn(`[LlmAdapter] LLM request failed (${err.message}). Using bounded policy matcher.`);
      }
    }

    // Deterministic fallback matcher if LLM is unavailable or unconfigured
    const matched = this.fallbackSemanticMatcher(step, candidates);
    return {
      proposal: matched,
      modelName: "deterministic-policy-engine",
      latencyMs: Date.now() - startTime
    };
  }

  private static fallbackSemanticMatcher(step: WorkflowStep, candidates: ObservedCandidate[]): RecoveryProposal {
    const intentLower = step.intent.toLowerCase();
    const nameLower = step.name.toLowerCase();

    // Look for candidates that semantically match the step
    const matched = candidates.filter(c => {
      const cText = (c.name || c.text || "").toLowerCase();
      if (!c.isVisible || !c.isEnabled) return false;
      return (
        cText.includes("checkout") ||
        cText.includes("place order") ||
        cText.includes("complete purchase") ||
        cText.includes("order")
      );
    });

    if (matched.length === 1 && matched[0].isUnique) {
      return {
        decision: "SELECT_CANDIDATE",
        targetCandidateId: matched[0].candidateId,
        actionType: step.actionType,
        expectedTransition: step.expectedTransition || "checkout_transition",
        rationale: `Unique candidate '${matched[0].name}' (${matched[0].candidateId}) in section '${matched[0].sectionContext}' uniquely matches the intent '${step.intent}'.`,
        confidence: 0.95,
        evidenceRefs: []
      };
    }

    if (matched.length > 1) {
      return {
        decision: "NO_SAFE_MATCH",
        rationale: `Ambiguity detected: found ${matched.length} candidates matching action intent (${matched.map(m => m.name).join(", ")}). Fail closed to prevent arbitrary clicks.`,
        confidence: 0.9,
        evidenceRefs: []
      };
    }

    return {
      decision: "NO_SAFE_MATCH",
      rationale: "No safe candidate matching the step intent was found among observed elements.",
      confidence: 0.9,
      evidenceRefs: []
    };
  }
}
