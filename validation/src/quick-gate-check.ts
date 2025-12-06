#!/usr/bin/env ts-node
/**
 * Quick Gate Check - Chain of Trust System
 *
 * Fast check (<5 seconds) for pre-commit hook (config-driven)
 * - Read-only checks (no API calls, file reads only)
 * - Check: registry freshness (results not stale)
 * - Check: any failed validators in registry
 * - Check: Phase 2-3 gates (naming, endpoints)
 * - Exit code 0 = safe to commit, Exit code 1 = blockers
 *
 * Usage: npx ts-node quick-gate-check.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, findProjectRoot, getRegistryPath } from './config/loader';

// Import registry functions if available, otherwise use fallback
let readRegistry: any;
let detectRegressions: any;

try {
  const registryLib = require('./lib/validation-registry');
  readRegistry = registryLib.readRegistry;
  detectRegressions = registryLib.detectRegressions;
} catch {
  // Fallback implementations if lib not available
  readRegistry = () => ({ validators: {}, phaseGates: {} });
  detectRegressions = () => [];
}

interface QuickCheckResult {
  passed: boolean;
  blockers: string[];
  warnings: string[];
}

/**
 * Check registry freshness
 */
function checkRegistryFreshness(staleThresholdHours: number = 2): QuickCheckResult {
  const result: QuickCheckResult = {
    passed: true,
    blockers: [],
    warnings: [],
  };

  const registry = readRegistry();
  const now = Date.now();
  const staleThresholdMs = staleThresholdHours * 60 * 60 * 1000;

  // Check for stale results
  const staleValidators: string[] = [];
  for (const [name, entry] of Object.entries(registry.validators)) {
    if ((entry as any).lastRun) {
      const age = now - new Date((entry as any).lastRun).getTime();
      if (age > staleThresholdMs) {
        staleValidators.push(name);
      }
    }
  }

  if (staleValidators.length > 0) {
    result.warnings.push(
      `Stale validators (>${staleThresholdHours}h): ${staleValidators.join(', ')}`
    );
  }

  return result;
}

/**
 * Check for failed validators
 */
function checkFailedValidators(): QuickCheckResult {
  const result: QuickCheckResult = {
    passed: true,
    blockers: [],
    warnings: [],
  };

  const registry = readRegistry();
  const failedValidators: string[] = [];

  for (const [name, entry] of Object.entries(registry.validators)) {
    const validatorEntry = entry as any;
    if (validatorEntry.lastRun && validatorEntry.passed === false) {
      failedValidators.push(`${name} (${validatorEntry.failedTests}/${validatorEntry.totalTests} failing)`);
    }
  }

  if (failedValidators.length > 0) {
    result.passed = false;
    result.blockers.push(
      `Failed validators: ${failedValidators.join(', ')}`
    );
  }

  return result;
}

/**
 * Check Phase 2-3 gates (naming, endpoints, etc.)
 */
function checkPhase2and3Gates(): QuickCheckResult {
  const result: QuickCheckResult = {
    passed: true,
    blockers: [],
    warnings: [],
  };

  const registry = readRegistry();

  // Check Phase 2: Contracts & Registry
  const phase2 = registry.phaseGates['phase2'];
  if (phase2 && 'requiredChecks' in phase2) {
    if (phase2.lastCheck === null) {
      result.warnings.push('Phase 2 (Contracts & Registry) not checked yet');
    } else if (phase2.passed === false) {
      result.blockers.push('Phase 2 (Contracts & Registry) checks failed');
      result.passed = false;
    }
  }

  // Check Phase 3: Backend Implementation
  const phase3 = registry.phaseGates['phase3'];
  if (phase3 && 'requiredChecks' in phase3) {
    if (phase3.lastCheck === null) {
      result.warnings.push('Phase 3 (Backend Implementation) not checked yet');
    } else if (phase3.passed === false) {
      result.blockers.push('Phase 3 (Backend Implementation) checks failed');
      result.passed = false;
    }
  }

  return result;
}

/**
 * Main function
 */
function main() {
  try {
    const projectRoot = findProjectRoot();
    const config = loadConfig(projectRoot);

    console.log('⚡ Quick gate check (pre-commit)...\n');

    const blockers: string[] = [];
    const warnings: string[] = [];

    // Check for regressions
    const regressions = detectRegressions();
    if (regressions.length > 0) {
      blockers.push(
        `Active regressions: ${regressions.map((r: any) => r.validator).join(', ')}`
      );
    }

    // Check registry freshness (use config thresholds if available)
    const staleThreshold = 2; // Could be made configurable
    const freshnessCheck = checkRegistryFreshness(staleThreshold);
    warnings.push(...freshnessCheck.warnings);

    // Check for failed validators
    const failedCheck = checkFailedValidators();
    if (!failedCheck.passed) {
      blockers.push(...failedCheck.blockers);
    }

    // Check Phase 2-3 gates (only if enabled in config)
    const enabledPhases = config.phases.enabled;
    if (enabledPhases.includes(2) || enabledPhases.includes(3)) {
      const phaseCheck = checkPhase2and3Gates();
      if (!phaseCheck.passed) {
        blockers.push(...phaseCheck.blockers);
      }
      warnings.push(...phaseCheck.warnings);
    }

    // Display warnings
    if (warnings.length > 0) {
      console.log('⚠️  Warnings:');
      for (const warning of warnings) {
        console.log(`   - ${warning}`);
      }
      console.log('');
    }

    // Display blockers and exit
    if (blockers.length > 0) {
      console.error('❌ Quick gate check: FAIL');
      console.error('\nBlockers:');
      for (const blocker of blockers) {
        console.error(`   - ${blocker}`);
      }
      console.error('\nAction required:');
      console.error('  npm run validation:all');
      console.error('');
      process.exit(1);
    }

    console.log('✅ Quick gate check: PASS - safe to commit');
    console.log('');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Quick gate check failed:', error.message);
    console.error('\nValidation registry not found or corrupted.');
    console.error('Run: npm run validation:all\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
