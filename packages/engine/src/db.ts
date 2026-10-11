import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { CONFIG } from "./config.js";

// Ensure parent dir exists
const dbDir = path.dirname(CONFIG.databasePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(CONFIG.databasePath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS test_specs (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    active_contract_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS test_contract_versions (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    contract_json TEXT NOT NULL,
    content_hash TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(test_id, version)
  );

  CREATE TABLE IF NOT EXISTS test_runs (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL,
    contract_version INTEGER NOT NULL,
    status TEXT NOT NULL,
    trigger_source TEXT NOT NULL DEFAULT 'workbench',
    mutation_scenario_id TEXT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    duration_ms INTEGER,
    final_summary TEXT,
    error_code TEXT,
    recovery_count INTEGER DEFAULT 0,
    idempotency_key TEXT,
    parent_run_id TEXT
  );

  CREATE TABLE IF NOT EXISTS run_steps (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    step_name TEXT NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    duration_ms INTEGER,
    failure_category TEXT,
    error_summary TEXT,
    screenshot_artifact_id TEXT,
    dom_artifact_id TEXT
  );

  CREATE TABLE IF NOT EXISTS recovery_attempts (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    candidate_set_json TEXT NOT NULL,
    proposal_json TEXT NOT NULL,
    policy_decision TEXT NOT NULL,
    policy_reason_codes_json TEXT NOT NULL,
    model_name TEXT,
    model_latency_ms INTEGER,
    created_at TEXT NOT NULL,
    result_status TEXT
  );

  CREATE TABLE IF NOT EXISTS human_review_decisions (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('APPROVE_RETRY', 'REJECT', 'CLARIFICATION')),
    candidate_id TEXT,
    candidate_json TEXT,
    note TEXT NOT NULL DEFAULT '',
    child_run_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS evidence_artifacts (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    step_id TEXT,
    artifact_type TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS run_events (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    sequence_no INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    UNIQUE(run_id, sequence_no)
  );

  CREATE TABLE IF NOT EXISTS mutation_scenarios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    mutation_type TEXT NOT NULL,
    expected_outcome TEXT NOT NULL,
    risk_category TEXT NOT NULL,
    setup_config_json TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1
  );
`);

const evidenceArtifactColumns = db.prepare("PRAGMA table_info(evidence_artifacts)").all() as { name: string }[];
if (!evidenceArtifactColumns.some(column => column.name === "attempt_number")) {
  db.exec("ALTER TABLE evidence_artifacts ADD COLUMN attempt_number INTEGER NOT NULL DEFAULT 1");
}
