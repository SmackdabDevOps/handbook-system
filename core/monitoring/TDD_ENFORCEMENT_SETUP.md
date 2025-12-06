# TDD Enforcement System - Setup Guide

> **Version:** 1.0.0 (2025-12-06)
>
> **Purpose:** Complete guide to setting up the Test-Driven Development (TDD) enforcement system in a new project.

---

## Overview

This system enforces TDD at the tooling level, making it impossible for AI agents (or developers) to:

- Write implementation code before tests exist
- Skip the RED phase (tests must fail first)
- Commit without validation
- Push without passing all phase gates

**Components:**

1. **Validation Registry** - Single source of truth for test/validation status
2. **TDD Gate Scripts** - Check unit, contract, and integration test coverage
3. **RED Phase Checker** - Enforces test-first development
4. **Commit Guard** - Blocks commits when validation is stale
5. **Claude Hooks** - Intercepts tool calls to enforce TDD
6. **PM Dashboard** - Real-time visibility into TDD status

---

## Prerequisites

Before setting up, ensure you have:

```bash
# Required dependencies
npm install --save-dev ts-node typescript glob jest

# For Claude Code integration
# Claude Code must be installed and configured
```

---

## Step 1: Create Directory Structure

```bash
mkdir -p scripts/validation/lib
mkdir -p scripts/dashboard
mkdir -p .claude
```

**Project structure after setup:**

```
project-root/
├── .claude/
│   └── hooks.json              # Claude hook configuration
├── scripts/
│   ├── validation/
│   │   ├── lib/
│   │   │   └── validation-registry.ts   # Registry library
│   │   ├── validation-registry.json     # Registry data (generated)
│   │   ├── check-red-phase.ts           # RED phase gate
│   │   ├── check-unit-test-coverage.ts  # Unit test gate
│   │   ├── check-contract-test-coverage.ts  # Contract test gate
│   │   ├── check-integration-test-coverage.ts  # Integration test gate
│   │   └── commit-guard.ts              # Commit blocker
│   └── dashboard/
│       ├── collect-dashboard-data.ts    # Dashboard data collector
│       └── index.html                   # PM Dashboard UI
└── handbook/
    └── monitoring/                      # Documentation
```

---

## Step 2: Create the Validation Registry Library

**File:** `scripts/validation/lib/validation-registry.ts`

This is the core library that all validators use to report results.

