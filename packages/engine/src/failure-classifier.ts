import { FailureCategory, FailureClassification } from "@intentlock/contracts";

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

    // Signal 1: Infrastructure or Network 5xx
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

    if (msg.includes("503 service unavailable") || msg.includes("econnrefused") || msg.includes("net::err_connection_refused")) {
      signals.push("Connection failure / 503 response");
      return {
        category: "APPLICATION_OR_NETWORK_ERROR",
        confidence: 0.95,
        isRecoverable: false,
        reason: "Connection refused or service unavailable. The application under test is offline.",
        suggestedAction: "Ensure the demo application server is running.",
        evidenceSignals: signals
      };
    }

    // Signal 2: Business Assertion or Invariant Failure
    if (ctx.isAssertionFailure || msg.includes("order_total_match") || msg.includes("sku_quantity_match") || msg.includes("payment_status_match") || msg.includes("declined") || msg.includes("total mismatch")) {
      signals.push("Business assertion/invariant condition violated");
      return {
        category: "ASSERTION_OR_BUSINESS_INVARIANT",
        confidence: 0.95,
        isRecoverable: false,
        reason: "Business logic assertion failed on an existing element or verified backend state. IntentLock strictly prohibits healing genuine defects.",
        suggestedAction: "Investigate application logic regression (e.g. pricing, discount, or payment gateway calculation).",
        evidenceSignals: signals
      };
    }

    // Signal 3: Locator Drift (timeout waiting for selector, element not found, element handle detached)
    const isLocatorTimeout = msg.includes("waiting for locator") ||
      msg.includes("timeout") ||
      msg.includes("strict mode violation") ||
      msg.includes("not found") ||
      msg.includes("element is not visible") ||
      msg.includes("cannot be clicked");

    if (isLocatorTimeout && (ctx.actionType === "click" || ctx.actionType === "fill" || ctx.actionType === "select")) {
      signals.push("Playwright locator timed out waiting for element");
      signals.push(`Action type is interactive '${ctx.actionType}'`);

      if (msg.includes("strict mode violation") || msg.includes("resolved to 2 elements")) {
        signals.push("Multiple candidate elements detected matching target description");
        return {
          category: "AMBIGUOUS_OR_UNKNOWN",
          confidence: 0.85,
          isRecoverable: false,
          reason: "Multiple ambiguous elements found on page matching locator criteria. Unsafe to click arbitrarily.",
          suggestedAction: "Require human review to disambiguate target action.",
          evidenceSignals: signals
        };
      }

      return {
        category: "LOCATOR_DRIFT",
        confidence: 0.92,
        isRecoverable: true,
        reason: "Target locator could not be resolved in the current DOM state, but page is loaded and interactive. Eligible for candidate discovery.",
        suggestedAction: "Observe page candidates and propose a bounded replacement action matching step intent.",
        evidenceSignals: signals
      };
    }

    // Signal 4: Fallback
    signals.push("Unclassified failure pattern");
    return {
      category: "AMBIGUOUS_OR_UNKNOWN",
      confidence: 0.6,
      isRecoverable: false,
      reason: `Unclassified failure: ${ctx.errorMessage.substring(0, 120)}`,
      suggestedAction: "Flag for human review; fail closed per safety policy.",
      evidenceSignals: signals
    };
  }
}
