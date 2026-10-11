import path from "node:path";
import fs from "node:fs";
import { Page } from "playwright";
import { db } from "./db.js";
import { CONFIG } from "./config.js";

export class EvidenceRecorder {
  private runId: string;
  private artifactsDir: string;

  constructor(runId: string) {
    this.runId = runId;
    this.artifactsDir = path.join(CONFIG.storageDir, "runs", runId, "artifacts");
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
  }

  public async captureScreenshot(page: Page, stepId?: string, label: string = "screenshot"): Promise<string> {
    const artifactId = `art_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const filename = `${label}_${artifactId}.png`;
    const absolutePath = path.join(this.artifactsDir, filename);
    const relativePath = `runs/${this.runId}/artifacts/${filename}`;

    try {
      await page.screenshot({ path: absolutePath, fullPage: true });
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO evidence_artifacts (id, run_id, step_id, artifact_type, relative_path, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(artifactId, this.runId, stepId || null, "screenshot", relativePath, "image/png", now);

      return artifactId;
    } catch (err: any) {
      console.warn(`[EvidenceRecorder] Screenshot capture failed: ${err.message}`);
      return "";
    }
  }

  public async captureDomSnapshot(page: Page, stepId?: string): Promise<string> {
    const artifactId = `art_dom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const filename = `dom_${artifactId}.json`;
    const absolutePath = path.join(this.artifactsDir, filename);
    const relativePath = `runs/${this.runId}/artifacts/${filename}`;

    try {
      const sanitizedDom = await page.evaluate(() => {
        // Extract meaningful interactive structure without leaking credentials
        const interactiveElements = Array.from(document.querySelectorAll("button, a, input, select, form, [role='button']")) as Element[];
        return {
          title: document.title,
          url: window.location.href,
          interactiveCount: interactiveElements.length,
          elements: interactiveElements.map((el: any, i) => ({
            index: i,
            tagName: el.tagName.toLowerCase(),
            id: el.id || undefined,
            name: el.name || undefined,
            role: el.getAttribute("role") || undefined,
            dataTestId: el.getAttribute("data-testid") || undefined,
            innerText: el.textContent ? el.textContent.trim().substring(0, 80) : undefined,
            type: el.type || undefined,
            classes: el.className || undefined,
            isVisible: el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0
          }))
        };
      });

      fs.writeFileSync(absolutePath, JSON.stringify(sanitizedDom, null, 2), "utf8");
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO evidence_artifacts (id, run_id, step_id, artifact_type, relative_path, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(artifactId, this.runId, stepId || null, "dom_snapshot", relativePath, "application/json", now);

      return artifactId;
    } catch (err: any) {
      console.warn(`[EvidenceRecorder] DOM snapshot capture failed: ${err.message}`);
      return "";
    }
  }
}
