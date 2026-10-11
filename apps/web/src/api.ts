import { BenchmarkMetrics, MutationScenario, RunDetail, TestRun } from "./types.js";

const BASE = "/api";

export async function fetchHealth(): Promise<{ status: string; version: string }> {
  const res = await fetch(`${BASE}/health`);
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

export async function createRun(testId: string, mutationScenarioId?: string | null): Promise<{ runId: string }> {
  const res = await fetch(`${BASE}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      testId,
      contractVersion: 1,
      mutationScenarioId: mutationScenarioId || null,
      idempotencyKey: `client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    })
  });
  return res.json();
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

export function subscribeToEvents(runId: string, onEvent: (event: any) => void): () => void {
  const es = new EventSource(`${BASE}/runs/${runId}/events`);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch {}
  };
  return () => {
    es.close();
  };
}
