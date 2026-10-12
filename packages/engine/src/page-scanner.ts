import { chromium } from "playwright";
import { StagehandAdapter } from "./stagehand-adapter.js";
import { ObservedCandidate } from "@intentlock/contracts";

export interface ScanResult {
  url: string;
  title: string;
  screenshot: string;
  candidates: ObservedCandidate[];
}

export async function scanPageUrl(targetUrl: string, timeoutMs: number = 15000): Promise<ScanResult> {
  let formattedUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = `https://${formattedUrl}`;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(formattedUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    
    // Brief settle time for client-side rendering
    try {
      await page.waitForLoadState("networkidle", { timeout: 3000 });
    } catch {
      // Continue if networkidle times out
    }
    await page.waitForTimeout(500);

    const title = await page.title();
    const screenshotBuf = await page.screenshot({ type: "jpeg", quality: 75 });
    const screenshot = `data:image/jpeg;base64,${screenshotBuf.toString("base64")}`;

    const clickCandidates = await StagehandAdapter.observeCandidates(page, "click");
    const fillCandidates = await StagehandAdapter.observeCandidates(page, "fill");

    // Assign unique IDs to combined list
    const candidates = [
      ...clickCandidates.map((c, i) => ({ ...c, candidateId: `click_${i + 1}` })),
      ...fillCandidates.map((c, i) => ({ ...c, candidateId: `input_${i + 1}` }))
    ];

    return {
      url: formattedUrl,
      title: title || formattedUrl,
      screenshot,
      candidates
    };
  } finally {
    try {
      await browser.close();
    } catch {}
  }
}
