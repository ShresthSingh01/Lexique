import { Page } from "playwright";
import { SuccessCondition, VerificationCheckResult, VerifierOutcome } from "@intentlock/contracts";
import { CONFIG } from "./config.js";

export class OutcomeVerifier {
  /**
   * Independently evaluates all machine-checkable contract success conditions against
   * the live Playwright UI state AND the trusted backend test oracle API.
   */
  public static async verify(
    page: Page,
    successConditions: SuccessCondition[],
    runId: string
  ): Promise<VerifierOutcome> {
    const checks: VerificationCheckResult[] = [];
    let backendOrder: any = null;

    // Fetch order ID from UI confirmation page if visible
    let uiOrderId: string | null = null;
    try {
      const orderIdEl = await page.$("#confirmed-order-id");
      if (orderIdEl) {
        uiOrderId = (await orderIdEl.innerText()).trim();
      }
    } catch {
      // not on confirmation page
    }

    // Fetch trusted order state directly from backend
    if (uiOrderId) {
      try {
        const res = await fetch(`${CONFIG.demoOrigin}/api/orders/${uiOrderId}`);
        if (res.ok) {
          backendOrder = await res.json();
        }
      } catch (err: any) {
        console.warn(`[OutcomeVerifier] Failed to query order from test oracle: ${err.message}`);
      }
    }

    // Evaluate each machine-checkable condition
    for (const condition of successConditions) {
      let passed = false;
      let actual: any = null;

      switch (condition.type) {
        case "ui_element_visible": {
          try {
            const el = await page.$(condition.expected);
            if (el) {
              const isVisible = await el.isVisible();
              passed = isVisible;
              actual = isVisible ? "visible" : "hidden";
            } else {
              actual = "element_not_found";
            }
          } catch {
            actual = "lookup_error";
          }
          break;
        }

        case "ui_url_contains": {
          const currentUrl = page.url();
          const expectedStr = typeof condition.expected === "string" ? condition.expected : String(condition.expected);
          passed = currentUrl.includes(expectedStr);
          actual = currentUrl;
          break;
        }

        case "ui_text_equals": {
          try {
            const selector = typeof condition.expected === "object" && condition.expected?.selector ? condition.expected.selector : condition.expected;
            const expectedText = typeof condition.expected === "object" && condition.expected?.text !== undefined ? condition.expected.text : "";
            const el = await page.$(selector);
            if (el) {
              const text = (await el.innerText()).trim();
              passed = text === String(expectedText).trim();
              actual = text;
            } else {
              actual = "element_not_found";
            }
          } catch {
            actual = "lookup_error";
          }
          break;
        }

        case "sku_quantity_match": {
          if (backendOrder) {
            const expectedSku = condition.expected?.sku;
            const expectedQty = condition.expected?.quantity;
            passed = backendOrder.sku === expectedSku && backendOrder.quantity === expectedQty;
            actual = { sku: backendOrder.sku, quantity: backendOrder.quantity };
          } else {
            passed = false;
            actual = uiOrderId ? "order_not_found_in_backend" : "no_order_id_found_on_page";
          }
          break;
        }

        case "order_total_match": {
          if (backendOrder) {
            const expectedTotal = Number(condition.expected);
            passed = Math.abs(backendOrder.total - expectedTotal) < 0.01;
            actual = backendOrder.total;
          } else {
            passed = false;
            actual = uiOrderId ? "order_not_found_in_backend" : "no_order_id_found_on_page";
          }
          break;
        }

        case "payment_status_match": {
          if (backendOrder) {
            passed = backendOrder.paymentStatus === condition.expected;
            actual = backendOrder.paymentStatus;
          } else {
            passed = false;
            actual = uiOrderId ? "order_not_found_in_backend" : "no_order_id_found_on_page";
          }
          break;
        }

        case "no_duplicate_orders": {
          try {
            const allOrdersRes = await fetch(`${CONFIG.demoOrigin}/api/orders`);
            if (allOrdersRes.ok) {
              const allOrdersData: any = await allOrdersRes.json();
              passed = allOrdersData.count === condition.expected;
              actual = allOrdersData.count;
            } else {
              passed = false;
              actual = "failed_to_query_all_orders";
            }
          } catch {
            passed = false;
            actual = "network_error_all_orders";
          }
          break;
        }

        default: {
          passed = false;
          actual = `unhandled_condition_type_${condition.type}`;
        }
      }

      checks.push({
        checkId: condition.id,
        description: condition.description,
        type: condition.type,
        passed,
        expected: condition.expected,
        actual
      });
    }

    const allPassed = checks.every(c => c.passed);
    const failedChecks = checks.filter(c => !c.passed);

    let summary = allPassed
      ? `All ${checks.length} contract success conditions independently verified by test oracle.`
      : `${failedChecks.length} of ${checks.length} success conditions failed verification: ${failedChecks.map(f => f.description).join("; ")}`;

    return {
      allPassed,
      checks,
      summary
    };
  }
}
