# Validation Registry – Single Source of Truth

> **Location:** `scripts/validation/validation-registry.json`
> **Purpose:** Single source of truth for all validation results

---

## Overview

The validation registry is a JSON file that stores the status of every validation script in the project.

**Key properties:**
- **Single source of truth:** All validation status lives here
- **Machine-readable:** Designed for automated tooling
- **Git-tracked:** Changes are auditable
- **Never manually edited:** Updated only by validation scripts

---

## Schema

### Top-Level Structure

```typescript
interface ValidationRegistry {
  $schema: string
  version: string
  lastFullRun: string | null
  validators: Record<string, ValidatorStatus>
  phaseGates: Record<string, PhaseGate>
  stats?: {
    tdd?: TDDStats
  }
  redPhaseVerified?: Record<string, RedPhaseEntry>
}
```

**Fields:**
- `$schema`: Path to JSON schema definition
- `version`: Registry format version (currently "1.0.0")
- `lastFullRun`: ISO timestamp of last `npm run validation:all`
- `validators`: Map of validator name → status
- `phaseGates`: Map of phase name → gate definition
- `stats.tdd`: TDD coverage metrics (see TDD Stats section below)
- `redPhaseVerified`: Modules that have passed RED phase verification

### Validator Status

```typescript
interface ValidatorStatus {
  lastRun: string | null
  passed: boolean | null
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  duration: number
  runBy: 'script' | 'manual' | 'ci' | null
  gitCommit: string | null
  details?: {
    failedTestNames?: string[]
    skippedTestNames?: string[]
    notes?: string
  }
}
```

**Fields:**
- `lastRun`: ISO 8601 timestamp when validator last ran (null if never run)
- `passed`: true if all tests passed, false if any failed, null if never run
- `totalTests`: Total number of tests in the validator
- `passedTests`: Number of tests that passed
- `failedTests`: Number of tests that failed
- `skippedTests`: Number of tests skipped
- `duration`: Execution time in milliseconds
- `runBy`: Who/what triggered the validation
- `gitCommit`: Short git commit hash when validator ran
- `details`: Optional object with failure details (see Crash Reporting below)

### Phase Gate

```typescript
interface PhaseGate {
  requiredValidators: string[]
  requiredPassRate: number
  description: string
}
```

**Fields:**
- `requiredValidators`: Array of validator names that must pass
- `requiredPassRate`: Fraction of validators that must pass (0.0 to 1.0, usually 1.0)
- `description`: Human-readable description of the gate

### TDD Stats (stats.tdd)

```typescript
interface TDDStats {
  lastUpdated: string | null
  unit_tests: {
    coverage_percent: number
    passing: boolean
  }
  contract_tests: {
    total_endpoints: number
    endpoints_with_tests: number
    coverage_percent: number
    passing: boolean
  }
  integration_tests: {
    cross_module_calls: number
    calls_with_tests: number
    coverage_percent: number  // -1 means "N/A" (nothing to test)
    passing: boolean
  }
}
```

**Fields:**
- `lastUpdated`: ISO timestamp of last TDD stats update
- `unit_tests.coverage_percent`: Jest line coverage percentage (threshold: 90%)
- `contract_tests.total_endpoints`: Total API endpoints from ENDPOINTS.json
- `contract_tests.endpoints_with_tests`: Endpoints with contract test coverage
- `contract_tests.coverage_percent`: Contract test coverage (threshold: 100%)
- `integration_tests.cross_module_calls`: Number of cross-module dependencies
- `integration_tests.coverage_percent`: Integration test coverage (-1 = N/A if no deps)

**Special value:** `coverage_percent: -1` means "not applicable" (no dependencies to test)

**Populated by:**
- `check-unit-test-coverage.ts` → updates `unit_tests`
- `check-contract-test-coverage.ts` → updates `contract_tests`
- `check-integration-test-coverage.ts` → updates `integration_tests`

### RED Phase Verified (redPhaseVerified)

```typescript
interface RedPhaseEntry {
  verified: boolean
  timestamp: string
  gitCommit?: string
}
```

**Fields:**
- `verified`: Always `true` when entry exists
- `timestamp`: ISO timestamp when RED phase was verified
- `gitCommit`: Short git commit hash at verification time

**Purpose:** Tracks which modules have passed RED phase (tests exist AND fail with assertion errors). Used by Claude hooks to enforce TDD workflow.

**Populated by:** `check-red-phase.ts <module>`

---

## Example Registry

