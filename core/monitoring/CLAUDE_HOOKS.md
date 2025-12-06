# Claude Hooks – TDD Enforcement & Pre-Commit Validation

> **Version:** 2.2.0 (2025-12-06)
>
> **Critical:** This project uses Claude Code hooks to enforce TDD workflow and block commits when validation fails.

---

## What Are Claude Hooks?

Claude Code hooks are event-driven automation that runs at specific points in agent workflows.

**Hook types:**
- `PreToolUse`: Runs before a tool is invoked (e.g., before running Bash, before writing files)
- `PostToolUse`: Runs after a tool completes
- `SessionStart`: Runs when Claude session starts
- `Stop`: Runs when agent is stopped

**This project uses:**
- `PreToolUse` on **Write** to enforce TDD (test-first development)
- `PreToolUse` on **Bash** to gate git commits and pushes
- `PostToolUse` on **Bash** to analyze validation results

---

## Hook Configuration Overview

**File:** `.claude/hooks.json`

### Hook 1: TDD Compliance Check (Write Tool)

**Purpose:** Ensures tests exist AND RED phase is verified before implementation code can be written.

**Triggers on:** Any file write to enforced paths

**Enforced patterns:**
- `src/modules/*/services/*.service.ts` - Unit tests required
- `src/modules/*/controllers/*.controller.ts` - Integration tests required
- `src/modules/*/guards/*.guard.ts` - Unit tests required
- `src/modules/*/interceptors/*.interceptor.ts` - Unit tests required
- `src/modules/*/pipes/*.pipe.ts` - Unit tests required
- `src/modules/*/filters/*.filter.ts` - Unit tests required
- `src/modules/*/middleware/*.middleware.ts` - Unit tests required
- `src/common/**/*.ts` (excluding index/interface/types/constants)

**Excluded patterns (always approved):**
- `*.dto.ts`, `*.model.ts`, `*.module.ts` - Tested via contract/integration
- `*.spec.ts`, `*.test.ts` - Test files themselves
- `index.ts`, `*.interface.ts`, `*.types.ts`, `*.constants.ts` - No logic
- `scripts/**/*.ts`, `test/**/*.ts` - Meta-tooling exempt
- `docs/**/*`, `*.md`, `*.json`, `*.yaml`, `*.html`, `*.css`, `*.js`

**Decision logic for NEW files:**
1. Check if test file exists at correct location
2. If NO test: **DENY** with "TDD VIOLATION: Write test first"
3. If test exists, check RED phase verification in registry
4. If RED phase NOT verified: **DENY** with "Run check-red-phase.ts first"
5. If test exists AND RED phase verified: **APPROVE**

**For existing (legacy) files:** APPROVE with warning to add tests

### Hook 2: Git Commit Gate (Bash Tool)

**Purpose:** Runs commit-guard before allowing `git commit`.

**Triggers on:** `git commit` commands (not git status/diff/log/add)

**Action:**
1. Runs `npx ts-node scripts/validation/commit-guard.ts`
2. If exit code 1: **DENY** with blockers
3. If exit code 0: **APPROVE**

### Hook 3: Git Push Gate (Bash Tool)

**Purpose:** Runs full phase gates before allowing `git push`.

**Triggers on:** `git push` commands

**Action:**
1. Runs `npx ts-node scripts/validation/check-all-phase-gates.ts`
2. If any gate fails: **DENY** with blockers
3. If all gates pass: **APPROVE**

### Hook 4: Validation Result Analysis (PostToolUse)

**Purpose:** Summarizes validation results and updates dashboard.

**Triggers after:** Any validation command completes

**Action:**
1. Parses output for pass/fail
2. If failed: Summarizes blockers
3. Runs `npm run dashboard:update` to refresh data

---

## TDD Workflow Enforcement

### The RED-GREEN-REFACTOR Cycle

Hooks enforce strict TDD sequence:

