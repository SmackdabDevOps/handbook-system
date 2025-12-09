#!/usr/bin/env ts-node
/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Check All Phase Gates - Chain of Trust System
 *
 * TEMPLATE: Copy to your project's scripts/validation/ directory
 *
 * Comprehensive gate checker for ALL phases (0-5)
 * - RUNS phase 0-3 validation scripts and updates registry
 * - Check phase 4-5 validator results from registry
 * - Return structured output showing which phases pass/fail
 * - Exit code 0 = all pass, Exit code 1 = blockers exist
 *
 * CRITICAL: Chain of Trust - later phases FAIL if earlier phases fail
 *
 * Usage:
 *   npx ts-node scripts/validation/check-all-phase-gates.ts
 *
 * CUSTOMIZATION REQUIRED:
 * 1. Update phase check commands to match your project
 * 2. Update registry path if different
 * 3. Add/remove phases as needed
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// CUSTOMIZE: Import from your validation-registry library
// =============================================================================
// import { checkAllPhaseGates, detectRegressions } from './lib/validation-registry';
// import { getRegistryPath } from './lib/config';

// =============================================================================
// CUSTOMIZE: Registry path
// =============================================================================
const REGISTRY_PATH = path.join(__dirname, 'validation-registry.json');

interface PhaseCheckResult {
  passed: boolean;
  output: string;
  error?: string;
}

/**
 * Run a command and return result
 */
function runCheck(command: string, description: string): PhaseCheckResult {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000, // 60 second timeout
    });
    return { passed: true, output };
  } catch (error: any) {
    return {
      passed: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
    };
  }
}

/**
 * Update phaseGates in registry with check results
 */