```json
{
  "$schema": "./validation-registry.schema.json",
  "version": "1.0.0",
  "lastFullRun": "2025-11-28T10:30:00.000Z",
  "validators": {
    "auth": {
      "lastRun": "2025-11-28T10:15:30.872Z",
      "passed": true,
      "totalTests": 60,
      "passedTests": 60,
      "failedTests": 0,
      "skippedTests": 0,
      "duration": 4688,
      "runBy": "script",
      "gitCommit": "abc123f"
    },
    "channels": {
      "lastRun": "2025-11-28T10:20:45.123Z",
      "passed": false,
      "totalTests": 45,
      "passedTests": 42,
      "failedTests": 3,
      "skippedTests": 0,
      "duration": 3200,
      "runBy": "script",
      "gitCommit": "abc123f"
    },
    "files": {
      "lastRun": null,
      "passed": null,
      "totalTests": 0,
      "passedTests": 0,
      "failedTests": 0,
      "skippedTests": 0,
      "duration": 0,
      "runBy": null,
      "gitCommit": null
    }
  },
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
  },
  "redPhaseVerified": {
    "bookmarks": {
      "verified": true,
      "timestamp": "2025-12-06T14:30:00.000Z",
      "gitCommit": "abc1234"
    }
  },
  "phaseGates": {
    "phase4": {
      "requiredValidators": ["auth", "onboarding", "channels", "chat-core"],
      "requiredPassRate": 1.0,
      "description": "All UX validation scripts must pass"
    }
  }
}
```

**Interpretation:**
- Auth validator: Last ran at 10:15:30, all 60 tests passed
- Channels validator: Last ran at 10:20:45, 3 tests failed
- Files validator: Never run
- TDD stats: 85.2% unit coverage (below 90% threshold), 0% contract coverage, N/A integration (no deps)
- RED phase: `bookmarks` module verified at 14:30
- Phase 4 gate: Requires 4 validators, all must pass

---

## Library API

**Location:** `scripts/validation/registry.ts`

**Purpose:** Programmatic access to validation registry

### Functions

#### `reportValidationResult()`

**Purpose:** Update registry with validation results

**Signature:**
```typescript
async function reportValidationResult(result: {
  validator: string
  passed: boolean
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  duration: number
}): Promise<void>
```

**Usage:**
```typescript
import { reportValidationResult } from './registry'

// At end of validation script
await reportValidationResult({
  validator: 'channels',
  passed: allTestsPassed,
  totalTests: 45,
  passedTests: 45,
  failedTests: 0,
  skippedTests: 0,
  duration: 3200
})
```

**What it does:**
1. Reads current registry
2. Updates the validator's status with provided results
3. Adds timestamp, git commit, runBy fields
4. Writes back to registry
5. Logs success message

**Never call this manually. Only from validation scripts.**

#### `checkPhaseGate()`

**Purpose:** Check if a phase gate is satisfied

**Signature:**
```typescript
function checkPhaseGate(phase: string): {
  passed: boolean
  requiredValidators: string[]
  missingValidators: string[]
  failedValidators: string[]
  staleValidators: string[]
  passedValidators: string[]
}
```

**Usage:**
```typescript
import { checkPhaseGate } from './registry'

const gate = checkPhaseGate('phase4')

if (!gate.passed) {
  console.error('Phase 4 blocked:')
  console.error('Missing validators:', gate.missingValidators)
  console.error('Failed validators:', gate.failedValidators)
  console.error('Stale validators:', gate.staleValidators)
  process.exit(1)
}

console.log('✅ Phase 4 gate: PASSED')
```

**Return values:**
- `passed`: true if gate is satisfied
- `requiredValidators`: List of validators required for this gate
- `missingValidators`: Validators that have never run
- `failedValidators`: Validators that ran but failed
- `staleValidators`: Validators that ran on old commits
- `passedValidators`: Validators that ran and passed

#### `getValidationStatus()`

**Purpose:** Get status of a specific validator

**Signature:**
```typescript
function getValidationStatus(validator: string): ValidatorStatus | null
```

**Usage:**
```typescript
import { getValidationStatus } from './registry'

const status = getValidationStatus('channels')

if (!status) {
  console.log('Channels validator has never run')
} else if (!status.passed) {
  console.log(`Channels validator failed (${status.failedTests} failures)`)
} else {
  console.log(`Channels validator passed (${status.passedTests} tests)`)
}
```

**Returns:**
- Validator status object if validator exists in registry
- null if validator not found

#### `listAllValidators()`

