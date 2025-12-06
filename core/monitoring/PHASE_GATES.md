# Phase Gates – Automated Phase Completion Checks

> **Purpose:** Phase gates prevent agents from claiming phases complete without evidence.

---

## What Are Phase Gates?

Phase gates are automated checks that determine if a playbook phase is truly complete.

**Traditional workflow:**
```
Agent: "Phase 4 is complete!"
PM: "Great, moving to Phase 5."
```

**Problem:** Agent might be wrong, PM has no way to verify.

**Phase gate workflow:**
```
Agent: "Phase 4 is complete!"
System: [checks gate] "Phase 4 BLOCKED: 3 validators not passing"
PM: "Fix the blockers first."
```

**Benefit:** PM knows the real status, not just agent's claim.

---

## How Phase Gates Work

### 1. Gate Definition (in Registry)

Each phase has a gate definition in `validation-registry.json`:

```json
{
  "phaseGates": {
    "phase4": {
      "requiredValidators": ["auth", "onboarding", "channels", "chat-core"],
      "requiredPassRate": 1.0,
      "description": "All UX validation scripts must pass"
    }
  }
}
```

**Fields:**
- `requiredValidators`: List of validators that must pass for this phase
- `requiredPassRate`: Fraction of validators that must pass (1.0 = 100%)
- `description`: Human-readable description

### 2. Gate Checking (Automated)

Command: `npm run validation:gates`

**What it does:**
1. Reads registry to get phase gate definitions
2. For each gate, checks required validators
3. Reports which validators are:
   - Passing (all tests passed, recent run)
   - Missing (never run)
   - Failed (ran but tests failed)
   - Stale (ran on old commit)
4. Determines if gate is PASSED or BLOCKED

**Output example:**

```
Phase 4 gate: BLOCKED
Required validators: [auth, onboarding, channels, chat-core, files, collaboration, admin, user-management, direct-messaging, multi-chat, advanced-features]
Passed validators: [auth, onboarding, channels]
Missing validators: [chat-core, files, collaboration, admin, user-management, direct-messaging, multi-chat, advanced-features]
Failed validators: []
Stale validators: []

Phase 4 is BLOCKED until all required validators pass.
```

### 3. Gate Enforcement

**Phase gates block:**
- Claims of phase completion
- PR merges (in CI/CD)
- Progression to next phase

