export interface TestRun {
  id: string;
  test_id: string;
  contract_version: number;
  status: "QUEUED" | "RUNNING" | "DIAGNOSING" | "RECOVERING" | "REPLAYING" | "VERIFYING" | "PASSED" | "HEALED" | "FAILED" | "REVIEW_REQUIRED";
  trigger_source: string;
  mutation_scenario_id: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  final_summary: string | null;
  error_code: string | null;
  recovery_count: number;
  idempotency_key?: string;
}

export interface RunStep {
  id: string;
  run_id: string;
  step_id: string;
  step_name: string;
  attempt_number: number;
  status: "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "HEALED" | "SKIPPED";
  started_at: string;
  finished_at: string;
  duration_ms: number;
  failure_category?: string;
  error_summary?: string;
  screenshot_artifact_id?: string;
  dom_artifact_id?: string;
}

export interface RunEvent {
  id: string;
  runId: string;
  sequenceNo: number;
  type: string;
  timestamp: string;
  payload: Record<string, any>;
}

export interface RecoveryAttempt {
  id: string;
  run_id: string;
  step_id: string;
  candidateSet: any[];
  proposal: {
    decision: string;
    targetCandidateId?: string;
    actionType?: string;
    expectedTransition?: string;
    rationale: string;
    confidence?: number;
  };
  policy_decision: string;
  reasonCodes: string[];
  model_name: string;
  model_latency_ms: number;
  created_at: string;
}

export interface EvidenceArtifact {
  id: string;
  run_id: string;
  step_id?: string;
  artifact_type: string;
  relative_path: string;
  mime_type: string;
  created_at: string;
}

export interface RunDetail {
  run: TestRun;
  steps: RunStep[];
  events: RunEvent[];
  recoveryAttempts: RecoveryAttempt[];
  artifacts: EvidenceArtifact[];
}

export interface MutationScenario {
  id: string;
  name: string;
  description: string;
  mutation_type: string;
  expected_outcome: string;
  risk_category: string;
  setupConfig: Record<string, any>;
  enabled: number;
}

export interface BenchmarkMetrics {
  totalRuns: number;
  benignRecoveryRate: number;
  benignRecoveryCount: string;
  falseHealRate: number;
  falseHealCount: string;
  intentPreservationRate: number;
  intentPreservationCount: string;
  safeAbstentionRate: number;
  safeAbstentionCount: string;
  averageRecoveryLatencyMs: number;
  modelInvocationCount: number;
  scenarios: Array<{
    scenarioId: string;
    name: string;
    expectedOutcome: string;
    totalRuns: number;
    passedRuns: number;
    healedRuns: number;
    failedRuns: number;
    reviewRequiredRuns: number;
    accuracyRate: number;
  }>;
}