**Purpose:** Get all validators and their status

**Signature:**
```typescript
function listAllValidators(): Record<string, ValidatorStatus>
```

**Usage:**
```typescript
import { listAllValidators } from './registry'

const validators = listAllValidators()

for (const [name, status] of Object.entries(validators)) {
  const emoji = status.passed === true ? '✅' : status.passed === false ? '❌' : '⚪'
  console.log(`${emoji} ${name}: ${status.passedTests}/${status.totalTests} tests`)
}
```

**Returns:** Map of all validators to their status

---

## How Validators Update Registry

### Integration Pattern

**Every validation script must:**

1. Import the registry library
2. Track test results during execution
3. Call `reportValidationResult()` at the end

**Example validation script:**

```typescript
import { reportValidationResult } from './registry'

async function runChannelsValidation() {
  let totalTests = 0
  let passedTests = 0
  let failedTests = 0
  const startTime = Date.now()

  try {
    // Run test 1
    totalTests++
    await testChannelCreation()
    passedTests++

    // Run test 2
    totalTests++
    await testChannelArchive()
    passedTests++

    // ... more tests ...

  } catch (error) {
    failedTests++
    console.error('Test failed:', error)
  }

  const duration = Date.now() - startTime
  const passed = failedTests === 0

  // Update registry
  await reportValidationResult({
    validator: 'channels',
    passed,
    totalTests,
    passedTests,
    failedTests,
    skippedTests: 0,
    duration
  })

  process.exit(passed ? 0 : 1)
}

runChannelsValidation()
```

**Key points:**
- Script tracks its own test counts
- Calls `reportValidationResult()` exactly once at the end
- Exits with code 0 on pass, 1 on fail
- Registry update is automatic (timestamp, git commit, runBy)

---

## Registry Update Rules

### When Registry Is Updated

**Updated by:**
- Validation scripts (via `reportValidationResult()`)
- `npm run validation:all` (sets `lastFullRun`)

**NOT updated by:**
- Manual edits (forbidden)
- Non-validation scripts
- Build or test commands (unless they call registry API)

### What Gets Recorded

**Every update records:**
- Timestamp of the run (ISO 8601)
- Pass/fail status
- Test counts (total, passed, failed, skipped)
- Execution duration
- Git commit hash (short form)
- Who ran it ('script' | 'manual' | 'ci')

**Why this matters:**
- PM can see exactly when validations ran
- Dashboard shows real-time status
- Stale results are detectable (old commit hash)
- Audit trail exists in git history

### Staleness Detection

**A validator result is stale if:**
- `gitCommit` field differs from current HEAD
- `lastRun` timestamp is more than 24 hours ago (configurable)

**What happens with stale results:**
- Phase gates may mark them as failed
- Dashboard shows warning icon
- `checkPhaseGate()` includes them in `staleValidators` array

**Solution:** Re-run the validator

---

## Phase Gates Detail

### What Phase Gates Do

**Purpose:** Define completion criteria for each phase

**Mechanism:**
- Each phase gate lists required validators
- Gate checks if all required validators have:
  - Run (not null `lastRun`)
  - Passed (`passed: true`)
  - Fresh results (recent `gitCommit`)

**Example gate definition:**

```json
{
  "phase4": {
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
      "advanced-features"
    ],
    "requiredPassRate": 1.0,
    "description": "All UX validation scripts must pass"
  }
}
```

**Interpretation:**
- Phase 4 requires 11 validators
- All 11 must pass (requiredPassRate: 1.0 = 100%)
- If any are missing, failed, or stale → gate is blocked

### Gate Checking Logic

**Pseudocode:**

```python
def check_phase_gate(phase: str) -> GateResult:
  gate = registry.phaseGates[phase]
  missing = []
  failed = []
  stale = []
  passed = []

  for validator in gate.requiredValidators:
    status = registry.validators[validator]

    if status.lastRun is None:
      missing.append(validator)
    elif status.passed is False:
      failed.append(validator)
    elif status.gitCommit != current_commit:
      stale.append(validator)
    else:
      passed.append(validator)

  total_passed = len(passed)
  total_required = len(gate.requiredValidators)
  pass_rate = total_passed / total_required

  gate_passed = pass_rate >= gate.requiredPassRate

  return {
    passed: gate_passed,
    requiredValidators: gate.requiredValidators,
    missingValidators: missing,
    failedValidators: failed,
    staleValidators: stale,
    passedValidators: passed
  }
```