function updatePhaseGate(phaseKey: string, passed: boolean, details?: string): void {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

  if (!registry.phaseGates) {
    registry.phaseGates = {};
  }

  if (!registry.phaseGates[phaseKey]) {
    registry.phaseGates[phaseKey] = {};
  }

  registry.phaseGates[phaseKey].lastCheck = new Date().toISOString();
  registry.phaseGates[phaseKey].passed = passed;
  if (details) {
    registry.phaseGates[phaseKey].lastDetails = details;
  }

  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

/**
 * Update phaseValidation in registry when a phase passes
 */
function updatePhaseValidation(phase: string, passed: boolean): void {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

  if (!registry.phaseValidation) {
    registry.phaseValidation = {};
  }

  const phaseKey = `phase${phase}`;
  if (!registry.phaseValidation[phaseKey]) {
    registry.phaseValidation[phaseKey] = { validated: false, timestamp: '', gitCommit: '' };
  }

  registry.phaseValidation[phaseKey].validated = passed;
  registry.phaseValidation[phaseKey].timestamp = passed ? new Date().toISOString() : '';

  if (passed) {
    try {
      const gitCommit = execSync('git rev-parse --short HEAD', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      registry.phaseValidation[phaseKey].gitCommit = gitCommit;
    } catch {
      registry.phaseValidation[phaseKey].gitCommit = 'unknown';
    }
  } else {
    registry.phaseValidation[phaseKey].gitCommit = '';
  }

  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

// =============================================================================
// CUSTOMIZE: Phase 0 checks
// =============================================================================
function runPhase0Checks(): PhaseCheckResult {
  console.log('  Running validate-phase0...');

  // CUSTOMIZE: Update command to match your project
  const result = runCheck(
    'npx ts-node scripts/validation/validate-phase0.ts 2>&1',
    'Phase 0 - Project Structure & Documentation',
  );

  updatePhaseGate('phase0', result.passed, result.error);
  updatePhaseValidation('0', result.passed);
  return result;
}

// =============================================================================
// CUSTOMIZE: Phase 1 checks
// =============================================================================
function runPhase1Checks(): PhaseCheckResult {
  // CUSTOMIZE: Add your Phase 1 validation commands
  const checks = [
    {
      cmd: 'npx ts-node docs/test-plans/scripts/check-business-rules-coverage.ts 2>&1',
      name: 'Business rules coverage',
    },
    // Add more checks as needed
  ];

  let allPassed = true;
  let combinedOutput = '';
  const failures: string[] = [];

  for (const check of checks) {
    console.log(`  Running ${check.name}...`);
    const result = runCheck(check.cmd, check.name);
    combinedOutput += `\n--- ${check.name} ---\n${result.output}\n`;

    if (!result.passed) {
      allPassed = false;
      failures.push(`${check.name}: ${result.error || 'failed'}`);
    }
  }

  updatePhaseGate('phase1', allPassed, allPassed ? undefined : failures.join('; '));
  updatePhaseValidation('1', allPassed);
  return {
    passed: allPassed,
    output: combinedOutput,
    error: failures.length > 0 ? failures.join('; ') : undefined,
  };
}

// =============================================================================
// CUSTOMIZE: Phase 2 checks
// =============================================================================
function runPhase2Checks(): PhaseCheckResult {
  // CUSTOMIZE: Add your Phase 2 validation commands
  const checks = [
    { cmd: 'npm run validate:naming 2>&1', name: 'Naming conventions' },
    { cmd: 'npm run validate:openapi-dto 2>&1', name: 'OpenAPI-DTO alignment' },
    { cmd: 'npm run openapi:bundle 2>&1', name: 'OpenAPI bundle' },
    { cmd: 'npm run endpoints:validate 2>&1', name: 'Endpoints validate' },
    // Add more checks as needed
  ];

  let allPassed = true;
  let combinedOutput = '';
  const failures: string[] = [];

  for (const check of checks) {
    console.log(`  Running ${check.name}...`);
    const result = runCheck(check.cmd, check.name);
    combinedOutput += `\n--- ${check.name} ---\n${result.output}\n`;

    if (!result.passed) {
      allPassed = false;
      failures.push(`${check.name}: ${result.error || 'failed'}`);
    }
  }

  updatePhaseGate('phase2', allPassed, allPassed ? undefined : failures.join('; '));
  updatePhaseValidation('2', allPassed);
  return {
    passed: allPassed,
    output: combinedOutput,
    error: failures.length > 0 ? failures.join('; ') : undefined,
  };
}

// =============================================================================
// CUSTOMIZE: Phase 3 checks - Backend Implementation
// =============================================================================
function runPhase3Checks(): PhaseCheckResult {
  const checks = [
    { cmd: 'npm run openapi:bundle 2>&1', name: 'OpenAPI bundle' },
    { cmd: 'npm run endpoints:validate 2>&1', name: 'Endpoints validate' },
  ];

  let allPassed = true;
  let combinedOutput = '';
  const failures: string[] = [];

  for (const check of checks) {
    console.log(`  Running ${check.name}...`);
    const result = runCheck(check.cmd, check.name);
    combinedOutput += `\n--- ${check.name} ---\n${result.output}\n`;

    if (!result.passed) {
      allPassed = false;
      failures.push(`${check.name}: ${result.error || 'failed'}`);
    }
  }

  // CRITICAL CHECK: No planned endpoints allowed - work must not be stranded
  console.log(`  Checking for planned (unimplemented) endpoints...`);
  try {
    // CUSTOMIZE: Update path to your ENDPOINTS.json
    const endpointsPath = path.join(process.cwd(), 'architecture/ENDPOINTS.json');
    const endpointsData = JSON.parse(fs.readFileSync(endpointsPath, 'utf8'));
    const plannedEndpoints = endpointsData.endpoints.filter(
      (e: { status: string }) => e.status === 'planned',
    );

    if (plannedEndpoints.length > 0) {
      allPassed = false;
      const plannedList = plannedEndpoints
        .slice(0, 5)
        .map((e: { method: string; path: string }) => `${e.method} ${e.path}`)
        .join(', ');
      const moreText = plannedEndpoints.length > 5 ? ` (+${plannedEndpoints.length - 5} more)` : '';
      failures.push(
        `${plannedEndpoints.length} planned endpoints need implementation: ${plannedList}${moreText}`,
      );
      combinedOutput += `\n--- Planned Endpoints Check ---\nFAILED: ${plannedEndpoints.length} endpoints awaiting implementation\n`;
    } else {
      combinedOutput += `\n--- Planned Endpoints Check ---\nPASSED: All contracted endpoints are implemented\n`;
    }
  } catch (error: any) {
    // If we can't read ENDPOINTS.json, that's a failure too
    allPassed = false;
    failures.push(`Cannot read ENDPOINTS.json: ${error.message}`);
  }

  updatePhaseGate('phase3', allPassed, allPassed ? undefined : failures.join('; '));
  updatePhaseValidation('3', allPassed);
  return {
    passed: allPassed,
    output: combinedOutput,
    error: failures.length > 0 ? failures.join('; ') : undefined,
  };
}

// =============================================================================
// Phase 4 coverage checks: UX Specs Coverage
// =============================================================================
function runPhase4CoverageChecks(): PhaseCheckResult {
  // CUSTOMIZE: Add your Phase 4 validation commands
  const checks = [
    { cmd: 'npx ts-node scripts/check-story-coverage.ts 2>&1', name: 'Story coverage' },
    { cmd: 'npx ts-node scripts/check-endpoint-coverage.ts 2>&1', name: 'Endpoint coverage (GATE)' },
  ];

  let allPassed = true;
  let combinedOutput = '';
  const failures: string[] = [];

  for (const check of checks) {
    console.log(`  Running ${check.name}...`);
    const result = runCheck(check.cmd, check.name);
    combinedOutput += `\n--- ${check.name} ---\n${result.output}\n`;

    if (!result.passed) {
      allPassed = false;
      failures.push(`${check.name}: ${result.error || 'failed'}`);
    }
  }

  updatePhaseGate('phase4-coverage', allPassed, allPassed ? undefined : failures.join('; '));
  return {
    passed: allPassed,
    output: combinedOutput,
    error: failures.length > 0 ? failures.join('; ') : undefined,
  };
}

// =============================================================================
// Phase 5 coverage checks: Spec-Script Coverage
// CRITICAL: Phase 5 FAILS if Phase 4 failed (Chain of Trust)
// =============================================================================
function runPhase5CoverageChecks(phase4Passed: boolean): PhaseCheckResult {
  // CRITICAL: Phase 5 cannot pass if Phase 4 failed
  if (!phase4Passed) {
    console.log(`  ⚠️  Phase 4 failed - Phase 5 blocked (chain of trust)`);
    updatePhaseGate('phase5-coverage', false, 'Blocked: Phase 4 must pass first');
    return {
      passed: false,
      output: 'Phase 5 blocked - Phase 4 (UX Specs) must pass first',
      error: 'Blocked: Phase 4 must pass first (chain of trust)',
    };
  }

  // CUSTOMIZE: Add your Phase 5 validation commands
  const checks = [
    { cmd: 'npx ts-node scripts/check-spec-script-coverage.ts 2>&1', name: 'Spec-script coverage (GATE)' },
  ];

  let allPassed = true;
  let combinedOutput = '';
  const failures: string[] = [];

  for (const check of checks) {
    console.log(`  Running ${check.name}...`);
    const result = runCheck(check.cmd, check.name);
    combinedOutput += `\n--- ${check.name} ---\n${result.output}\n`;

    if (!result.passed) {
      allPassed = false;
      failures.push(`${check.name}: ${result.error || 'failed'}`);
    }
  }

  updatePhaseGate('phase5-coverage', allPassed, allPassed ? undefined : failures.join('; '));
  return {
    passed: allPassed,
    output: combinedOutput,
    error: failures.length > 0 ? failures.join('; ') : undefined,
  };
}

// =============================================================================
// Main
// =============================================================================
function main() {
  try {
    console.log('🔍 Checking all phase gates (0-5)...\n');

    // Run Phase 0-3 checks (these actually execute the scripts)
    console.log('📋 Phase 0: Feature List');
    const phase0 = runPhase0Checks();
    console.log(phase0.passed ? '   ✅ PASSED\n' : `   ❌ FAILED: ${phase0.error}\n`);

    console.log('📋 Phase 1: Stories & Business Rules');
    const phase1 = runPhase1Checks();
    console.log(phase1.passed ? '   ✅ PASSED\n' : `   ❌ FAILED: ${phase1.error}\n`);

    console.log('📋 Phase 2: Contracts & Registry');
    const phase2 = runPhase2Checks();
    console.log(phase2.passed ? '   ✅ PASSED\n' : `   ❌ FAILED: ${phase2.error}\n`);

    console.log('📋 Phase 3: Backend Implementation');
    const phase3 = runPhase3Checks();
    console.log(phase3.passed ? '   ✅ PASSED\n' : `   ❌ FAILED: ${phase3.error}\n`);

    // Phase 4-5 coverage checks (handbook-documented gates)
    console.log('📋 Phase 4: UX Specs Coverage (GATES)');
    const phase4Coverage = runPhase4CoverageChecks();
    console.log(phase4Coverage.passed ? '   ✅ PASSED\n' : `   ❌ FAILED: ${phase4Coverage.error}\n`);

    // CRITICAL: Pass phase4 result - Phase 5 is blocked if Phase 4 fails (chain of trust)
    console.log('📋 Phase 5: Spec-Script Coverage (GATE)');
    const phase5Coverage = runPhase5CoverageChecks(phase4Coverage.passed);
    console.log(phase5Coverage.passed ? '   ✅ PASSED\n' : `   ❌ FAILED: ${phase5Coverage.error}\n`);

    // Summary
    const allPassed = phase0.passed && phase1.passed && phase2.passed && phase3.passed &&
                      phase4Coverage.passed && phase5Coverage.passed;

    console.log('─'.repeat(60));

    if (allPassed) {
      console.log('✅ All phase gates PASSED - safe to proceed');
      console.log('');
      process.exit(0);
    } else {
      console.log('❌ Some phase gates FAILED - blockers exist');
      console.log('');
      console.log('Fix lowest failing phase first:');

      // Report core phase failures (in order - Phase 0 first!)
      if (!phase0.passed) console.log(`  Phase 0 (Feature List): ${phase0.error}`);
      if (!phase1.passed) console.log(`  Phase 1: ${phase1.error}`);
      if (!phase2.passed) console.log(`  Phase 2: ${phase2.error}`);
      if (!phase3.passed) console.log(`  Phase 3: ${phase3.error}`);
      if (!phase4Coverage.passed) console.log(`  Phase 4 Coverage: ${phase4Coverage.error}`);
      if (!phase5Coverage.passed) console.log(`  Phase 5 Coverage: ${phase5Coverage.error}`);

      console.log('');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Phase gate check failed:', error.message);
    console.error('\nValidation registry not found or corrupted.');
    console.error('Run: npm run validation:all\n');
    process.exit(1);
  }
}

main();
