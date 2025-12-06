# @smackdab/handbook-system - Package Inventory

**Generated:** December 6, 2025
**Package Version:** 0.1.0
**Description:** Portable API-First Test-Driven Development (TDD) methodology with full orchestration and validation infrastructure

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Core handbook documents | 15 |
| Optional modules | 10 |
| Stack-specific stacks | 3 (NestJS, Express, NX Monorepo) |
| Stack-specific documents | 20+ |
| Validation scripts | 13 |
| CLI utilities | 2 |
| Plugin agents | 8 |
| Plugin commands | 11 |
| Plugin skills | 6 |
| Config files | 6 |
| **Total files** | **125+** |

---

## Directory Structure Overview

```
handbook-system/
├── core/                  # Core methodology (required for all projects)
├── optional/              # Opt-in modules and patterns
├── stacks/                # Framework-specific configurations
│   ├── nestjs/
│   ├── express/
│   └── nx-monorepo/
├── validation/            # Contract validation and TDD enforcement
├── bin/                   # CLI entry points
├── plugin/                # SDD Plugin for Claude Code
├── claude/                # Claude Code hooks
├── husky/                 # Git pre-commit hooks
├── docs/                  # Package documentation
├── scripts/               # Utility scripts
├── handbook.config.*.json # Configuration files
├── package.json           # NPM package manifest
├── tsconfig.json          # TypeScript configuration
└── README.md              # Package overview
```

---

## Core Methodology - `/core/` (15 Files)

The core directory contains the foundational System Delivery Playbook and standards that every project must follow. These files define the methodology, phases, rules, and cross-cutting concerns.

### Primary Documents

