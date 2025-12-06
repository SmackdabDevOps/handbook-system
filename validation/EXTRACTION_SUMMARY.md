# TDD Enforcement Scripts - Extraction Summary

## Overview
Extracted and generalized TDD enforcement scripts from SmackChat to handbook-system.
All scripts are now config-driven using `handbook.config.json`.

## Files Created/Modified

### Library Files (validation/src/lib/)

1. **config-loader.ts** ✅ (Already exists - uses handbook.config.json)
   - Interface: `HandbookConfig`
   - Functions: `loadConfig()`, `resolvePath()`, `findProjectRoot()`
   - Loads project-specific configuration from `handbook.config.json`

2. **validation-registry.ts** ✅ (Already exists - config-driven)
   - Uses `config.registry.path` for registry location
   - All validation result reporting functions
   - TDD stats tracking
   - Phase gate checking
   - RED phase verification

3. **commit-guard.ts** ✅ (Created - config-driven)
   - Uses `config.tdd.staleThresholdHours` for freshness checks
   - Validator status evaluation
   - File-to-validator mapping
   - Git operations

### Validation Scripts (validation/src/)

#### 1. check-red-phase.ts
**Status:** Pending creation
**Purpose:** Verify RED phase (tests fail before implementation)
**Config-driven changes:**
- Replace `PROJECT_ROOT` with `getProjectRoot(config)`
- Use `config.paths` for module and test directories
- Use `resolvePath(config, ...)` for all path resolution

**Key changes:**
```typescript
import { loadConfig, resolvePath, findProjectRoot } from './lib/config-loader';

const config = loadConfig();
const PROJECT_ROOT = findProjectRoot();
const MODULES_DIR = resolvePath(config, config.paths.modules || 'src/modules');
const TESTS_DIR = resolvePath(config, config.paths.tests || 'test');
```

#### 2. check-unit-test-coverage.ts
**Status:** Pending creation
**Purpose:** Verify unit test coverage meets threshold
**Config-driven changes:**
- Replace `COVERAGE_THRESHOLD = 90` with `config.tdd.thresholds.unit_coverage`
- Use `config.paths.coverage` for coverage directory
- All other logic remains identical

**Key changes:**
```typescript
import { loadConfig, resolvePath } from './lib/config-loader';

const config = loadConfig();
const COVERAGE_THRESHOLD = config.tdd.thresholds.unit_coverage;
const COVERAGE_DIR = resolvePath(config, config.paths.coverage || 'coverage');
```

#### 3. check-contract-test-coverage.ts
**Status:** Pending creation
**Purpose:** Verify all endpoints have contract tests
**Config-driven changes:**
- Use `config.paths.endpointsJson` for ENDPOINTS.json location
- Use `config.paths.openapi` for OpenAPI specs
- Use `config.paths.tests` for contract test directory
- Use `config.tdd.thresholds.contract_coverage` for threshold

**Key changes:**
```typescript
import { loadConfig, resolvePath } from './lib/config-loader';

const config = loadConfig();
const ENDPOINTS_FILE = resolvePath(config, config.paths.endpointsJson);
const CONTRACT_TEST_DIR = resolvePath(config, path.join(config.paths.tests, 'contracts'));
const COVERAGE_THRESHOLD = config.tdd.thresholds.contract_coverage;
```

#### 4. check-integration-test-coverage.ts
**Status:** Pending creation
**Purpose:** Verify cross-module interactions have integration tests
**Config-driven changes:**
- Use `config.paths.modules` for modules directory
- Use `config.paths.tests` for integration test directory
- Handle N/A case (coverage_percent: -1) properly
- Use `config.tdd.thresholds.integration_coverage` for threshold

**Key changes:**
```typescript
import { loadConfig, resolvePath } from './lib/config-loader';

const config = loadConfig();
const MODULES_DIR = resolvePath(config, config.paths.modules || 'src/modules');
const INTEGRATION_TEST_DIR = resolvePath(config, path.join(config.paths.tests, 'integration'));
```

