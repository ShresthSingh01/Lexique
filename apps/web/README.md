# Ojastra Workbench Frontend (`@intentlock/web`)

React 18 + TypeScript + Vite user interface for the Ojastra self-healing test automation workbench.

For complete, in-depth architectural and operational documentation covering all 6 pages, state management, SSE real-time streaming, and API integrations, see **[FRONTEND.md](../../FRONTEND.md)** at the root of the repository.

---

## ⚡ Quick Start

```bash
# Start frontend development server on http://localhost:5173
pnpm dev

# Build production bundle to dist/
pnpm build
```

---

## 📁 Component Directory

- `src/App.tsx`: Centralized state store, navigation router, and SSE subscription manager.
- `src/views/`:
  - `DashboardView.tsx`: Overview KPI metrics, accuracy breakdown table, recent runs feed.
  - `TestEditorView.tsx`: Visual Intent Contract editor & Playwright generator.
  - `RunExplorerView.tsx`: Run timeline, high-res screenshots, sanitized DOM snapshots, and one-click commit heal action.
  - `MutationLabView.tsx`: Scenario runner for all 8 mutation scenarios.
  - `DemoAppView.tsx`: Embedded sandbox viewer of the target demo store.
  - `SettingsView.tsx`: LLM provider status, environment info, and clean-slate reset.
- `src/components/shared/LiveExecutionOverlay.tsx`: Real-time streaming modal showing step execution, failure diagnosis, Stagehand discovery, and oracle verification.
- `src/api.ts`: Typed REST client and SSE EventSource subscriber.
- `src/index.css`: Zero-Tailwind, vanilla CSS token-driven design system.
