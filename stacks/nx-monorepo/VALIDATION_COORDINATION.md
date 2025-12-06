# Validation Coordination in Nx Monorepo

**Context:** In an Nx monorepo with multiple services, validation must run across all affected apps while maintaining shared configurations. This guide shows how to coordinate handbook validators, TDD enforcement, and quality checks across services.

## Shared Validation Registry

### Monorepo Validation Registry Structure

**scripts/validation/validation-registry.json**
```json
{
  "validators": {
    "phase0": {
      "openapi-validation": {
        "description": "Validate OpenAPI contracts for all services",
        "script": "scripts/validation/phase0/validate-openapi.js",
        "scope": "all-services",
        "requiredFor": ["phase0-complete"]
      },
      "business-rules": {
        "description": "Validate business rules documentation",
        "script": "scripts/validation/phase0/validate-business-rules.js",
        "scope": "shared",
        "requiredFor": ["phase0-complete"]
      }
    },
    "phase1": {
      "contract-implementation": {
        "description": "Validate DTOs match OpenAPI contracts",
        "script": "scripts/validation/phase1/validate-contracts.js",
        "scope": "per-service",
        "requiredFor": ["phase1-complete"]
      }
    },
    "phase2": {
      "tdd-enforcement": {
        "description": "Enforce TDD workflow for all services",
        "script": "scripts/validation/phase2/tdd-enforcement.js",
        "scope": "all-services",
        "requiredFor": ["phase2-complete"]
      },
      "test-coverage": {
        "description": "Validate test coverage thresholds",
        "script": "scripts/validation/phase2/validate-coverage.js",
        "scope": "per-service",
        "requiredFor": ["phase2-complete"]
      }
    }
  },
  "services": {
    "auth-service": {
      "openapi": "openapi/auth-service/openapi.yaml",
      "projectRoot": "apps/auth-service",
      "coverageThreshold": 80
    },
    "chat-service": {
      "openapi": "openapi/chat-service/openapi.yaml",
      "projectRoot": "apps/chat-service",
      "coverageThreshold": 80
    },
    "api-gateway": {
      "openapi": "openapi/api-gateway/openapi.yaml",
      "projectRoot": "apps/api-gateway",
      "coverageThreshold": 75
    }
  }
}
```

## Running Validators Across Apps

### Validator Runner for All Services

**scripts/validation/run-validators.js**
```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, 'validation-registry.json');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

const args = process.argv.slice(2);
const phase = args[0]; // e.g., 'phase0', 'phase1', 'phase2'
const service = args[1]; // optional: specific service name

if (!phase) {
  console.error('Usage: node run-validators.js <phase> [service]');
  console.error('Example: node run-validators.js phase0');
  console.error('Example: node run-validators.js phase1 auth-service');
  process.exit(1);
}

const validators = registry.validators[phase];
if (!validators) {
  console.error(`No validators found for phase: ${phase}`);
  process.exit(1);
}

console.log(`\n=== Running ${phase} Validators ===\n`);

let hasFailures = false;

for (const [validatorName, config] of Object.entries(validators)) {
  console.log(`\n📋 ${validatorName}: ${config.description}`);

  try {
    if (config.scope === 'all-services') {
      // Run once for all services
      execSync(`node ${config.script}`, { stdio: 'inherit' });
      console.log(`✅ ${validatorName} passed`);

    } else if (config.scope === 'per-service') {
      // Run for each service
      const services = service
        ? [service]
        : Object.keys(registry.services);

      for (const svc of services) {
        console.log(`  Validating ${svc}...`);
        execSync(`node ${config.script} ${svc}`, { stdio: 'inherit' });
        console.log(`  ✅ ${svc} passed`);
      }

    } else if (config.scope === 'shared') {
      // Run for shared resources
      execSync(`node ${config.script}`, { stdio: 'inherit' });
      console.log(`✅ ${validatorName} passed`);
    }

  } catch (error) {
    console.error(`❌ ${validatorName} failed`);
    hasFailures = true;
  }
}

if (hasFailures) {
  console.error(`\n❌ ${phase} validation failed`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${phase} validators passed`);
}
```

### Phase-Specific Validators

**scripts/validation/phase0/validate-openapi.js**
```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '../validation-registry.json');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

console.log('Validating OpenAPI contracts for all services...\n');

let hasFailures = false;

for (const [serviceName, config] of Object.entries(registry.services)) {
  const specPath = config.openapi;

  console.log(`Validating ${serviceName}...`);

  try {
    // Validate spec syntax
    execSync(`npx swagger-cli validate ${specPath}`, { stdio: 'inherit' });

    // Bundle spec (resolve $refs)
    const outPath = `dist/openapi/${serviceName}.json`;
    execSync(`npx swagger-cli bundle ${specPath} -o ${outPath}`, { stdio: 'inherit' });

    console.log(`✅ ${serviceName} contract is valid\n`);
  } catch (error) {
    console.error(`❌ ${serviceName} contract validation failed\n`);
    hasFailures = true;
  }
}