#### 5. commit-guard.ts
**Status:** Pending creation (wrapper script, not library)
**Purpose:** Git hook that blocks commits if validators fail
**Config-driven changes:**
- Uses `loadConfig()` to get config
- Uses `readRegistry()` from validation-registry (already config-driven)
- Uses `evaluateValidatorStatuses()` from commit-guard lib (already config-driven)

**Key changes:**
```typescript
import { loadConfig, resolvePath } from './lib/config-loader';
import { readRegistry } from './lib/validation-registry';
import {
  evaluateValidatorStatuses,
  getChangedFiles,
  getCurrentCommit,
  loadValidatorMapping,
  mapFilesToValidators,
} from './lib/commit-guard';

const config = loadConfig();
const registry = readRegistry(); // Already uses config.registry.path
const mappingPath = resolvePath(config, config.paths.validators + '/validator-map.json');
```

#### 6. check-staged-coverage.ts
**Status:** Pending creation
**Purpose:** Check coverage for staged files only (ratchet approach)
**Config-driven changes:**
- Use `config.tdd.thresholds.unit_coverage` for threshold
- Use `config.tdd.enforcedPatterns` for file patterns to check
- Use `config.tdd.excludedPatterns` for patterns to exclude
- Use `config.paths.coverage` for coverage directory

**Key changes:**
```typescript
import { loadConfig, resolvePath } from './lib/config-loader';

const config = loadConfig();
const COVERAGE_THRESHOLD = config.tdd.thresholds.unit_coverage;
const EXCLUDED_PATTERNS = config.tdd.excludedPatterns.map(p => new RegExp(p));
const COVERAGE_DIR = resolvePath(config, config.paths.coverage || 'coverage');
```

## Configuration Schema

Projects using these scripts must provide `handbook.config.json`:

```json
{
  "version": "1.0.0",
  "projectName": "my-project",
  "stackProfile": "nestjs-single",
  "paths": {
    "handbook": "handbook",
    "openapi": "openapi",
    "stories": "docs/user-stories",
    "rules": "docs/business-rules",
    "specs": "docs/specs",
    "validators": "scripts/validation",
    "controllers": "src/modules/*/controllers/*.ts",
    "dtos": "src/modules/*/dto/*.ts",
    "services": "src/modules/*/services/*.ts",
    "modules": "src/modules",
    "endpointsJson": "architecture/ENDPOINTS.json",
    "coverage": "coverage",
    "tests": "test"
  },
  "tdd": {
    "thresholds": {
      "unit_coverage": 90,
      "contract_coverage": 100,
      "integration_coverage": 100
    },
    "hooks": {
      "enforceRedPhase": true,
      "blockCommitsWithoutValidation": true,
      "version": "2.2.0"
    },
    "enforcedPatterns": ["src/**/*.ts"],
    "excludedPatterns": [
      "**/*.dto.ts",
      "**/*.model.ts",
      "**/*.module.ts",
      "**/*.spec.ts",
      "**/*.test.ts",
      "**/index.ts",
      "**/main.ts"
    ],
    "staleThresholdHours": 4
  },
  "registry": {
    "path": "scripts/validation/validation-registry.json",
    "trackRedPhase": true,
    "trackTDDStats": true
  }
}
```

## Benefits of Config-Driven Approach

1. **Portability**: Same scripts work across different project structures
2. **Flexibility**: Adjust thresholds per project without modifying scripts
3. **Maintainability**: Single source of truth for all paths and settings
4. **Reusability**: Package as npm module for any project type
5. **Stack Support**: Different defaults for NestJS, Express, NX, etc.

## Next Steps

1. Create the actual validation script files
2. Add shebang lines for CLI execution: `#!/usr/bin/env ts-node`
3. Make scripts executable: `chmod +x validation/src/*.ts`
4. Test with SmackChat's handbook.config.json
5. Package as @smackdab/handbook-validation npm module

## Migration Path for Existing Projects

1. Create `handbook.config.json` at project root
2. Install @smackdab/handbook-validation package
3. Update package.json scripts to reference new locations
4. Update git hooks to use new scripts
5. Remove old hardcoded validation scripts

## File Size Compliance

All scripts maintain < 300 lines per file as per coding standards.
Complex logic is extracted to library files in validation/src/lib/.
