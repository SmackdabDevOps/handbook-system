# Validation Scripts - Config-Driven

Generalized validation scripts extracted from SmackChat, made config-driven for reuse across projects.

## Overview

These scripts provide a complete validation system that works with any project using the handbook system. All behavior is driven by `handbook.config.json` instead of hardcoded values.

## Scripts

### 1. `gates.ts` (Phase Gate Checker)
**Source:** SmackChat's `check-all-phase-gates.ts`

Comprehensive gate checker for ALL phases (1-5):
- Runs enabled phase validation scripts
- Updates validation registry
- Returns structured output showing pass/fail
- Exit code 0 = all pass, 1 = blockers exist

**Usage:**
```bash
npx ts-node gates.ts
```

**Config Dependencies:**
- `config.phases.enabled` - Which phases to check
- `config.commands.*` - Validation commands to run
- `config.registry.path` - Registry location
- `config.paths.*` - Various path configurations

### 2. `quick-gate-check.ts` (Pre-commit Check)
**Source:** SmackChat's `quick-gate-check.ts`

Fast check (<5 seconds) for pre-commit hook:
- Read-only checks (no API calls)
- Checks registry freshness
- Checks for failed validators
- Checks Phase 2-3 gates
- Exit code 0 = safe to commit, 1 = blockers

**Usage:**
```bash
npx ts-node quick-gate-check.ts
```

**Config Dependencies:**
- `config.phases.enabled` - Which phases to check
- `config.registry.path` - Registry location

### 3. `runner.ts` (Validation Server)
**Source:** SmackChat's `runner-server.ts`

HTTP server for running validation suites with SSE progress updates:
- Configurable via handbook.config.json
- Supports streaming logs and status updates
- Handles single validator or full suite runs

**Usage:**
```bash
npx ts-node runner.ts
# Server starts on port 8810 (or $VALIDATION_RUNNER_PORT)
```

**Endpoints:**
- `GET /health` - Health check
- `GET /api/validate/status` - Current run status
- `POST /api/validate/run?validator=<name>` - Start validation run
- `GET /api/validate/events` - SSE stream of progress

**Config Dependencies:**
- `config.commands.validate:gates` - Validation command to run
- `config.projectName` - Display name

### 4. `run-all.ts` (Full Suite Runner)
**Source:** SmackChat's `run-all.ts`

Runs all validators for configured features:
- Discovers validators from config.features list
- Reports results to validation registry
- Updates progress files and dashboard
- Supports single validator or full suite

**Usage:**
```bash
npx ts-node run-all.ts                    # Run all validators
npx ts-node run-all.ts --validator=auth   # Run single validator
```

**Config Dependencies:**
- `config.features` - List of feature names (generates validator list)
- `config.paths.validators` - Validator scripts location
- `config.commands.*` - Pre-validation checks

### 5. `check-registry-freshness.ts` (Registry Staleness Checker)
**Source:** SmackChat's `check-registry-freshness.ts`

Detects when validation registry is stale:
- New validators exist that aren't in registry
- Validator scripts modified after their last run
- Registry hasn't had a full run in threshold time

**Usage:**
```bash
npx ts-node check-registry-freshness.ts
```

**Exit Codes:**
- 0 = Fresh (all validators accounted for and recent)
- 1 = Stale (missing validators, old results, or code changed)

**Config Dependencies:**
- `config.features` - Expected validators
- `config.paths.validators` - Validator scripts location
- `config.registry.path` - Registry location

## Configuration Loader

### `config/loader.ts`

Provides type-safe access to validation configuration:

**Functions:**
- `loadConfig(projectRoot?)` - Load handbook.config.json
- `findProjectRoot(startDir?)` - Find project root by looking for config
- `getAbsolutePath(relativePath, projectRoot?)` - Convert relative to absolute path
- `getRegistryPath(projectRoot?)` - Get registry path
- `getValidatorsPath(projectRoot?)` - Get validators directory path
- `clearConfigCache()` - Clear cached config (useful for testing)

**Example:**
```typescript
import { loadConfig, findProjectRoot } from './config/loader';

const projectRoot = findProjectRoot();
const config = loadConfig(projectRoot);

console.log(config.projectName);
console.log(config.features);
```

## Configuration Schema

These scripts read from `handbook.config.json` with the following structure:

```json
{
  "version": "1.0.0",
  "projectName": "your-project-name",
  "stackProfile": "nestjs-single",
  "paths": {
    "validators": "scripts/validation/",
    "endpointsJson": "architecture/ENDPOINTS.json"
  },
  "commands": {
    "validate:gates": "npm run validation:gates",
    "validate:quick": "npm run validation:quick",
    "openapi:bundle": "npm run openapi:bundle",
    "endpoints:validate": "npm run endpoints:validate"
  },
  "phases": {
    "enabled": [0, 1, 2, 3, 4, 5],
    "customGates": {}
  },
  "registry": {
    "path": "scripts/validation/validation-registry.json",
    "trackRedPhase": true,
    "trackTDDStats": true
  },
  "features": [
    "auth",
    "channels",
    "messages"
  ]
}
```

## Key Differences from SmackChat Originals

### Hardcoded → Config-Driven

| SmackChat Original | Generalized Version |
|-------------------|---------------------|
| Hardcoded registry path | `config.registry.path` |
| Hardcoded validator list | Generated from `config.features` |
| Hardcoded npm commands | `config.commands.*` |
| Hardcoded phase logic | `config.phases.enabled` |
| Hardcoded paths | `config.paths.*` |
| Fixed port 8810 | `$VALIDATION_RUNNER_PORT` or 8810 |

### Preserved Core Logic

- All gate checking logic intact
- Registry update patterns preserved
- Phase execution order maintained
- Error handling and reporting unchanged
- SSE streaming logic preserved
- Freshness detection algorithms intact

## Dependencies

These scripts depend on lib files that may need to be copied:

- `lib/validation-registry.ts` - Registry read/write functions
- `lib/run-suite.ts` - Suite execution utilities
- `lib/port-utils.ts` - Port management (for runner.ts)

If these libs are not present, the scripts include fallback implementations for basic functionality.

## Integration Example

### In a New Project

1. Copy these scripts to your project's validation directory
2. Create `handbook.config.json` with your project's configuration
3. Add npm scripts to `package.json`:

```json
{
  "scripts": {
    "validation:all": "ts-node scripts/validation/run-all.ts",
    "validation:gates": "ts-node scripts/validation/gates.ts",
    "validation:quick": "ts-node scripts/validation/quick-gate-check.ts",
    "validation:freshness": "ts-node scripts/validation/check-registry-freshness.ts",
    "validation:server": "ts-node scripts/validation/runner.ts"
  }
}
```

4. Configure your features and paths in `handbook.config.json`
5. Run `npm run validation:all` to execute the suite

## License

Part of the Smackdab handbook system.
