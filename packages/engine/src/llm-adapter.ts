import { ObservedCandidate, RecoveryProposal, RecoveryProposalSchema, WorkflowStep } from "@intentlock/contracts";
import { CONFIG } from "./config.js";
import { SemanticVectorEngine } from "./semantic-vsm.js";

export class LlmAdapter {
  /**
   * Evaluates recovery proposals using Gemini, OpenAI, or the local TF-IDF Cosine Vector Space Engine.
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

    const systemPrompt = `You are Ojastra's autonomous test recovery policy adapter.
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

    // 1. Google Gemini native REST endpoint with structured JSON
    const provider = (CONFIG.llmProvider || "").toLowerCase();
    if ((provider === "gemini" || !provider) && CONFIG.geminiApiKey) {
      try {
        const url = `${CONFIG.geminiApiUrl}/models/${CONFIG.geminiModel}:generateContent?key=${CONFIG.geminiApiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json"
            }
          }),
          signal: AbortSignal.timeout(CONFIG.llmTimeoutMs)
        });

        if (response.ok) {
          const data: any = await response.json();
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            const parsed = JSON.parse(content);
            const validated = RecoveryProposalSchema.parse(parsed);
            return {
              proposal: validated,
              modelName: CONFIG.geminiModel,
              latencyMs: Date.now() - startTime
            };
          }
        } else {
          const errText = await response.text();
          console.warn(`[LlmAdapter] Gemini API HTTP ${response.status}: ${errText}. Cascading to Vector Space Engine.`);
        }
      } catch (err: any) {
        console.warn(`[LlmAdapter] Gemini error (${err.message}). Cascading to Vector Space Engine.`);
      }
    } else {
      // Mistral / OpenAI compatible endpoint
      let apiKey = "";
      let baseUrl = "";
      let model = "";

      if (provider === "mistral" && CONFIG.mistralApiKey) {
        apiKey = CONFIG.mistralApiKey;
        baseUrl = CONFIG.mistralBaseUrl;
        model = CONFIG.llmModel;
      } else if (provider === "openai" && CONFIG.openaiApiKey) {
        apiKey = CONFIG.openaiApiKey;
        baseUrl = CONFIG.openaiBaseUrl;
        model = CONFIG.llmModel;
      }

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
            console.warn(`[LlmAdapter] Provider HTTP error ${response.status}: ${errText}. Cascading to Vector Space Engine.`);
          }
        } catch (err: any) {
          console.warn(`[LlmAdapter] Cloud LLM error (${err.message}). Cascading to Vector Space Engine.`);
        }
      }
    }

    // 2. Real In-Memory TF-IDF Cosine Vector Space Engine
    const vectorProposal = this.evaluateWithVectorSpaceEngine(step, candidates);
    return {
      proposal: vectorProposal,
      modelName: "tf-idf-cosine-vector-engine",
      latencyMs: Date.now() - startTime
    };
  }

  /**
   * Real mathematical vector space ranking with TF-IDF and Cosine Similarity.
   */
  private static evaluateWithVectorSpaceEngine(step: WorkflowStep, candidates: ObservedCandidate[]): RecoveryProposal {
    // Check for destructive actions
    const filteredCandidates = candidates.filter(c => !SemanticVectorEngine.isDestructiveAction(c.name || ""));

    if (filteredCandidates.length === 0) {
      return {
        decision: "NO_SAFE_MATCH",
        rationale: "All observed elements were filtered out by safety policy as potentially destructive or irrelevant.",
        confidence: 0.95,
        evidenceRefs: []
      };
    }

    // Rank candidates using Cosine Similarity
    const ranked = SemanticVectorEngine.rankCandidates(step.intent, filteredCandidates);

    if (ranked.length === 0) {
      return {
        decision: "NO_SAFE_MATCH",
        rationale: "No candidates available for vector space ranking.",
        confidence: 0.9,
        evidenceRefs: []
      };
    }

    const top = ranked[0];

    // Ambiguity Detection: If 2nd candidate is also high scoring and close to top candidate
    if (ranked.length > 1) {
      const runnerUp = ranked[1];
      const delta = top.similarity - runnerUp.similarity;

      // Both candidates have high similarity and difference is very small (< 0.05) or names identical
      if ((top.similarity >= 0.65 && runnerUp.similarity >= 0.65 && delta < 0.05) ||
          (top.candidateName.toLowerCase() === runnerUp.candidateName.toLowerCase() && top.similarity >= 0.65)) {
        return {
          decision: "NO_SAFE_MATCH",
          rationale: `Vector Ambiguity Detected: Top candidate '${top.candidateName}' (sim: ${top.similarity}) and runner-up '${runnerUp.candidateName}' (sim: ${runnerUp.similarity}) have overlapping cosine vectors (delta: ${delta.toFixed(3)}). Fail closed to prevent arbitrary clicks.`,
          confidence: Number(top.similarity.toFixed(2)),
          evidenceRefs: []
        };
      }
    }

    // Single strong match
    if (top.similarity >= 0.50 && top.candidate.isUnique && top.candidate.isVisible) {
      return {
        decision: "SELECT_CANDIDATE",
        targetCandidateId: top.candidateId,
        actionType: step.actionType,
        expectedTransition: step.expectedTransition || "next_state",
        rationale: `TF-IDF Cosine Vector Engine selected '${top.candidateName}' (${top.candidateId}) with cosine similarity score ${top.similarity} matching intent '${step.intent}'.`,
        confidence: top.similarity,
        evidenceRefs: []
      };
    }

    return {
      decision: "NO_SAFE_MATCH",
      rationale: `Top candidate '${top.candidateName}' reached cosine similarity ${top.similarity}, which is below the safe acceptance threshold (0.50).`,
      confidence: top.similarity,
      evidenceRefs: []
    };
  }
}
