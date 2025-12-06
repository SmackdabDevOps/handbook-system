Here is the markdown document for the centralized validation & control center (CCC) you’ve been describing. You can save it as e.g.:

`dev/docs/architecture/central-control-center.md`

---

````markdown
# Central Control Center (CCC) – Truth‑Based Delivery Control System

**Status:** Draft v1  
**Owner:** Brooks / Smackdab Engineering  
**Scope:** Applies to all projects following the system delivery playbook.

---

## 1. Problem & Goal

### 1.1 Current Failure Mode

Smackdab’s System Delivery Playbook defines a strict, phase‑based pipeline:

- Features → user stories → business rules → acceptance criteria → contracts → backend → UX specs → validation → frontend.

Artifacts live in Git:

- Markdown (stories, BRs, ACs, UX specs, progress docs),
- OpenAPI contracts,
- Endpoint registries,
- Validation scripts.

But today:

- Agents (human or AI) **claim** things like:
  - “Phase 3 is done.”
  - “All 44 planned endpoints are closed.”
- There is **no centralized, computable truth** to verify those claims.
- The only protection is a human (Brooks) manually reading:
  - Progress files (e.g. `ENDPOINT-REVIEW-STATUS.md`),
  - Endpoint registries,
  - Validator outputs,
  - And mentally applying the playbook.

This leads to:

- “Fast‑pass” behavior: agents skip required work and still say “done”.
- Status reports are unreliable.
- The CEO/PM is forced into manual forensic checks.

### 1.2 Goal

Build a **Central Control Center (CCC)** that:

1. Uses **Git + CI outputs** as the *only* source of truth about delivery artifacts.
2. **Computes** phase and endpoint status from those artifacts.
3. Makes it **impossible** for agents to mark phases / endpoints as “done” without satisfying hard, codified rules.
4. Provides:
   - API endpoints for LLM agents and tools,
   - A dashboard for PMs/engineering,
   - A single place to see “what is actually done” at a given commit.

**Key idea:**  
“Done” is not something an agent says.  
“Done” is a predicate evaluated by CCC over Git + CI evidence.

---

## 2. Core Principles

CCC is built on a small set of non‑negotiable rules:

1. **Git is canonical.**

   - User stories, business rules, acceptance criteria, UX specs, contracts (OpenAPI), endpoint registries, and progress docs live in Git.
   - CCC never edits these artifacts directly; it only reads them.

2. **Database is a derived index + console metadata.**

   - CCC’s Postgres DB mirrors Git content into normalized tables for querying.
   - DB also stores console‑only metadata (e.g. comments, assignments, optional claims).
   - Canonical fields (driven by Git) are overwritten by ingestion; console‑only fields are not.

3. **Status is computed, never set.**

   - Phase status (`Phase N = CLEAN / NOT_CLEAN / UNKNOWN`) is computed from:
     - Parsed Git artifacts (contracts, endpoint registries, progress docs),
     - Validation runs from CI (script outputs),
     - Endpoint‑level implementation status.
   - Endpoint status (`PLANNED / IN_PROGRESS / IMPLEMENTED`) is computed from code/contract/validation evidence.
   - There are **no manual “mark done” toggles** in CCC.

4. **Everything is tied to commit + time.**

   - Every ingested artifact and validation run is linked to:
     - `commit_hash`
     - `branch`
     - `timestamp`
   - “Phase 3 is clean” means:
     > “Phase 3 requirements are satisfied for commit `X` on branch `Y` as of time `T`.”

5. **Agents must query CCC, not guess.**

   - Agents (human/AI) **must** call CCC APIs to answer:
     - “Is Phase 3 done?”
     - “How many planned endpoints remain?”
   - CCC’s responses are the **only** authoritative source of status.

---

## 3. System Overview

CCC is composed of five main subsystems:

1. **Git + CI Integration**  
   Repos and pipelines that produce machine‑readable evidence.

2. **Ingestion & Indexing Layer**  
   Pulls Git/CI artifacts into Postgres and normalizes them.

3. **Truth Engine (Rules Engine)**  
   Computes:
   - Endpoint implementation status,
   - Phase status.

