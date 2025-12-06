---
name: Validation Orchestrator
description: This skill runs validation scripts for the System Delivery Playbook phases, captures output, and updates progress files with results. Use when executing phase validations, ensuring compliance, or checking validation status.
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Validation Orchestrator

## Configuration

This skill uses project-specific configuration for validation commands and paths:

**Required config values:**
- `config.commands.validation.quick` - Pre-commit validation command
- `config.commands.validation.gates` - Phase gate check command
- `config.commands.validation.all` - Full validation suite command
- `config.commands.validation.generateProgress` - Progress file generation command
- `config.paths.validators` - Path to validation scripts directory
- `config.paths.registry` - Path to validation registry JSON file
- `config.paths.dashboard` - Path to dashboard data JSON file

**Example config:**
```json
{
  "commands": {
    "validation": {
      "quick": "npm run validation:quick",
      "gates": "npm run validation:gates",
      "all": "npm run validation:all",
      "generateProgress": "npm run validation:generate-progress"
    }
  },
  "paths": {
    "validators": "scripts/validation/",
    "registry": "scripts/validation/validation-registry.json",
    "dashboard": "scripts/dashboard/dashboard-data.json"
  }
}
```

## Purpose

This skill executes the validation scripts required by the System Delivery Playbook:
1. Determines which validations to run based on current phase or specific request
2. Executes scripts in the correct order
3. **Writes results to Chain of Trust registry** via `reportValidationResult()`
4. **Generates progress files from registry** (never manually edits them)
5. **Automatically refreshes PM Dashboard data**
6. Reports pass/fail status with actionable next steps

## Quick Reference: Validation Commands

| Command | Purpose | Speed | Use When |
|---------|---------|-------|----------|
| `npm run validation:quick` | Pre-commit check | ~1 sec | Before `git commit` |
| `npm run validation:gates` | All phase gates (1-5) | ~15-30 sec | Comprehensive status check |
| `npm run validation:all` | Full validation suite | ~2-5 min | Complete validation run |

**All commands automatically refresh dashboard data.**

## Chain of Trust Integration

**Validators must write to the registry, not progress files directly.**

```typescript
// Every validator MUST import and use:
import { reportValidationResult } from './lib/validation-registry';

// At end of validator:
reportValidationResult('validate-<name>-full', {
  passed: exitCode === 0,
  summary: { total, passed, failed },
  details: [...],
  duration: Date.now() - startTime
});
```

**Progress files are auto-generated:**
```bash
npm run validation:generate-progress  # Generates from registry
npm run validation:all                # Runs all validators + generates + refreshes dashboard
npm run validation:gates              # Checks all gates + refreshes dashboard
```

**Dashboard auto-refresh:** The PM Dashboard data (`dashboard-data.json`) is automatically regenerated after:
- `npm run validation:all`
- `npm run validation:gates`
- Any validation command (via PostToolUse hook)

## TDD Enforcement (v2.2.0)

**TDD is enforced at the tool level via Claude hooks (`.claude/hooks.json`).**

### TDD Gate Scripts

| Script | Purpose | Threshold |
|--------|---------|-----------|
| `check-red-phase.ts <module>` | Verify tests exist AND fail with assertions | Tests must FAIL |
| `check-unit-test-coverage.ts` | Jest line coverage | 90% minimum |
| `check-contract-test-coverage.ts` | API endpoint test coverage | 100% (all endpoints) |
| `check-integration-test-coverage.ts` | Cross-module dependency coverage | 100% or N/A (-1) |
| `commit-guard.ts` | Block commits when validation stale | Validation must be fresh |

### TDD Commands

```bash
# RED phase (before implementation)
npx ts-node scripts/validation/check-red-phase.ts <module>

# GREEN phase (after implementation)
npx ts-node scripts/validation/check-red-phase.ts <module> --green

# Coverage checks
npx ts-node scripts/validation/check-unit-test-coverage.ts
npx ts-node scripts/validation/check-contract-test-coverage.ts
npx ts-node scripts/validation/check-integration-test-coverage.ts

# Full TDD cycle
npm run tdd:cycle
```

