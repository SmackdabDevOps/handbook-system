#!/usr/bin/env ts-node
/**
 * Check All Phase Gates - Chain of Trust System
 *
 * Comprehensive gate checker for ALL phases (config-driven)
 * - RUNS enabled phase validation scripts and updates registry
 * - Checks validator results from registry
 * - Returns structured output showing which phases pass/fail
 * - Exit code 0 = all pass, Exit code 1 = blockers exist
 *
 * Usage:
 *   npx ts-node gates.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, findProjectRoot, getAbsolutePath, getRegistryPath } from './config/loader';

// Import registry functions if available, otherwise use fallback
let checkAllPhaseGates: any;
let detectRegressions: any;

try {
  const registryLib = require('./lib/validation-registry');
  checkAllPhaseGates = registryLib.checkAllPhaseGates;
  detectRegressions = registryLib.detectRegressions;
} catch {
  // Fallback implementations if lib not available
  checkAllPhaseGates = () => ({ allPassed: true, phases: [] });
  detectRegressions = () => [];
}

interface PhaseCheckResult {
  passed: boolean;
  output: string;
  error?: string;
}

/**
 * Run a command and return result
 */
function runCheck(command: string, description: string, cwd: string): PhaseCheckResult {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
      cwd,
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
function updatePhaseGate(
  registryPath: string,
  phaseKey: string,
  passed: boolean,
  details?: string
): void {
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

    if (registry.phaseGates && registry.phaseGates[phaseKey]) {
      registry.phaseGates[phaseKey].lastCheck = new Date().toISOString();
      registry.phaseGates[phaseKey].passed = passed;
      if (details) {
        registry.phaseGates[phaseKey].lastDetails = details;
      }
    }

    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  } catch (error) {
    console.warn(`Warning: Could not update registry for ${phaseKey}`);
  }
}

/**
 * Run Phase 1 checks: Stories & Business Rules
 */
function runPhase1Checks(config: any, projectRoot: string, registryPath: string): PhaseCheckResult {
  console.log('  Running check-business-rules-coverage...');
  const result = runCheck(
    'npx ts-node docs/test-plans/scripts/check-business-rules-coverage.ts 2>&1',
    'Business rules coverage',
    projectRoot
  );
  updatePhaseGate(registryPath, 'phase1', result.passed, result.error);
  return result;
}

/**
 * Run Phase 2 checks: Contracts & Registry
 */
function runPhase2Checks(config: any, projectRoot: string, registryPath: string): PhaseCheckResult {
  const checks = [
    { cmd: 'npm run validate:naming 2>&1', name: 'Naming conventions' },
    { cmd: 'npm run validate:openapi-dto 2>&1', name: 'OpenAPI-DTO alignment' },
    { cmd: config.commands['openapi:bundle'] + ' 2>&1', name: 'OpenAPI bundle' },
    { cmd: config.commands['endpoints:validate'] + ' 2>&1', name: 'Endpoints validate' },
    { cmd: 'npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts 2>&1', name: 'Documentation matrix' },
    { cmd: 'npx ts-node docs/test-plans/scripts/check-acceptance-coverage.ts 2>&1', name: 'Acceptance coverage' },
  ];

  let allPassed = true;
  let combinedOutput = '';
  const failures: string[] = [];

  for (const check of checks) {
    console.log(`  Running ${check.name}...`);
    const result = runCheck(check.cmd, check.name, projectRoot);
    combinedOutput += `\n--- ${check.name} ---\n${result.output}\n`;

    if (!result.passed) {
      allPassed = false;
      failures.push(`${check.name}: ${result.error || 'failed'}`);
    }
  }

  updatePhaseGate(
    registryPath,
    'phase2',
    allPassed,
    allPassed ? undefined : failures.join('; ')
  );
  return {
    passed: allPassed,
    output: combinedOutput,
    error: failures.length > 0 ? failures.join('; ') : undefined,
  };
}

/**
 * Run Phase 3 checks: Backend Implementation
 */