**Phase gates do NOT block:**
- Individual commits (that's Claude hooks)
- Running validators
- Documentation updates

---

## Current Phase Gates

### Phase 1: User Stories & Business Rules

**Gate:** `phase1`

**Required validators:** None (intentionally manual evidence checks)

**Why manual?**
Phase 1 involves human-authored requirements (user stories, business rules). These cannot be automatically validated for correctness—only for structure and coverage.

**Completion criteria:**
- Run: `npx ts-node docs/test-plans/scripts/check-business-rules-coverage.ts`
- Ensure: No stories without rules, no undefined rules
- Verify: Each story has acceptance criteria
- Verify: Business rules are linked bidirectionally to stories

**Evidence files:**
- `docs/user-stories/*.md` - User story definitions
- `docs/business-rules/*.md` - Business rule definitions

**Manual check:** PM reviews output and story/rule quality, approves phase completion

**Commands to run:**
```bash
# Check business rules coverage
npx ts-node docs/test-plans/scripts/check-business-rules-coverage.ts

# Verify story-rule cross-references
npx ts-node docs/test-plans/scripts/check-story-rule-linkage.ts
```

### Phase 2: Endpoint Contracts & Registry

**Gate:** `phase2`

**Required validators:** None (static schema validation, not runtime tests)

**Why manual?**
Phase 2 involves contract definitions (OpenAPI specs, DTOs). These are validated structurally but require human review for semantic correctness.

**Completion criteria:**
- Run: `npm run endpoints:validate`
- Run: `npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts`
- Ensure: No undefined endpoints, all endpoints covered by stories/rules
- Verify: OpenAPI specs match DTO definitions

**Evidence files:**
- `architecture/ENDPOINTS.json` - Generated endpoint registry
- `architecture/ENDPOINTS.md` - Human-readable endpoint docs
- `openapi/paths/*.yaml` - OpenAPI path definitions
- `openapi/schemas/*.yaml` - OpenAPI schema definitions

**Manual check:** PM reviews output and contract completeness, approves phase completion

**Commands to run:**
```bash
# Validate and regenerate endpoint registry
npm run endpoints:validate

# Check documentation matrix
npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts

# Bundle OpenAPI specs
npm run openapi:bundle
```

### Phase 3: Backend Implementation (TDD Enforced)

**Gate:** `phase3`

**Sub-phase Gates:**
- Phase 3.1: `npm run check:contract-coverage` (100% contract test coverage)
- Phase 3.2: `npm run check:red-phase -- {module}` (tests must fail initially for NEW modules)
- Phase 3.3: `npm run check:unit-coverage` (≥90% coverage all metrics)
- Phase 3.4: `npm run check:integration-coverage` (cross-module tests)

**RED Phase (3.2) Failure Type Requirements:**

Tests must fail with **assertion errors** to satisfy RED phase. Other failure types are rejected:

| Failure Type | Satisfies RED? | Example |
|--------------|----------------|---------|
| Assertion errors | ✅ YES | `expect(result).toBe(expected)` fails |
| Import/module errors | ❌ NO | `Cannot find module './bookmarks.service'` |
| Syntax errors | ❌ NO | `SyntaxError: Unexpected token` |
| Runtime/setup errors | ❌ NO | `TypeError: Cannot read property of undefined` |
| Unknown errors | ❌ NO | Unrecognized failure pattern |

**Why assertion failures only?**
- Ensures tests actually test the intended behavior
- Prevents "tests fail but for wrong reasons"
- Validates test structure before implementation

**Commands:**
```bash
# Check RED phase (tests should FAIL with assertion errors)
npx ts-node scripts/validation/check-red-phase.ts <module>

# Check GREEN phase (tests should PASS after implementation)
npx ts-node scripts/validation/check-red-phase.ts <module> --green

# Force re-run (ignores cache)
npx ts-node scripts/validation/check-red-phase.ts <module> --force
```

**Full TDD Cycle:**
- Run: `npm run tdd:cycle` (contract → unit → integration → validation)

**Completion criteria:**
- Run: `npm run endpoints:validate` (no missing endpoints)
- Run: `npm run test:gates` (all TDD gates pass)
- Ensure: 90% coverage, 100% contract coverage, integration tests for cross-module calls

**Evidence Files:**
- `docs/test-plans/progress/UNIT-TEST-COVERAGE.md` (≥90%)
- `docs/test-plans/progress/CONTRACT-TEST-STATUS.md` (100%)
- `docs/test-plans/progress/INTEGRATION-TEST-STATUS.md`

### Phase 4: UX Validation Specs

**Gate:** `phase4`

**Required validators:**
```json
[
  "auth",
  "onboarding",
  "channels",
  "chat-core",
  "files",
  "collaboration",
  "admin",
  "user-management",
  "direct-messaging",
  "multi-chat",
  "advanced-features"
]
```

**Required pass rate:** 100% (all must pass)

**Completion criteria:**
- Run: `npm run validation:all`
- Ensure: All validators pass
- Check: `npm run validation:gates` shows Phase 4 PASSED

**Automated check:** System computes gate status from registry

### Phase 5: UX Validation Scripts & Logs

**Gate:** `phase5` (same as phase4)

**Required validators:** Same as Phase 4

**Additional requirements:**
- All validators must generate logs in `scripts/validation/logs/`
- Logs must show full request/response for every step

**Completion criteria:**
- Same as Phase 4
- Plus: Manual review of log files for completeness

---

## Checking Gate Status

### Command

```bash
npm run validation:gates
```

**What it does:**
- Reads `validation-registry.json`
- Checks each phase gate
- Reports status for each

**Output:**

```
=== Phase Gate Status ===

Phase 1 (User Stories & Business Rules): MANUAL CHECK REQUIRED
  - Run: npx ts-node docs/test-plans/scripts/check-business-rules-coverage.ts

Phase 2 (Endpoint Contracts): MANUAL CHECK REQUIRED
  - Run: npm run endpoints:validate
  - Run: npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts

Phase 3 (Backend Implementation): MANUAL CHECK REQUIRED
  - Run: npm run endpoints:validate
  - Run: npm test

Phase 4 (UX Validation Specs): BLOCKED
  Required validators: 11
  Passed: 3 (auth, onboarding, channels)
  Missing: 5 (chat-core, files, collaboration, admin, user-management)
  Failed: 0
  Stale: 3 (direct-messaging, multi-chat, advanced-features)

Phase 5 (UX Validation Scripts & Logs): BLOCKED (same as Phase 4)

=== Summary ===
Automated gates: 1 blocked, 0 passed
Manual checks: 3 required
```

**Interpretation:**
- Phases 1-3: Require manual PM review of script outputs
- Phase 4: Blocked because only 3/11 validators passing
- Phase 5: Same status as Phase 4

---

## Fixing Blocked Gates

### Process

**Step 1: Identify blockers**

```bash
npm run validation:gates
```

**Output shows:**
- Missing validators (never run)
- Failed validators (ran but failed)
- Stale validators (ran on old commit)

**Step 2: Fix each blocker type**

**For missing validators:**

```bash
# Run the missing validator
npm run validation:chat-core

# Check if it passes
# If it fails, fix the code and re-run
```

**For failed validators:**

```bash
# Check the log file for failures
cat scripts/validation/logs/channels-*.log

# Find the failing test
# Fix the code or spec (per RULEBOOK.md)
# Re-run validator
npm run validation:channels
```

**For stale validators:**

```bash
# Re-run the validator on current commit
npm run validation:direct-messaging

# Results will be recorded with current git commit hash
# Validator will no longer be stale
```

**Step 3: Verify gate is unblocked**

```bash
npm run validation:gates
```

**Expected output:**

```
Phase 4 (UX Validation Specs): PASSED
  Required validators: 11
  Passed: 11
  Missing: 0
  Failed: 0
  Stale: 0
```

---

## TDD Gate Failure Handling (Phase 3)

### 3.1 Contract Test Coverage Failures

**Script:** `npm run check:contract-coverage`

- **If endpoints lack contract tests:**
  - For each uncovered endpoint in ENDPOINTS.json:
    - Create `test/contracts/dto/{module}.dto.spec.ts` with DTO validation tests
    - Create `test/contracts/{module}.contract.spec.ts` with OpenAPI compliance tests
    - Test all validation decorators (@IsString, @IsUUID, etc.)
    - Test required vs optional fields
  - Rerun until 100% endpoint coverage

### 3.2 RED Phase Failures

**Script:** `npm run check:red-phase -- {moduleName}`

- **If no test files exist:**
  - Create `src/modules/{module}/services/__tests__/{service}.spec.ts`
  - Create `src/modules/{module}/controllers/__tests__/{controller}.spec.ts`
  - Tests MUST assert expected behavior that doesn't exist yet
  - Rerun - tests should FAIL (that's the goal!)

- **If tests pass when they should fail:**
  - Tests are not testing meaningful behavior
  - Rewrite tests to assert the expected outcomes
  - Do NOT add implementation yet - tests must fail first
  - Once tests fail, RED phase is verified (recorded in registry)

### 3.3 Unit Coverage Failures

**Script:** `npm run check:unit-coverage`

- **If coverage below 90%:**
  - Check coverage report: `npm test -- --coverage`
  - Identify uncovered files/lines in report
  - Add tests for uncovered paths:
    - Create `__tests__/*.spec.ts` for each uncovered service/controller
    - Write tests for all public methods
    - Mock dependencies properly
  - Rerun until ≥90% coverage on all metrics (branches, functions, lines, statements)

### 3.4 Integration Test Failures

**Script:** `npm run check:integration-coverage`

- **If cross-module calls lack tests:**
  - Check output for detected interactions without tests
  - For each gap:
    - Create `test/integration/{feature}.integration.spec.ts`
    - Test actual service interactions (mocked DB)
    - Verify event emissions if applicable
    - Test transaction boundaries
  - Optionally add to `test/integration/integration-manifest.json` for explicit tracking
  - Rerun until all cross-module calls covered

---

## Agent Protocol for Claiming Phase Complete

**Traditional (wrong):**

```
Agent: "I finished implementing all the features. Phase 3 is complete!"
PM: "Are you sure all endpoints are implemented?"
Agent: "Yes, I implemented everything in the stories."
PM: [has to manually verify, takes hours]
```

**Chain of Trust (correct):**

```
Agent: "I finished implementing all the features. Checking phase gate..."
[runs: npm run validation:gates]
System: "Phase 3 gate: All endpoints implemented ✅"
Agent: "Phase 3 gate shows green. All required checks pass."
PM: [checks dashboard, sees same green status, approves in seconds]
```

**Required steps:**

1. **Run the gate check:**
   ```bash
   npm run validation:gates
   ```

2. **If blocked, fix blockers:**
   - Run missing validators
   - Fix failed validators
   - Re-run stale validators

3. **Verify gate passes:**
   ```bash
   npm run validation:gates
   # Must show: Phase X: PASSED
   ```

4. **Report to PM with evidence:**
   ```
   "Phase 4 complete. Gate check shows:
   - All 11 validators passing
   - No missing/failed/stale validators
   - See: npm run validation:gates output
   - See: PM dashboard for real-time status"
   ```

**PM verification:**
- Runs same command: `npm run validation:gates`
- Checks PM dashboard
- Sees same green status
- Approves phase completion

**No trust required. Evidence is in the registry.**

---

## Common Blocker Scenarios

### Scenario 1: "I thought I ran all validators"

**Problem:**

```
Phase 4 gate: BLOCKED
Missing validators: [files, collaboration, admin]
```

**Cause:** Agent ran some validators but not all

**Solution:**

```bash
# Run the missing validators
npm run validation:files
npm run validation:collaboration
npm run validation:admin

# Or run all at once
npm run validation:all
```

**Prevention:** Always use `npm run validation:all` before claiming phase complete

### Scenario 2: "Validator failed but I thought it was not critical"

**Problem:**

```
Phase 4 gate: BLOCKED
Failed validators: [channels]
```

**Cause:** Agent decided failure was "minor" and ignored it

**Solution:**

```bash
# Check the failure
cat scripts/validation/logs/channels-*.log

# Fix the code that caused failure
# Re-run validator
npm run validation:channels
```

**Rule:** ALL validators must pass. No exceptions. Phase gate enforces 100% pass rate.

### Scenario 3: "Validator passed yesterday, why is it stale?"

**Problem:**

```
Phase 4 gate: BLOCKED
Stale validators: [auth, onboarding]
```

**Cause:** Code changed (new git commit) since validator last ran

**Solution:**

```bash
# Re-run stale validators on current code
npm run validation:auth
npm run validation:onboarding

# Results will be recorded with current commit hash
```

**Reason:** Phase gate requires fresh results. Old results don't prove current code works.

### Scenario 4: "Phase gate says MANUAL CHECK REQUIRED"

**Problem:**

```
Phase 2 gate: MANUAL CHECK REQUIRED
  - Run: npm run endpoints:validate
```

**Cause:** Phase 2 doesn't have automated gate yet (manual PM review)

**Solution:**

```bash
# Run the required commands
npm run endpoints:validate
npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts

# Review output
# If all pass, report to PM for approval
```

**When automated gate exists:** Will check registry, not require manual review

---

## Phase Gate Logic Detail

### Gate Checking Algorithm

**Pseudocode:**

```python
def check_phase_gate(phase: str) -> GateResult:
  # 1. Get gate definition
  gate = registry.phaseGates[phase]
  if not gate:
    return { passed: false, error: "Gate not defined" }

  # 2. Initialize result buckets
  missing = []
  failed = []
  stale = []
  passed = []

  # 3. Check each required validator
  for validator_name in gate.requiredValidators:
    status = registry.validators[validator_name]

    # Never run
    if status.lastRun is None:
      missing.append(validator_name)
      continue

    # Ran but failed
    if status.passed is False:
      failed.append(validator_name)
      continue

    # Ran on old commit
    current_commit = get_current_git_commit()
    if status.gitCommit != current_commit:
      stale.append(validator_name)
      continue

    # Passed all checks
    passed.append(validator_name)

  # 4. Compute pass rate
  total_required = len(gate.requiredValidators)
  total_passed = len(passed)
  pass_rate = total_passed / total_required if total_required > 0 else 0

  # 5. Determine if gate passed
  gate_passed = pass_rate >= gate.requiredPassRate

  return {
    passed: gate_passed,
    requiredValidators: gate.requiredValidators,
    missingValidators: missing,
    failedValidators: failed,
    staleValidators: stale,
    passedValidators: passed,
    passRate: pass_rate
  }
```

**Key points:**
- Validator must have run (not null `lastRun`)
- Validator must have passed (not false `passed`)
- Validator must be fresh (current `gitCommit`)
- All three conditions must be true for validator to count as "passed"

### Staleness Detection

**A validator is stale if:**

```python
status.gitCommit != current_git_commit
```

**Why this matters:**

```
Scenario:
1. Agent runs validator on commit abc123 → passes
2. Agent makes code changes → new commit def456
3. Agent claims phase complete
4. Gate check: validator gitCommit is abc123, current commit is def456
5. Result: Validator is STALE, gate is BLOCKED
```

**Solution:** Re-run validator on current code

**Future enhancement:** Time-based staleness (results older than 24 hours)

---

## Integration with Other Components

### Phase Gates ↔ Registry

**Gate reads from registry:**
- Validator status (passed, lastRun, gitCommit)
- Phase gate definitions (requiredValidators, requiredPassRate)

**Gate does NOT write to registry:**
- Registry is updated by validators only
- Gate is read-only consumer of registry data

### Phase Gates ↔ Validators

**Validators update registry:**
- `reportValidationResult()` writes status to registry

**Phase gates check registry:**
- `checkPhaseGate()` reads validator status from registry

**Connection:**
- Validators provide the evidence
- Phase gates interpret the evidence

### Phase Gates ↔ Claude Hooks

**Hooks enforce immediate requirement:**
- "Run validation before commit"

**Phase gates enforce long-term requirement:**
- "Pass all validations before phase complete"

**Connection:**
- Hook is pre-commit enforcement
- Phase gate is pre-phase-completion enforcement
- Both read from same evidence source (registry)

### Phase Gates ↔ Dashboard

**Dashboard shows gate status:**
- Reads registry
- Calls `checkPhaseGate()` for each phase
- Displays passed/blocked status

**PM uses dashboard to:**
- See which phases are blocked
- Identify missing/failed/stale validators
- Make phase approval decisions

**Connection:**
- Phase gates compute status
- Dashboard visualizes status
- PM acts on status

---

## Adding New Phase Gates

### Process

**Step 1: Define validators for the phase**

Identify which validation scripts must pass for this phase.

**Example:** Phase 6 (Frontend Endpoint Maps)

Required validators:
- All Phase 4/5 validators (backend must be validated)
- New: `endpoint-map-coverage` (checks all endpoints are mapped)

**Step 2: Add gate definition to registry**

Edit `validation-registry.json`:

```json
{
  "phaseGates": {
    "phase6": {
      "requiredValidators": [
        "auth",
        "onboarding",
        "channels",
        "chat-core",
        "files",
        "collaboration",
        "admin",
        "user-management",
        "direct-messaging",
        "multi-chat",
        "advanced-features",
        "endpoint-map-coverage"
      ],
      "requiredPassRate": 1.0,
      "description": "All backend validators + endpoint map coverage"
    }
  }
}
```

**Step 3: Update gate check script**

Ensure `npm run validation:gates` includes the new phase.

**Step 4: Document in handbook**

Update this file (PHASE_GATES.md) with the new gate.

---

## Future Enhancements

### Time-Based Staleness

**Current:** Stale if git commit differs

**Future:** Stale if older than 24 hours (configurable)

**Benefit:** Catches cases where code hasn't changed but behavior might have (external dependencies, DB state)

### Partial Pass Rates

**Current:** Most gates require 100% pass rate

**Future:** Some gates allow partial pass (e.g., 80% of validators)

**Use case:** Phase 7 (UI) might allow frontend to progress if 80% of backend validators pass

### CI/CD Integration

**Current:** Gates are run manually

**Future:** CI/CD runs gate checks on every PR

**Benefit:**
- PR cannot merge if phase gate blocked
- Automated enforcement in CI
- PM doesn't have to manually check

### Gate Override Mechanism

**Current:** No override, all validators must pass

**Future:** PM can override gate with explicit approval + reason

**Use case:** Known bug marked as FUTURE, PM approves proceeding anyway

**Audit trail:** Override recorded in registry with PM signature + timestamp

---

## Summary

**Phase gates prevent agents from claiming phases complete without evidence.**

**How they work:**
1. Each phase defines required validators
2. Gate checks if all required validators have passed
3. Gate considers validators missing, failed, or stale as blockers
4. Gate reports pass/blocked status

**Agent protocol:**
1. Run `npm run validation:gates` before claiming phase complete
2. Fix any blockers (missing/failed/stale validators)
3. Re-run gate check until passed
4. Report to PM with evidence (gate check output)

**PM verification:**
1. Run same command: `npm run validation:gates`
2. Check PM dashboard
3. Verify same status as agent claims
4. Approve or reject based on evidence

**Benefits:**
- No trust required (evidence in registry)
- No ambiguity (gate passed or blocked, not "mostly done")
- No surprises (PM sees same status as agent)
- No skipping (cannot claim complete without passing gate)

**Phase gates are non-negotiable. They're how the project knows phases are truly complete.**