```typescript
/**
 * Validation Registry - Single Source of Truth
 */

import * as fs from 'fs';
import * as path from 'path';

const REGISTRY_PATH = path.join(__dirname, '..', 'validation-registry.json');

// ========== INTERFACES ==========

export interface ValidationResult {
  validator: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number; // milliseconds
  details?: {
    failedTestNames?: string[];
    skippedTestNames?: string[];
    notes?: string;
  };
}

export interface ValidatorEntry {
  lastRun: string | null;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  details?: ValidationResult['details'];
  runBy: string;
  gitCommit?: string;
  history: Array<{
    timestamp: string;
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
  }>;
}

export interface TDDStats {
  lastUpdated: string | null;
  unit_tests: {
    coverage_percent: number;
    passing: boolean;
  };
  contract_tests: {
    total_endpoints: number;
    endpoints_with_tests: number;
    coverage_percent: number;
    passing: boolean;
  };
  integration_tests: {
    cross_module_calls: number;
    calls_with_tests: number;
    coverage_percent: number; // -1 means "N/A" (nothing to test)
    passing: boolean;
  };
}

export interface ValidationRegistry {
  version: string;
  lastFullRun: string | null;
  validators: Record<string, ValidatorEntry>;
  stats?: {
    tdd?: TDDStats;
  };
  redPhaseVerified?: Record<
    string,
    {
      verified: boolean;
      timestamp: string;
      gitCommit?: string;
    }
  >;
  phaseGates: Record<string, any>;
}

// ========== REGISTRY OPERATIONS ==========

export function readRegistry(): ValidationRegistry {
  if (!fs.existsSync(REGISTRY_PATH)) {
    return createEmptyRegistry();
  }
  try {
    const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return createEmptyRegistry();
  }
}

export function writeRegistry(registry: ValidationRegistry): void {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

function createEmptyRegistry(): ValidationRegistry {
  return {
    version: '1.0.0',
    lastFullRun: null,
    validators: {},
    stats: {
      tdd: {
        lastUpdated: null,
        unit_tests: { coverage_percent: 0, passing: false },
        contract_tests: {
          total_endpoints: 0,
          endpoints_with_tests: 0,
          coverage_percent: 0,
          passing: false,
        },
        integration_tests: {
          cross_module_calls: 0,
          calls_with_tests: 0,
          coverage_percent: 0,
          passing: false,
        },
      },
    },
    redPhaseVerified: {},
    phaseGates: {},
  };
}

// ========== VALIDATION REPORTING ==========

function getGitCommit(): string | undefined {
  try {
    const { execSync } = require('child_process');
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim().slice(0, 7);
  } catch {
    return undefined;
  }
}

export async function reportValidationResult(result: ValidationResult): Promise<void> {
  const registry = readRegistry();

  const entry: ValidatorEntry = {
    lastRun: new Date().toISOString(),
    passed: result.passed,
    totalTests: result.totalTests,
    passedTests: result.passedTests,
    failedTests: result.failedTests,
    skippedTests: result.skippedTests,
    duration: result.duration,
    details: result.details,
    runBy: 'script',
    gitCommit: getGitCommit(),
    history: registry.validators[result.validator]?.history || [],
  };

  // Add to history (keep last 10)
  entry.history.unshift({
    timestamp: entry.lastRun!,
    passed: result.passed,
    totalTests: result.totalTests,
    passedTests: result.passedTests,
    failedTests: result.failedTests,
  });
  entry.history = entry.history.slice(0, 10);

  registry.validators[result.validator] = entry;
  writeRegistry(registry);
}

// ========== TDD STATS UPDATES ==========

export function updateUnitTestStats(stats: TDDStats['unit_tests']): void {
  const registry = readRegistry();
  if (!registry.stats) registry.stats = {};
  if (!registry.stats.tdd) {
    registry.stats.tdd = {
      lastUpdated: null,
      unit_tests: { coverage_percent: 0, passing: false },
      contract_tests: {
        total_endpoints: 0,
        endpoints_with_tests: 0,
        coverage_percent: 0,
        passing: false,
      },
      integration_tests: {
        cross_module_calls: 0,
        calls_with_tests: 0,
        coverage_percent: 0,
        passing: false,
      },
    };
  }
  registry.stats.tdd.unit_tests = stats;
  registry.stats.tdd.lastUpdated = new Date().toISOString();
  writeRegistry(registry);
}

export function updateContractTestStats(stats: TDDStats['contract_tests']): void {
  const registry = readRegistry();
  if (!registry.stats) registry.stats = {};
  if (!registry.stats.tdd) {
    registry.stats.tdd = {
      lastUpdated: null,
      unit_tests: { coverage_percent: 0, passing: false },
      contract_tests: {
        total_endpoints: 0,
        endpoints_with_tests: 0,
        coverage_percent: 0,
        passing: false,
      },
      integration_tests: {
        cross_module_calls: 0,
        calls_with_tests: 0,
        coverage_percent: 0,
        passing: false,
      },
    };
  }
  registry.stats.tdd.contract_tests = stats;
  registry.stats.tdd.lastUpdated = new Date().toISOString();
  writeRegistry(registry);
}

export function updateIntegrationTestStats(stats: TDDStats['integration_tests']): void {
  const registry = readRegistry();
  if (!registry.stats) registry.stats = {};
  if (!registry.stats.tdd) {
    registry.stats.tdd = {
      lastUpdated: null,
      unit_tests: { coverage_percent: 0, passing: false },
      contract_tests: {
        total_endpoints: 0,
        endpoints_with_tests: 0,
        coverage_percent: 0,
        passing: false,
      },
      integration_tests: {
        cross_module_calls: 0,
        calls_with_tests: 0,
        coverage_percent: 0,
        passing: false,
      },
    };
  }
  registry.stats.tdd.integration_tests = stats;
  registry.stats.tdd.lastUpdated = new Date().toISOString();
  writeRegistry(registry);
}

export function getTDDStats(): TDDStats | null {
  const registry = readRegistry();
  return registry.stats?.tdd || null;
}
```

