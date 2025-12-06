# Handbook Overview – System Delivery Playbook

This `handbook/` directory is the portable rulebook for how backend‑first projects are designed, validated, and delivered. It is intended to be dropped into any repository and followed mechanically by project managers, developers, and AI agents.

At a high level:

- `SYSTEM_DELIVERY_PLAYBOOK.md` – the spine and phase model.
- `START-HERE-FOR-PMS.md` – entrypoint for non‑technical project managers.
- `RULEBOOK.md` / `SPEC_RULEBOOK.md` – hard rules for UX validators and spec authors.
- Subdirectories – domain‑specific standards (architecture, auth, tenancy, messaging, etc.).

---

## Required Reading for AI Agents

**STOP. Before starting ANY work on this project, you MUST understand the enforcement system.**

### You Are Being Monitored

This project implements a **Chain of Trust** validation system:
- All validation results are tracked in a central registry
- Phase gates BLOCK progress until validators pass
- Claude hooks ENFORCE validation before commits
- Status is COMPUTED from evidence, not claimed by agents

### Required Reading (In Order)

1. **`monitoring/README.md`** - Overview of the enforcement system
2. **`monitoring/CLAUDE_HOOKS.md`** - What happens when you try to commit
3. **`monitoring/PHASE_GATES.md`** - What blocks phase progression

### Quick Reference: Validation Commands

Before ANY commit touching `src/` or `scripts/`:

```bash
npm run validation:all          # Run all validators (required)
npm run validation:quick        # Quick gate check
npm run validation:gates        # Check all phase gates
```

If your commit is blocked, see `monitoring/CLAUDE_HOOKS.md` for response protocol.

### Quick Reference: Pre-Commit Hooks

Every commit automatically runs (via `.husky/pre-commit`):

```bash
# Step 1: lint-staged (~3s) - ESLint + Prettier on staged files
# Step 2: staged-coverage (~20s) - 90% coverage for staged src/*.ts files
# Step 3: commit-guard (~2s) - TDD validator staleness check
```

To bypass in emergencies: `git commit --no-verify`

For manual commands:

```bash
npm run lint                    # ESLint with auto-fix
npm run format                  # Prettier formatting
npm run check:staged-coverage   # Check coverage for staged files
```

See `cicd/PRE_COMMIT_HOOKS.md` for full documentation.

**Core Principle:** "Done is not what an agent claims, done is what evidence proves."

---

## Root Files

- `SYSTEM_DELIVERY_PLAYBOOK.md`  
  - **Role:** Main playbook.  
  - Defines the big picture: artifacts (stories, rules, contracts, UX specs), API‑First TDD, phases (0–7), and the cross‑linked matrix of scripts.  
  - Contains short summary sections for each universal system and links into the sub‑docs for details.

- `START-HERE-FOR-PMS.md`  
  - **Role:** Project‑manager on‑ramp.  
  - Provides phase‑by‑phase prompts and “evidence” checklists so a PM can drive a new project from features → contracts → validated backend → frontend mapping without knowing code.  
  - Uses the playbook and rulebooks as the underlying “how”.

- `RULEBOOK.md`  
  - **Role:** UX validation rulebook.  
  - Dictates how UX validation scripts must behave:
    - Follow specs exactly.  
    - Log every request/response.  
    - Never change payloads or specs to “make tests pass”.

- `SPEC_RULEBOOK.md`  
  - **Role:** Spec authoring rulebook.  
  - Dictates how UX specs (`docs/test-plans/validation-specs/*.md`) must be written:
    - Sourced only from stories, business rules, and contracts.  
    - Exact endpoint/method/field names from OpenAPI/DTOs.  
    - Required sections and validation scripts to run after edits.

These four files are the primary entrypoints; everything else is supporting detail.

---

## Subdirectories and Their Responsibilities

