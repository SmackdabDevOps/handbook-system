# Validator Templates

This directory contains templates for creating validation scripts that follow the System Delivery Playbook phases.

## Overview

The handbook-system provides these templates to help projects generate their own validators quickly and consistently:

| Template | Purpose | When to Use |
|----------|---------|-------------|
| `validate-directory-structure.template.ts` | Directory structure validation | Phase 0: Validate project follows handbook directory standards |
| `validate-required-docs.template.ts` | Required documentation | Phase 0: Validate minimum required docs exist |
| `validate-features.template.ts` | FEAT-XXX feature registry | Phase 0: Validate features.md exists and contains FEAT-XXX entries |
| `validate-phase0-gate.template.ts` | Combined Phase 0 gate | Phase 0: Run all Phase 0 checks as single gate |
| `validate-phase0.template.ts` | Feature-based requirements | Phase 0 (legacy): Validate user stories, business rules by feature |
| `validate-phase1.template.ts` | Contract-Code alignment | Phase 1: Validate OpenAPI specs align with DTOs and Controllers |
| `validate-phase2.template.ts` | Test coverage | Phase 2: Validate unit, contract, and integration test coverage |
| `validate-feature.template.ts` | Feature behavior testing | Phase 4: Validate actual API behavior against UX specs |
| **Chain of Trust System** | | |
| `check-all-phase-gates.template.ts` | Run all phase gates | Run all gates 0-5, block later phases if earlier fail |
| `check-phase-prerequisites.template.ts` | File prerequisite checking | Block file edits if phase prerequisites not met |
| `lib/validation-registry.template.ts` | Registry API library | Report validator results, check gates, track regressions |
| `validation-registry.template.json` | Registry data structure | Initialize validation registry for new projects |

## Quick Start

### 1. Copy a Template

```bash
# Example: Create a Phase 0 validator for your project
cp validate-phase0.template.ts ../../your-project/scripts/validation/validate-phase0.ts
```

### 2. Customize Configuration

Open the copied file and customize the configuration section:

```typescript
// CUSTOMIZE: Add your feature names here
const MANUAL_CONFIG = {
  paths: {
    stories: 'docs/user-stories',
    rules: 'docs/business-rules',
    openapi: 'openapi',
  },
  features: [
    'auth',           // ← Add your features
    'channels',
    'messages',
  ],
};
```

### 3. Run the Validator

```bash
npx ts-node scripts/validation/validate-phase0.ts
```

## Template Details

### Phase 0: Directory Structure (NEW)

**File:** `validate-directory-structure.template.ts`

**Validates:**
- Required directories exist (`docs/user-stories/`, `docs/business-rules/`, etc.)
- No forbidden documentation files at project root
- Handbook directory exists

**Customization needed:**
```typescript
// CUSTOMIZE: Add stack-specific OpenAPI location
const REQUIRED_DIRECTORIES = [
  { path: 'specs', description: 'OpenAPI specs directory' },        // Single-Service
  // { path: 'openapi', description: 'OpenAPI specs directory' },   // Nx Backend
];

// CUSTOMIZE: Add project-specific allowed root files
const ALLOWED_ROOT_MD_FILES = [
  'README.md',
  'CLAUDE.md',
  'API_FIRST_WORKFLOW.md',  // Add project-specific allowed files
];
```

**Expected structure:**
```
project/
├── docs/
│   ├── user-stories/      # Required
│   ├── business-rules/    # Required
│   ├── test-plans/
│   │   └── validation-specs/  # Required
│   ├── product/           # For FEATURES.md, SPECIFICATION.md
│   ├── architecture/      # For DATABASE.md, etc.
│   ├── plans/             # For IMPLEMENTATION_PLAN.md
│   ├── progress/          # For STATUS.md
│   └── research/          # For *_ANALYSIS.md
├── handbook/              # Required
├── src/                   # Required
└── specs/ or openapi/     # Required (stack-dependent)
```

---

### Phase 0: Required Documentation (NEW)

**File:** `validate-required-docs.template.ts`

**Validates:**
- At least one user story exists
- At least one business rule exists
- OpenAPI spec exists
- Handbook playbook exists

**Customization needed:**
```typescript
// CUSTOMIZE: Choose OpenAPI location based on stack
const REQUIRED_DOCS = [
  {
    name: 'OpenAPI Spec',
    pattern: 'specs/*.yaml',       // Single-Service (NestJS)
    // pattern: 'openapi/paths/*.yaml', // Nx Backend
    minCount: 1,
  },
];
```

---

### Phase 0: Features Registry (NEW)

**File:** `validate-features.template.ts`

**Validates:**
- `docs/features.md` exists
- Contains at least one FEAT-XXX feature definition
- Provides CLI flags for feature management