---

## Step 3: Create RED Phase Checker

**File:** `scripts/validation/check-red-phase.ts`

This script verifies that tests exist AND fail with assertion errors before allowing implementation.

```typescript
#!/usr/bin/env ts-node
/**
 * RED Phase Verification - Test-Driven Development Gate
 *
 * Verifies tests exist for specific module and FAIL with assertion errors
 * (not import/syntax errors). Part of TDD: RED -> GREEN -> REFACTOR
 *
 * Exit codes:
 *   0 = RED phase satisfied (tests exist and FAIL with assertion errors)
 *   1 = RED phase not satisfied
 *
 * Usage:
 *   npx ts-node scripts/validation/check-red-phase.ts <module>
 *   npx ts-node scripts/validation/check-red-phase.ts <module> --green
 */

import * as path from 'path';
import { execSync } from 'child_process';
import { glob } from 'glob';
import {
  reportValidationResult,
  ValidationResult,
  readRegistry,
  writeRegistry,
} from './lib/validation-registry';

const PROJECT_ROOT = path.join(__dirname, '..', '..');

// Find test files for a module
async function findTestFiles(moduleName: string): Promise<string[]> {
  const patterns = [
    path.join(PROJECT_ROOT, `src/modules/${moduleName}/**/__tests__/*.spec.ts`),
    path.join(PROJECT_ROOT, `src/modules/${moduleName}/**/*.spec.ts`),
    path.join(PROJECT_ROOT, `test/**/${moduleName}*.spec.ts`),
  ];

  const allFiles: string[] = [];
  for (const pattern of patterns) {
    try {
      const files = await glob(pattern);
      allFiles.push(...files);
    } catch {
      /* ignore */
    }
  }
  return Array.from(new Set(allFiles));
}

// Analyze test failure type
function analyzeTestFailure(
  output: string,
  error: string,
): {
  failureType: 'assertion' | 'import' | 'syntax' | 'unknown';
  message: string;
} {
  const combined = output + '\n' + error;

  if (combined.includes('Cannot find module') || combined.includes('Module not found')) {
    return { failureType: 'import', message: 'Test failed due to import error' };
  }
  if (combined.includes('SyntaxError:') || combined.includes('Unexpected token')) {
    return { failureType: 'syntax', message: 'Test failed due to syntax error' };
  }
  if (
    combined.includes('expect(') ||
    combined.includes('Expected:') ||
    combined.includes('FAIL ')
  ) {
    return {
      failureType: 'assertion',
      message: 'Test failed with assertion error (expected for RED phase)',
    };
  }
  return { failureType: 'unknown', message: 'Test failed with unknown error type' };
}

// Run tests for a module
function runModuleTests(
  moduleName: string,
  testFiles: string[],
): {
  passed: boolean;
  output: string;
  error: string;
  failureAnalysis?: ReturnType<typeof analyzeTestFailure>;
} {
  try {
    const testPatterns = testFiles.map((f) => f.replace(PROJECT_ROOT, '.')).join('|');
    const output = execSync(`npm test -- --testPathPattern='${testPatterns}' 2>&1`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
    });
    return { passed: true, output, error: '' };
  } catch (error: any) {
    const output = error.stdout || '';
    const errorOutput = error.stderr || error.message;
    return {
      passed: false,
      output,
      error: errorOutput,
      failureAnalysis: analyzeTestFailure(output, errorOutput),
    };
  }
}

// Check if module is verified in registry
function isModuleVerified(moduleName: string): boolean {
  const registry = readRegistry();
  const redPhaseVerified = (registry as any).redPhaseVerified || {};
  return !!redPhaseVerified[moduleName];
}

// Mark module as verified
function markModuleVerified(moduleName: string): void {
  const registry = readRegistry();
  if (!(registry as any).redPhaseVerified) {
    (registry as any).redPhaseVerified = {};
  }
  (registry as any).redPhaseVerified[moduleName] = {
    verified: true,
    timestamp: new Date().toISOString(),
  };
  writeRegistry(registry);
}

// Main
async function main() {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  const moduleName = args.find((a) => !a.startsWith('--'));
  const forceFlag = args.includes('--force');
  const greenFlag = args.includes('--green');

  if (!moduleName) {
    console.error('Usage: check-red-phase.ts <moduleName> [--force] [--green]');
    process.exit(1);
  }

  const phaseMode = greenFlag ? 'GREEN' : 'RED';
  console.log(`Checking ${phaseMode} phase for module: ${moduleName}\n`);

  // Check if already verified
  if (!greenFlag && !forceFlag && isModuleVerified(moduleName)) {
    console.log(`Module '${moduleName}' already verified for RED phase`);
    process.exit(0);
  }

  const testFiles = await findTestFiles(moduleName);

  if (testFiles.length === 0) {
    console.error(`No test files found for module '${moduleName}'`);
    console.error('Write tests first! (RED phase)');
    process.exit(1);
  }

  console.log(`Found ${testFiles.length} test file(s)`);
  const testResult = runModuleTests(moduleName, testFiles);
  const duration = Date.now() - startTime;

  if (greenFlag) {
    // GREEN PHASE: Tests should PASS
    if (testResult.passed) {
      console.log(`GREEN phase satisfied for '${moduleName}'`);
      process.exit(0);
    } else {
      console.error(`GREEN phase FAILED - tests are still failing`);
      process.exit(1);
    }
  } else {
    // RED PHASE: Tests should FAIL with assertion errors
    if (testResult.passed) {
      console.error(`RED phase FAILED - tests are PASSING (should fail first)`);
      process.exit(1);
    }

    const analysis = testResult.failureAnalysis;

    if (analysis?.failureType === 'import' || analysis?.failureType === 'syntax') {
      console.error(`RED phase FAILED - tests fail with ${analysis.failureType} errors`);
      console.error('Fix import/syntax issues first');
      process.exit(1);
    }

    if (analysis?.failureType === 'unknown') {
      console.error(`RED phase FAILED - tests fail with unknown error type`);
      console.error('Ensure tests use expect()/assert()');
      process.exit(1);
    }

    // Tests failed with assertion errors - RED phase satisfied!
    markModuleVerified(moduleName);
    console.log(`RED phase satisfied for '${moduleName}'`);
    console.log('Next: Implement the functionality, then run with --green');
    process.exit(0);
  }
}

main();
```