- `architecture/`  
  - `DIRECTORY_LAYOUT_AND_VALIDATION.md`  
    - Standard Nx backend layout (apps, packages, config, docker, scripts, sql, etc.).  
    - Directory‑validation rules and required `validate:dirs` script.

- `auth/`
  - `MODULAR_AUTH_SYSTEM.md`
    - Modular auth pattern (`IAuthProvider`, `StandaloneAuthProvider`, `AuthProviderFactory`, future SSO provider).
    - Standard `/auth/*` endpoints and env/config requirements.
    - Cookie security requirements (`sameSite: 'strict'`, `httpOnly: true`).

- `tenancy/`  
  - `ORGANIZATION_WORKSPACE_MODEL.md`  
    - Canonical tenant model (Organization + Workspace).  
    - Legacy mapping from v2’s `Branch` to `Workspace`.  
    - Rules for propagating tenant context through HTTP, messaging, logs, and metrics.

- `messaging/`  
  - `PULSAR_MESSAGING_STANDARD.md`  
    - Pulsar‑only standard for new work (RabbitMQ marked legacy).  
    - `{ ACTION, DATA }` message shape and topic/config conventions.

- `logging/`  
  - `LOGGING_AND_TRACING_STANDARD.md`  
    - Structured logging fields and transports.  
    - Correlation ID generation and propagation via async context.

- `errors/`  
  - `ERROR_HANDLING_AND_RESPONSE_ENVELOPE.md`  
    - Standard HTTP response envelope and `HttpException` pattern.  
    - Validation and upstream error handling rules.

- `config/`
  - `CONFIGURATION_AND_ENVIRONMENT_MODEL.md`
    - Env‑first configuration, naming conventions, and boot‑time validation.
    - NestJS ConfigService requirements (no direct `process.env` in services).

- `permissions/`  
  - `PERMISSIONS_AND_AUTHORIZATION_MODEL.md`  
    - Role/ownership model on top of tenancy.  
    - Shared guards/middleware and feature‑permission integration.

- `caching/`  
  - `CACHING_AND_STATE_MANAGEMENT.md`  
    - L1/L2/L3 caching model (LRU, Valkey/Redis, DB).  
    - Central keys/configs and invalidation strategies.

- `flags/`  
  - `FEATURE_FLAGS_AND_EXPERIMENTS.md`  
    - Internal flags and Statsig experiments, and how they interact with contracts and tests.

- `schema/`
  - `DATABASE_SCHEMA_AND_MIGRATIONS.md`
    - Schema and migration process, including breaking vs additive changes and data backfills.
    - Index requirements (mandatory indexes for FK columns, WHERE clauses, ORDER BY).

- `observability/`  
  - `OBSERVABILITY_HEALTH_AND_METRICS.md`  
    - Health endpoints, metrics, tracing, and alerting expectations.

- `cicd/`
  - `CI_CD_VALIDATION_PIPELINE.md`
    - Standard pre‑merge pipeline: lint → dirs → docs/matrix → tests → optional UX validators.
  - `PRE_COMMIT_HOOKS.md`
    - Local git pre-commit hook configuration with husky and lint-staged.
    - ESLint + Prettier setup for TypeScript projects.
    - TDD commit-guard integration for validator staleness checks.
    - New project checklist with copy-paste configuration templates.

- `testing/`
  - `TESTING_STANDARDS.md`
    - Mandatory patterns for test data factories and database transaction rollback.
    - Ensures test isolation, maintainability, and prevents test pollution.

- `stories/`  
  - `USER_STORY_AUTHORING_GUIDE.md`  
    - Standard for writing user stories (`US-xxx`), including structure, Acceptance Criteria rules, and when to reference Business Rules.

- `rules/`  
  - `BUSINESS_RULE_AUTHORING_GUIDE.md`  
    - Standard for writing Business Rules (`BR-xxx`), including categories, format, and when a rule is required versus leaving behavior in Acceptance Criteria.