if (hasFailures) {
  console.error('❌ OpenAPI validation failed');
  process.exit(1);
}

console.log('✅ All OpenAPI contracts validated successfully');
```

**scripts/validation/phase1/validate-contracts.js**
```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const serviceName = process.argv[2];
if (!serviceName) {
  console.error('Usage: node validate-contracts.js <service-name>');
  process.exit(1);
}

const REGISTRY_PATH = path.join(__dirname, '../validation-registry.json');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const serviceConfig = registry.services[serviceName];

if (!serviceConfig) {
  console.error(`Service not found: ${serviceName}`);
  process.exit(1);
}

console.log(`Validating contract implementation for ${serviceName}...\n`);

// Run contract tests for this service
const testCommand = `npx nx test ${serviceName} --testPathPattern=.*\\.contract\\.spec\\.ts$`;

try {
  execSync(testCommand, { stdio: 'inherit' });
  console.log(`\n✅ ${serviceName} contract implementation validated`);
} catch (error) {
  console.error(`\n❌ ${serviceName} contract implementation validation failed`);
  process.exit(1);
}
```

## Per-App vs Shared Configs

### Shared Configuration

**jest.config.base.js (workspace root)**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageReporters: ['text', 'lcov', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts'
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Per-Service Configuration

**apps/auth-service/jest.config.ts**
```typescript
import baseConfig from '../../jest.config.base';

export default {
  ...baseConfig,
  displayName: 'auth-service',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  coverageDirectory: '../../coverage/apps/auth-service',
  coverageThreshold: {
    global: {
      branches: 85,  // Higher threshold for auth
      functions: 85,
      lines: 85,
      statements: 85
    }
  }
};
```

## Monorepo-Aware TDD Enforcement

### TDD Enforcement Configuration

**scripts/validation/phase2/tdd-enforcement.js**
```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get affected apps using Nx
function getAffectedApps() {
  const output = execSync('npx nx affected:apps --plain', { encoding: 'utf8' });
  return output.trim().split(/\s+/).filter(Boolean);
}

// Check if app has RED phase recorded
function hasRedPhase(appName) {
  const redPhasePath = `apps/${appName}/.tdd-enforcement/RED_PHASE.json`;
  return fs.existsSync(redPhasePath);
}

