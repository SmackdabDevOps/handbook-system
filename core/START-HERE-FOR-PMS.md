# Start Here – Project Manager Guide

> **Audience:** Non‑technical project managers working with an AI agent.  
> **Goal:** Use this handbook package to drive a brand‑new backend‑first product from idea to validated APIs, then to frontend, with **no on‑the‑fly interpretation** by the agent. Every backend created with this process is treated as production‑ready; only the frontend is allowed to lag.

This file tells you:

- How to work with the AI.
- The exact phases you will move through.
- The prompts you should give the AI at each phase.
- What proof you must receive before moving to the next phase.

All technical “how” details live in:

- `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` – full system manual.
- `handbook/RULEBOOK.md` – how UX validators must behave.
- `handbook/SPEC_RULEBOOK.md` – how UX specs must be written.

You do **not** need to read those in depth to run a project, but the AI **must** obey them.

---

## 1. How To Use This Handbook With an AI

1. You always work **phase by phase**.  
2. In each phase:
   - You give the AI the **prompt template** from this file (adjusting only the product domain name and high‑level feature ideas).
   - The AI:
     - Reads the handbook and rulebooks.
     - Creates or updates the required files.
     - Runs the required validation scripts.
     - Shows you the **evidence files** and a short summary of results.
3. You only move to the next phase when:
   - The evidence files listed for that phase exist, and
   - The validations for that phase are clean (or any remaining issues are explicitly marked as future work).

If the AI suggests doing work **outside** these phases or skipping a validation, your default answer is **“no”** unless you can point to a rule in this handbook that allows it.

---

## 2. Phase Overview (Linear Path For PMs)

The system has seven phases. You will follow them in order, even though the underlying process allows feedback loops.

You can apply this path to:

- A single **integrated Nx backend** that contains many internal modules (the standard pattern for your main CRM backend), **or**
- Multiple smaller services that each own their own contracts.

In both cases:

- Each backend service follows the same API‑First TDD rules.  
- UX flows are allowed to call more than one service, but only through documented contracts.  
- Directory layout must follow the profile and stub defined in `SYSTEM_DELIVERY_PLAYBOOK.md` (see “Backend Directory Layout – Integrated Nx Backend”) and pass the directory validation script.

1. **Phase 0 – Features**  
   Clarify major capabilities in plain language.
2. **Phase 1 – User Stories & Business Rules**  
   Turn features into user stories and business rules.
3. **Phase 2 – Endpoint Contracts & Registry**  
   Define concrete API endpoints backed by contracts.
4. **Phase 3 – Backend Implementation**  
   Implement endpoints so they satisfy the contracts.
5. **Phase 4 – UX Specs (User Experiences)**  
   Write multi‑user journeys that virtually use the app via APIs.
6. **Phase 5 – UX Validation Scripts & Logs**  
   Execute the UX specs against the real backend and log all calls.
7. **Phase 6 – Frontend Endpoint Maps & UI**  
   Plan the frontend by endpoints, then build the UI.

The AI must always treat this as **API‑First TDD**:

- Stories and rules first.  
- Then contracts.  
- Then specs and tests.  
- Then code to make tests pass.  
- Then refactor.

---

## 3. Phase‑By‑Phase Instructions and Prompts

For each phase below:

- “Your prompt to the AI” is what you paste (after editing bracketed pieces).
- “Evidence you must see” is what you look for before approving the phase as complete.

### Phase 0 – Features

**Purpose:** Capture the big picture in business language.

**Your prompt to the AI:**

> “You are an expert backend‑first systems designer. Using the handbook in the `handbook/` folder, help me define a feature list for a new product in the [DOMAIN] space.  
> 1) Create or update a concise feature list document under `docs/` (for example `docs/features.md`).  
> 2) Summarize the sections and file paths you created.  
> 3) Run `npx ts-node handbook/scripts/validate-phase0-features.ts` to ensure the file exists and is valid.
> Do not create any APIs, contracts, or code yet.”

**Evidence you must see:**