**CLI Usage:**
```bash
# Basic validation - check file exists and has features
npx ts-node scripts/validation/validate-features.ts

# List all features with their status
npx ts-node scripts/validation/validate-features.ts --list

# Show next available FEAT-XXX number
npx ts-node scripts/validation/validate-features.ts --next

# Check if specific feature exists (exits with code 1 if not found)
npx ts-node scripts/validation/validate-features.ts --feature FEAT-013
```

**Customization needed:**
```typescript
// CUSTOMIZE: Adjust these paths to match your project structure
const DOCS_DIR = 'docs';           // Your docs directory
const FEATURES_FILE = 'features.md'; // Your features file name
```

**Expected file format:**
```markdown
# Features

## FEAT-001: User Authentication
**Status:** Implemented

Description of the feature...

## FEAT-002: Real-time Messaging
**Status:** Planned

Description of the feature...
```

**Exit codes:**
- `0`: Validation passed
- `1`: Validation failed (missing file, no features, or feature not found with `--feature` flag)

**Integration with pre-commit hooks:**
This validator can be used in pre-commit hooks to ensure user stories reference valid FEAT-XXX identifiers:

```typescript
// In validate-user-stories.ts
import { execSync } from 'child_process';

// Check if FEAT-013 exists before allowing story creation
try {
  execSync('npx ts-node validate-features.ts --feature FEAT-013', { stdio: 'pipe' });
} catch {
  console.error('Feature FEAT-013 does not exist in features.md');
  process.exit(1);
}
```

---

### Phase 0: Combined Gate (NEW)

**File:** `validate-phase0-gate.template.ts`

**Purpose:** Runs both directory structure and required docs validation as a single gate check.

**Usage:**
```bash
npm run validate:phase0
```

**Note:** Phase 0 MUST pass before Phase 1 can begin.

---

### Phase 0: Requirements & Contracts (Legacy)

**File:** `validate-phase0.template.ts`

**Validates:**
- User story files exist for each feature
- Business rule files exist for each feature
- OpenAPI contract files exist

**Customization needed:**
```typescript
const MANUAL_CONFIG = {
  features: [
    'auth',      // ← Add all your feature names
    'channels',
    // ...
  ],
};
```

**Expected structure:**
```
docs/
  user-stories/
    auth.md
    channels.md
  business-rules/
    auth.md
    channels.md
openapi/
  paths/
    *.yaml
```

---

### Phase 1: Contract-Code Alignment

**File:** `validate-phase1.template.ts`

**Validates:**
- OpenAPI YAML files are valid
- DTOs exist and can be found
- Controllers exist and can be found
- ENDPOINTS.json exists and is valid

**Customization needed:**
```typescript
const MANUAL_CONFIG = {
  paths: {
    openapi: 'openapi',
    dtos: 'src/modules/*/dto/*.dto.ts',           // ← Adjust glob patterns
    controllers: 'src/modules/*/controllers/*.controller.ts',
    endpointsJson: 'architecture/ENDPOINTS.json',
  },
};
```

**Dependencies:**
- Requires `js-yaml` package: `npm install js-yaml`
- Requires `glob` package: `npm install glob`

---

### Phase 2: Test Coverage

**File:** `validate-phase2.template.ts`

**Validates:**
- Unit tests run and meet coverage threshold (default: 90%)
- Contract tests cover all endpoints (default: 100%)
- Integration tests cover cross-module dependencies

**Customization needed:**
```typescript
const MANUAL_CONFIG = {
  testCommands: {
    unit: 'npm test -- --coverage --passWithNoTests',  // ← Your test commands
    contract: 'npm run test:contract',
    integration: 'npm run test:integration',
  },
  thresholds: {
    unitCoverage: 90,       // ← Adjust thresholds
    contractCoverage: 100,
    integrationCoverage: 100,
  },
  paths: {
    coverageSummary: 'coverage/coverage-summary.json',
    endpointsJson: 'architecture/ENDPOINTS.json',
  },
};
```

**Note:** Contract coverage counting is a placeholder - you'll need to implement the actual counting logic based on your test structure.

---

### Feature Validator

**File:** `validate-feature.template.ts`

**Purpose:** Test actual API behavior against UX specs

**Customization needed:**

1. **Set feature config:**
```typescript
const FEATURE_CONFIG = {
  name: 'user-management',           // ← Your feature name
  specFile: 'user-management.md',    // ← Your UX spec file
  baseUrl: process.env.API_BASE_URL || 'http://localhost:8000/api/v1',
  auth: {
    type: 'session',                 // or 'bearer'
    testCredentials: {
      email: 'test.user@example.com',
      password: 'Password123!',
    },
  },
};
```