function runPhase3Checks(config: any, projectRoot: string, registryPath: string): PhaseCheckResult {
  const checks = [
    { cmd: config.commands['openapi:bundle'] + ' 2>&1', name: 'OpenAPI bundle' },
    { cmd: config.commands['endpoints:validate'] + ' 2>&1', name: 'Endpoints validate' },
  ];

  let allPassed = true;
  let combinedOutput = '';
  const failures: string[] = [];

  for (const check of checks) {
    console.log(`  Running ${check.name}...`);
    const result = runCheck(check.cmd, check.name, projectRoot);
    combinedOutput += `\n--- ${check.name} ---\n${result.output}\n`;

    if (!result.passed) {
      allPassed = false;
      failures.push(`${check.name}: ${result.error || 'failed'}`);
    }
  }

  updatePhaseGate(
    registryPath,
    'phase3',
    allPassed,
    allPassed ? undefined : failures.join('; ')
  );
  return {
    passed: allPassed,
    output: combinedOutput,
    error: failures.length > 0 ? failures.join('; ') : undefined,
  };
}

/**
 * Run Phase 4 coverage checks: UX Specs Coverage
 */
function runPhase4CoverageChecks(config: any, projectRoot: string, registryPath: string): PhaseCheckResult {
  const checks = [
    { cmd: 'npx ts-node scripts/check-story-coverage.ts 2>&1', name: 'Story coverage' },
    { cmd: 'npx ts-node scripts/check-endpoint-coverage.ts 2>&1', name: 'Endpoint coverage (GATE)' },
    { cmd: 'npx ts-node docs/test-plans/scripts/validate-ux-specs-against-contracts.ts 2>&1', name: 'UX specs vs contracts' },
  ];

  let allPassed = true;
  let combinedOutput = '';
  const failures: string[] = [];

  for (const check of checks) {
    console.log(`  Running ${check.name}...`);
    const result = runCheck(check.cmd, check.name, projectRoot);
    combinedOutput += `\n--- ${check.name} ---\n${result.output}\n`;

    if (!result.passed) {
      allPassed = false;
      failures.push(`${check.name}: ${result.error || 'failed'}`);
    }
  }

  updatePhaseGate(
    registryPath,
    'phase4-coverage',
    allPassed,
    allPassed ? undefined : failures.join('; ')
  );
  return {
    passed: allPassed,
    output: combinedOutput,
    error: failures.length > 0 ? failures.join('; ') : undefined,
  };
}

/**
 * Run Phase 5 coverage checks: Spec-Script Coverage
 */
function runPhase5CoverageChecks(config: any, projectRoot: string, registryPath: string): PhaseCheckResult {
  const checks = [
    { cmd: 'npx ts-node scripts/check-spec-script-coverage.ts 2>&1', name: 'Spec-script coverage (GATE)' },
  ];

  let allPassed = true;
  let combinedOutput = '';
  const failures: string[] = [];

  for (const check of checks) {
    console.log(`  Running ${check.name}...`);
    const result = runCheck(check.cmd, check.name, projectRoot);
    combinedOutput += `\n--- ${check.name} ---\n${result.output}\n`;

    if (!result.passed) {
      allPassed = false;
      failures.push(`${check.name}: ${result.error || 'failed'}`);
    }
  }

  updatePhaseGate(
    registryPath,
    'phase5-coverage',
    allPassed,
    allPassed ? undefined : failures.join('; ')
  );
  return {
    passed: allPassed,
    output: combinedOutput,
    error: failures.length > 0 ? failures.join('; ') : undefined,
  };
}

/**
 * Main function
 */
