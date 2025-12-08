# Directory Layout and Validation – Integrated Nx Backend

This document expands on section **2.12/2.13** of `SYSTEM_DELIVERY_PLAYBOOK.md` and defines the required directory structure and directory‑validation rules for Integrated Nx backends (backend v2‑style projects).

---

## 1. Standard Workspace Layout

For Smackdab‑style projects using the **Integrated Nx Backend** profile, agents must follow this directory layout. Do **not** invent new top‑level folders or alternate layouts.

**Workspace root (example stub):**

```text
backend/
├── apps/                     # Runtime applications (HTTP APIs, workers, sockets)
│   ├── api/                  # Core CRM API (Express)
│   │   └── src/
│   │       ├── modules/      # Domain modules (auth, entity, email, etc.)
│   │       ├── config/       # App-specific config wiring
│   │       ├── middlewares/  # Express middlewares
│   │       ├── lib/          # App-local helpers
│   │       └── ...           # Other app-local code (cron, scripts, etc.)
│   ├── payment/              # Payment service (Express)
│   ├── campaign/             # Campaign service
│   ├── public-api/           # Public API surface
│   ├── mobile-api/           # Mobile-facing API
│   ├── socket/               # WebSocket / real-time service
│   └── user-tracking/        # Tracking/analytics service
├── packages/                 # Shared, reusable code
│   ├── core/                 # Core utilities, response helpers, base services
│   ├── services/             # Domain services shared across apps
│   ├── sequelize/            # ORM models and repositories
│   ├── cache/                # Valkey/Redis cache layer
│   ├── queue/                # Messaging abstractions (Pulsar, legacy Rabbit)
│   ├── logger/               # Logging
│   ├── types/                # Shared TypeScript types
│   └── ...                   # Other shared packages (email-templates, base-axios, etc.)
├── config/                   # Central configuration files
├── docker/                   # Dockerfiles and compose-related config
├── scripts/                  # Workspace-level scripts and tooling
├── sql/                      # SQL migrations or helper scripts
├── openapi-spec.yaml         # Root OpenAPI spec (when present)
└── ...                       # Other infra folders (pm2, pulsar_conf, logs, etc.)
```

**Hard rules for this profile:**

- All HTTP/backend services must live under `apps/` using this pattern.  
- All shared backend logic must live under `packages/` in clearly named packages; do **not** create ad‑hoc shared folders under `apps/`.  
- Do not add new top‑level folders at the workspace root without:
  - Updating this document and `SYSTEM_DELIVERY_PLAYBOOK.md`, **and**
  - Adding directory rules to the validation script described below.
- Within each `apps/<app>/src`:
  - Domain logic belongs under `modules/` (or the project’s documented equivalent).  
  - Cross‑cutting code (common middlewares, config wiring) belongs in `config/`, `middlewares/`, `lib/`, not in arbitrary new folders.

For Single‑Service Backend projects, follow that project's documented layout and mirror these principles: one clear place for runtime code, one clear place for shared modules, no ad‑hoc top‑level directories.

---

## 1.5 Documentation Directory Structure (All Profiles)

Regardless of stack profile (Nx Monorepo, NestJS Single-Service, Express), ALL projects must follow this documentation structure. This is enforced by the Phase 0 gate.

```text
docs/
├── user-stories/              # User story documents (Phase 1)
│   ├── 01-feature-area.md     # Stories organized by feature
│   └── ...                    # Each file contains US-xxx IDs
├── business-rules/            # Business rule documents (Phase 1)
│   ├── BR-001-rule-name.md    # Rules follow BR-xxx naming
│   ├── BR-002-rule-name.md
│   └── README.md              # Index/overview
├── test-plans/                # Test planning artifacts
│   ├── validation-specs/      # UX validation specifications (Phase 4)
│   │   ├── 01-authentication.md
│   │   ├── 02-feature.md
│   │   └── ...
│   ├── progress/              # TDD progress tracking (Phase 3)
│   │   ├── UNIT-TEST-COVERAGE.md
│   │   ├── CONTRACT-TEST-STATUS.md
│   │   └── INTEGRATION-TEST-STATUS.md
│   └── scripts/               # Validation helper scripts
├── product/                   # Product definition
│   ├── FEATURES.md            # Feature list
│   ├── SPECIFICATION.md       # Product specification
│   └── MVP_PRIORITIZATION.md  # MVP priorities
├── architecture/              # Technical architecture
│   ├── DATABASE.md            # Database design
│   └── ...                    # Other technical docs
├── plans/                     # Implementation plans
│   └── *.md                   # Dated or named plans
├── progress/                  # Status tracking
│   └── STATUS.md              # Project status
└── research/                  # Analysis and rejected ideas
    └── *.md                   # Research documents
```