2. **Implement test cases:**
```typescript
// Replace placeholder tests with your actual tests
async function testCreateUser(): Promise<TestResult> {
  return recordTest('Create User', async () => {
    const user = await registerUser(/* ... */);
    const c = client(user.session);

    const res = await c.post('/users', { /* ... */ });

    expect(res.status === 201, `Expected 201, got ${res.status}`);
    expect(res.data?.data?.id, 'User ID missing');
    // ... more assertions based on your UX spec
  });
}
```

3. **Add tests to main function:**
```typescript
async function validateFeature(): Promise<boolean> {
  // Add your test cases
  testResults.push(await testCreateUser());
  testResults.push(await testGetUser());
  testResults.push(await testUpdateUser());
  testResults.push(await testDeleteUser());

  // ...
}
```

**Dependencies:**
- Requires `axios` package: `npm install axios`

---

## Integration with Validation Registry

All templates include commented-out code for integration with the validation registry system. To enable:

1. **Create the registry helper:**

Create `scripts/validation/lib/validation-registry.ts` with the reporting utilities (see SmackChat example).

2. **Uncomment registry code:**

In each validator, uncomment the import and `reportValidationResult()` call:

```typescript
import { reportValidationResult } from './lib/validation-registry';

// ... in validation function:
reportValidationResult({
  validator: 'phase0',
  passed,
  totalTests: 10,
  passedTests: 8,
  failedTests: 2,
  skippedTests: 0,
  duration: 1500,
  details: results,
});
```

3. **Create registry JSON:**

Initialize `scripts/validation/validation-registry.json`:

```json
{
  "$schema": "./validation-registry.schema.json",
  "version": "1.0.0",
  "lastFullRun": null,
  "validators": {},
  "regressions": {
    "active": [],
    "resolved": []
  },
  "phaseGates": {}
}
```

---

## Common Customization Points

### Paths and Globs

All templates use configurable paths. Adjust these to match your project structure:

```typescript
const MANUAL_CONFIG = {
  paths: {
    stories: 'docs/user-stories',              // Your user stories location
    rules: 'docs/business-rules',              // Your business rules location
    openapi: 'openapi',                        // Your OpenAPI specs location
    dtos: 'src/modules/*/dto/*.dto.ts',        // Your DTOs glob pattern
    controllers: 'src/**/controllers/*.ts',    // Your controllers glob pattern
    endpointsJson: 'architecture/ENDPOINTS.json',
  },
};
```

### Test Commands

Adjust test commands to match your project's npm scripts:

```typescript
const MANUAL_CONFIG = {
  testCommands: {
    unit: 'npm test -- --coverage',         // Or: pnpm test, yarn test, etc.
    contract: 'npm run test:e2e',           // Your contract test command
    integration: 'npm run test:integration', // Your integration test command
  },
};
```

### Base URLs and Authentication

For feature validators, customize the API connection:

```typescript
const FEATURE_CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:8000/api/v1',
  auth: {
    type: 'session',  // or 'bearer' for JWT
    testCredentials: {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    },
  },
};
```

---

## Best Practices

### 1. Start with Phase 0

Always implement Phase 0 validation first. It ensures you have the foundation (stories, rules, contracts) before moving to code.

### 2. Run Validators in Order

Phase validators build on each other:
- **Phase 0:** Requirements exist
- **Phase 1:** Code aligns with requirements
- **Phase 2:** Tests cover the code

### 3. Use Feature Validators for Behavior

Feature validators should test actual API behavior, not just structure. Base tests on UX spec steps.

### 4. Keep Validators Idempotent

Validators should be safe to run multiple times. Use unique identifiers (timestamps, UUIDs) for test data.

### 5. Report to Registry

Enable registry reporting to track validation history and catch regressions.

---

## Example Usage

### Create Phase 0 Validator for SmackChat

```bash
# 1. Copy template
cp validate-phase0.template.ts \
   ../../smackchat/scripts/validation/validate-phase0.ts

# 2. Edit features array
# Add: 'auth', 'channels', 'messages', 'notifications', 'translations'

# 3. Run
cd ../../smackchat
npx ts-node scripts/validation/validate-phase0.ts
```

### Create Feature Validator for Auth

```bash
# 1. Copy template
cp validate-feature.template.ts \
   ../../smackchat/scripts/validation/validate-auth-full.ts

# 2. Customize:
#    - Set name: 'auth'
#    - Set specFile: 'auth.md'
#    - Implement test cases based on auth UX spec

# 3. Run
cd ../../smackchat
npx ts-node scripts/validation/validate-auth-full.ts
```

---

## Troubleshooting

### "Configuration not loaded" error