// Check if app has passing tests
function hasPassingTests(appName) {
  try {
    execSync(`npx nx test ${appName} --passWithNoTests=false`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

console.log('Enforcing TDD workflow for affected apps...\n');

const affectedApps = getAffectedApps();

if (affectedApps.length === 0) {
  console.log('No affected apps. Skipping TDD enforcement.');
  process.exit(0);
}

console.log(`Affected apps: ${affectedApps.join(', ')}\n`);

let violations = [];

for (const app of affectedApps) {
  console.log(`Checking ${app}...`);

  const redPhase = hasRedPhase(app);
  const passingTests = hasPassingTests(app);

  if (!redPhase) {
    violations.push(`${app}: No RED phase recorded (missing .tdd-enforcement/RED_PHASE.json)`);
  }

  if (!passingTests) {
    violations.push(`${app}: Tests are failing (GREEN phase not reached)`);
  }

  if (redPhase && passingTests) {
    console.log(`✅ ${app} followed TDD workflow\n`);
  }
}

if (violations.length > 0) {
  console.error('\n❌ TDD Enforcement Violations:\n');
  violations.forEach(v => console.error(`  - ${v}`));
  console.error('\nTDD workflow must be followed: RED → GREEN → REFACTOR');
  process.exit(1);
}

console.log('✅ All affected apps followed TDD workflow');
```

### Git Hooks for Monorepo

**scripts/git-hooks/pre-commit**
```bash
#!/bin/bash

set -e

echo "Running pre-commit checks..."

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Check if any TypeScript files are staged
if echo "$STAGED_FILES" | grep -q '\.ts$'; then
  echo "Running linter on staged files..."
  npx lint-staged
fi

# Check if any app files are staged
if echo "$STAGED_FILES" | grep -q '^apps/'; then
  echo "Running affected tests..."
  npx nx affected --target=test --base=HEAD
fi

# Check if OpenAPI files are staged
if echo "$STAGED_FILES" | grep -q '^openapi/'; then
  echo "Validating OpenAPI contracts..."
  node scripts/validation/phase0/validate-openapi.js
fi

echo "✅ Pre-commit checks passed"
```

## Dashboard for All Services

### Validation Status Dashboard

**scripts/validation/generate-dashboard.js**
```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, 'validation-registry.json');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

const OUTPUT_PATH = 'docs/validation-status.md';

let markdown = '# Validation Status Dashboard\n\n';
markdown += `Last updated: ${new Date().toISOString()}\n\n`;

// Service status table
markdown += '## Service Status\n\n';
markdown += '| Service | OpenAPI | Contracts | Tests | Coverage | TDD |\n';
markdown += '|---------|---------|-----------|-------|----------|-----|\n';

for (const [serviceName, config] of Object.entries(registry.services)) {
  const openapi = checkOpenAPI(serviceName);
  const contracts = checkContracts(serviceName);
  const tests = checkTests(serviceName);
  const coverage = checkCoverage(serviceName);
  const tdd = checkTDD(serviceName);

  markdown += `| ${serviceName} | ${openapi} | ${contracts} | ${tests} | ${coverage} | ${tdd} |\n`;
}

markdown += '\n## Legend\n\n';
markdown += '- ✅ Passing\n';
markdown += '- ❌ Failing\n';
markdown += '- ⚠️ Warning\n';
markdown += '- ⏭️ Skipped\n';

fs.writeFileSync(OUTPUT_PATH, markdown);
console.log(`Dashboard generated: ${OUTPUT_PATH}`);

function checkOpenAPI(service) {
  try {
    const config = registry.services[service];
    fs.accessSync(config.openapi);
    return '✅';
  } catch {
    return '❌';
  }
}

function checkContracts(service) {
  // Check if contract tests exist and pass
  try {
    const { execSync } = require('child_process');
    execSync(`npx nx test ${service} --testPathPattern=.*\\.contract\\.spec\\.ts$ --passWithNoTests`, { stdio: 'ignore' });
    return '✅';
  } catch {
    return '❌';
  }
}

function checkTests(service) {
  try {
    const { execSync } = require('child_process');
    execSync(`npx nx test ${service}`, { stdio: 'ignore' });
    return '✅';
  } catch {
    return '❌';
  }
}

function checkCoverage(service) {
  const coveragePath = `coverage/apps/${service}/coverage-summary.json`;
  if (!fs.existsSync(coveragePath)) return '⚠️';

  const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  const total = coverage.total.lines.pct;
  const threshold = registry.services[service].coverageThreshold;

  return total >= threshold ? '✅' : '❌';
}

function checkTDD(service) {
  const redPhasePath = `apps/${service}/.tdd-enforcement/RED_PHASE.json`;
  return fs.existsSync(redPhasePath) ? '✅' : '⏭️';
}
```

## Nx Integration

### Validation Targets in project.json

**apps/auth-service/project.json**
```json
{
  "name": "auth-service",
  "targets": {
    "validate-phase0": {
      "executor": "nx:run-commands",
      "options": {
        "command": "node scripts/validation/run-validators.js phase0 auth-service"
      }
    },
    "validate-phase1": {
      "executor": "nx:run-commands",
      "options": {
        "command": "node scripts/validation/run-validators.js phase1 auth-service"
      }
    },
    "validate-phase2": {
      "executor": "nx:run-commands",
      "options": {
        "command": "node scripts/validation/run-validators.js phase2 auth-service"
      }
    },
    "validate-all": {
      "executor": "nx:run-commands",
      "options": {
        "commands": [
          "nx validate-phase0 auth-service",
          "nx validate-phase1 auth-service",
          "nx validate-phase2 auth-service"
        ],
        "parallel": false
      }
    }
  }
}
```

### Running Validation Across All Services

```bash
# Validate all services for all phases
nx run-many --target=validate-all --all

# Validate affected services only
nx affected --target=validate-all

# Validate specific phase for all services
nx run-many --target=validate-phase0 --all
```

## Best Practices

1. **Shared Registry:** Maintain single source of truth for validation config
2. **Affected Validation:** Only validate affected services in CI
3. **Per-Service Thresholds:** Allow different thresholds per service
4. **Dashboard:** Generate validation status dashboard
5. **Git Hooks:** Enforce validation on commit/push
6. **Parallel Execution:** Run validators in parallel where possible

## Anti-Patterns to Avoid

1. Validating all services on every commit (use affected)
2. Duplicate validation configs per service
3. Skipping validation for "small" changes
4. Not tracking TDD enforcement
5. Missing integration with CI/CD

## Related Handbook Sections

- `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` - Phase validation requirements
- `handbook/RULEBOOK.md` - Validation rules
- `stacks/nx-monorepo/BUILD_AND_DEPLOY.md` - CI/CD integration
- `stacks/nx-monorepo/MULTI_APP_COORDINATION.md` - Service coordination
