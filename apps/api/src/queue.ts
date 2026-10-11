import { db, RunOrchestrator } from "@intentlock/engine";
import { ObservedCandidate, TestContract } from "@intentlock/contracts";
import { SseManager } from "./sse.js";

interface QueueJob {
  runId: string;
  testId: string;
  contractVersion: number;
  mutationScenarioId?: string | null;
  parentRunId?: string;
  approvedStepId?: string;
  approvedCandidate?: ObservedCandidate;
  reviewDecisionId?: string;
}

export class RunQueue {
  private static queue: QueueJob[] = [];
  private static isProcessing: boolean = false;

  public static enqueue(job: QueueJob): void {
    this.queue.push(job);
    this.processNext();
  }

  private static async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift()!;

    try {
      // 1. Fetch contract
      const contractRow = db.prepare(`
        SELECT contract_json
        FROM test_contract_versions
        WHERE test_id = ? AND version = ?
      `).get(job.testId, job.contractVersion) as any;

      if (!contractRow) {
        throw new Error(`Contract version ${job.contractVersion} not found for test '${job.testId}'`);
      }

      const contract: TestContract = JSON.parse(contractRow.contract_json);

      // 2. Instantiate and run orchestrator
      const orchestrator = new RunOrchestrator({
        runId: job.runId,
        contract,
        mutationScenarioId: job.mutationScenarioId,
        parentRunId: job.parentRunId,
        approvedStepId: job.approvedStepId,
        approvedCandidate: job.approvedCandidate,
        reviewDecisionId: job.reviewDecisionId,
        onEvent: (event) => {
          SseManager.broadcast(event);
        }
      });

      await orchestrator.execute();
    } catch (err: any) {
      console.error(`[RunQueue] Run ${job.runId} failed:`, err);
      db.prepare(`
        UPDATE test_runs
        SET status = 'FAILED',
            finished_at = ?,
            final_summary = ?
        WHERE id = ?
      `).run(new Date().toISOString(), `Queue execution failure: ${err.message}`, job.runId);
    } finally {
      this.isProcessing = false;
      // Process next job in queue if any
      this.processNext();
    }
  }
}
