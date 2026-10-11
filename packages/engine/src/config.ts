import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

// Load .env from project root or current dir
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

export const CONFIG = {
  port: parseInt(process.env.PORT || "3000", 10),
  demoPort: parseInt(process.env.DEMO_PORT || "3001", 10),
  webPort: parseInt(process.env.WEB_PORT || "5173", 10),
  demoOrigin: process.env.DEMO_APP_ORIGIN || `http://localhost:${process.env.DEMO_PORT || "3001"}`,
  storageDir: path.resolve(process.cwd(), process.env.STORAGE_DIR || "storage"),
  databasePath: path.resolve(process.cwd(), process.env.DATABASE_PATH || "storage/intentlock.db"),

  // LLM Configuration
  llmProvider: process.env.LLM_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : (process.env.MISTRAL_API_KEY ? "mistral" : "openai")),
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
  geminiApiUrl: process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta",
  geminiBaseUrl: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  mistralApiKey: process.env.MISTRAL_API_KEY || "",
  mistralBaseUrl: process.env.MISTRAL_BASE_URL || "https://api.mistral.ai/v1",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  llmModel: process.env.LLM_MODEL || (process.env.GEMINI_API_KEY ? "gemini-3.8-flash" : "mistral-small-latest"),
  llmTimeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || "45000", 10),
  maxRecoveryAttemptsPerStep: 1
};

// Ensure storage directories exist
if (!fs.existsSync(CONFIG.storageDir)) {
  fs.mkdirSync(CONFIG.storageDir, { recursive: true });
}
const runsStorage = path.join(CONFIG.storageDir, "runs");
if (!fs.existsSync(runsStorage)) {
  fs.mkdirSync(runsStorage, { recursive: true });
}