- A feature list file under `docs/` describing major capabilities.
- Output from `validate-phase0-features.ts` showing ✅ PASSED.
- No API details yet (just high‑level features).

---

### Phase 1 – User Stories & Business Rules

**Purpose:** Turn features into testable user stories and explicit rules.

**Your prompt to the AI:**

> “Using the handbook, generate user stories and business rules for this product.  
> 1) Create or update `docs/user-stories/*.md` and `docs/business-rules/*.md` so every story has a `US-xxx` ID and every rule has a `BR-xxx` ID.  
> 2) Run the structural validator: `npx ts-node handbook/scripts/validate-phase1-structure.ts`.
> 3) Run the coverage script: `npx ts-node docs/test-plans/scripts/check-business-rules-coverage.ts`.
> 4) Write the latest results to `docs/test-plans/progress/STORY-RULES-STATUS.md`.  
> 5) Show me which files you updated and whether any stories or rules are still out of sync.”

**Evidence you must see:**

- `docs/user-stories/*.md` – clear stories with IDs.  
- `docs/business-rules/*.md` – rules with IDs.  
- Output from `validate-phase1-structure.ts` showing ✅ PASSED (no duplicate IDs, correct AC format).
- `docs/test-plans/progress/STORY-RULES-STATUS.md` – script output showing:
  - No stories without rules.  
  - No undefined rule IDs.

If the evidence file still lists problems, the AI must propose specific fixes to stories/rules and rerun the script until the file is clean or remaining issues are explicitly marked as future work.

---

### Phase 2 – Endpoint Contracts & Registry

**Purpose:** Define API endpoints that follow the stories and rules.

**Your prompt to the AI:**

> “Using only the user stories and business rules plus the handbook, define the initial API contracts.  
> 1) Create or update the endpoint registry (`architecture/ENDPOINTS.json`) and OpenAPI files under `openapi/`.  
> 2) Make sure each endpoint in the registry points to at least one story and business rule.  
> 3) Run the documentation matrix script and write the latest results to `docs/test-plans/progress/ENDPOINT-MATRIX-STATUS.md`.  
> 4) Report any endpoints that lack stories/rules or any story/rule references to undefined endpoints.”

**Evidence you must see:**

- `architecture/ENDPOINTS.json` exists with endpoints linked to `US-xxx` and `BR-xxx`.  
- OpenAPI files under `openapi/` describing the same endpoints.  
- `docs/test-plans/progress/ENDPOINT-MATRIX-STATUS.md` showing:
  - No endpoints referenced in docs that are missing from the registry.  
  - No “orphan” endpoints without any story or rule, unless explicitly marked internal.

---

### Phase 3 – Backend Implementation

**Purpose:** Implement backend endpoints to match the contracts.

**Your prompt to the AI:**

> “Backend implementation must follow API‑First TDD.  
> 1) Treat the contracts in `architecture/ENDPOINTS.json` and `openapi/` as fixed.  
> 2) Implement or update backend code so each endpoint behaves according to those contracts and existing tests.  
> 3) Run the endpoint validation commands described in the handbook and update `docs/test-plans/progress/ENDPOINT-REVIEW-STATUS.md` (or equivalent) with the latest results.  
> 4) Do not relax or change contracts just to make tests pass; if behavior and contracts disagree, explain the conflict and propose a contract‑first fix.”

**Evidence you must see:**

- Backend code exists for each endpoint in the registry.  
- Endpoint validation report in `docs/test-plans/progress/ENDPOINT-REVIEW-STATUS.md` (or similar) showing which endpoints are complete vs partial.  
- Any conflicts between code and contracts are clearly explained, not hidden.

---

### Phase 4 – UX Specs (User Experiences)

**Purpose:** Define realistic, multi‑user journeys that use the APIs end‑to‑end.

**Your prompt to the AI:**