### TDD Stats in Registry

The registry tracks TDD metrics in `stats.tdd`:

```json
{
  "stats": {
    "tdd": {
      "lastUpdated": "2025-12-06T18:20:34.530Z",
      "unit_tests": { "coverage_percent": 85.2, "passing": false },
      "contract_tests": { "total_endpoints": 209, "endpoints_with_tests": 0, "coverage_percent": 0, "passing": false },
      "integration_tests": { "cross_module_calls": 0, "calls_with_tests": 0, "coverage_percent": -1, "passing": false }
    }
  },
  "redPhaseVerified": {
    "bookmarks": { "verified": true, "timestamp": "2025-12-06T14:30:00.000Z", "gitCommit": "abc1234" }
  }
}
```

**Special value:** `coverage_percent: -1` means "N/A" (no cross-module dependencies to test). Display as "N/A", not "0%".

### TDD Workflow (Enforced by Hooks)

```
1. Write failing tests FIRST
2. Run: npx ts-node scripts/validation/check-red-phase.ts <module>
   → Registry records redPhaseVerified.<module> = true
3. NOW implementation is allowed (hooks check registry)
4. Run: npx ts-node scripts/validation/check-red-phase.ts <module> --green
5. Commit (commit-guard runs)
6. Push (phase gates run)
```

**Claude hooks block implementation writes until:**
1. Test file exists at correct location
2. RED phase is verified in registry

### TDD Documentation

- `handbook/monitoring/CLAUDE_HOOKS.md` - Hook configuration (v2.2.0)
- `handbook/monitoring/TDD_ENFORCEMENT_SETUP.md` - Setup guide
- `handbook/monitoring/VALIDATION_REGISTRY.md` - Registry schema (incl. stats.tdd)

## Trigger Keywords

- "run validations"
- "validate phase"
- "check compliance"
- "run the scripts"
- "validate my changes"
- "check if we're green"
- "run gate check"

## Validation Script Reference

### Phase 1: Stories & Business Rules

**Script:** `check-business-rules-coverage`
```bash
npx ts-node docs/test-plans/scripts/check-business-rules-coverage.ts
```

**What it checks:**
- Every US-xxx has at least one BR-xxx
- Every BR-xxx is referenced by at least one story
- No undefined BR-xxx references

**Output file:** `docs/test-plans/progress/STORY-RULES-STATUS.md`

---

### Phase 2: Contracts & Registry

**NEW: Phase 2 now includes naming validation gates.**

**Script 1:** `validate:naming` **(GATE)**
```bash
npm run validate:naming
```

**What it checks:**
- OpenAPI specs use `snake_case` for field names
- DTOs use `camelCase` for field names
- Consistent naming across the codebase

**Script 2:** `validate:openapi-dto` **(GATE)**
```bash
npm run validate:openapi-dto
```

**What it checks:**
- Every OpenAPI field has a corresponding DTO field
- Field mappings are consistent (snake_case ↔ camelCase)
- No missing or orphaned fields

**Script 3:** `openapi:bundle`
```bash
npm run openapi:bundle
```

**What it checks:**
- OpenAPI specs are valid YAML
- All $ref references resolve
- Bundled output is valid

**Script 4:** `endpoints:validate`
```bash
npm run endpoints:validate
```

**What it checks:**
- Controllers match OpenAPI contracts
- All endpoints have implementations
- Registry (ENDPOINTS.json) is in sync

**Script 5:** `validate-documentation-matrix`
```bash
npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts
```

**What it checks:**
- Every endpoint has story coverage
- Every endpoint has rule coverage
- No undefined endpoint references

**Output files:**
- `docs/test-plans/progress/ENDPOINT-MATRIX-STATUS.md`
- `docs/test-plans/progress/NAMING-VALIDATION-STATUS.md`

---