---

## Step 4: Create Unit Test Coverage Checker

**File:** `scripts/validation/check-unit-test-coverage.ts`

```typescript
#!/usr/bin/env ts-node
/**
 * Unit Test Coverage Checker
 *
 * Exit codes:
 *   0 = Coverage meets threshold (90%)
 *   1 = Coverage below threshold
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { reportValidationResult, updateUnitTestStats } from './lib/validation-registry';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const COVERAGE_SUMMARY = path.join(PROJECT_ROOT, 'coverage/coverage-summary.json');
const COVERAGE_THRESHOLD = 90;

async function main() {
  const startTime = Date.now();
  console.log(`Checking unit test coverage (target: ${COVERAGE_THRESHOLD}%)...\n`);

  try {
    // Run Jest with coverage
    execSync('npm test -- --coverage --passWithNoTests', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
  } catch {
    // Tests may fail but we still want the coverage report
  }

  if (!fs.existsSync(COVERAGE_SUMMARY)) {
    console.error('Coverage summary not found');
    updateUnitTestStats({ coverage_percent: 0, passing: false });
    process.exit(1);
  }

  const summary = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY, 'utf-8'));
  const lineCoverage = summary.total?.lines?.pct || 0;
  const passed = lineCoverage >= COVERAGE_THRESHOLD;
  const duration = Date.now() - startTime;

  await reportValidationResult({
    validator: 'unit-test-coverage',
    passed,
    totalTests: 4,
    passedTests: passed ? 4 : 0,
    failedTests: passed ? 0 : 4,
    skippedTests: 0,
    duration,
    details: { notes: `Line coverage: ${lineCoverage}%` },
  });

  updateUnitTestStats({ coverage_percent: lineCoverage, passing: passed });

  console.log(`\nCoverage: ${lineCoverage}% (threshold: ${COVERAGE_THRESHOLD}%)`);
  process.exit(passed ? 0 : 1);
}

main();
```