> “Using the handbook, stories, rules, and contracts, create UX validation specs.  
> 1) For each major journey, create a file in `docs/test-plans/validation-specs/NN-name.md` that follows SPEC_RULEBOOK (with `## Covered Stories`, endpoints, bodies, and expectations).  
> 2) Run the story coverage script and write the latest results to `docs/test-plans/progress/UX-SPEC-COVERAGE.md`.  
> 3) Run the UX‑vs‑contracts validation script (if present) and write its results to `docs/test-plans/progress/UX-CONTRACT-ALIGNMENT.md`.  
> 4) Do not invent endpoints or fields; everything must come from contracts and DTOs.”

**Evidence you must see:**

- UX spec files under `docs/test-plans/validation-specs/` with `## Covered Stories` sections.  
- `docs/test-plans/progress/UX-SPEC-COVERAGE.md` showing 0 missing stories.  
- `docs/test-plans/progress/UX-CONTRACT-ALIGNMENT.md` showing:
  - No undefined endpoints in specs.  
  - No unknown request fields vs contracts, unless explicitly marked future.

---

### Phase 5 – UX Validation Scripts & Logs

**Purpose:** Actually call the APIs according to the specs and log every call.

**Your prompt to the AI:**

> "Using the UX specs and RULEBOOK, implement UX validation scripts.
> 1) For each UX spec, create a corresponding script under `scripts/validation/validate-*-full.ts` that follows each spec step exactly.
> 2) Ensure scripts load configuration from `.env` and log every request and response in a readable format to `scripts/validation/logs/`.
> 3) Run the full validation suite and write a summary to `docs/test-plans/progress/UX-VALIDATION-STATUS.md`.
> 4) If a spec step fails, log the failure and treat it as a backend or contract issue; do not change the spec just to make tests pass.
> 5) **CRITICAL (GATE):** Run `npx ts-node scripts/check-spec-script-coverage.ts` to verify every spec step has a matching script call. This must show 100% coverage before Phase 5 is complete."

**Evidence you must see:**

- Validation scripts in `scripts/validation/` – one per spec file.
- Log files in `scripts/validation/logs/` showing:
  - Method and path.
  - Request body.
  - Response status and body for every step.
- `docs/test-plans/progress/UX-VALIDATION-STATUS.md` summarizing which journeys pass and which fail, with reasons.
- **`docs/test-plans/progress/SPEC-SCRIPT-COVERAGE.md`** showing 100% spec-to-script coverage. This is a **GATE requirement** – Phase 5 cannot complete until every spec file has a script, and every spec step has a corresponding API call in that script.

**Why spec-script coverage matters:**

A validation script can "pass" (run without errors) while only testing a fraction of what the spec defines. The spec is the contract; the script is the execution layer. Without verifying coverage, you can have green validators that don't actually test the documented scenarios.

---

### Phase 6 – Frontend Endpoint Maps & UI

**Purpose:** Plan and then build the frontend based on validated APIs.

**Your prompt to the AI:**

> “Only after backend validation is green, generate frontend endpoint maps.  
> 1) Under `docs/frontend/endpoint-maps/`, create one file per major journey that lists pages/views and the endpoints each view calls, following the handbook guidance.  
> 2) Confirm that every endpoint in these maps exists in the registry and is covered by UX specs and validators.  
> 3) Once maps are in place, help define a plan for frontend implementation that does not introduce new endpoints without going back through contracts and specs.”

**Evidence you must see:**

- Endpoint map files under `docs/frontend/endpoint-maps/`.  
- Each map clearly lists:
  - Views/pages.  
  - Endpoints per view.  
  - Required inputs (IDs, session) and expected errors.  
- A statement from the AI confirming that all endpoints in the maps:
  - Exist in the registry.  
  - Are exercised by UX validators.

---

## 4. Summary – What You Enforce as PM

When you hand this handbook to an AI for a new project, your job is to enforce **process**, not to know the technical details.

You:

- Move strictly phase by phase.  
- Use the prompts in this file, adjusting only the domain and feature ideas.  
- Require the evidence files and reports for each phase before proceeding.  
- Push back whenever the AI suggests work that does not match this handbook.

If you do that, the AI is forced into API‑First TDD, the backend is validated via realistic UX flows before frontend work begins, and every important artifact and decision is captured in the repository in a repeatable way.