| File | Purpose |
|------|---------|
| `SYSTEM_DELIVERY_PLAYBOOK.md` | Master playbook defining 7-phase delivery model. Covers user stories, business rules, API contracts, UX specs, phase gates, and the cross-linked validation matrix. Entry point for understanding the complete methodology. |
| `START-HERE-FOR-PMS.md` | Project manager on-ramp guide. Provides phase-by-phase prompts and evidence checklists for driving projects from features to validated backend without requiring code knowledge. |
| `RULEBOOK.md` | UX validation rulebook. Dictates how validation scripts must behave: follow specs exactly, log every request/response, never mutate payloads to make tests pass. |
| `SPEC_RULEBOOK.md` | Spec authoring rulebook. Requirements for writing UX specs (docs/test-plans/validation-specs/*.md): source only from stories/rules/contracts, use exact endpoint/field names, required sections. |
| `README.md` | Core directory overview and navigation guide. Explains the role of each subdirectory and required reading order for different personas (PMs, developers, agents). |
| `central-control-center.md` | Central coordination point documentation. Describes how monitoring, validation, phase gates, and hooks integrate into a cohesive chain of trust system. |

### Subdirectories

#### `/core/architecture/` - Directory Layout & Validation

| File | Purpose |
|------|---------|
| `DIRECTORY_LAYOUT_AND_VALIDATION.md` | Standard Nx backend directory structure (apps, packages, config, docker, scripts, sql). Includes directory validation rules and required `validate:dirs` script configuration. |

#### `/core/contracts/` - API Safety & Contract Patterns

| File | Purpose |
|------|---------|
| `MASTER_API_TEMPLATE_v5_AGENT.yaml` | Master OpenAPI contract template for AI agents. Defines authentication, tenancy, response envelope, bulk operation patterns, path conventions that all generated contracts must follow. Critical reference for contract-first development. |
| `NESTJS_CONTROLLER_PATTERNS.md` | NestJS controller patterns for endpoint validation. Documents how validation scripts detect routes, common detection issues, and required decorator usage. |
| `TYPESCRIPT_TYPE_SAFETY.md` | TypeScript patterns preventing `any` type proliferation. Covers Sequelize patterns (`WhereOptions`, `Order`), JSONB typing, generic constraints, and enforcement rules. |
| `API_SAFETY_PATTERNS.md` | API safety guardrails for DoS prevention. Covers pagination limits, request size limits, bulk operation safety, rate limiting considerations, and resource exhaustion prevention. |
| `NAMING_CONVENTIONS.md` | Standardized naming conventions for endpoints, DTOs, databases, messages. Ensures consistency across all contracts and implementations. |

#### `/core/testing/` - Test Standards

| File | Purpose |
|------|---------|
| `TESTING_STANDARDS.md` | Mandatory testing patterns: test data factories, database transaction rollback, test isolation, preventing test pollution. Defines what must be tested (services, controllers, guards) vs what is tested implicitly (DTOs, models). |

#### `/core/stories/` - User Story Authoring

| File | Purpose |
|------|---------|
| `USER_STORY_AUTHORING_GUIDE.md` | Standard for writing user stories (US-xxx). Covers story structure, acceptance criteria rules, when to reference business rules vs inline conditions. Maps stories to code artifacts. |

#### `/core/rules/` - Business Rule Authoring

| File | Purpose |
|------|---------|
| `BUSINESS_RULE_AUTHORING_GUIDE.md` | Standard for writing business rules (BR-xxx). Covers rule categories, authoring format, when a rule is required vs leaving behavior in acceptance criteria. Maps rules to service and guard implementations. |

#### `/core/errors/` - Error Handling

| File | Purpose |
|------|---------|
| `ERROR_HANDLING_AND_RESPONSE_ENVELOPE.md` | Standard HTTP response envelope format and error handling patterns. Defines `{ data, message, toast, responseType }` shape, status code mapping, validation error formatting, and upstream error handling rules. |

#### `/core/cicd/` - CI/CD & Git Hooks

| File | Purpose |
|------|---------|
| `CI_CD_VALIDATION_PIPELINE.md` | Standard pre-merge CI pipeline: lint → directory validation → docs/matrix validation → tests → optional UX validators. Defines what gates block merge and what provides advisories. |
| `PRE_COMMIT_HOOKS.md` | Local git pre-commit hook configuration with husky and lint-staged. Covers ESLint + Prettier, TDD commit-guard integration, new project checklist with copy-paste templates. |

#### `/core/tooling/` - Developer Tooling

| File | Purpose |
|------|---------|
| `CLAUDE_CODE_INTEGRATION.md` | Prescriptive guide for AI-assisted development. Maps each playbook phase to specific Claude Code tools (skills, agents, slash commands). Designed for junior developers to follow step-by-step. Includes tool reference tables, phase-by-phase instructions, multi-task orchestration. |

#### `/core/monitoring/` - Validation & Enforcement (9 Files)

The monitoring subdirectory implements the Chain of Trust system that enforces TDD and contract compliance.

| File | Purpose |
|------|---------|
| `README.md` | Overview of Chain of Trust enforcement system. Required reading for all AI agents. Explains validation registry, phase gates, Claude hooks, PM dashboard, and why "done is what evidence proves, not what agents claim." |
| `CHAIN_OF_TRUST.md` | Philosophy and architecture of evidence-based status computation. Data flow diagrams showing how validation results feed phase gates and dashboard. Core concept: validation results are immutable evidence, not claims. |
| `CHAIN_OF_TRUST_FLOW.md` | Detailed flow diagrams showing data movement between validators, registry, phase gates, hooks, and dashboard. Essential reference for understanding the enforcement pipeline. |
| `PHASE_GATES.md` | Automated phase completion checks. Documents current gates (e.g., "Phase 2 requires 70% coverage"), how to check status, how to fix blockers, and which gates are hard blocks vs advisories. |
| `CLAUDE_HOOKS.md` | Pre-commit validation enforcement via Claude Code hooks. Explains what validators get triggered on commit, what gets blocked, how to respond to failures, what NOT to do (no `--no-verify`). |
| `VALIDATION_REGISTRY.md` | Schema and API documentation for validation-registry.json. Defines structure of validator entries, update rules, timestamp tracking, security considerations. Library functions for reading/updating registry. |
| `VALIDATION_SCRIPTS_REFERENCE.md` | Complete reference of all validation scripts: what each checks, required inputs, expected outputs, how to run individually, how to interpret results. |
| `PM_DASHBOARD.md` | PM Dashboard documentation and user guide. Covers dashboard startup (`npm run dashboard:serve` on port 8811), dashboard versions (v1 original, v2 with collapsible sections), section explanations: Phase Gates, Stats Grid, Blockers, Live Runner, Validator Health. |
| `LIVE_VALIDATION_RUNNER.md` | Live validation streaming service documentation. SSE-based real-time validator execution and output streaming. Covers runner API endpoints and dashboard integration. |
| `TDD_ENFORCEMENT_SETUP.md` | Setup guide for TDD enforcement in new projects. Covers installation, configuration, pre-commit hook setup, validation registry initialization, dashboard setup. |
| `VALIDATION_SYSTEM_DIAGRAM.md` | Visual diagrams showing Chain of Trust architecture, data flows, phase gate logic, hook trigger sequence. Helps developers understand the complete enforcement system at a glance. |

#### `/core/templates/` - Template Documents

| File | Purpose |
|------|---------|
| `features.md` | Feature template for standard feature documentation. Provides boilerplate structure for documenting new features in the system. |

---

## Optional Modules - `/optional/` (10 Files)

Optional modules provide patterns and standards for cross-cutting concerns that projects opt into based on requirements. Each module is independent and can be used standalone.

| File | Purpose |
|------|---------|
| `auth/MODULAR_AUTH_SYSTEM.md` | Modular authentication pattern with `IAuthProvider`, `StandaloneAuthProvider`, `AuthProviderFactory`. Covers standard `/auth/*` endpoints, env/config requirements, cookie security (`sameSite: 'strict'`, `httpOnly: true`), JWT vs session patterns. |
| `tenancy/ORGANIZATION_WORKSPACE_MODEL.md` | Canonical tenant model (Organization + Workspace). Includes legacy mapping from v2's `Branch` to `Workspace`, rules for propagating tenant context through HTTP, messaging, logs, metrics. Core pattern for multi-tenancy. |
| `messaging/PULSAR_MESSAGING_STANDARD.md` | Pulsar-only messaging standard for new work (RabbitMQ marked legacy). Covers `{ ACTION, DATA }` message shape, topic/config conventions, consumer patterns, error handling. |
| `logging/LOGGING_AND_TRACING_STANDARD.md` | Structured logging fields and transports. Covers correlation ID generation and propagation via async context, log level conventions, structured field naming, how logs integrate with observability stack. |
| `schema/DATABASE_SCHEMA_AND_MIGRATIONS.md` | Database schema and migration process. Covers breaking vs additive changes, data backfill patterns, index requirements (mandatory for FK columns, WHERE clauses, ORDER BY). Migration naming and testing. |
| `permissions/PERMISSIONS_AND_AUTHORIZATION_MODEL.md` | Role/ownership model on top of tenancy. Covers shared guards/middleware patterns, feature-permission integration, role hierarchies, tenant-scoped permissions. |
| `caching/CACHING_AND_STATE_MANAGEMENT.md` | L1/L2/L3 caching model (LRU, Valkey/Redis, DB). Covers central keys/configs, invalidation strategies, cache coherence, stale-while-revalidate patterns. |
| `config/CONFIGURATION_AND_ENVIRONMENT_MODEL.md` | Env-first configuration, naming conventions, boot-time validation. Covers NestJS ConfigService requirements (no direct `process.env` in services), dotenv loading, validation schemas. |
| `flags/FEATURE_FLAGS_AND_EXPERIMENTS.md` | Feature flags and experiment patterns. Covers internal flags for deployment safety, Statsig experiments, integration with contracts/tests, rollout strategies. |
| `observability/OBSERVABILITY_HEALTH_AND_METRICS.md` | Health endpoints, metrics, tracing, alerting expectations. Covers liveness/readiness probes, Prometheus metrics format, distributed tracing, alerting rules. |

---

## Stack-Specific Patterns - `/stacks/` (3 Stacks, 20+ Files)

Stack-specific directories provide framework-aware implementations of the handbook methodology. Each stack includes patterns, configuration, and integration guides tailored to its framework.

### NestJS Single Service - `/stacks/nestjs/` (8 Files)

For NestJS-based backend services. Maps handbook phases directly to NestJS architectural patterns.

| File | Purpose |
|------|---------|
| `README.md` | Complete NestJS stack guide. Maps handbook phases to NestJS modules, controllers, services, guards. Includes directory structure examples, architectural patterns, TDD enforcement rules, OpenAPI integration workflow. |
| `patterns.md` | Common NestJS patterns for handbook compliance. Quick reference for implementing controllers, services, guards, interceptors, filters, pipes, middleware. |
| `CONTROLLER_PATTERNS.md` | Detailed controller patterns from OpenAPI specs. Covers decorators, response envelopes, error handling, guards, interceptors. Links controllers directly to OpenAPI endpoint definitions. |
| `SERVICE_PATTERNS.md` | Service implementation patterns for business rules. Covers dependency injection, database operations, error handling, logging. Maps business rules to service methods. |
| `DTO_PATTERNS.md` | Data Transfer Object patterns for OpenAPI request/response schemas. Covers validation decorators, class-validator usage, request vs response DTOs, composition patterns. |
| `MODULE_STRUCTURE.md` | NestJS module organization and feature module anatomy. Covers module exports, dependency injection, shared providers, module lifecycle. Maps user stories to feature modules. |
| `TESTING_PATTERNS.md` | NestJS testing patterns for unit, integration, e2e tests. Covers Test.createTestingModule, mocking strategies, database testing, async testing. Links to handbook testing standards. |
| `config.json` | Stack configuration file. Defines glob patterns for NestJS artifacts (controllers, services, guards, etc.), TDD enforcement patterns (which files must have tests), test file locations, validation exclusions. Used by validation scripts to enforce stack-specific rules. |

### Express Single Service - `/stacks/express/` (8 Files)

For Express.js-based backend services. Lightweight framework patterns.

| File | Purpose |
|------|---------|
| `README.md` | Express stack guide. Maps handbook phases to Express route handlers, middleware, validation. Directory structure examples, architectural patterns, OpenAPI integration. |
| `patterns.md` | Common Express patterns for handbook compliance. Quick reference for middleware, route handlers, error handling, request validation. |
| `ROUTER_PATTERNS.md` | Express router and route handler patterns. Covers router.get/post/put/delete, parameter parsing, middleware chaining, error handling, response formatting. |
| `MIDDLEWARE_PATTERNS.md` | Express middleware patterns for cross-cutting concerns. Covers authentication, logging, request validation, response transformation, error handling middleware. |
| `VALIDATION_PATTERNS.md` | Input validation patterns using joi, express-validator. Covers schema definition, middleware integration, error responses, custom validators. |
| `TESTING_PATTERNS.md` | Express testing patterns using supertest, jest. Covers integration testing, mocking, database testing, middleware testing. |
| `SWAGGER_JSDOC.md` | Swagger JSDoc integration for Express. Covers documenting routes, parameters, responses, auto-generating OpenAPI specs from code comments. |
| `config.json` | Stack configuration file. Defines glob patterns for Express artifacts (routes, middleware, handlers), TDD enforcement patterns, test locations. |

### NX Monorepo - `/stacks/nx-monorepo/` (8 Files)

For NX monorepo setups with multiple services. Coordinates validation and patterns across multiple packages.

| File | Purpose |
|------|---------|
| `README.md` | NX monorepo stack guide. Maps handbook phases to NX workspace structure. Covers shared packages, app coordination, cross-service contracts, validation coordination. |
| `patterns.md` | Common NX patterns for handbook compliance. Quick reference for organizing apps, shared packages, dependency management. |
| `SHARED_PACKAGES.md` | Shared package patterns in NX monorepo. Covers shared types, utils, validators, database models, common decorators. Prevents duplication across services. |
| `CROSS_SERVICE_CONTRACTS.md` | Inter-service contract patterns. Covers versioned APIs between services, event contracts (Pulsar), shared types, backwards compatibility. |
| `MULTI_APP_COORDINATION.md` | Multi-app coordination patterns. Covers mono-repo testing, shared configuration, deploy coordination, feature flags across services. |
| `VALIDATION_COORDINATION.md` | Validation coordination across NX workspace. Covers running validators for affected apps only, shared validation rules, dependency-aware testing. |
| `BUILD_AND_DEPLOY.md` | Build and deploy patterns for NX monorepo. Covers incremental builds, cache management, deployment orchestration, CI/CD integration. |
| `config.json` | Stack configuration file. Extends NestJS/Express configs with NX-specific patterns: workspace validation, affected-only targets, shared package validation. |

---

## Validation Infrastructure - `/validation/` (15 Files)

Validation scripts, templates, and configuration for the Chain of Trust system. Enforces TDD, contract compliance, and phase gates.

### Validation Scripts - `/validation/src/` (13 Files)

| File | Purpose |
|------|---------|
| `runner.ts` | Main validation orchestrator. Loads all validators, executes them in sequence, aggregates results, updates validation registry, returns overall status. Called by CI/CD and pre-commit hooks. |
| `run-all.ts` | Master validation runner. Executes all validators for complete project validation. Used for full phase gate checks and dashboard status computation. |
| `gates.ts` | Phase gate validator. Checks if current phase can progress based on evidence (test coverage, validation results, artifact completion). Implements gate logic defined in handbook. |
| `quick-gate-check.ts` | Quick phase gate status check. Lightweight version of gates validator for rapid feedback. Used in pre-commit hooks and dashboard. |
| `dashboard.ts` | PM Dashboard backend service. Aggregates validation results, computes phase status, serves data to web dashboard UI. Provides real-time status visualization. |
| `commit-guard.ts` | Pre-commit hook validator. Checks if staged changes are valid before allowing commit. Prevents committing failing tests or breaking contracts. |
| `check-red-phase.ts` | RED phase validator. Verifies that tests exist and are failing before implementation. Enforces TDD: tests must come before code. |
| `check-unit-test-coverage.ts` | Unit test coverage validator. Checks unit test coverage meets minimum threshold. Aggregates coverage from test runners. |
| `check-integration-test-coverage.ts` | Integration test coverage validator. Checks integration test coverage (if applicable). Verifies critical paths are tested. |
| `check-contract-test-coverage.ts` | Contract/OpenAPI validation test coverage. Verifies endpoints match spec, responses match schema, error cases are covered. |
| `check-staged-coverage.ts` | Staged files coverage validator. Checks that files staged for commit have sufficient test coverage. Prevents committing untested code. |
| `check-registry-freshness.ts` | Validation registry freshness check. Ensures registry is not stale, validators are up-to-date, no orphaned entries. Prevents outdated status. |

### Validation Configuration - `/validation/src/config/` (2 Files)

| File | Purpose |
|------|---------|
| `loader.ts` | Configuration loader for validation system. Loads handbook.config.json, merges with defaults, validates against schema. Provides config to all validators. |

### Validation Libraries - `/validation/src/lib/` (3 Files)

| File | Purpose |
|------|---------|
| `validation-registry.ts` | Library for reading/updating validation-registry.json. Provides typed API for queries, updates, timestamp management, immutability enforcement. Used by validators and CLI. |
| `config-loader.ts` | Configuration loading library. Handles dotenv, environment validation, config merging. Used during bootstrap. |
| `commit-guard.ts` | Commit guard logic library. Implements pre-commit validation checks: staged file analysis, coverage computation, validator staleness check. |

### Validation Templates - `/validation/templates/` (5 Files)

Template validators for creating new validators following handbook patterns.

| File | Purpose |
|------|---------|
| `README.md` | Validator creation guide. Explains how to create new validators, required structure, imports, registry updates. Templates show boilerplate. |
| `validate-phase0.template.ts` | Template for Phase 0 (Plan) validators. Checks for stories, rules, contracts, specs. Template structure for plan-phase validation. |
| `validate-phase1.template.ts` | Template for Phase 1 (RED) validators. Checks tests exist and fail. Template structure for red-phase TDD enforcement. |
| `validate-phase2.template.ts` | Template for Phase 2 (GREEN) validators. Checks implementation exists, tests pass, coverage meets threshold. Template for green-phase validation. |
| `validate-feature.template.ts` | Template for feature validators. Validates a specific feature across all phases. Shows cross-phase validation structure. |

### Validation Documentation - `/validation/` (3 Files)

| File | Purpose |
|------|---------|
| `README.md` | Validation infrastructure overview. Explains validator architecture, registry format, execution flow, integration points. |
| `EXTRACTION-SUMMARY.md` | Summary of validators extracted from SmackChat implementation. Documents origin, purpose, status of each validator. |
| `EXTRACTION_SUMMARY.md` | Detailed extraction summary with history. Mirrors EXTRACTION-SUMMARY.md with additional context. |
| `IMPLEMENTATION_STATUS.md` | Current implementation status of all validators. Shows which are complete, in-progress, planned. |

---

## CLI Tools - `/bin/` (5 Files)

Command-line tools for project initialization and maintenance.

| File | Purpose |
|------|---------|
| `handbook-init.ts` | Main CLI entry point for project initialization. Prompts for stack selection, generates project structure, copies handbook files, configures validation, installs hooks. Transforms fresh project into handbook-ready project. |
| `handbook-doctor.ts` | Diagnostic tool for checking handbook compliance. Verifies project structure, configuration, hooks, validators. Reports issues and suggests fixes. Used for troubleshooting. |
| `lib/file-operations.ts` | File system utilities for CLI. Handles copying handbook files, creating directories, templating. Abstracts fs operations for testability. |
| `lib/npm-scripts.ts` | NPM script management utilities. Adds/updates package.json scripts for validators, testing, building. Integrates handbook validation into npm ecosystem. |
| `lib/husky-installer.ts` | Husky git hooks installation. Sets up .husky directory, installs pre-commit hooks, configures lint-staged. |

---

## Plugin Infrastructure - `/plugin/` (25+ Files)

Claude Code plugin providing agents, commands, and skills for handbook-driven development.

### Plugin Overview

| File | Purpose |
|------|---------|
| `README.md` | Plugin documentation. Explains agent ecosystem, available commands, skills, how to invoke from Claude Code. Entry point for understanding plugin capabilities. |

### Plugin Agents - `/plugin/agents/` (8 Files)

Autonomous agents for specific development workflows in the SDD methodology.

| File | Purpose |
|------|---------|
| `handbook-auditor.md` | Agent that audits project against handbook compliance. Checks structure, validates rules, identifies deviations. Generates remediation suggestions. |
| `validation-runner.md` | Agent that orchestrates validation execution. Runs appropriate validators for current phase, aggregates results, updates registry. Reports blockers. |
| `contract-designer.md` | Agent that designs API contracts (OpenAPI). Converts user stories and business rules into complete contract specs. Generates DTOs, schemas, path definitions. |
| `spec-author.md` | Agent that writes UX validation specs. Converts contracts and business rules into acceptance criteria tests. Creates docs/test-plans/validation-specs files. |
| `story-rule-linker.md` | Agent that creates cross-references between user stories and business rules. Builds the artifact matrix. Identifies missing links. |
| `implementer.md` | Agent that implements features following the handbook. Takes a story/rule/contract, writes tests, implements, refactors. Manages phase progression. |
| `phase-coordinator.md` | Agent that orchestrates multi-step phase work. Dispatches sub-agents, verifies evidence, manages phase transitions. Reports to PM Dashboard. |
| `retroactive-documenter.md` | Agent that generates missing documentation from existing code. Reverse-engineers stories/rules/specs from implementation. |

### Plugin Commands - `/plugin/commands/` (11 Files)

Slash commands for manual interaction with handbook system from Claude Code.

| File | Purpose |
|------|---------|
| `start.md` | `/sdd:start [goal]` - Launch the phase-coordinator to orchestrate playbook work for a goal. Entry point for handbook-driven development. |
| `status.md` | `/sdd:status` - Show current project phase status and what to do next. Dashboard summary. |
| `validate.md` | `/sdd:validate` - Run validation scripts for a specific phase or all phases. Returns blockers and evidence. |
| `next.md` | `/sdd:next` - Determine and execute the next required action in the playbook. Suggests what to work on. |
| `phase.md` | `/sdd:phase [phase-name]` - Execute work for a specific phase of the playbook. Dispatches agents for phase tasks. |
| `sync-handbook.md` | `/sdd:sync-handbook` - Audit plugin against handbook and generate updates for any discrepancies. Keeps plugin in sync. |
| `add-feature.md` | `/sdd:add-feature` - Inject a new feature into the project mid-development. Safely adds scope without disrupting existing work. |
| `add-endpoint.md` | `/sdd:add-endpoint` - Add or document an API endpoint following contract-first approach. Creates complete contract + implementation + tests. |
| `doctor.md` | `/sdd:doctor` - Run handbook-doctor diagnostic tool. Reports compliance issues and suggests remediation. |
| `matrix.md` | `/sdd:matrix` - Check the cross-reference matrix (stories <-> rules <-> endpoints <-> specs). Shows artifact alignment. |
| `version.md` | `/sdd:version` - Show plugin version and git commit info. Used for issue reporting. |

### Plugin Skills - `/plugin/skills/` (6 Skills, 15+ Files)

Specialized skill agents providing focused expertise for specific tasks.

#### Feature Injection Skill - `/plugin/skills/feature-injection/`

| File | Purpose |
|------|---------|
| `SKILL.md` | Feature injection skill documentation. Safely adds new features to in-progress projects while preserving validated existing work. Walks through all required phases for just the new feature. |

#### Validation Orchestrator Skill - `/plugin/skills/validation-orchestrator/`

| File | Purpose |
|------|---------|
| `SKILL.md` | Validation orchestrator skill documentation. Runs validation scripts for specific phases, captures output, updates progress files with results. |

#### Handbook Sync Skill - `/plugin/skills/handbook-sync/`

| File | Purpose |
|------|---------|
| `SKILL.md` | Handbook sync skill documentation. Audits plugin against handbook to identify discrepancies and generates updates to maintain alignment. |
| `references/git-workflow.md` | Git workflow reference for handbook sync. Documents branching strategy, commit conventions, PR templates. |

#### Failure Recovery Skill - `/plugin/skills/failure-recovery/`

| File | Purpose |
|------|---------|
| `SKILL.md` | Failure recovery skill documentation. Guides through fixing validation failures following System Delivery Playbook remediation procedures. |
| `references/phase1-remediation.md` | Remediation procedures for Phase 1 (Plan) failures. Lists common issues and fixes. |
| `references/phase2-remediation.md` | Remediation procedures for Phase 2 (RED) failures. Covers test-writing issues. |
| `references/phase3-remediation.md` | Remediation procedures for Phase 3 (GREEN) failures. Covers implementation issues. |
| `references/phase4-remediation.md` | Remediation procedures for Phase 4 (Refactor) failures. Covers refactoring issues. |
| `references/phase5-remediation.md` | Remediation procedures for Phase 5 (Validate) failures. Covers validation test issues. |

#### Phase Navigator Skill - `/plugin/skills/phase-navigator/`

| File | Purpose |
|------|---------|
| `SKILL.md` | Phase navigator skill documentation. Determines current project phase in the System Delivery Playbook and shows what's complete, pending, and next steps. |

#### Artifact Generator Skill - `/plugin/skills/artifact-generator/`

| File | Purpose |
|------|---------|
| `SKILL.md` | Artifact generator skill documentation. Generates properly formatted artifacts following handbook templates: user stories, business rules, OpenAPI contracts, UX specs. |
| `references/user-stories.md` | User story template and examples. Shows proper US-xxx format, acceptance criteria structure, linking to rules. |
| `references/business-rules.md` | Business rule template and examples. Shows proper BR-xxx format, categories, enforcement mechanisms. |
| `references/openapi-contracts.md` | OpenAPI contract template and examples. Shows proper schema structure, endpoint patterns, security definitions. |
| `references/ux-specs.md` | UX specification template and examples. Shows proper validation spec structure, test scenario format. |

#### Endpoint Evolution Skill - `/plugin/skills/endpoint-evolution/`

| File | Purpose |
|------|---------|
| `SKILL.md` | Endpoint evolution skill documentation. Manages complete endpoint lifecycle from OpenAPI contracts through implementation and documentation. |
| `references/adding-endpoints.md` | Guide for adding new endpoints. Workflow from spec to tests to implementation. |
| `references/modifying-endpoints.md` | Guide for modifying existing endpoints. Breaking vs non-breaking changes, versioning. |
| `references/deprecating-endpoints.md` | Guide for deprecating endpoints. Sunset timelines, migration guides, notification strategies. |
| `references/documenting-unclassified.md` | Guide for documenting unclassified endpoints. Retroactive documentation from implementation. |
| `references/common-patterns.md` | Common endpoint patterns. CRUD operations, bulk operations, filtering, pagination, sorting. |

### Plugin Hook Configuration - `/plugin/hooks/` (2 Files)

| File | Purpose |
|------|---------|
| `hooks.json` | Activated hooks configuration. Defines which Claude Code hooks are enabled and their configuration. |
| `hooks.template.json` | Hook configuration template. Template structure for setting up hooks in a new project. |

### Plugin Library - `/plugin/lib/` (1 File)

| File | Purpose |
|------|---------|
| `config-loader.md` | Configuration loader for plugin. Loads handbook.config.json and provides config to agents/commands/skills. |

---

## Claude Code Integration - `/claude/` (1 File)

| File | Purpose |
|------|---------|
| `hooks.json` | Claude Code hook definitions for this project. Enables validation hooks, commit guards, phase gate checks. Integrated with Chain of Trust enforcement system. |

---

## Husky Git Hooks - `/husky/` (1 File)

| File | Purpose |
|------|---------|
| `README.md` | Husky setup and git hooks documentation. Explains pre-commit hook configuration, lint-staged integration, TDD commit guard. Copy-paste templates for new projects. |

---

## Documentation - `/docs/` (4 Files)

Project-level documentation for handbook-system itself.

| File | Purpose |
|------|---------|
| `TESTING.md` | Testing guide for handbook-system package. Covers test structure, running tests, coverage expectations. |
| `migration/MIGRATION_GUIDE.md` | Migration guide for adopting handbook-system in existing projects. Covers checklist, backwards compatibility, phased adoption strategy. |
| `migration/smackchat-config.json` | SmackChat-specific migration configuration. Example of how to configure handbook-system for SmackChat project. |

---

## Configuration Files - Root Level (6 Files)

| File | Purpose |
|------|---------|
| `package.json` | NPM package manifest. Defines package metadata, bin entry points (handbook-init CLI), build/test scripts, dependencies. Version: 0.1.0. |
| `tsconfig.json` | TypeScript configuration. Compiler options, module resolution, build targets for handbook-system source. |
| `handbook.config.schema.json` | JSON schema for handbook.config.json validation. Defines valid configuration structure and types. Used to validate project configs. |
| `handbook.config.example.json` | Example handbook configuration. Shows all available configuration options with realistic values. Copy as template for new projects. |
| `README.md` | Package overview. Quick start guide, project structure, documentation links, development commands. |

---

## File Manifest Summary

### By Type

| Type | Count | Location |
|------|-------|----------|
| Markdown documentation (.md) | 85+ | throughout |
| TypeScript source (.ts) | 25+ | bin/, validation/src/ |
| JSON configuration (.json) | 10+ | root, stacks/, validation/ |
| YAML (OpenAPI template) | 1 | core/contracts/ |
| **Total** | **120+** | - |

### By Audience

| Audience | Key Files | Location |
|----------|-----------|----------|
| **Project Managers** | START-HERE-FOR-PMS.md, PM_DASHBOARD.md, SYSTEM_DELIVERY_PLAYBOOK.md | core/ |
| **Developers** | CLAUDE_CODE_INTEGRATION.md, Stack-specific README.md, TESTING_STANDARDS.md | core/tooling/, stacks/ |
| **AI Agents** | monitoring/README.md, CHAIN_OF_TRUST.md, PHASE_GATES.md, Agent .md files | core/monitoring/, plugin/agents/ |
| **Architects** | SYSTEM_DELIVERY_PLAYBOOK.md, optional/*.md, stack README.md | core/, optional/, stacks/ |
| **DevOps/SRE** | CI_CD_VALIDATION_PIPELINE.md, PRE_COMMIT_HOOKS.md, observability module | core/cicd/, optional/ |

---

## Key Features by Category

### Methodology Foundation
- **7-phase delivery model** (Plan → RED → GREEN → Refactor → Validate → Release → Monitor)
- **Contract-first development** (OpenAPI-driven)
- **Evidence-based status** (Chain of Trust)
- **Cross-referenced artifacts** (Stories ↔ Rules ↔ Contracts ↔ Specs)

### Technical Standards
- **API response envelope** pattern
- **Error handling** conventions
- **Database schema** and migration standards
- **Testing patterns** (unit, integration, e2e, contract)
- **Authentication** modular patterns
- **Authorization** role-based model
- **Multi-tenancy** (Org + Workspace)
- **Caching** L1/L2/L3 strategy
- **Messaging** (Pulsar standard)
- **Logging** structured format
- **Observability** health/metrics/tracing

### Framework Support
- **NestJS** single service
- **Express.js** single service
- **NX Monorepo** multi-service

### Validation & Enforcement
- **Automated validators** (13 scripts)
- **Phase gates** (progression blocking)
- **Pre-commit hooks** (Claude Code + Husky)
- **Validation registry** (immutable evidence)
- **PM Dashboard** (real-time status)
- **Live validation runner** (SSE streaming)

### Developer Tooling
- **CLI tools** (handbook-init, handbook-doctor)
- **Claude Code plugin** (8 agents, 11 commands, 6 skills)
- **Claude Code hooks** (validation enforcement)
- **Template generators** (validators, artifacts)
- **Config system** (handbook.config.json)

---

## Integration Points

### With CI/CD
Validation scripts integrate with GitHub Actions, GitLab CI, Jenkins via:
- npm scripts in package.json
- Validation registry for status reporting
- Exit codes for blocking/advisory modes

### With Claude Code
Plugin integrates via:
- Slash commands (/sdd:*)
- Agents for autonomous work
- Skills for specialized tasks
- Hooks for pre-commit enforcement
- Config loader for handbook-aware decisions

### With Git
Integration via:
- Husky pre-commit hooks
- Lint-staged for file-specific linting
- Commit guard for TDD enforcement
- Branch protection rules

### With Editor IDEs
- VSCode handbook syntax highlighting (via extension)
- Inline validation results (via language server)
- Quick fixes for common errors

---

## Version & Licensing

| Property | Value |
|----------|-------|
| **Package Name** | @smackdab/handbook-system |
| **Version** | 0.1.0 |
| **License** | MIT |
| **Repository** | https://github.com/smackdab/handbook-system.git |
| **Main Entry** | dist/index.js |
| **Types Entry** | dist/index.d.ts |
| **CLI Entry** | handbook-init |

---

## Getting Started Checklist

1. Read: `core/README.md` (navigation guide)
2. Read: `core/SYSTEM_DELIVERY_PLAYBOOK.md` (complete methodology)
3. Read: `core/monitoring/README.md` (enforcement system)
4. For PMs: `core/START-HERE-FOR-PMS.md`
5. For developers: `core/tooling/CLAUDE_CODE_INTEGRATION.md` + stack-specific README
6. For AI agents: `core/monitoring/CLAUDE_HOOKS.md` + agents/
7. Initialize project: `npx @smackdab/handbook-init`
8. Run validation: `npm run validation:all`
9. Check status: `npm run validation:gates`

---

## File Organization Rationale

The package is organized into logical groups serving different purposes:

- **core/** - Non-negotiable methodology every project must follow
- **optional/** - Standards for features projects might use
- **stacks/** - Framework-specific implementations
- **validation/** - Enforcement infrastructure
- **bin/** - CLI tools for setup and diagnostics
- **plugin/** - Claude Code integration for AI-assisted development
- **docs/** - Documentation about handbook-system itself

This separation enables:
1. Copy handbook to projects (core + optional)
2. Reference stack-specific patterns
3. Integrate validation into CI/CD
4. Use CLI for initialization
5. Invoke from Claude Code via plugin

---

Generated for package version 0.1.0
Last updated: December 6, 2025