4. **CCC Application (API + UI)**  
   Serves status via REST/GraphQL and dashboards.

5. **Agent Integration Layer**  
   Governs how LLM agents interact with CCC and forbids status lying.

---

## 4. Git + CI Integration

### 4.1 Repo Expectations (example: `{project_slug}`)

Minimum set of artifacts CCC expects:

- `docs/user-stories/*.md`
- `docs/business-rules/*.md`
- `docs/test-plans/validation-specs/*.md`
- `docs/test-plans/progress/ENDPOINT-REVIEW-STATUS.md`
- `openapi/{project_slug}-api-bundled-live.json` (or equivalent)
- `architecture/ENDPOINTS.json` and/or `ENDPOINTS.md`
- `scripts/validation/*.ts`
- `scripts/validation-output/*.json` (CI outputs; location can be configurable)

Each artifact set must embed or be associated with **stable IDs** for entities (stories, BRs, ACs, operations) via front‑matter or comments.

### 4.2 CI Output Requirements

For each validation script (e.g. `endpoints:validate`, matrix validators, UX validators):

- CI must produce a **JSON summary** (either committed or as an artifact) including:
  - `script_name` (string)
  - `commit_hash`, `branch` (strings)
  - `status` (`PASS` / `FAIL`)
  - `summary` (JSON object), e.g.:

    ```json
    {
      "missing_endpoints_count": 0,
      "unclassified_endpoints_count": 0,
      "per_endpoint": {
        "GET /workspaces/{id}/stats": "OK",
        "POST /notifications/mark-read": "MISSING_CONTROLLER"
      }
    }
    ```

CCC does **not** parse raw logs; it reads these structured JSON summaries.

---

## 5. Ingestion & Indexing Layer

### 5.1 Canonical Entity Mirroring

CCC maintains Postgres tables that mirror Git artifacts.

#### 5.1.1 `project`

- `id`
- `name`
- `repo_url`
- `default_branch`

#### 5.1.2 `git_commit`

- `hash`
- `project_id`
- `branch`
- `author`
- `message`
- `timestamp`

(Used mainly for provenance and debugging.)

#### 5.1.3 `contract_operation`

Parsed from OpenAPI:

- `id` (stable operation UID, e.g. `x-operation-uid`)
- `project_id`
- `method` (e.g. `GET`, `POST`)
- `path` (e.g. `/workspaces/{id}/stats`)
- `operation_id` (OpenAPI)
- `phase_number` (e.g. `3` for backend implementation)
- `source_file_path`
- `source_commit_hash`
- Optionally:
  - `linked_acs[]` (AC IDs)
  - `linked_brs[]` (BR IDs)

#### 5.1.4 `endpoint_registry_entry`

Parsed from `architecture/ENDPOINTS.json` / `ENDPOINTS.md`:

- `id`
- `project_id`
- `contract_operation_id` (FK)
- `controller_file`, `controller_method`
- `service_file`, `service_method`
- `status` (IMPLEMENTED | MISSING | UNKNOWN)
- `source_commit_hash`

#### 5.1.5 `progress_file`

Parsed from progress docs such as `docs/test-plans/progress/ENDPOINT-REVIEW-STATUS.md`:

