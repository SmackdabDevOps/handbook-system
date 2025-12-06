# Live Validation Runner

Purpose: provide a one-click, real-time validation run with streamed logs and status for PMs/agents. This pattern should be copied to other projects that adopt the Chain of Trust.

---

## Quick Start

```bash
# 1. Start the validation runner server (REQUIRED for live dashboard)
npm run validation:runner

# 2. In a separate terminal, serve the dashboard
npm run dashboard:serve

# 3. Open the dashboard in your browser
open http://localhost:3000/index.html
```

**Key Points:**
- The **validation runner** starts on port **8810** (API server for triggering validations)
- The **dashboard server** starts on port **3000** (serves the HTML dashboard)
- Both must be running for the live validation feature to work
- Validations are triggered via the "Run All (live)" button on the dashboard

---

## Components
- **Runner service**: `npm run validation:runner` (scripts/validation/runner-server.ts)
  - Starts an HTTP server on the port defined in `.env` as `VALIDATION_RUNNER_PORT` (default we use 8810).
  - Selects a free port by reading the central registry `/Users/brooksswift/Coding/.local-dev-registry.json`; falls back to the next open port if the preferred one is taken.
  - Endpoints:
    - `POST /api/validate/run` – triggers `npm run validate:all` end-to-end.
    - `GET /api/validate/status` – current run state (running/exitCode/pid/timestamps).
    - `GET /api/validate/events` – SSE stream for live logs + status.
- **Dashboard integration**: `scripts/dashboard/index.html`
  - “Run All (live)” button calls the runner and streams output into the dashboard.
  - Runner port is read from `dashboard-data.json` (populated by the collector).

## Configuration
- Add to `.env`:
  - `VALIDATION_RUNNER_PORT=8810` (or another unused port)
- Registration: `npm run register` updates `/Users/brooksswift/Coding/.local-dev-registry.json` with `{project_slug}-validation_runner` to avoid conflicts and document ownership.

## Usage
1) Start runner service: `npm run validation:runner`
2) Open dashboard: `http://127.0.0.1:3000/scripts/dashboard/index.html`
3) Click “Run All (live)” → watch logs/status stream; results still update the validation registry, progress files, and dashboard data.
4) If the stream shows unavailable, ensure the runner is running and the port matches `dashboard-data.json` (collector reads `.env`).

## Port safety for other projects
- Reuse the `port-utils` helper to load central registry ports and pick a free one.
- Require `VALIDATION_RUNNER_PORT` in `.env` and propagate it into the project’s register script so conflicts are caught early.

## Contract
- Runner must not bypass existing gates; it simply invokes `validate:all` (full prechecks + validators) and reports pass/fail.
- Registry and dashboard must be updated even on failure so PMs see fresh evidence.