```
1. RED PHASE:
   - Write failing tests FIRST
   - Tests must fail with ASSERTION errors (not import/syntax)
   - Run: npx ts-node scripts/validation/check-red-phase.ts <module>
   - Registry records RED phase verification

2. GREEN PHASE:
   - Write implementation to make tests pass
   - Hooks now ALLOW writes (RED phase verified)
   - Run: npx ts-node scripts/validation/check-red-phase.ts <module> --green
   - Tests should now PASS

3. REFACTOR PHASE:
   - Clean up code while keeping tests green
   - Run full TDD cycle: npm run tdd:cycle
   - Commit when ready
```

### RED Phase Verification

**What satisfies RED phase:**
- Tests exist for the module
- Tests FAIL with **assertion errors** (expect(), toBe(), etc.)

**What does NOT satisfy RED phase:**
- Tests that PASS (no failures = no RED phase)
- Tests that fail with import/module errors
- Tests that fail with syntax errors
- Tests that fail with unknown/runtime errors

**Why this matters:**
- Ensures tests actually test the right thing
- Prevents "green tests" that pass accidentally
- Forces deliberate test-before-code workflow

### Example TDD Workflow

```bash
# 1. Create new module
mkdir -p src/modules/bookmarks/services/__tests__

# 2. Write failing test FIRST
Write: src/modules/bookmarks/services/__tests__/bookmarks.service.spec.ts

# 3. Run RED phase check
npx ts-node scripts/validation/check-red-phase.ts bookmarks
# Output: ✅ RED phase satisfied (tests fail with assertion errors)
# Registry updated: redPhaseVerified.bookmarks = true

# 4. NOW write implementation (hooks will allow it)
Write: src/modules/bookmarks/services/bookmarks.service.ts
# Hook checks:
#   - Test exists? ✅
#   - RED phase verified? ✅
#   - APPROVE

# 5. Run GREEN phase check
npx ts-node scripts/validation/check-red-phase.ts bookmarks --green
# Output: ✅ GREEN phase satisfied (tests pass)

# 6. Commit
git commit -m "feat: Add bookmarks service"
# Commit-guard runs, checks validations, APPROVE
```

---

## What Gets Blocked

### Blocked: Implementation Before Tests

```
Agent:
1. Write src/modules/bookmarks/services/bookmarks.service.ts (NEW file)

Hook:
❌ DENIED: TDD VIOLATION: Write test first at
   src/modules/bookmarks/services/__tests__/bookmarks.service.spec.ts
```

### Blocked: Implementation Before RED Phase

```
Agent:
1. Write src/modules/bookmarks/services/__tests__/bookmarks.service.spec.ts
2. Write src/modules/bookmarks/services/bookmarks.service.ts

Hook:
❌ DENIED: TDD VIOLATION: RED phase not verified.
   Run first: npx ts-node scripts/validation/check-red-phase.ts bookmarks
```

### Blocked: Commit Without Validation

```
Agent:
1. Edit src/modules/channels/controllers/channels.controller.ts
2. git commit -m "Fix channels bug"

Hook (commit-guard):
❌ DENIED: Run validation commands first
   Blockers: [modified files without validation]
```

### Blocked: Push Without Phase Gates

```
Agent:
1. git push

Hook (phase gates):
❌ DENIED: Phase gate failures
   Blockers: [contract-test-coverage: 0%, integration-test-coverage: N/A]
```

### Allowed: Tests Written First, RED Verified

```
Agent:
1. Write src/modules/bookmarks/services/__tests__/bookmarks.service.spec.ts
2. npx ts-node scripts/validation/check-red-phase.ts bookmarks
   ✅ RED phase satisfied
3. Write src/modules/bookmarks/services/bookmarks.service.ts
   ✅ APPROVED (test exists, RED phase verified)
```

### Allowed: Legacy Code (Existing Files)

```
Agent:
1. Edit src/modules/auth/services/auth.service.ts (EXISTS in git)

Hook:
✅ APPROVED with warning:
   TDD WARNING: Legacy service without tests - consider adding tests
```

---

## Registry Integration

### TDD Stats