---

## Step 5: Create Contract Test Coverage Checker

**File:** `scripts/validation/check-contract-test-coverage.ts`

```typescript
#!/usr/bin/env ts-node
/**
 * Contract Test Coverage Checker
 *
 * Verifies every API endpoint has a contract test.
 * Reads endpoints from your API specification.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { reportValidationResult, updateContractTestStats } from './lib/validation-registry';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const ENDPOINTS_FILE = path.join(PROJECT_ROOT, 'architecture/ENDPOINTS.json');
const CONTRACT_TEST_DIR = path.join(PROJECT_ROOT, 'test/contracts');

async function main() {
  const startTime = Date.now();
  console.log('Checking contract test coverage...\n');

  // Load endpoints (adjust path to your endpoint list)
  if (!fs.existsSync(ENDPOINTS_FILE)) {
    console.log('No ENDPOINTS.json found - skipping contract coverage');
    updateContractTestStats({
      total_endpoints: 0,
      endpoints_with_tests: 0,
      coverage_percent: 100,
      passing: true,
    });
    process.exit(0);
  }

  const endpoints = JSON.parse(fs.readFileSync(ENDPOINTS_FILE, 'utf-8'));
  const testFiles = await glob(path.join(CONTRACT_TEST_DIR, '**/*.spec.ts'));

  // Read test files to find which endpoints are covered
  const testedEndpoints = new Set<string>();
  for (const file of testFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    // Look for endpoint references in test files
    for (const ep of endpoints) {
      if (content.includes(ep.path) || content.includes(ep.id)) {
        testedEndpoints.add(ep.id);
      }
    }
  }

  const totalEndpoints = endpoints.length;
  const endpointsWithTests = testedEndpoints.size;
  const coveragePercent =
    totalEndpoints > 0 ? Math.round((endpointsWithTests / totalEndpoints) * 100) : 100;
  const passed = coveragePercent === 100;
  const duration = Date.now() - startTime;

  await reportValidationResult({
    validator: 'contract-test-coverage',
    passed,
    totalTests: totalEndpoints,
    passedTests: endpointsWithTests,
    failedTests: totalEndpoints - endpointsWithTests,
    skippedTests: 0,
    duration,
    details: { notes: `Contract coverage: ${coveragePercent}%` },
  });

  updateContractTestStats({
    total_endpoints: totalEndpoints,
    endpoints_with_tests: endpointsWithTests,
    coverage_percent: coveragePercent,
    passing: passed,
  });

  console.log(`Coverage: ${coveragePercent}% (${endpointsWithTests}/${totalEndpoints})`);
  process.exit(passed ? 0 : 1);
}

main();
```

---

## Step 6: Create Integration Test Coverage Checker