**Hard rules for documentation (Phase 0 Gate):**

1. **No product documentation at project root**
   - `FEATURES.md` → `docs/product/FEATURES.md`
   - `STATUS.md` → `docs/progress/STATUS.md`
   - `IMPLEMENTATION*.md` → `docs/plans/`
   - `*SPECIFICATION*.md` → `docs/product/`
   - `*ANALYSIS*.md` → `docs/research/`
   - `DATABASE*.md` → `docs/architecture/`

2. **Allowed at project root:**
   - `README.md` - Project overview
   - `CLAUDE.md` - Agent instructions
   - `CONTRIBUTING.md` - Contribution guide
   - `CHANGELOG.md` - Version history
   - Developer quick-reference docs (e.g., `API_FIRST_WORKFLOW.md`)
   - Configuration files (package.json, tsconfig.json, etc.)

3. **handbook/ is read-only**
   - The `handbook/` directory contains the portable rulebook
   - Do NOT modify files in `handbook/` directly
   - These files come from the `@smackdab/handbook-system` package
   - Project-specific documentation goes in `docs/`

4. **Required directories (Phase 0 enforced):**
   - `docs/user-stories/` - Must exist with at least one file
   - `docs/business-rules/` - Must exist with at least one BR-*.md file
   - `docs/test-plans/validation-specs/` - Must exist
   - `handbook/` - Must exist with playbook
   - `specs/` (Single-Service) or `openapi/` (Nx) - OpenAPI specs

**Validation command:** `npm run validate:phase0`

---

## 2. Directory Validation Script (Required Guardrail)

Every repository using this handbook **must** include a directory‑structure validator. This validator enforces the rules above.

**Required script and usage:**

- Script file: `scripts/validate-directory-structure.ts`  
- Standard command (to be added to `package.json`):  
  - `"validate:dirs": "ts-node scripts/validate-directory-structure.ts"`

**Minimum checks this script must perform for an Integrated Nx Backend:**

1. **Top‑level enforcement**
   - Only allow a known set of top‑level folders: `apps/`, `packages/`, `config/`, `docker/`, `scripts/`, `sql/`, `openapi-spec.yaml`, and other explicitly documented infra folders.  
   - Fail if new top‑level directories appear that are not in the allowed list.

2. **Apps layout**
   - Under `apps/`, ensure each app has:
     - `project.json` / Nx config, and  
     - a `src/` directory.  
   - Under `apps/<app>/src`, ensure:
     - `modules/` exists for domain modules.  
     - If `config/`, `middlewares/`, `lib/` exist, they follow the documented usage; no extra peer folders like `shared/` or `utils/` unless formally added to the rules.

3. **Packages layout**
   - Under `packages/`, ensure each package is either:
     - An Nx library (must have `project.json` and `src/`), or  
     - A simple module (no `project.json`, but must have an `index.ts` entrypoint).
   - Disallow new shared code folders outside `packages/` (no `libs/` or `shared/` at the root of apps).

4. **Docs layout**
   - Ensure documentation folders live only where the handbook says they should:
     - Manuals and rulebooks under `handbook/`.  
     - Test plans under `docs/test-plans/` (not at workspace root).

**CI requirement:**

- The `validate:dirs` command must run:
  - In local pre‑commit or pre‑push hooks (where configured).  
  - In CI, before or along with other validation commands.

If this script is missing or not wired into CI for a new backend project, agents must treat that as a configuration bug and request that it be added before proceeding with large structural changes.