**Result:**
- `passed: true` → All requirements met, phase can proceed
- `passed: false` → Some validators missing/failed/stale, phase blocked

---

## Common Workflows

### Workflow 1: Agent Runs Single Validator

```bash
# 1. Run validator
$ npm run validation:channels

# 2. Validator updates registry automatically
# (no manual intervention needed)

# 3. Check status
$ cat scripts/validation/validation-registry.json | jq '.validators.channels'
{
  "lastRun": "2025-11-28T10:30:00.000Z",
  "passed": true,
  "totalTests": 45,
  "passedTests": 45,
  "gitCommit": "abc123f"
}
```

### Workflow 2: Check Phase Gate Status

```bash
# Run gate check script
$ npm run validation:gates

# Output shows:
Phase 4 gate: BLOCKED
Required validators: [auth, onboarding, channels, chat-core, ...]
Passed validators: [auth, onboarding, channels]
Missing validators: [chat-core, files, collaboration]
Failed validators: []
Stale validators: []
```

### Workflow 3: PM Checks Dashboard

```bash
# PM opens dashboard
$ open docs/pm-dashboard/index.html

# Dashboard reads registry and shows:
- All validators with pass/fail status
- Last run timestamps
- Phase gate status (green/red)
- Overall project health score
```

---

## Crash Reporting System

### Overview

**Problem:** When validators crash (TypeScript errors, syntax errors, missing modules), they never reach their `reportValidationResult()` call. This leaves stale "passed" status in the registry, creating false positives.

**Solution:** The validation runner (`scripts/validation/run-all.ts`) now detects crashes and reports failures directly to the registry.

### How Crash Detection Works

**Location:** `scripts/validation/run-all.ts` lines 76-107

**Flow:**
```
1. Runner spawns validator process
2. Runner captures stdout/stderr
3. Runner checks exit code
4. If exit code !== 0:
   → Extract error message from stderr
   → Classify error type
   → Call reportValidationResult() with failure details
   → Update registry with crash info
```

### Error Type Classification

The runner automatically classifies crash types for clearer messaging:

| Error Type | Detection Pattern | Example |
|------------|-------------------|---------|
| `TypeScript compilation error` | `TSError` or `Unable to compile TypeScript` | Undefined variable, type mismatch |
| `JavaScript syntax error` | `SyntaxError` | Missing bracket, invalid token |
| `Missing module/import error` | `Cannot find module` | npm install needed |
| `Connection refused - server not running?` | `ECONNREFUSED` | Backend not started |
| `Script crashed` | (default) | Any other crash |

### Registry Entry for Crashed Validator

When a validator crashes, the registry is updated with:

```json
{
  "user-management": {
    "lastRun": "2025-11-29T21:14:36.970Z",
    "passed": false,
    "totalTests": 0,
    "passedTests": 0,
    "failedTests": 1,
    "skippedTests": 0,
    "duration": 911,
    "details": {
      "failedTestNames": ["TypeScript compilation error"],
      "notes": "Exit code: 1\n\nTSError: ⨯ Unable to compile TypeScript:\nvalidate-user-management-full.ts(14,19): error TS2304: Cannot find name 'undefinedVariable'..."
    },
    "runBy": "script",
    "gitCommit": "cabf14b"
  }
}
```

**Key fields for crashes:**
- `passed: false` - Always false for crashes
- `totalTests: 0` - Validator never ran its tests
- `failedTests: 1` - The crash counts as one failure
- `details.failedTestNames`: Array containing the classified error type
- `details.notes`: Exit code + first 500 chars of stderr (error message)

### Agent Guidelines for Crash Handling

**When you see a validator crash in the registry or dashboard:**

1. **Check `details.failedTestNames`** to understand the error type
2. **Check `details.notes`** for the actual error message with line numbers
3. **Fix the script** based on the error type:

| Error Type | Action |
|------------|--------|
| TypeScript compilation error | Fix type error at indicated line |
| JavaScript syntax error | Fix syntax at indicated line |
| Missing module/import error | Run `npm install` or fix import path |
| Connection refused | Start the backend server |
| Script crashed | Check stderr for stack trace |

4. **Re-run the validator** to update registry:
   ```bash
   npm run validation:all --validator=<name>
   ```

5. **Verify registry shows `passed: true`**

### Why This Matters

**Before crash reporting:**
- Validator crashed
- Registry kept old "passed: true" status
- Dashboard showed green ✅
- PM thought everything was fine
- **FALSE POSITIVE - Critical bug**