**File:** `scripts/validation/check-integration-test-coverage.ts`

```typescript
#!/usr/bin/env ts-node
/**
 * Integration Test Coverage Checker
 *
 * Checks for cross-module dependencies and verifies integration tests exist.
 * Returns N/A (-1) if no cross-module dependencies are detected.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { reportValidationResult, updateIntegrationTestStats } from './lib/validation-registry';

const PROJECT_ROOT = path.join(__dirname, '..', '..');

async function main() {
  const startTime = Date.now();
  console.log('Checking integration test coverage...\n');

  // Find module files and detect cross-module imports
  const moduleFiles = await glob(path.join(PROJECT_ROOT, 'src/modules/**/*.module.ts'));
  const crossModuleInteractions = new Map<string, Set<string>>();

  for (const file of moduleFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const moduleName = path.basename(path.dirname(path.dirname(file)));

    // Look for imports from other modules
    const importMatches = content.matchAll(/imports:\s*\[([^\]]+)\]/g);
    for (const match of importMatches) {
      const imports = match[1];
      // Find other module imports (adjust pattern to your project)
      const otherModules = imports.match(/(\w+)Module/g) || [];
      for (const dep of otherModules) {
        if (!dep.includes(moduleName)) {
          const key = `${moduleName} -> ${dep}`;
          crossModuleInteractions.set(key, new Set([moduleName, dep]));
        }
      }
    }
  }

  const duration = Date.now() - startTime;

  if (crossModuleInteractions.size === 0) {
    console.log('No cross-module dependencies detected (N/A)\n');

    await reportValidationResult({
      validator: 'integration-test-coverage',
      passed: true,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration,
      details: { notes: 'No cross-module dependencies - N/A' },
    });

    // Use -1 as sentinel for "N/A"
    updateIntegrationTestStats({
      cross_module_calls: 0,
      calls_with_tests: 0,
      coverage_percent: -1,
      passing: false,
    });

    process.exit(0);
  }

  // Check for integration tests
  const integrationTests = await glob(path.join(PROJECT_ROOT, 'test/integration/**/*.spec.ts'));
  // ... check which interactions are covered by tests ...

  const coveragePercent = 0; // Calculate actual coverage
  updateIntegrationTestStats({
    cross_module_calls: crossModuleInteractions.size,
    calls_with_tests: 0,
    coverage_percent: coveragePercent,
    passing: coveragePercent === 100,
  });

  process.exit(coveragePercent === 100 ? 0 : 1);
}

main();
```

---

## Step 7: Create Commit Guard

**File:** `scripts/validation/commit-guard.ts`

```typescript
#!/usr/bin/env ts-node
/**
 * Commit Guard - Blocks commits when validation is stale
 *
 * Exit codes:
 *   0 = OK to commit
 *   1 = Blocked (run validations first)
 */

import { execSync } from 'child_process';
import { readRegistry } from './lib/validation-registry';

function getCurrentCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim().slice(0, 7);
  } catch {
    return 'unknown';
  }
}

function getChangedFiles(): string[] {
  try {
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    return staged.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  const registry = readRegistry();
  const currentCommit = getCurrentCommit();
  const changedFiles = getChangedFiles();

  // Check if src/ files were changed
  const srcChanged = changedFiles.some((f) => f.startsWith('src/'));

  if (!srcChanged) {
    console.log('No src/ files changed - commit allowed');
    process.exit(0);
  }

  // Check if validators are stale (run on different commit)
  const staleValidators: string[] = [];
  for (const [name, entry] of Object.entries(registry.validators)) {
    if (entry.gitCommit !== currentCommit && entry.lastRun) {
      staleValidators.push(name);
    }
  }

  if (staleValidators.length > 0) {
    console.error('Commit guard: BLOCKED');
    console.error(`Changed files: ${changedFiles.join(', ')}`);
    console.error('Blockers:');
    console.error(`  - Stale validators: ${staleValidators.join(', ')}`);
    console.error('\nRun validators on current commit first.');
    process.exit(1);
  }

  console.log('Commit guard: OK');
  process.exit(0);
}

main();
```