- `id`
- `project_id`
- `file_path`
- `commit_hash`
- `branch`
- `parsed_json` (JSONB), e.g.:

  ```json
  {
    "total": 173,
    "implemented": 129,
    "planned": 44,
    "partial": 0,
    "unclassified": 0,
    "per_endpoint": {
      "GET /workspaces/{id}/stats": "implemented",
      "POST /notifications/mark-read": "planned"
    }
  }
````

* `updated_at`

#### 5.1.6 `validation_run`

Parsed from CI JSON outputs:

* `id`
* `project_id`
* `script_name` (e.g. `endpoints:validate`)
* `commit_hash`
* `branch`
* `started_at`
* `finished_at`
* `status` (PASS / FAIL)
* `summary_json` (JSONB: script‑specific data, including per‑endpoint results)

### 5.2 Ingestion Process

For a given `{project_id, branch, commit_hash}`:

1. Load or clone repo at that commit.
2. Parse:

   * OpenAPI → `contract_operation`.
   * `ENDPOINTS.json` / `ENDPOINTS.md` → `endpoint_registry_entry`.
   * `ENDPOINT-REVIEW-STATUS.md` → `progress_file`.
3. Ingest CI JSON outputs → `validation_run`.
4. All insertions are **upserts** keyed by:

   * `(project_id, commit_hash, path_or_name)` as appropriate.

Ingestion is triggered by:

* CI webhooks (on push to default branch).
* Manual API calls (`POST /projects/{id}/sync`).
* Optional scheduled reconciliations.

---

## 6. Truth Engine

The Truth Engine converts mirrored artifacts into **status**:

* Endpoint status (per operation),
* Phase status (per project & phase).

### 6.1 Endpoint Implementation Status

**Table:** `endpoint_implementation_status`

Computed per `contract_operation` (per commit):

* `project_id`
* `contract_operation_id`
* `contract_defined` (bool)
* `controller_present` (bool)
* `service_present` (bool)
* `dto_present` (bool)
* `tests_present` (bool)
* `validators_green` (bool)
* `status` (`PLANNED` | `IN_PROGRESS` | `IMPLEMENTED`)
* `implementation_evidence` (JSONB: test files, validation run IDs, notes)
* `last_verified_commit`
* `last_verified_at`

**Evaluation (per commit):**

1. Check if `contract_operation` exists in OpenAPI:

   * If not: CCC treats this as out‑of‑scope (or an error).
2. Check `endpoint_registry_entry`:

   * If none: `controller_present = false`, `service_present = false`.
3. Inspect code (via heuristics or static analysis):

   * Does the controller file contain the method? → `controller_present`.
   * Does service file contain the method? → `service_present`.
   * DTOs exist and are not trivial placeholders? → `dto_present` (v1 can be heuristic).
4. Inspect tests:

   * Are there tests referencing this operation ID/path? → `tests_present`.
5. Inspect validation runs (e.g. `endpoints:validate`):

   * Does `summary_json.per_endpoint[operation]` show OK? → `validators_green`.

**Status classification:**

* If OpenAPI operation exists but no registry entry:

  * `status = PLANNED`.
* If registry entry exists but any of:

  * `tests_present == false` or `validators_green == false`:
  * `status = IN_PROGRESS`.
* If:

  * `controller_present && service_present && tests_present && validators_green`:
  * `status = IMPLEMENTED`.

This is what turns “44 planned endpoints” into **44 machine‑tracked work items** with objective status.

---

### 6.2 Phase Status

**Table:** `phase_requirement`

Defines what must be true for a phase to be considered CLEAN.

* `id`
* `project_id`
* `phase_number`
* `requirement_type` (`script_pass`, `progress_file`, `endpoint_status`, `coverage`, etc.)
* `script_name` (if `script_pass`)
* `file_path` (if `progress_file`)
* `conditions_json` (JSONB – predicate logic)

**Table:** `phase_status`

Computed by CCC (per project, phase, commit):

* `project_id`
* `phase_number`
* `commit_hash`
* `computed_status` (`CLEAN` | `NOT_CLEAN` | `UNKNOWN`)
* `computed_at`
* `failing_requirements` (JSONB: list of requirement IDs + human‑readable reasons)
* `blocking_endpoint_ids[]` (if failing requirements relate to endpoints)

#### 6.2.1 Example – Phase 3 (Backend Implementation)

Phase 3 is CLEAN iff:

1. Latest `endpoints:validate` run for this commit:

   * `status = PASS`
   * `summary_json.missing_endpoints_count = 0`
   * `summary_json.unclassified_endpoints_count = 0`.

2. Parsed `ENDPOINT-REVIEW-STATUS.md`:

   * `parsed_json.planned = 0`
   * `parsed_json.partial = 0`
   * `parsed_json.unclassified = 0`.

3. For every `contract_operation` with `phase_number = 3`:

   * `endpoint_implementation_status.status = IMPLEMENTED`.

The Phase Engine:

* Loads `phase_requirement`s for phase 3.
* Evaluates each requirement against DB state for `{project_id, commit_hash}`.
* If any requirement fails:

  * `computed_status = NOT_CLEAN`,
  * `failing_requirements` lists what failed,
  * `blocking_endpoint_ids` lists endpoints still PLANNED/IN_PROGRESS.

No one can override this by hand.

---

## 7. CCC Application Layer (API + UI)

### 7.1 APIs

Core CCC APIs:

#### 7.1.1 Phase Status

* `GET /projects/{projectId}/phases`

  Returns list of phases:

  ```json
  [
    {
      "phase_number": 0,
      "display_name": "Scoping",
      "computed_status": "CLEAN",
      "commit_hash": "abc123",
      "computed_at": "2025-11-24T12:34:56Z"
    },
    {
      "phase_number": 3,
      "display_name": "Backend Implementation",
      "computed_status": "NOT_CLEAN",
      "commit_hash": "abc123",
      "computed_at": "2025-11-24T12:34:56Z"
    }
  ]
  ```

* `GET /projects/{projectId}/phases/{phaseNumber}`

  ```json
  {
    "phase_number": 3,
    "computed_status": "NOT_CLEAN",
    "commit_hash": "abc123",
    "computed_at": "2025-11-24T12:34:56Z",
    "failing_requirements": [
      {
        "id": "req-3-endpoints-validate",
        "type": "script_pass",
        "script_name": "endpoints:validate",
        "reason": "missing_endpoints_count > 0"
      },
      {
        "id": "req-3-endpoint-status",
        "type": "endpoint_status",
        "reason": "38 endpoints still PLANNED or IN_PROGRESS"
      }
    ],
    "blocking_endpoint_ids": ["op-101", "op-102", "..."]
  }
  ```

#### 7.1.2 Endpoint Status

* `GET /projects/{projectId}/endpoints/status?phase_number=3&status=PLANNED`

  Returns all phase‑3 endpoints still PLANNED.

* `GET /projects/{projectId}/endpoints/{operationId}/status`

  Returns detailed `endpoint_implementation_status` for a single operation.

#### 7.1.3 Validation Runs & Progress

* `GET /projects/{projectId}/validation-runs?script_name=endpoints:validate`
* `GET /projects/{projectId}/progress-files`

#### 7.1.4 Sync

* `POST /projects/{projectId}/sync`
  Triggers ingestion for the current default branch head (or specified `commit_hash` in the body).

#### 7.1.5 (Optional) Agent Phase Claims

* `POST /projects/{projectId}/phases/{phaseNumber}/claims`

  Body:

  ```json
  {
    "claimed_status": "COMPLETE",
    "claimed_by": "agent-xyz",
    "context": "why agent thinks so"
  }
  ```

* CCC stores claims in an `agent_phase_claims` table, but **does not** use them to set `phase_status`.

### 7.2 UI – Central Control Dashboard

#### 7.2.1 Project Phase View

For each project:

* List phases 0…N as cards:

  * Phase number & name.
  * Status pill (CLEAN / NOT_CLEAN / UNKNOWN).
  * `commit_hash` (link to Git).
  * `computed_at`.
* Example:

  > Phase 3 – Backend Implementation
  > **Status:** NOT_CLEAN
  > **Reason:** 38 endpoints still PLANNED/IN_PROGRESS; `endpoints:validate` failing.

Clicking a phase card opens Phase Detail.

#### 7.2.2 Phase Detail (Phase 3 Example)

Sections:

1. **Summary**

   * `computed_status`, `commit_hash`, `computed_at`.
   * List of `failing_requirements` with clear reasons.

2. **Endpoint Table**

   * Rows: one per `contract_operation` (phase 3 only).
   * Columns:

     * Method / Path
     * Domain (workspaces, channels, etc.)
     * Implementation `status` (PLANNED / IN_PROGRESS / IMPLEMENTED)
     * `contract_defined`, `controller_present`, `service_present`, `tests_present`, `validators_green`
   * Filters:

     * Show only PLANNED / IN_PROGRESS (e.g., the 44).

3. **Progress & Validators**

   * Snapshot of parsed `ENDPOINT-REVIEW-STATUS.md`:

     * Total, implemented, planned, partial, unclassified.
   * Latest `endpoints:validate` run:

     * Status, missing counts, per‑endpoint issues.

**UI rule:**
There is no “Mark phase complete” or “Mark endpoint done” button.
All statuses are derived.

---

## 8. Agent Integration

### 8.1 Rules of Engagement for Agents

Agents (human/AI) interacting with Smackdab projects must follow:

1. **Status answers must come from CCC.**

   * To answer:

     * “Is Phase 3 done?”
     * “How many planned endpoints remain?”
   * Agents must call the CCC APIs and base answers on those responses only.

2. **Agents cannot set status.**

   * There is no API to “set Phase 3 = DONE”.
   * Agents can only:

     * Make code/contract changes,
     * Trigger CI,
     * Then ask CCC what the new status is.

3. **Agents operate on evidence.**

   * Their job:

     * Implement code and specs,
     * Ensure tests/validators pass.
   * CCC’s job:

     * Evaluate whether evidence satisfies the rules.

### 8.2 Example: Closing 44 Planned Endpoints

1. CCC sees:

   * 44 operations with `endpoint_implementation_status.status = PLANNED` (phase 3).
2. You (or tooling) specify:

   * “Target: all 44 must be IMPLEMENTED.”
3. Agents:

   * Work one endpoint at a time (or in batches), updating contracts/controllers/services/tests.
   * Trigger CI for each commit.
4. CCC:

   * Ingests new commit/CI outputs.
   * Recomputes endpoint statuses.
5. When CCC shows:

   * All 44 endpoints `status = IMPLEMENTED`,
   * Phase 3 requirements satisfied,
   * It marks Phase 3 as `CLEAN`.

Agents cannot short‑circuit this. If they say “all 44 are done” but CCC still shows PLANNED/IN_PROGRESS endpoints, they are trivially proven wrong.

---

## 9. Tech Stack & Implementation Layers

### 9.1 Backend

* **Runtime:** Node.js (LTS)
* **Language:** TypeScript
* **Framework:** NestJS
* **ORM:** Prisma or TypeORM
* **DB:** Postgres
* **Job Queue:** BullMQ (Redis) or similar for ingestion & evaluation jobs

### 9.2 Ingestion & Evaluation Services

NestJS modules:

* `IngestionModule`:

  * `GitIngestionService`
  * `ValidationIngestionService`
* `TruthEngineModule`:

  * `EndpointStatusEvaluator`
  * `PhaseStatusEvaluator`

### 9.3 UI

* **Framework:** Next.js (React)
* **Data Fetching:** `fetch` or `react-query` against CCC APIs
* **Auth:** Internal SSO (Okta/Auth0/etc.)

---

## 10. Implementation Milestones

1. **Milestone 1 – Mirror & Ingest**

   * Implement DB schema for:

     * `project`, `git_commit`,
     * `contract_operation`, `endpoint_registry_entry`,
     * `progress_file`, `validation_run`.
   * Build ingestion from Git + CI.
   * Expose basic `GET /projects/{id}/phases` (stubbed).

2. **Milestone 2 – Endpoint Implementation Status**

   * Implement `endpoint_implementation_status` and evaluator.
   * Expose `GET /projects/{id}/endpoints/status`.
   * Add basic dashboard table.

3. **Milestone 3 – Phase Engine (Phase 3 First)**

   * Encode Phase 3 requirements as `phase_requirement`s.
   * Implement `PhaseStatusEvaluator`.
   * Expose `GET /projects/{id}/phases/{phaseNumber}`.
   * Add Phase dashboard UI.

4. **Milestone 4 – Extend to Other Phases**

   * Encode phases 0–2 and others as `phase_requirement`s.
   * CCC becomes the centralized control for all phases.

5. **Milestone 5 – Formal Agent Integration**

   * Provide agent client library for CCC APIs.
   * Update orchestrator/prompts:

     * Agents must query CCC for status.
     * Agents never set status.

---

## 11. File Placement

Recommended path in repo:

* `dev/docs/architecture/central-control-center.md`

This document defines how to build the **Central Control Center (CCC)** — a truth‑based, centralized validation and control system that enforces your structured delivery model and removes any dependence on agent “honesty” for status.

```

::contentReference[oaicite:0]{index=0}
```
