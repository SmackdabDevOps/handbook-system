---
name: Phase Navigator
description: This skill determines the current project phase in the System Delivery Playbook and shows what's complete, pending, and next steps. Use when asking about project status, phase progress, or deciding what to work on next.
allowed-tools: Read, Glob, Grep, Bash
---

# Phase Navigator

## Configuration

This skill uses project-specific configuration from the SDD plugin config:

**Required config values:**
- `config.phases.enabled` - Which phases are enabled for this project (array of phase numbers)
- `config.paths.validators` - Path to validation scripts directory
- `config.paths.dashboard` - Path to dashboard data JSON file
- `config.paths.registry` - Path to validation registry JSON file

**How to use config:**
When the skill runs, it reads these paths dynamically from the project's SDD plugin configuration. This allows the same skill to work across different projects with different directory structures.

**Example config:**
```json
{
  "phases": {
    "enabled": [1, 2, 3, 4, 5]
  },
  "paths": {
    "validators": "scripts/validation/",
    "dashboard": "scripts/dashboard/dashboard-data.json",
    "registry": "scripts/validation/validation-registry.json"
  }
}
```

## Purpose

This skill analyzes a project following the Smackdab System Delivery Playbook to determine:
1. Which of the 7 phases the project is currently in
2. What artifacts exist and their completion status
3. What validation scripts have passed/failed
4. What the next required action is

## Trigger Keywords

- "what phase are we in"
- "where are we in the project"
- "project status"
- "what's next"
- "phase status"
- "playbook status"
- "delivery status"

## The 7 Phases

| Phase | Name | Key Artifacts | Validation Script |
|-------|------|---------------|-------------------|
| 0 | Features | `docs/features.md` | None |
| 1 | Stories & Rules | `docs/user-stories/*.md`, `docs/business-rules/*.md` | `check-business-rules-coverage.ts` |
| 2 | Contracts & Registry | `openapi/paths/*.yaml`, `architecture/ENDPOINTS.json` | `validate:naming`, `validate:openapi-dto`, `endpoints:validate` |
| 3 | Backend Implementation | `src/modules/*/controllers/*.ts` | `endpoints:validate`, `lint`, `test` |
| 3.5 | Retroactive Documentation | OpenAPI + User Story for unclassified endpoints | `endpoints:validate` |
| 4 | UX Specs | `docs/test-plans/validation-specs/*.md` | `check-story-coverage.ts`, `check-endpoint-coverage.ts` |
| 5 | Validation Scripts | `scripts/validation/validate-*.ts` | `run-all-with-logs.sh` |
| 6 | Frontend Maps | `docs/frontend/endpoint-maps/*.md` | `validate-documentation-matrix.ts` |
| 7 | Frontend UI | Frontend implementation | Lint, typecheck, test |

## Phase Detection Algorithm

When invoked, perform these checks in order:

### Step 0: Run Comprehensive Gate Check (PRIMARY METHOD)

**ALWAYS start with:**
```bash
npm run validation:gates
```

This command:
1. Checks ALL phase gates (1-5) in a single run
2. Returns structured output showing which phases pass/fail
3. Automatically refreshes the PM Dashboard data
4. Takes ~15-30 seconds

### Step 1: Read Dashboard Data (Authoritative Source)

```bash
# Read from config.paths.dashboard (typically scripts/dashboard/dashboard-data.json)
cat ${config.paths.dashboard} | jq '.all_phase_gates, .current_phase, .blockers, .tdd_stats'
```

**Key fields:**
```json
{
  "current_phase": { "number": 4, "name": "UX Specs" },
  "all_phase_gates": {
    "allPassed": false,
    "phases": [
      { "phase": "phase1", "name": "Stories & Business Rules", "passed": true, "blockers": [] },
      { "phase": "phase2", "name": "Contracts & Registry", "passed": true, "blockers": [] },
      { "phase": "phase3", "name": "Backend Implementation", "passed": true, "blockers": [] },
      { "phase": "phase4", "passed": false, "blockers": ["8 validators not run"] },
      { "phase": "phase5", "passed": false, "blockers": ["8 validators not run"] }
    ]
  },
  "blockers": [...],
  "validation_health": {
    "never_run_count": 8,
    "never_run_validators": ["channels", "chat-core", ...]
  },
  "tdd_stats": {
    "unit_tests": { "coverage_percent": 85.2, "passing": false },
    "contract_tests": { "total_endpoints": 209, "endpoints_with_tests": 0, "coverage_percent": 0, "passing": false },
    "integration_tests": { "cross_module_calls": 0, "calls_with_tests": 0, "coverage_percent": -1, "passing": false }
  }
}
```