The validation registry tracks TDD metrics in `stats.tdd`:

```json
{
  "stats": {
    "tdd": {
      "lastUpdated": "2025-12-06T18:20:34.530Z",
      "unit_tests": {
        "coverage_percent": 85.2,
        "passing": false
      },
      "contract_tests": {
        "total_endpoints": 209,
        "endpoints_with_tests": 0,
        "coverage_percent": 0,
        "passing": false
      },
      "integration_tests": {
        "cross_module_calls": 0,
        "calls_with_tests": 0,
        "coverage_percent": -1,
        "passing": false
      }
    }
  }
}
```

**Note:** `coverage_percent: -1` means "N/A" (nothing to test)

### RED Phase Tracking

The registry records which modules have passed RED phase:

```json
{
  "redPhaseVerified": {
    "bookmarks": {
      "verified": true,
      "timestamp": "2025-12-06T14:30:00.000Z",
      "gitCommit": "abc1234"
    }
  }
}
```

Hooks check this before allowing implementation writes.

---

## Commands Reference

### TDD Commands

```bash
# Check RED phase for a module
npx ts-node scripts/validation/check-red-phase.ts <module>

# Check GREEN phase (after implementation)
npx ts-node scripts/validation/check-red-phase.ts <module> --green

# Force re-run RED phase check
npx ts-node scripts/validation/check-red-phase.ts <module> --force

# Run full TDD cycle (all tests + gates)
npm run tdd:cycle
```

### Coverage Commands

```bash
# Check contract test coverage
npx ts-node scripts/validation/check-contract-test-coverage.ts

# Check integration test coverage
npx ts-node scripts/validation/check-integration-test-coverage.ts

# Check unit test coverage (90% threshold)
npx ts-node scripts/validation/check-unit-test-coverage.ts
```

### Gate Commands

```bash
# Run commit guard
npx ts-node scripts/validation/commit-guard.ts

# Run all phase gates
npx ts-node scripts/validation/check-all-phase-gates.ts

# Update dashboard data
npm run dashboard:update
```

---

## What NOT to Do

### ❌ DO NOT bypass hooks with --no-verify

```bash
# FORBIDDEN
git commit --no-verify -m "Skip validation"
```

**Why:** Defeats the Chain of Trust system. PM can audit commits.

### ❌ DO NOT edit hooks.json to weaken enforcement

**Why:** Git history shows the edit. Hook changes are noticed.

### ❌ DO NOT write implementation before tests

**Why:** Hooks will DENY the write. This is by design.

### ❌ DO NOT fake RED phase verification

**Why:** Registry shows actual timestamps. Validators verify test behavior.

### ❌ DO NOT argue with the hook

**Wrong response:** "This change is too small to need TDD"

**Right response:** Write the test first, run check-red-phase, then implement.

---

## Hook Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.2.0 | 2025-12-06 | RED phase now BLOCKS (was warning). Full TDD enforcement. |
| 2.1.0 | 2025-12-06 | Added RED phase verification check. Warns if not verified. |
| 2.0.0 | 2025-12-06 | Expanded coverage to guards, interceptors, pipes, filters, middleware, common utilities. |
| 1.0.0 | 2025-12-06 | Initial TDD enforcement for services and controllers. |

---

## Summary

**Claude hooks enforce TDD at the tool level:**

1. **Write hook:** Blocks implementation until tests exist AND RED phase is verified
2. **Bash hook (commit):** Runs commit-guard before allowing commits
3. **Bash hook (push):** Runs full phase gates before allowing pushes
4. **PostToolUse hook:** Summarizes validation results

**The TDD sequence is non-negotiable:**
1. Write failing tests (RED)
2. Run check-red-phase.ts to verify
3. Write implementation (hooks now allow it)
4. Run tests until they pass (GREEN)
5. Refactor while keeping tests green
6. Commit (commit-guard runs)
7. Push (phase gates run)

**When blocked:** Write tests first, run RED phase check, then proceed.

The system is designed to enforce test-first development. Work with it.