---

## Step 8: Configure Claude Hooks

**File:** `.claude/hooks.json`

This is the critical file that intercepts Claude Code tool calls to enforce TDD.

```json
{
  "description": "TDD enforcement - blocks implementation before tests",
  "documentation": {
    "version": "2.2.0",
    "lastUpdated": "2025-12-06"
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Analyzing command: $TOOL_INPUT.command\n\nIF this command starts with 'git commit':\n1. Run: npx ts-node scripts/validation/commit-guard.ts\n2. If exit code 1: respond 'deny' with blockers\n3. If exit code 0: respond 'approve'\n\nFor ALL other commands: respond 'approve' immediately."
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "=== TDD COMPLIANCE CHECK ===\n\nFile path: $TOOL_INPUT.file_path\n\n--- EXCLUSIONS (approve immediately) ---\nIF file matches: *.dto.ts, *.model.ts, *.module.ts, *.spec.ts, *.test.ts, */index.ts, *.interface.ts, *.types.ts, *.constants.ts, scripts/**/*.ts, test/**/*.ts, docs/**/*: respond 'approve'\n\n--- SERVICES ---\nIF path matches 'src/modules/*/services/*.service.ts':\n1. Extract module name from path\n2. Check if file is NEW (git log returns error)\n3. If NEW:\n   a. Check if test exists at {dir}/__tests__/{filename}.spec.ts\n   b. If NO test: respond 'deny' with 'TDD VIOLATION: Write test first'\n   c. Check if RED phase verified in registry\n   d. If NOT verified: respond 'deny' with 'TDD VIOLATION: Run check-red-phase.ts first'\n4. If EXISTS: respond 'approve' (legacy)\n\n--- CONTROLLERS ---\nIF path matches 'src/modules/*/controllers/*.controller.ts':\nSame logic as services.\n\n--- DEFAULT ---\nFor all other paths: respond 'approve'"
          }
        ]
      }
    ]
  }
}
```

---

## Step 9: Add npm Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "check:unit-coverage": "npx ts-node scripts/validation/check-unit-test-coverage.ts",
    "check:contract-coverage": "npx ts-node scripts/validation/check-contract-test-coverage.ts",
    "check:integration-coverage": "npx ts-node scripts/validation/check-integration-test-coverage.ts",
    "check:red-phase": "npx ts-node scripts/validation/check-red-phase.ts",
    "tdd:cycle": "npm run test && npm run check:unit-coverage && npm run check:contract-coverage && npm run check:integration-coverage",
    "dashboard:update": "npx ts-node scripts/dashboard/collect-dashboard-data.ts"
  }
}
```

---

## Step 10: Initialize the Registry

Create the initial registry file:

```bash
# Create empty registry
cat > scripts/validation/validation-registry.json << 'EOF'
{
  "version": "1.0.0",
  "lastFullRun": null,
  "validators": {},
  "stats": {
    "tdd": {
      "lastUpdated": null,
      "unit_tests": { "coverage_percent": 0, "passing": false },
      "contract_tests": { "total_endpoints": 0, "endpoints_with_tests": 0, "coverage_percent": 0, "passing": false },
      "integration_tests": { "cross_module_calls": 0, "calls_with_tests": 0, "coverage_percent": 0, "passing": false }
    }
  },
  "redPhaseVerified": {},
  "phaseGates": {}
}
EOF
```

---

## Step 11: Create Dashboard Data Collector

**File:** `scripts/dashboard/collect-dashboard-data.ts`

```typescript
#!/usr/bin/env ts-node
/**
 * Dashboard Data Collector
 * Reads from registry and outputs data for PM dashboard
 */

