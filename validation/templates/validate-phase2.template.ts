#!/usr/bin/env ts-node
/**
 * Phase 2 Validator Template
 *
 * Phase 2 validates: Test Coverage
 * - Unit tests exist and pass
 * - Contract tests cover all endpoints
 * - Integration tests cover cross-module dependencies
 *
 * Usage: Copy this file, rename to validate-phase2.ts, customize configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// CONFIGURATION - CUSTOMIZE THESE VALUES
// ============================================================================

const PROJECT_ROOT = path.join(__dirname, '..', '..');

// CUSTOMIZE: Adjust these to match your project's test commands
const MANUAL_CONFIG = {
  testCommands: {
    unit: 'npm test -- --coverage --passWithNoTests',
    contract: 'npm run test:contract', // or 'npm run test:e2e'
    integration: 'npm run test:integration',
  },
  thresholds: {
    unitCoverage: 90, // percent
    contractCoverage: 100, // percent (all endpoints must have tests)
    integrationCoverage: 100, // percent (all cross-module calls must have tests)
  },
  paths: {
    coverageSummary: 'coverage/coverage-summary.json',
    endpointsJson: 'architecture/ENDPOINTS.json',
  },
};

const USE_MANUAL_CONFIG = true;

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

interface Phase2Results {
  unitCoverage: number;
  unitPassed: boolean;
  contractCoverage: number;
  contractPassed: boolean;
  integrationCoverage: number;
  integrationPassed: boolean;
  issues: string[];
}

function runCommand(command: string, description: string): boolean {
  console.log(`Running: ${command}`);
  try {
    execSync(command, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
    console.log(`  ✓ ${description} passed`);
    return true;
  } catch (error: any) {
    console.log(`  ✗ ${description} failed`);
    return false;
  }
}

function getUnitCoverage(): number {
  const config = USE_MANUAL_CONFIG ? MANUAL_CONFIG : null;
  if (!config) return 0;

  const coveragePath = path.join(PROJECT_ROOT, config.paths.coverageSummary);
  if (!fs.existsSync(coveragePath)) {
    console.log('  ⚠ Coverage summary not found');
    return 0;
  }

  try {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
    const total = coverage.total;

    // Average of all coverage metrics
    const avgCoverage = (
      total.lines.pct +
      total.statements.pct +
      total.functions.pct +
      total.branches.pct
    ) / 4;

    console.log(`  Lines: ${total.lines.pct}%`);
    console.log(`  Statements: ${total.statements.pct}%`);
    console.log(`  Functions: ${total.functions.pct}%`);
    console.log(`  Branches: ${total.branches.pct}%`);
    console.log(`  Average: ${avgCoverage.toFixed(2)}%`);

    return avgCoverage;
  } catch (error: any) {
    console.log(`  ✗ Failed to parse coverage: ${error.message}`);
    return 0;
  }
}

function getContractCoverage(): { coverage: number; details: string } {
  const config = USE_MANUAL_CONFIG ? MANUAL_CONFIG : null;
  if (!config) return { coverage: 0, details: 'Config not loaded' };

  const endpointsPath = path.join(PROJECT_ROOT, config.paths.endpointsJson);
  if (!fs.existsSync(endpointsPath)) {
    return { coverage: 0, details: 'ENDPOINTS.json not found' };
  }

  try {
    const endpointsContent = fs.readFileSync(endpointsPath, 'utf-8');
    const endpointsData = JSON.parse(endpointsContent);
    const endpoints = Array.isArray(endpointsData)
      ? endpointsData
      : endpointsData.endpoints || [];

    const totalEndpoints = endpoints.length;

    // CUSTOMIZE: This is a placeholder - you'll need to implement actual contract test counting
    // For example, scan test files for contract test markers or maintain a registry
    const coveredEndpoints = 0; // TODO: Implement actual counting

    const coverage = totalEndpoints > 0 ? (coveredEndpoints / totalEndpoints) * 100 : 0;

    return {
      coverage,
      details: `${coveredEndpoints}/${totalEndpoints} endpoints have contract tests`,
    };
  } catch (error: any) {
    return { coverage: 0, details: `Error: ${error.message}` };
  }
}

async function validatePhase2(): Promise<boolean> {
  console.log('=== Phase 2 Validation: Test Coverage ===\n');

  const config = USE_MANUAL_CONFIG ? MANUAL_CONFIG : null;
  if (!config) {
    console.error('ERROR: Configuration not loaded.');
    return false;
  }

  const results: Phase2Results = {
    unitCoverage: 0,
    unitPassed: false,
    contractCoverage: 0,
    contractPassed: false,
    integrationCoverage: 0,
    integrationPassed: false,
    issues: [],
  };

  // 1. Unit Tests
  console.log('1. Running unit tests...');
  results.unitPassed = runCommand(config.testCommands.unit, 'Unit tests');

  if (results.unitPassed) {
    console.log('\nChecking unit test coverage...');
    results.unitCoverage = getUnitCoverage();

    if (results.unitCoverage < config.thresholds.unitCoverage) {
      results.unitPassed = false;
      results.issues.push(
        `Unit coverage ${results.unitCoverage.toFixed(2)}% below threshold ${config.thresholds.unitCoverage}%`
      );
    }
  } else {
    results.issues.push('Unit tests failed to run');
  }

  // 2. Contract Tests
  console.log('\n2. Checking contract test coverage...');
  const contractResult = getContractCoverage();
  results.contractCoverage = contractResult.coverage;
  console.log(`  ${contractResult.details}`);

  if (results.contractCoverage < config.thresholds.contractCoverage) {
    results.contractPassed = false;
    results.issues.push(
      `Contract coverage ${results.contractCoverage.toFixed(2)}% below threshold ${config.thresholds.contractCoverage}%`
    );
  } else {
    results.contractPassed = true;
  }

  // 3. Integration Tests (if applicable)
  console.log('\n3. Checking integration tests...');
  console.log('  ℹ Integration tests are project-specific');
  console.log('  ℹ Customize this section based on your needs');

  // CUSTOMIZE: Implement integration test logic for your project
  // For now, we'll mark as passed
  results.integrationPassed = true;
  results.integrationCoverage = 100;

  // Summary
  console.log('\n=== Phase 2 Summary ===');
  console.log(`Unit Coverage: ${results.unitCoverage.toFixed(2)}% (threshold: ${config.thresholds.unitCoverage}%)`);
  console.log(`Unit Tests Passed: ${results.unitPassed ? 'YES' : 'NO'}`);
  console.log(`Contract Coverage: ${results.contractCoverage.toFixed(2)}% (threshold: ${config.thresholds.contractCoverage}%)`);
  console.log(`Contract Tests Passed: ${results.contractPassed ? 'YES' : 'NO'}`);
  console.log(`Integration Tests Passed: ${results.integrationPassed ? 'YES' : 'NO'}`);

  const passed =
    results.unitPassed &&
    results.contractPassed &&
    results.integrationPassed &&
    results.issues.length === 0;

  if (!passed) {
    console.log('\n❌ Phase 2 FAILED');
    results.issues.forEach((issue: string) => {
      console.log(`  - ${issue}`);
    });
  } else {
    console.log('\n✅ Phase 2 PASSED');
  }

  // Optional: Report to validation registry
  /*
  import { reportValidationResult } from './lib/validation-registry';
  reportValidationResult({
    validator: 'phase2',
    passed,
    totalTests: 3,
    passedTests: [
      results.unitPassed,
      results.contractPassed,
      results.integrationPassed
    ].filter(Boolean).length,
    failedTests: results.issues.length,
    skippedTests: 0,
    duration: 0,
    details: results,
  });
  */

  return passed;
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  validatePhase2()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch((error: any) => {
      console.error('Validation error:', error);
      process.exit(1);
    });
}

export { validatePhase2 };