**Script 6:** `check-acceptance-coverage`
```bash
npx ts-node docs/test-plans/scripts/check-acceptance-coverage.ts
```

**What it checks:**
- [API] AC IDs from stories match contracts
- AC IDs in OpenAPI x-acceptance-criteria metadata
- Coverage between stories → contracts → specs

**Output file:** `docs/test-plans/progress/ACCEPTANCE-COVERAGE-STATUS.md`

---

### Phase 3: Backend Implementation

**Script 1:** `endpoints:validate`
```bash
npm run endpoints:validate
```

**What it checks:**
- All registered endpoints are implemented
- No unclassified endpoints
- Controller signatures match contracts

**Script 2:** `lint`
```bash
npm run lint
```

**Script 3:** `typecheck`
```bash
npm run typecheck
```

**Script 4:** `test`
```bash
npm test
```

**Output file:** `docs/test-plans/progress/ENDPOINT-REVIEW-STATUS.md`

---

### Phase 4: UX Specs

**Script 1:** `check-story-coverage`
```bash
npx ts-node scripts/check-story-coverage.ts
```

**What it checks:**
- Every US-xxx appears in at least one spec's `## Covered Stories`

**Script 2:** `check-endpoint-coverage` **(GATE)**
```bash
npx ts-node scripts/check-endpoint-coverage.ts
```

**What it checks:**
- Every endpoint in ENDPOINTS.json is exercised by at least one UX spec step
- **This is a PASS/FAIL GATE** - Phase 4 cannot complete until 100% coverage

**Why both story AND endpoint coverage:**
- Story coverage = business requirements are tested
- Endpoint coverage = ALL API surface area is validated
- A story can be "covered" while its endpoints remain untested

**Script 3:** `validate-ux-specs-against-contracts`
```bash
npx ts-node docs/test-plans/scripts/validate-ux-specs-against-contracts.ts
```

**What it checks:**
- Every endpoint in specs exists in ENDPOINTS.json
- Every body field in specs exists in DTOs/OpenAPI

**Output files:**
- `docs/test-plans/progress/UX-SPEC-COVERAGE.md` (story coverage)
- `docs/test-plans/progress/ENDPOINT-COVERAGE-STATUS.md` (endpoint coverage - GATE)

---

### Phase 5: Validation Scripts

**Script 1:** `check-spec-script-coverage` **(GATE - Phase 5c)**
```bash
npx ts-node scripts/check-spec-script-coverage.ts
```

**What it checks:**
- Every UX spec file has a matching validation script
- Every spec step has a corresponding API call in the script
- **This is a PASS/FAIL GATE** - Phase 5 cannot complete until 100% coverage

**Why spec-to-script coverage matters:**
- A script can "pass" (run without errors) while testing only a fraction of the spec
- Per RULEBOOK.md Rule 3: "Each spec has a single script that runs all its steps in order"
- Per RULEBOOK.md Rule 13: "Do not add steps not present in spec. Do not remove steps"
- Without this gate, validators can be green while not actually testing what specs define

**Script 2:** `run-all-with-logs` **(Phase 5b)**
```bash
./scripts/validation/run-all-with-logs.sh
```

**What it checks:**
- Validators execute spec steps against real backend
- All requests/responses are logged
- Backend behavior matches contract expectations

**Output files:**
- `docs/test-plans/progress/SPEC-SCRIPT-COVERAGE.md` (spec-to-script coverage - GATE)
- `docs/test-plans/progress/UX-VALIDATION-STATUS.md` (validators vs backend)

---

## Execution Workflow

When invoked, follow this process:

### 1. Run Comprehensive Gate Check First

**ALWAYS start with:**
```bash
npm run validation:gates
```

This gives you the complete picture of all phase gates (1-5) in one command.

### 2. Analyze Results from Dashboard

Read `scripts/dashboard/dashboard-data.json` for:
- `all_phase_gates.phases[]` - Status of each phase
- `blockers[]` - What's blocking progress
- `validation_health` - Staleness and never-run validators

### 3. Fix Lowest Failing Phase First