**After crash reporting:**
- Validator crashes
- Runner detects exit code !== 0
- Registry immediately updated with `passed: false`
- Dashboard shows red ❌ with error details
- PM sees exactly what broke and why
- **ACCURATE STATUS - Trust restored**

### Testing Crash Reporting

To verify crash reporting works:

```bash
# 1. Introduce a bug in any validator
echo "const x = undefinedVar;" >> scripts/validation/validate-auth-full.ts

# 2. Run the validator
npm run validation:all --validator=auth

# 3. Check registry shows failure with details
cat scripts/validation/validation-registry.json | jq '.validators.auth'

# 4. Revert the bug
git checkout scripts/validation/validate-auth-full.ts
```

---

## Error Handling

### Registry File Missing

**Symptom:** `validation-registry.json` doesn't exist

**Cause:** Fresh clone or file deleted

**Solution:**
```bash
# Run any validator to initialize registry
npm run validation:auth
```

**Result:** Registry file is created with default structure

### Registry Corrupted

**Symptom:** JSON parse error when reading registry

**Cause:** Manual edit introduced syntax error

**Solution:**
```bash
# Restore from git
git checkout scripts/validation/validation-registry.json

# Re-run validators
npm run validation:all
```

**Prevention:** Never manually edit the registry

### Validator Not in Registry

**Symptom:** `checkPhaseGate()` shows validator as missing

**Cause:** New validator was added but hasn't run yet

**Solution:**
```bash
# Run the missing validator
npm run validation:new-feature

# Registry will be updated automatically
```

### Validator Crashed (TypeScript/Runtime Error)

**Symptom:** Registry shows `passed: false` with `details.failedTestNames: ["TypeScript compilation error"]`

**Cause:** Validator script has a bug (undefined variable, type error, missing import)

**Diagnosis:**
```bash
# Check error details
cat scripts/validation/validation-registry.json | jq '.validators["auth"].details'

# Output shows:
{
  "failedTestNames": ["TypeScript compilation error"],
  "notes": "Exit code: 1\n\nTSError: ⨯ Unable to compile TypeScript:\nvalidate-auth-full.ts(14,19): error TS2304: Cannot find name 'foo'..."
}
```

**Solution:**
1. Read the `details.notes` to find the file and line number
2. Fix the TypeScript/JavaScript error in the validator script
3. Re-run the validator: `npm run validation:all --validator=auth`
4. Verify registry now shows `passed: true`

**Key Insight:** The runner now catches crashes and reports them to the registry automatically. Before this fix, crashes would leave stale "passed" status. See [Crash Reporting System](#crash-reporting-system) for details.

---

## Security & Integrity

### Why Manual Edits Are Forbidden

**Reasons:**
1. **Defeats Chain of Trust:** PM relies on registry as ground truth
2. **Detectable:** Git history shows manual edits
3. **Fragile:** Easy to introduce JSON syntax errors
4. **Bypasses enforcement:** Hook and gate checks become meaningless

**If you need to fix registry:**
- Don't edit manually
- Re-run the validator to generate correct results
- If validator is broken, fix the validator

### Git History Audit

**PMs can audit registry changes:**

```bash
# See all registry changes
git log -p scripts/validation/validation-registry.json

# Check who updated registry
git blame scripts/validation/validation-registry.json

# Verify updates came from validation scripts
git show abc123:scripts/validation/validation-registry.json
```

**Red flags:**
- Manual commits to registry (not from validators)
- Registry updates without corresponding validator changes
- Timestamps that don't match git commit times

### Registry Schema Validation

**Future enhancement:** JSON schema validation

**Schema file:** `scripts/validation/validation-registry.schema.json`

**Validation:**
```bash
# Validate registry against schema
npx ajv validate -s validation-registry.schema.json -d validation-registry.json
```

**Benefits:**
- Catch corrupted registry early
- Enforce required fields
- Prevent invalid data types

---

## Summary

**The validation registry is the single source of truth for validation status.**

**Key properties:**
- Machine-readable JSON format
- Updated only by validation scripts
- Git-tracked for audit trail
- Read by phase gates and dashboard

**Library API:**
- `reportValidationResult()`: Update registry (from validators only)
- `checkPhaseGate()`: Check if phase can proceed
- `getValidationStatus()`: Get status of specific validator
- `listAllValidators()`: Get all validators

**Never:**
- Edit registry manually
- Fake validation results
- Bypass registry updates
- Treat old results as current

**The registry is non-negotiable. It's how the project knows what's validated.**
