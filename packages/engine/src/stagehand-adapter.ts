import { Page } from "playwright";
import { ObservedCandidate, ActionType } from "@intentlock/contracts";

export class StagehandAdapter {
  /**
   * Observes interactive elements on the page, extracting rich semantic context,
   * accessibility roles, and candidate identifiers without coupling to unverified SDK shapes.
   */
  public static async observeCandidates(page: Page, targetActionType: ActionType = "click"): Promise<ObservedCandidate[]> {
    const rawElements = await page.evaluate((actionType) => {
      // Find candidate elements matching the intent action type
      const selector = actionType === "fill"
        ? "input:not([type='hidden']), textarea, [contenteditable='true']"
        : "button, a[role='button'], a[href], input[type='submit'], input[type='button'], [role='button']";

      const nodes = Array.from(document.querySelectorAll(selector));

      return nodes.map((node, index) => {
        const el = node as HTMLElement;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const isVisible = rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        const isEnabled = !(el as any).disabled;

        const role = el.getAttribute("role") || (el.tagName.toLowerCase() === "button" ? "button" : (el.tagName.toLowerCase() === "a" ? "link" : "generic"));
        const ariaLabel = el.getAttribute("aria-label") || "";
        const text = (el.innerText || el.textContent || "").trim();
        const name = ariaLabel || text || (el as any).value || "";

        // Determine closest semantic section context
        const section = el.closest("header, main, footer, section, form, .card, [role='region']") as HTMLElement | null;
        let sectionContext = "page";
        if (section) {
          const heading = section.querySelector("h1, h2, h3, h4, span");
          sectionContext = (heading ? heading.textContent?.trim() : section.className) || section.tagName.toLowerCase();
        }

        // Generate robust selector
        let computedSelector = "";
        if (el.id) {
          computedSelector = `#${el.id}`;
        } else if (el.getAttribute("data-testid")) {
          computedSelector = `[data-testid="${el.getAttribute("data-testid")}"]`;
        } else if (name && role === "button") {
          computedSelector = `role=button[name="${name}"]`;
        } else if (el.tagName.toLowerCase() === "a" && el.getAttribute("href")) {
          computedSelector = `a[href="${el.getAttribute("href")}"]`;
        } else {
          computedSelector = `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
        }

        return {
          index,
          role,
          name: name.substring(0, 100),
          text: text.substring(0, 100),
          tag: el.tagName.toLowerCase(),
          selector: computedSelector,
          isVisible,
          isEnabled,
          boundingBox: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          sectionContext: sectionContext.substring(0, 80)
        };
      });
    }, targetActionType);

    // Compute uniqueness and normalize into ObservedCandidate schema
    const candidates: ObservedCandidate[] = rawElements
      .filter(e => e.isVisible)
      .map((item, idx) => {
        const candidateId = `cand_${String(idx + 1).padStart(2, "0")}`;
        const duplicateCount = rawElements.filter(other => other.name.toLowerCase() === item.name.toLowerCase() && other.role === item.role).length;

        return {
          candidateId,
          role: item.role,
          name: item.name,
          text: item.text,
          tag: item.tag,
          selector: item.selector,
          actionType: targetActionType,
          isVisible: item.isVisible,
          isEnabled: item.isEnabled,
          isUnique: duplicateCount === 1,
          boundingBox: item.boundingBox,
          sectionContext: item.sectionContext
        };
      });

    return candidates;
  }
}