Make sure you've set `USE_MANUAL_CONFIG = true` and filled in the `MANUAL_CONFIG` object.

### "No features configured" error

The `features` array is empty. Add your feature names to the configuration.

### "Cannot find module 'glob'" or "'js-yaml'"

Install missing dependencies:
```bash
npm install glob js-yaml
npm install -D @types/glob @types/js-yaml
```

### Tests fail with connection errors

Make sure your API is running on the configured base URL. Check `baseUrl` in the config.

---

## Chain of Trust Gate System (NEW)

The Chain of Trust system ensures phases are completed in order. Later phases show "pending" or "blocked" when prerequisite phases haven't passed.

### Overview

| Template | Purpose |
|----------|---------|
| `check-all-phase-gates.template.ts` | Run all phase gates, block later phases if earlier fail |
| `check-phase-prerequisites.template.ts` | Check if file can be modified based on phase prerequisites |
| `lib/validation-registry.template.ts` | Registry API for reporting validator results |
| `validation-registry.template.json` | Initial registry structure |

### Quick Setup

```bash
# 1. Create lib directory
mkdir -p scripts/validation/lib

# 2. Copy templates
cp check-all-phase-gates.template.ts ../../your-project/scripts/validation/check-all-phase-gates.ts
cp check-phase-prerequisites.template.ts ../../your-project/scripts/validation/check-phase-prerequisites.ts
cp lib/validation-registry.template.ts ../../your-project/scripts/validation/lib/validation-registry.ts
cp validation-registry.template.json ../../your-project/scripts/validation/validation-registry.json

# 3. Customize phase checks in check-all-phase-gates.ts
# 4. Run
npx ts-node scripts/validation/check-all-phase-gates.ts
```

### How "Pending" Status Works

Validators have three states based on registry data:

| `lastRun` | `passed` | Status |
|-----------|----------|--------|
| `null` | `null` | **pending** (never run) |
| timestamp | `true` | pass |
| timestamp | `false` | fail |

The dashboard collector derives status:
```typescript
const status = !hasRun ? 'not_run' : entry.passed ? 'pass' : 'fail';
```

### Chain of Trust Blocking

Phase 5 is **blocked** if Phase 4 fails:

```typescript
function runPhase5CoverageChecks(phase4Passed: boolean): PhaseCheckResult {
  // CRITICAL: Phase 5 cannot pass if Phase 4 failed
  if (!phase4Passed) {
    console.log(`  ⚠️  Phase 4 failed - Phase 5 blocked (chain of trust)`);
    updatePhaseGate('phase5-coverage', false, 'Blocked: Phase 4 must pass first');
    return {
      passed: false,
      error: 'Blocked: Phase 4 must pass first (chain of trust)',
    };
  }
  // ... run actual checks
}
```

### File-Based Prerequisites

The `check-phase-prerequisites.ts` script maps files to phases:

```typescript
const FILE_MAPPINGS = [
  { pattern: /^docs\/user-stories\/.*\.md$/, phase: 1, description: 'User story' },
  { pattern: /^openapi\/paths\/.*\.yaml$/, phase: 2, description: 'OpenAPI path' },
  { pattern: /^src\/.*\/services\/.*\.ts$/, phase: 3, description: 'Service' },
  // ...
];
```

Usage:
```bash
# Check if Phase 2 prerequisites are met
npx ts-node check-phase-prerequisites.ts --phase 2

# Check if a specific file can be modified
npx ts-node check-phase-prerequisites.ts --file openapi/paths/auth.yaml
```

### Validation Registry Structure

```json
{
  "validators": {
    "auth": {
      "lastRun": null,      // null = pending
      "passed": null,       // null = never run
      "totalTests": 0,
      "history": []
    }
  },
  "phaseGates": {
    "phase1": {
      "name": "Stories & Business Rules",
      "lastCheck": null,    // null = pending
      "passed": null        // null = never checked
    }
  }
}
```

### Customization Required

1. **Update phase checks** in `check-all-phase-gates.ts` to match your npm scripts
2. **Update file mappings** in `check-phase-prerequisites.ts` to match your project structure
3. **Update registry path** in both files if different from `scripts/validation/`
4. **Add validators** to `phaseGates.phase4.requiredValidators` as you create them

---

## Next Steps

1. **Copy templates** to your project's `scripts/validation/` directory
2. **Customize configuration** for your project structure
3. **Implement feature tests** based on your UX specs
4. **Set up Chain of Trust gate system** (recommended for phase enforcement)
5. **Add to CI/CD pipeline** to run validators automatically

For more information, see the [System Delivery Playbook](../../core/SYSTEM_DELIVERY_PLAYBOOK.md).
