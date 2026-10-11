import { FailureCategory, ObservedCandidate } from "@intentlock/contracts";

export interface RankedCandidate {
  candidateId: string;
  candidateName: string;
  similarity: number;
  candidate: ObservedCandidate;
}

export class SemanticVectorEngine {
  // Domain intent synonym clusters
  private static readonly INTENT_SYNONYMS: Record<string, string[]> = {
    checkout: [
      "checkout",
      "place order",
      "complete purchase",
      "complete order",
      "submit order",
      "pay now",
      "proceed to checkout",
      "proceed to payment",
      "buy now",
      "finalize order"
    ],
    cart: [
      "cart",
      "basket",
      "bag",
      "shopping cart",
      "order summary",
      "items summary"
    ],
    add_to_cart: [
      "add to cart",
      "add item",
      "select product",
      "buy item",
      "add to basket"
    ],
    submit_form: [
      "submit",
      "complete purchase",
      "confirm and pay",
      "finish order",
      "finalize"
    ]
  };

  private static readonly DESTRUCTIVE_TERMS = [
    "delete",
    "remove",
    "cancel",
    "clear",
    "trash",
    "abandon",
    "return",
    "back"
  ];

  // Canonical error taxonomy vectors
  private static readonly ERROR_SIGNATURES: Record<FailureCategory, string[]> = {
    LOCATOR_DRIFT: [
      "waiting for locator",
      "timeout waiting for element",
      "element not found in dom",
      "element is not visible",
      "element handle detached",
      "strict mode violation resolved to multiple elements"
    ],
    APPLICATION_OR_NETWORK_ERROR: [
      "503 service unavailable",
      "500 internal server error",
      "connection refused",
      "net err_connection_refused",
      "network error",
      "failed to fetch"
    ],
    ASSERTION_OR_BUSINESS_INVARIANT: [
      "order total match failed",
      "expected total mismatch",
      "sku quantity match failed",
      "payment status match failed",
      "transaction declined",
      "business assertion violated",
      "verifier condition failed"
    ],
    AMBIGUOUS_OR_UNKNOWN: [
      "multiple ambiguous candidates",
      "unresolved conflict",
      "duplicate interactive labels"
    ],
    LAYOUT_OR_STRUCTURE_DRIFT: ["layout moved", "relocated structure"],
    WORKFLOW_DRIFT: ["unexpected step", "workflow sequence drift"],
    TEST_DATA_OR_FIXTURE_ERROR: ["fixture missing", "cart empty"],
    ENVIRONMENT_OR_INFRASTRUCTURE_ERROR: ["browser crashed", "os memory limit"]
  };

  /**
   * Tokenizes text into normalized words, bi-grams, and expanded semantic synonyms.
   */
  public static tokenize(text: string): string[] {
    const clean = (text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    const words = clean.split(/\s+/).filter(w => w.length > 1);
    const tokens: string[] = [...words];

    // Generate bigrams
    for (let i = 0; i < words.length - 1; i++) {
      tokens.push(`${words[i]} ${words[i + 1]}`);
    }

    // Expand domain synonyms
    for (const [key, synonyms] of Object.entries(this.INTENT_SYNONYMS)) {
      if (tokens.some(t => t.includes(key) || synonyms.includes(t))) {
        tokens.push(...synonyms);
      }
    }

    return tokens;
  }

  /**
   * Computes TF-IDF vector for a set of tokens against a vocabulary space.
   */
  private static vectorize(tokens: string[], vocabulary: Map<string, number>): Float64Array {
    const vec = new Float64Array(vocabulary.size);
    const counts = new Map<string, number>();

    for (const t of tokens) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }

    for (const [token, count] of counts.entries()) {
      const idx = vocabulary.get(token);
      if (idx !== undefined) {
        // TF-IDF term frequency (augmented frequency)
        vec[idx] = 0.5 + (0.5 * count) / tokens.length;
      }
    }

    return vec;
  }

  /**
   * Computes Cosine Similarity between two Float64 vectors: (A . B) / (||A|| * ||B||)
   */
  public static cosineSimilarity(vecA: Float64Array, vecB: Float64Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Ranks observed page candidates by cosine similarity against the step intent.
   */
  public static rankCandidates(stepIntent: string, candidates: ObservedCandidate[]): RankedCandidate[] {
    const intentTokens = this.tokenize(stepIntent);

    // Build shared vocabulary
    const vocab = new Map<string, number>();
    let vIndex = 0;

    for (const t of intentTokens) {
      if (!vocab.has(t)) vocab.set(t, vIndex++);
    }

    const candidateTokensList = candidates.map(c => {
      const combinedText = `${c.name} ${c.text} ${c.role} ${c.sectionContext || ""}`;
      const tokens = this.tokenize(combinedText);
      for (const t of tokens) {
        if (!vocab.has(t)) vocab.set(t, vIndex++);
      }
      return tokens;
    });

    const intentVec = this.vectorize(intentTokens, vocab);

    const scored: RankedCandidate[] = candidates.map((candidate, i) => {
      const candVec = this.vectorize(candidateTokensList[i], vocab);
      const similarity = this.cosineSimilarity(intentVec, candVec);

      return {
        candidateId: candidate.candidateId,
        candidateName: candidate.name || candidate.role || "unknown",
        similarity: Number(similarity.toFixed(4)),
        candidate
      };
    });

    // Sort descending by cosine similarity
    return scored.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Evaluates if a candidate is semantically aligned with destructive or forbidden operations.
   */
  public static isDestructiveAction(text: string): boolean {
    const tokens = this.tokenize(text);
    return tokens.some(t => this.DESTRUCTIVE_TERMS.some(dt => t.includes(dt)));
  }

  /**
   * Classifies an unformatted runtime browser error message by vector distance
   * against canonical failure category clusters.
   */
  public static classifyErrorVector(errorMessage: string): {
    category: FailureCategory;
    similarity: number;
    reason: string;
  } {
    const errTokens = this.tokenize(errorMessage);
    const vocab = new Map<string, number>();
    let vIndex = 0;

    for (const t of errTokens) {
      if (!vocab.has(t)) vocab.set(t, vIndex++);
    }

    const categoryScores: Array<{ category: FailureCategory; similarity: number }> = [];

    for (const [category, signatures] of Object.entries(this.ERROR_SIGNATURES)) {
      const sigTokens = signatures.flatMap(s => this.tokenize(s));
      for (const t of sigTokens) {
        if (!vocab.has(t)) vocab.set(t, vIndex++);
      }

      const errVec = this.vectorize(errTokens, vocab);
      const sigVec = this.vectorize(sigTokens, vocab);
      const similarity = this.cosineSimilarity(errVec, sigVec);

      categoryScores.push({
        category: category as FailureCategory,
        similarity: Number(similarity.toFixed(4))
      });
    }

    categoryScores.sort((a, b) => b.similarity - a.similarity);
    const best = categoryScores[0];

    if (best && best.similarity >= 0.3) {
      return {
        category: best.category,
        similarity: best.similarity,
        reason: `Vector cosine similarity (${best.similarity}) to canonical ${best.category} signature cluster.`
      };
    }

    return {
      category: "AMBIGUOUS_OR_UNKNOWN",
      similarity: 0.1,
      reason: "No strong vector correlation with known failure clusters."
    };
  }
}
