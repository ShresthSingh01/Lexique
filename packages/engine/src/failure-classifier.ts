import { FailureClassification } from "@intentlock/contracts";
import { SemanticVectorEngine } from "./semantic-vsm.js";

export interface ErrorContext {
  stepId: string;
  stepIntent: string;
  actionType: string;
  errorMessage: string;
  httpStatus?: number;
  isAssertionFailure?: boolean;
  domElementExists?: boolean;
  url?: string;
}

export class FailureClassifier {
  public static classify(ctx: ErrorContext): FailureClassification {
    const msg = (ctx.errorMessage || "").toLowerCase();
    const signals: string[] = [];

    // 1. Hard HTTP / Infrastructure 5xx check
    if (ctx.httpStatus && ctx.httpStatus >= 500) {
      signals.push(`HTTP status ${ctx.httpStatus} detected`);
      return {
        category: "APPLICATION_OR_NETWORK_ERROR",
        confidence: 0.98,
        isRecoverable: false,
        reason: `Server returned an application/infrastructure error (${ctx.httpStatus}). Recovery cannot modify backend service state.`,
        suggestedAction: "Check backend application logs and service health.",
        evidenceSignals: signals
      };
    }

    // 2. Vector space classification of the runtime error message
    const vectorResult = SemanticVectorEngine.classifyErrorVector(ctx.errorMessage);
    signals.push(`Vector Space Classification: ${vectorResult.category} (similarity: ${vectorResult.similarity})`);

    // Signal: Business Assertion or Invariant Failure
    if (ctx.isAssertionFailure ||
        vectorResult.category === "ASSERTION_OR_BUSINESS_INVARIANT" ||
        msg.includes("order_total_match") ||
        msg.includes("sku_quantity_match") ||
        msg.includes("payment_status_match") ||
        msg.includes("declined") ||
        msg.includes("total mismatch")) {
      signals.push("Business assertion/invariant condition violated");
      return {
        category: "ASSERTION_OR_BUSINESS_INVARIANT",
        confidence: Math.max(0.95, vectorResult.similarity),
        isRecoverable: false,
        reason: "Business logic assertion failed on an existing element or verified backend state. Ojastra strictly prohibits healing genuine defects.",
        suggestedAction: "Investigate application logic regression (e.g. pricing, discount, or payment gateway calculation).",
        evidenceSignals: signals
      };
    }

    // Signal: Application or Network failure
    if (vectorResult.category === "APPLICATION_OR_NETWORK_ERROR" ||
        msg.includes("503") ||
        msg.includes("econnrefused") ||
        msg.includes("net::err_connection_refused")) {
      signals.push("Network or backend offline error pattern");
      return {
        category: "APPLICATION_OR_NETWORK_ERROR",
        confidence: Math.max(0.95, vectorResult.similarity),
        isRecoverable: false,
        reason: "Connection refused or service unavailable. The application under test is offline.",
        suggestedAction: "Ensure the demo application server is running.",
        evidenceSignals: signals
      };
    }

    // Signal: Locator Drift
    const isInteractiveAction = ctx.actionType === "click" || ctx.actionType === "fill" || ctx.actionType === "select";

    if (vectorResult.category === "LOCATOR_DRIFT" ||
        msg.includes("waiting for locator") ||
        msg.includes("timeout") ||
        msg.includes("not found")) {

      signals.push("Playwright locator timed out waiting for element");
      signals.push(`Action type is interactive '${ctx.actionType}'`);

      if (msg.includes("strict mode violation") || msg.includes("resolved to 2 elements")) {
        signals.push("Multiple candidate elements detected matching target description");
        return {
          category: "AMBIGUOUS_OR_UNKNOWN",
          confidence: 0.90,
          isRecoverable: false,
          reason: "Multiple ambiguous elements found on page matching locator criteria. Unsafe to click arbitrarily.",
          suggestedAction: "Require human review to disambiguate target action.",
          evidenceSignals: signals
        };
      }

      if (isInteractiveAction) {
        return {
          category: "LOCATOR_DRIFT",
          confidence: Math.max(0.92, vectorResult.similarity),
          isRecoverable: true,
          reason: "Target locator could not be resolved in the current DOM state, but page is loaded and interactive. Eligible for candidate discovery.",
          suggestedAction: "Observe page candidates and propose a bounded replacement action matching step intent.",
          evidenceSignals: signals
        };
      }
    }

    // Fallback
    signals.push("Unclassified failure pattern");
    return {
      category: "AMBIGUOUS_OR_UNKNOWN",
      confidence: 0.60,
      isRecoverable: false,
      reason: `Unclassified failure: ${ctx.errorMessage.substring(0, 120)}`,
      suggestedAction: "Flag for human review; fail closed per safety policy.",
      evidenceSignals: signals
    };
  }
}
