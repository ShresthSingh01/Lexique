import { BenchmarkMetrics, MutationScenario, RunDetail, TestRun } from "./types.js";

const BASE = "/api";

export async function fetchHealth(): Promise<{ status: string; version: string }> {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}

export interface SystemSettings {
  minimumCandidateSimilarity: number;
  headless: boolean;
  llmProvider?: string;
  llmModel?: string;
}

export async function fetchSettings(): Promise<SystemSettings> {
  const res = await fetch(`${BASE}/settings`);
  if (!res.ok) throw new Error(`Unable to load policy settings (HTTP ${res.status}).`);
  return res.json();
}

export async function updateSettings(settings: { headless?: boolean }): Promise<SystemSettings> {
  const res = await fetch(`${BASE}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error(`Unable to update settings (HTTP ${res.status}).`);
  return res.json();
}

export async function fetchTests(): Promise<any[]> {
  const res = await fetch(`${BASE}/tests`);
  return res.json();
}

export async function fetchTestDetail(testId: string): Promise<any> {
  const res = await fetch(`${BASE}/tests/${testId}`);
  return res.json();
}

export async function fetchRuns(): Promise<TestRun[]> {
  const res = await fetch(`${BASE}/runs`);
  return res.json();
}

export async function fetchRunDetail(runId: string): Promise<RunDetail> {
  const res = await fetch(`${BASE}/runs/${runId}`);
  return res.json();
}

export async function createRun(testId: string, mutationScenarioId?: string | null, contractVersion?: number): Promise<{ runId: string }> {
  let version = contractVersion;
  if (!version) {
    try {
      const testDetail = await fetchTestDetail(testId);
      version = testDetail.active_contract_version || 1;
    } catch {
      version = 1;
    }
  }

  const res = await fetch(`${BASE}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      testId,
      contractVersion: version,
      mutationScenarioId: mutationScenarioId || null,
      idempotencyKey: `client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    })
  });
  return res.json();
}

export async function createTest(payload: any): Promise<{ testId: string; contractVersion: number }> {
  const res = await fetch(`${BASE}/tests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function updateContract(testId: string, payload: any): Promise<any> {
  const res = await fetch(`${BASE}/tests/${testId}/contract`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function pingUrl(url: string): Promise<{ reachable: boolean; statusCode: number; latencyMs: number; error?: string }> {
  const res = await fetch(`${BASE}/ping-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });
  return res.json();
}

export interface ScannedElement {
  candidateId: string;
  role: string;
  name: string;
  text: string;
  tag: string;
  selector: string;
  actionType: string;
  isVisible: boolean;
  isEnabled: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
  sectionContext?: string;
}

export interface ScanUrlResponse {
  url: string;
  title: string;
  screenshot: string;
  candidates: ScannedElement[];
}

export async function scanUrl(url: string): Promise<ScanUrlResponse> {
  const res = await fetch(`${BASE}/scan-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to scan URL (HTTP ${res.status})`);
  }
  return res.json();
}

export async function generateContract(payload: {
  url: string;
  title?: string;
  goal?: string;
  candidates?: ScannedElement[];
  useLlm?: boolean;
}): Promise<any> {
  const res = await fetch(`${BASE}/generate-contract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to generate contract (HTTP ${res.status})`);
  }
  return res.json();
}

export async function pingTest(testId: string): Promise<{ reachable: boolean; statusCode: number; latencyMs: number; error?: string; baseUrl?: string }> {
  const res = await fetch(`${BASE}/tests/${testId}/ping`);
  return res.json();
}

export async function commitHeal(testId: string, stepId: string, newLocator: string, runId?: string): Promise<any> {
  const res = await fetch(`${BASE}/tests/${testId}/commit-heal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stepId, newLocator, runId })
  });
  return res.json();
}

export async function submitHumanReview(
  runId: string,
  payload: { decision: "approve_retry" | "reject" | "clarification"; candidateId?: string; note?: string }
): Promise<{ reviewDecisionId: string; childRunId: string | null; message: string }> {
  const res = await fetch(`${BASE}/runs/${runId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message || `Unable to record review (HTTP ${res.status}).`);
  }
  return body;
}

export async function fetchMutations(): Promise<MutationScenario[]> {
  const res = await fetch(`${BASE}/mutations`);
  return res.json();
}

export async function resetMutation(scenarioId: string): Promise<any> {
  const res = await fetch(`${BASE}/mutations/${scenarioId}/reset`, { method: "POST" });
  return res.json();
}

export async function fetchBenchmark(): Promise<BenchmarkMetrics> {
  const res = await fetch(`${BASE}/benchmark`);
  return res.json();
}

export async function clearAllRuns(): Promise<void> {
  await fetch(`${BASE}/runs/clear`, { method: "POST" });
}

export function subscribeToEvents(runId: string, onEvent: (event: any) => void): () => void {
  const es = new EventSource(`${BASE}/runs/${runId}/events`);
  const handler = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch {}
  };
  es.onmessage = handler;
  const eventTypes = [
    "RUN_STARTED", "STEP_PASSED", "STEP_FAILED", "EVIDENCE_CAPTURED",
    "FAILURE_CLASSIFIED", "RECOVERY_STARTED", "RECOVERY_CANDIDATES_FOUND",
    "RECOVERY_PROPOSED", "RECOVERY_POLICY_DECIDED", "REPLAY_STARTED",
    "VERIFICATION_STARTED", "VERIFICATION_CHECK_PASSED", "VERIFICATION_CHECK_FAILED",
    "RUN_FINISHED", "RUN_FAILED", "REVIEW_REQUIRED"
  ];
  for (const t of eventTypes) {
    es.addEventListener(t, handler as any);
  }
  return () => {
    for (const t of eventTypes) {
      es.removeEventListener(t, handler as any);
    }
    es.close();
  };
}