**TDD Stats interpretation:**
- `coverage_percent: -1` means "N/A" (no cross-module dependencies to test)
- Display N/A as "N/A" not "0%" or "-1%"
- Thresholds: Unit 90%, Contract 100%, Integration 100% (or N/A)

### Step 2: Determine Current Phase from Gates

**Rule: Current phase = lowest phase with blockers (or highest passing + 1)**

```
If Phase 1 fails → Current phase is 1
If Phase 2 fails → Current phase is 2
If Phase 3 fails → Current phase is 3
If Phase 4 fails → Current phase is 4
If Phase 5 fails → Current phase is 5
If all pass → Ready for Phase 6+
```

### Step 3: Identify Blockers

Read `blockers[]` array from dashboard JSON. Each blocker has:
- `phase` - Which phase it blocks
- `type` - `missing_validator`, `validator_failed`, `stale_results`
- `title` - What's blocking
- `action` - How to fix

### Step 4: Report Status

Use the output format below to report.

## Output Format

After analysis, report:

```markdown
## Project Phase Status

**Current Phase:** [Phase N - Name]
**All Gates Passed:** [Yes/No]

### Phase Gate Status

| Phase | Status | Blockers |
|-------|--------|----------|
| 1 - Stories & Rules | ✅ PASS | - |
| 2 - Contracts | ✅ PASS | - |
| 3 - Backend | ✅ PASS | - |
| 4 - UX Specs | ❌ FAIL | 8 validators not run |
| 5 - Validation | ⏳ SKIP | Blocked by Phase 4 |

### Validation Health

- **Never run validators:** 8 (channels, chat-core, files, ...)
- **Stale results:** 2 validators
- **Active regressions:** 0

### TDD Stats

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Unit Test Coverage | 85.2% | 90% | ❌ FAIL |
| Contract Test Coverage | 0% | 100% | ❌ FAIL |
| Integration Test Coverage | N/A | 100% | ✅ N/A |

**RED Phase Verified Modules:** bookmarks, auth (2 total)

### Immediate Next Steps

1. [Specific action required - prioritize lowest failing phase]
2. [Specific action required]
3. [Specific action required]

### Commands to Run

```bash
# Fix current blockers:
npm run validation:all  # Run all validators

# Then re-check:
npm run validation:gates
```
```

## Source of Truth: Chain of Trust Registry

**Primary source:**
- `${config.paths.dashboard}` - Aggregated status with blockers (auto-refreshed)
- `${config.paths.registry}` - Machine-readable validator results

**Generated files (auto-generated from registry):**
- `${config.paths.progressDocs}/UX-VALIDATION-STATUS.md` - Generated by validation commands

**Legacy progress files (manual, may be stale):**
- `${config.paths.progressDocs}/STORY-RULES-STATUS.md` - Phase 1
- `${config.paths.progressDocs}/ENDPOINT-MATRIX-STATUS.md` - Phase 2
- `${config.paths.progressDocs}/ENDPOINT-REVIEW-STATUS.md` - Phase 3
- `${config.paths.progressDocs}/UX-SPEC-COVERAGE.md` - Phase 4

**Rule:** Always prefer registry over manual progress files. Registry is authoritative.

## Quick Reference: Validation Commands

| Command | Purpose | Speed |
|---------|---------|-------|
| `npm run validation:quick` | Pre-commit check | ~1 sec |
| `npm run validation:gates` | All phase gates | ~15-30 sec |
| `npm run validation:all` | Full validation suite | ~2-5 min |

## Integration with Other Skills

After determining phase status:
- If validation failures exist → invoke `failure-recovery` skill
- If new features needed → invoke `feature-injection` skill
- If endpoints need documentation → invoke `endpoint-evolution` skill
- If artifacts need generation → invoke `artifact-generator` skill

## Chain of Trust Documentation

For complete details on the validation system, see:
- `handbook/monitoring/README.md` - System overview
- `handbook/monitoring/CHAIN_OF_TRUST.md` - Philosophy and architecture
- `handbook/monitoring/PHASE_GATES.md` - Gate rules and requirements

## Critical Rules

1. **Run validation:gates FIRST** - Don't analyze stale data
2. **Never skip phases** - Each phase depends on the previous
3. **Never fake completion** - Run actual validation scripts
4. **Report blockers clearly** - Don't hide issues
5. **Prioritize lowest failing phase** - Fix foundation before building