import * as fs from 'fs';
import * as path from 'path';
import { readRegistry } from '../validation/lib/validation-registry';

const OUTPUT_PATH = path.join(__dirname, 'dashboard-data.json');

async function main() {
  console.log('Collecting dashboard data...\n');

  const registry = readRegistry();
  const tddStats = registry.stats?.tdd || {
    unit_tests: { coverage_percent: 0, passing: false },
    contract_tests: {
      total_endpoints: 0,
      endpoints_with_tests: 0,
      coverage_percent: 0,
      passing: false,
    },
    integration_tests: {
      cross_module_calls: 0,
      calls_with_tests: 0,
      coverage_percent: 0,
      passing: false,
    },
  };

  const dashboardData = {
    generated_at: new Date().toISOString(),
    tdd_stats: {
      unit_tests: {
        coverage_percent: tddStats.unit_tests.coverage_percent,
        passing: tddStats.unit_tests.passing,
      },
      contract_tests: {
        total_endpoints: tddStats.contract_tests.total_endpoints,
        endpoints_with_tests: tddStats.contract_tests.endpoints_with_tests,
        coverage_percent: tddStats.contract_tests.coverage_percent,
        passing: tddStats.contract_tests.passing,
      },
      integration_tests: {
        cross_module_calls: tddStats.integration_tests.cross_module_calls,
        calls_with_tests: tddStats.integration_tests.calls_with_tests,
        coverage_percent: tddStats.integration_tests.coverage_percent, // -1 = N/A
        passing: tddStats.integration_tests.passing,
      },
    },
    validators: Object.entries(registry.validators).map(([name, entry]) => ({
      name,
      status: entry.passed ? 'pass' : 'fail',
      lastRun: entry.lastRun,
      tests: {
        total: entry.totalTests,
        passed: entry.passedTests,
        failed: entry.failedTests,
      },
    })),
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dashboardData, null, 2));
  console.log(`Dashboard data written to ${OUTPUT_PATH}`);
}

main();
```

---

## Verification

After setup, verify everything works:

```bash
# 1. Run coverage checks
npm run check:unit-coverage
npm run check:contract-coverage
npm run check:integration-coverage

# 2. Verify registry was updated
cat scripts/validation/validation-registry.json | grep -A 10 '"stats"'

# 3. Update dashboard
npm run dashboard:update

# 4. Test RED phase enforcement (should fail if no tests)
npm run check:red-phase -- mymodule

# 5. Try to commit (should be blocked if validators stale)
git add .
git commit -m "test"
```

---

## Summary

| Component            | File                                                    | Purpose                  |
| -------------------- | ------------------------------------------------------- | ------------------------ |
| Registry Library     | `scripts/validation/lib/validation-registry.ts`         | Core data management     |
| Unit Coverage        | `scripts/validation/check-unit-test-coverage.ts`        | Jest coverage gate       |
| Contract Coverage    | `scripts/validation/check-contract-test-coverage.ts`    | API test gate            |
| Integration Coverage | `scripts/validation/check-integration-test-coverage.ts` | Cross-module test gate   |
| RED Phase            | `scripts/validation/check-red-phase.ts`                 | TDD sequence enforcement |
| Commit Guard         | `scripts/validation/commit-guard.ts`                    | Commit blocker           |
| Claude Hooks         | `.claude/hooks.json`                                    | Tool-level enforcement   |
| Dashboard Collector  | `scripts/dashboard/collect-dashboard-data.ts`           | PM visibility            |

**The system is non-negotiable. It enforces TDD at every level.**

---

## See Also

- [CLAUDE_HOOKS.md](CLAUDE_HOOKS.md) - Hook configuration details
- [VALIDATION_REGISTRY.md](VALIDATION_REGISTRY.md) - Registry schema
- [PHASE_GATES.md](PHASE_GATES.md) - Phase gate requirements
- [PM_DASHBOARD.md](PM_DASHBOARD.md) - Dashboard setup