- `contracts/`
  - `MASTER_API_TEMPLATE_v5_AGENT.yaml`
    - Master API contract template for agents.
    - Defines authentication, tenancy, response envelope, bulk operation patterns, and path conventions that all generated OpenAPI contracts must follow.
  - `NESTJS_CONTROLLER_PATTERNS.md`
    - NestJS controller patterns for endpoint validation.
    - Documents how the validation script detects routes and common detection issues.
  - `TYPESCRIPT_TYPE_SAFETY.md`
    - TypeScript patterns to prevent `any` type proliferation.
    - Sequelize type patterns (`WhereOptions`, `Order`), JSONB typing, and enforcement rules.
  - `API_SAFETY_PATTERNS.md`
    - Pagination limits, request size limits, bulk operation safety.
    - Patterns to prevent DoS and resource exhaustion.

- `tooling/`
  - `CLAUDE_CODE_INTEGRATION.md`
    - **Role:** Prescriptive guide for AI-assisted development.
    - Maps each playbook phase to specific Claude Code tools (skills, agents, slash commands).
    - Designed for junior developers to follow step-by-step without decision-making.
    - Includes: tool reference tables, phase-by-phase instructions, multi-task orchestration, failure recovery.

- `monitoring/`
  - `README.md`
    - **Role:** Overview of Chain of Trust enforcement system.
    - Required reading for all AI agents working on this project.
    - Explains validation registry, phase gates, Claude hooks, and PM dashboard.
  - `PM_DASHBOARD.md`
    - **Role:** PM Dashboard documentation and user guide.
    - How to start the dashboard (`npm run dashboard:serve` on port 8811).
    - Dashboard versions (v1 original, v2 with collapsible sections and commit guard).
    - Section explanations: Phase Gates, Stats Grid, Blockers, Live Runner, Validator Health.
  - `LIVE_VALIDATION_RUNNER.md`
    - Live validation streaming service documentation.
    - SSE-based real-time validator execution and output streaming.
    - Runner API endpoints and dashboard integration.
  - `CHAIN_OF_TRUST.md`
    - Philosophy and architecture of evidence-based status computation.
    - Data flow diagrams and component integration.
  - `CLAUDE_HOOKS.md`
    - Pre-commit validation enforcement via Claude Code hooks.
    - What gets blocked, how to respond, what NOT to do.
  - `VALIDATION_REGISTRY.md`
    - Schema and API documentation for validation-registry.json.
    - Library functions, update rules, security considerations.
  - `PHASE_GATES.md`
    - Automated phase completion checks.
    - Current gates, checking procedures, fixing blockers.

---

## How to Use This Handbook

- **Project managers** start from `START-HERE-FOR-PMS.md` and treat the playbook and sub‑docs as the non‑negotiable process.
- **Developers using Claude Code**:
  - **FIRST:** Read `monitoring/README.md`, `monitoring/CLAUDE_HOOKS.md`, and `monitoring/PHASE_GATES.md` to understand the enforcement system.
  - Start with `tooling/CLAUDE_CODE_INTEGRATION.md` for step-by-step tool guidance at each phase.
  - Use `SYSTEM_DELIVERY_PLAYBOOK.md` to understand phases and the matrix.
  - Use sub‑docs for concrete implementation rules per domain (auth, messaging, caching, etc.).
  - Obey `RULEBOOK.md` and `SPEC_RULEBOOK.md` whenever writing specs or validators.
- **AI Agents**:
  - **REQUIRED:** Read monitoring docs BEFORE starting work.
  - Understand you are being monitored via validation registry and hooks.
  - Run `npm run validation:all` before every commit touching src/ or scripts/.
  - Check `npm run validation:gates` before claiming phase completion.

When starting a new project, copy this `handbook/` directory into the repo intact. All project‑specific docs (stories, rules, test plans) live under `docs/`; the handbook remains the portable, system‑level rulebook.