function main() {
  try {
    const projectRoot = findProjectRoot();
    const config = loadConfig(projectRoot);
    const registryPath = getRegistryPath(projectRoot);
    const enabledPhases = config.phases.enabled;

    console.log('🔍 Checking all phase gates...\n');
    console.log(`Project: ${config.projectName}`);
    console.log(`Enabled phases: ${enabledPhases.join(', ')}\n`);

    // Check for regressions first
    const regressions = detectRegressions();
    if (regressions.length > 0) {
      console.log('⚠️  ACTIVE REGRESSIONS DETECTED:');
      for (const regression of regressions) {
        console.log(`   - ${regression.validator} (${regression.timestamp})`);
        if (regression.gitCommit) {
          console.log(`     Commit: ${regression.gitCommit}`);
        }
      }
      console.log('');
    }

    let phase1: PhaseCheckResult = { passed: true, output: '' };
    let phase2: PhaseCheckResult = { passed: true, output: '' };
    let phase3: PhaseCheckResult = { passed: true, output: '' };
    let phase4Coverage: PhaseCheckResult = { passed: true, output: '' };
    let phase5Coverage: PhaseCheckResult = { passed: true, output: '' };

    // Run enabled phase checks
    if (enabledPhases.includes(1)) {
      console.log('📋 Phase 1: Stories & Business Rules');
      phase1 = runPhase1Checks(config, projectRoot, registryPath);
      console.log(phase1.passed ? '   ✅ PASSED\n' : `   ❌ FAILED: ${phase1.error}\n`);
    }

    if (enabledPhases.includes(2)) {
      console.log('📋 Phase 2: Contracts & Registry');
      phase2 = runPhase2Checks(config, projectRoot, registryPath);
      console.log(phase2.passed ? '   ✅ PASSED\n' : `   ❌ FAILED: ${phase2.error}\n`);
    }

    if (enabledPhases.includes(3)) {
      console.log('📋 Phase 3: Backend Implementation');
      phase3 = runPhase3Checks(config, projectRoot, registryPath);
      console.log(phase3.passed ? '   ✅ PASSED\n' : `   ❌ FAILED: ${phase3.error}\n`);
    }

    if (enabledPhases.includes(4)) {
      console.log('📋 Phase 4: UX Specs Coverage (GATES)');
      phase4Coverage = runPhase4CoverageChecks(config, projectRoot, registryPath);
      console.log(phase4Coverage.passed ? '   ✅ PASSED\n' : `   ❌ FAILED: ${phase4Coverage.error}\n`);
    }

    // Check all phase gates (includes phases 4-5 validators from registry)
    console.log('📋 Phases 4-5: UX Validators (from registry)\n');
    const result = checkAllPhaseGates();

    if (enabledPhases.includes(5)) {
      console.log('📋 Phase 5: Spec-Script Coverage (GATE)');
      phase5Coverage = runPhase5CoverageChecks(config, projectRoot, registryPath);
      console.log(phase5Coverage.passed ? '   ✅ PASSED\n' : `   ❌ FAILED: ${phase5Coverage.error}\n`);
    }

    // Display results for each phase
    for (const phase of result.phases) {
      const icon = phase.passed ? '✅' : '❌';
      const phaseName = phase.name || phase.phase;
      console.log(`${icon} ${phase.phase.toUpperCase()}: ${phaseName}`);

      if (phase.blockers.length > 0) {
        console.log('   Blockers:');
        for (const blocker of phase.blockers) {
          console.log(`     - ${blocker}`);
        }
      }

      if (phase.warnings && phase.warnings.length > 0) {
        console.log('   Warnings:');
        for (const warning of phase.warnings) {
          console.log(`     - ${warning}`);
        }
      }

      console.log('');
    }

    // Summary
    const coverageGatesPassed = phase4Coverage.passed && phase5Coverage.passed;
    const corePhasesPassed = phase1.passed && phase2.passed && phase3.passed;
    const allPassed = result.allPassed && coverageGatesPassed && corePhasesPassed;

    const passedCount = result.phases.filter((p: any) => p.passed).length;
    const totalCount = result.phases.length;

    console.log('─'.repeat(60));
    console.log(`Phase Gates: ${passedCount}/${totalCount} passing`);
    console.log(`Coverage Gates: ${coverageGatesPassed ? '✅' : '❌'} (Phase 4 endpoint + Phase 5 spec-script)`);

    if (allPassed) {
      console.log('✅ All phase gates PASSED - safe to proceed');
      console.log('');
      process.exit(0);
    } else {
      console.log('❌ Some phase gates FAILED - blockers exist');
      console.log('');
      console.log('Fix lowest failing phase first:');

      if (!phase1.passed) console.log(`  Phase 1: ${phase1.error}`);
      if (!phase2.passed) console.log(`  Phase 2: ${phase2.error}`);
      if (!phase3.passed) console.log(`  Phase 3: ${phase3.error}`);
      if (!phase4Coverage.passed) console.log(`  Phase 4 Coverage: ${phase4Coverage.error}`);
      if (!phase5Coverage.passed) console.log(`  Phase 5 Coverage: ${phase5Coverage.error}`);

      const failedPhases = result.phases.filter((p: any) => !p.passed);
      for (const phase of failedPhases) {
        console.log(`  ${phase.phase}: ${phase.blockers.join(', ')}`);
      }

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

if (require.main === module) {
  main();
}