**CRITICAL:** Work on phases in order. Don't skip ahead.

```
If Phase 1 fails → Fix Phase 1 issues
If Phase 2 fails → Fix Phase 2 issues (including naming validation)
If Phase 3 fails → Fix Phase 3 issues
...
```

### 4. Re-run Validation

After fixes:
```bash
npm run validation:gates
```

### 5. Report Results

```markdown
## Validation Results

**All Gates Passed:** [Yes/No]

| Phase | Status | Blockers |
|-------|--------|----------|
| Phase 1 | ✅ PASS | - |
| Phase 2 | ❌ FAIL | naming-conventions |
| Phase 3 | ⏳ SKIP | Blocked by Phase 2 |

### Recommended Actions

1. [Specific fix with file path]
2. [Specific fix with file path]
```

## Validation Dependencies

Some validations depend on others:

```
Phase 1: check-business-rules-coverage
    ↓
Phase 2: validate:naming [GATE] → validate:openapi-dto [GATE] → openapi:bundle → endpoints:validate → validate-documentation-matrix
    ↓
Phase 3: endpoints:validate → lint → typecheck → test
    ↓
Phase 4: check-story-coverage → check-endpoint-coverage [GATE] → validate-ux-specs-against-contracts
    ↓
Phase 5: check-spec-script-coverage [GATE] → run-all-with-logs
```

**Gate Rules:**
- Phase 2 GATE: `validate:naming` and `validate:openapi-dto` must pass
- Phase 4 GATE: `check-endpoint-coverage` must show 100% before Phase 5
- Phase 5 GATE: `check-spec-script-coverage` must show 100% before Phase 6

**Rule:** If an upstream validation fails, downstream validations may be skipped or will likely fail.

## Common Validation Failures

### "Naming convention violation" (Phase 2 - NEW)
- **Fix:** OpenAPI should use `snake_case`, DTOs should use `camelCase`
- **File:** `openapi/paths/*.yaml` or `src/modules/*/dto/*.ts`

### "OpenAPI-DTO field mismatch" (Phase 2 - NEW)
- **Fix:** Ensure every OpenAPI field has a DTO counterpart
- **Check:** `npm run validate:openapi-dto` for specific mismatches

### "Stories missing Business Rules"
- **Fix:** Add BR-xxx references to stories or create new rules
- **File:** `docs/business-rules/*.md`

### "Endpoints NOT covered by User Story"
- **Fix:** Add endpoint to story's `**API Endpoints**` section
- **File:** `docs/user-stories/*.md`

### "Unclassified endpoints"
- **Fix:** Follow Phase 3.5 retroactive documentation
- **Action:** Create OpenAPI spec + add to user story

### "Endpoint not found in registry"
- **Fix:** Either implement the endpoint or fix the spec's path
- **Check:** `npm run show:endpoint -- 'METHOD /path'`

### "Spec body has unknown fields"
- **Fix:** Align spec JSON with DTO field names
- **Check:** Read the DTO file for exact field names

## Integration with Failure Recovery

When validations fail:
1. Capture the specific failure message
2. Identify the phase and artifact type
3. Invoke `failure-recovery` skill with context
4. Re-run validation after fix

## Chain of Trust Documentation

For complete details on the validation system, see:
- `handbook/monitoring/README.md` - System overview
- `handbook/monitoring/CHAIN_OF_TRUST.md` - Philosophy and architecture
- `handbook/monitoring/VALIDATION_REGISTRY.md` - Registry mechanics
- `handbook/monitoring/PHASE_GATES.md` - Gate rules and requirements

## Critical Rules

1. **Never modify specs to pass validation** - Fix the underlying issue
2. **Never manually edit progress files** - They are auto-generated from registry
3. **Validators must call reportValidationResult()** - This is what populates the registry
4. **Run in order** - Respect dependencies
5. **Report honestly** - No hiding failures
6. **Use npm run validation:gates** - This is the comprehensive check
7. **Fix lowest phase first** - Foundation before building
