/**
 * Validation Registry - Single Source of Truth for Validation Status
 *
 * TEMPLATE: Copy to your project's scripts/validation/lib/ directory
 *
 * This module provides utilities for validators to report their results
 * to a central registry. Progress files are GENERATED from this registry,
 * never manually edited.
 *
 * Usage in validators:
 *   import { reportValidationResult, ValidationResult } from './lib/validation-registry';
 *
 *   const result: ValidationResult = {
 *     validator: 'auth',
 *     passed: true,
 *     totalTests: 15,
 *     passedTests: 15,
 *     failedTests: 0,
 *     skippedTests: 0,
 *     duration: 12500,
 *     details: { ... }
 *   };
 *
 *   await reportValidationResult(result);
 *
 * CUSTOMIZATION REQUIRED:
 * 1. Update REGISTRY_PATH to match your project structure
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// CUSTOMIZE: Registry path
// =============================================================================
const REGISTRY_PATH = path.join(__dirname, '..', 'validation-registry.json');

// =============================================================================
// Types
// =============================================================================

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

export interface HistoryEntry {
  timestamp: string; // ISO timestamp
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  transition?: 'pass->fail' | 'fail->pass' | 'first-run';
  gitCommit?: string;
}

export interface ValidatorEntry {
  lastRun: string | null; // ISO timestamp or null if never run
  passed: boolean | null; // null = never run (PENDING)
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  details?: ValidationResult['details'];
  runBy: string; // 'script' | 'manual' | 'ci'
  gitCommit?: string;
  history: HistoryEntry[];
}

export interface Regression {
  validator: string;
  timestamp: string;
  previousStatus: 'pass';
  currentStatus: 'fail';
  gitCommit?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface PhaseGate1to3 {
  name: string;
  requiredChecks: string[];
  lastCheck: string | null;
  passed: boolean | null;
}

export interface PhaseGate4to5 {
  requiredValidators: string[];
  requiredPassRate: number;
  description: string;
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
    coverage_percent: number;
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
  regressions: {
    active: Regression[];
    resolved: Regression[];
  };
  phaseGates: Record<string, PhaseGate1to3 | PhaseGate4to5>;
  phaseValidation?: Record<string, { validated: boolean; timestamp: string; gitCommit: string }>;
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Read the current registry state
 */
export function readRegistry(): ValidationRegistry {
  if (!fs.existsSync(REGISTRY_PATH)) {
    throw new Error(`Validation registry not found at ${REGISTRY_PATH}`);
  }
  const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  return JSON.parse(content);
}

/**
 * Write the registry to disk
 */
export function writeRegistry(registry: ValidationRegistry): void {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n');
}

/**
 * Get current git commit hash (if in a git repo)
 */
function getGitCommit(): string | undefined {
  try {
    const gitDir = path.join(__dirname, '..', '..', '..', '.git');
    if (fs.existsSync(gitDir)) {
      const headPath = path.join(gitDir, 'HEAD');
      const head = fs.readFileSync(headPath, 'utf-8').trim();
      if (head.startsWith('ref:')) {
        const refPath = path.join(gitDir, head.slice(5).trim());
        return fs.readFileSync(refPath, 'utf-8').trim().slice(0, 7);
      }
      return head.slice(0, 7);
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

/**
 * Report a validation result to the registry
 */
export async function reportValidationResult(
  result: ValidationResult,
  runBy: 'script' | 'manual' | 'ci' = 'script'
): Promise<void> {
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
    runBy,
    gitCommit: getGitCommit(),
    history: registry.validators[result.validator]?.history || [],
  };

  registry.validators[result.validator] = entry;
  writeRegistry(registry);
}

/**
 * Report a validation result WITH regression tracking
 * Tracks pass->fail transitions and updates history
 */
export async function reportValidationResultWithRegression(
  result: ValidationResult,
  runBy: 'script' | 'manual' | 'ci' = 'script'
): Promise<void> {
  const registry = readRegistry();
  const previousEntry = registry.validators[result.validator];
  const timestamp = new Date().toISOString();
  const gitCommit = getGitCommit();

  // Determine transition
  let transition: HistoryEntry['transition'] = 'first-run';
  if (previousEntry && previousEntry.passed !== null) {
    if (previousEntry.passed && !result.passed) {
      transition = 'pass->fail';
    } else if (!previousEntry.passed && result.passed) {
      transition = 'fail->pass';
    }
  }

  // Add to history
  const historyEntry: HistoryEntry = {
    timestamp,
    passed: result.passed,
    totalTests: result.totalTests,
    passedTests: result.passedTests,
    failedTests: result.failedTests,
    transition,
    gitCommit,
  };

  const history = previousEntry?.history || [];
  history.push(historyEntry);

  // Keep last 20 history entries
  if (history.length > 20) {
    history.shift();
  }

  // Create new entry
  const entry: ValidatorEntry = {
    lastRun: timestamp,
    passed: result.passed,
    totalTests: result.totalTests,
    passedTests: result.passedTests,
    failedTests: result.failedTests,
    skippedTests: result.skippedTests,
    duration: result.duration,
    details: result.details,
    runBy,
    gitCommit,
    history,
  };

  registry.validators[result.validator] = entry;

  // Track regressions
  if (transition === 'pass->fail') {
    const regression: Regression = {
      validator: result.validator,
      timestamp,
      previousStatus: 'pass',
      currentStatus: 'fail',
      gitCommit,
    };
    registry.regressions.active.push(regression);
  } else if (transition === 'fail->pass') {
    // Move from active to resolved
    const activeIndex = registry.regressions.active.findIndex(
      (r) => r.validator === result.validator
    );
    if (activeIndex >= 0) {
      const resolved = registry.regressions.active.splice(activeIndex, 1)[0];
      resolved.resolvedAt = timestamp;
      resolved.resolvedBy = runBy;
      registry.regressions.resolved.push(resolved);

      // Keep last 50 resolved regressions
      if (registry.regressions.resolved.length > 50) {
        registry.regressions.resolved.shift();
      }
    }
  }

  writeRegistry(registry);
}

/**
 * Mark a full validation run as complete
 */
export function markFullRunComplete(): void {
  const registry = readRegistry();
  registry.lastFullRun = new Date().toISOString();
  writeRegistry(registry);
}

/**
 * Check if a phase gate is satisfied
 */
export function checkPhaseGate(phaseName: string): {
  satisfied: boolean;
  passRate: number;
  missing: string[];
  failed: string[];
  stale: string[];
} {
  const registry = readRegistry();
  const gate = registry.phaseGates[phaseName];

  if (!gate) {
    throw new Error(`Unknown phase gate: ${phaseName}`);
  }

  // Type guard: only phases 4-5 have requiredValidators
  if (!('requiredValidators' in gate)) {
    throw new Error(`Phase gate ${phaseName} does not have requiredValidators`);
  }

  const missing: string[] = [];
  const failed: string[] = [];
  const stale: string[] = [];
  let passed = 0;

  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();

  for (const validatorName of gate.requiredValidators) {
    const entry = registry.validators[validatorName];

    if (!entry) {
      missing.push(validatorName);
      continue;
    }

    // Check if result is stale (> 1 hour old)
    if (entry.lastRun) {
      const age = now - new Date(entry.lastRun).getTime();
      if (age > ONE_HOUR) {
        stale.push(validatorName);
      }
    } else {
      stale.push(validatorName);
    }

    if (entry.passed) {
      passed++;
    } else {
      failed.push(validatorName);
    }
  }

  const total = gate.requiredValidators.length;
  const passRate = total > 0 ? passed / total : 0;

  return {
    satisfied: passRate >= gate.requiredPassRate && missing.length === 0,
    passRate,
    missing,
    failed,
    stale,
  };
}

/**
 * Get summary of all validators
 */
export function getValidatorSummary(): {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  validators: Array<{
    name: string;
    status: 'pass' | 'fail' | 'pending';
    lastRun?: string | null;
  }>;
} {
  const registry = readRegistry();
  const allValidators = new Set<string>();

  // Collect all known validators from phase gates
  for (const gate of Object.values(registry.phaseGates)) {
    if ('requiredValidators' in gate) {
      for (const v of gate.requiredValidators) {
        allValidators.add(v);
      }
    }
  }

  const validators: Array<{
    name: string;
    status: 'pass' | 'fail' | 'pending';
    lastRun?: string | null;
  }> = [];

  let passed = 0;
  let failed = 0;
  let pending = 0;

  for (const name of Array.from(allValidators)) {
    const entry = registry.validators[name];
    if (!entry || entry.lastRun === null) {
      validators.push({ name, status: 'pending' });
      pending++;
    } else if (entry.passed) {
      validators.push({ name, status: 'pass', lastRun: entry.lastRun });
      passed++;
    } else {
      validators.push({ name, status: 'fail', lastRun: entry.lastRun });
      failed++;
    }
  }

  return {
    total: allValidators.size,
    passed,
    failed,
    pending,
    validators: validators.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/**
 * Detect active regressions (validators that went from pass to fail)
 */
export function detectRegressions(): Regression[] {
  const registry = readRegistry();
  return registry.regressions.active;
}

/**
 * Check all phase gates (phases 0-5)
 * Returns structured result showing which phases pass/fail/pending
 */
export function checkAllPhaseGates(): {
  allPassed: boolean;
  phases: Array<{
    phase: string;
    name?: string;
    passed: boolean | null; // null = pending (never checked)
    blockers: string[];
    warnings: string[];
  }>;
} {
  const registry = readRegistry();
  const phases: Array<{
    phase: string;
    name?: string;
    passed: boolean | null;
    blockers: string[];
    warnings: string[];
  }> = [];

  let allPassed = true;

  // Check phases 0-3 (requiredChecks)
  for (const [phaseKey, gate] of Object.entries(registry.phaseGates)) {
    if ('requiredChecks' in gate) {
      const blockers: string[] = [];
      const warnings: string[] = [];

      // For phases 0-3, we check if the gate has been run and passed
      if (gate.lastCheck === null) {
        blockers.push(`Phase gate has not been checked yet`);
      } else if (gate.passed === false) {
        blockers.push(`Phase gate checks failed`);
        // Add specific failed checks if available
        for (const check of gate.requiredChecks) {
          warnings.push(`Check required: ${check}`);
        }
      }

      // null = pending, true = pass, false = fail
      const phasePassed = gate.passed;
      phases.push({
        phase: phaseKey,
        name: gate.name,
        passed: phasePassed,
        blockers,
        warnings,
      });

      if (phasePassed !== true) {
        allPassed = false;
      }
    } else if ('requiredValidators' in gate) {
      // Phases 4-5 (requiredValidators)
      const gateResult = checkPhaseGate(phaseKey);
      const blockers: string[] = [];
      const warnings: string[] = [];

      if (gateResult.missing.length > 0) {
        blockers.push(`Missing validators: ${gateResult.missing.join(', ')}`);
      }
      if (gateResult.failed.length > 0) {
        blockers.push(`Failed validators: ${gateResult.failed.join(', ')}`);
      }
      if (gateResult.stale.length > 0) {
        warnings.push(`Stale validators: ${gateResult.stale.join(', ')}`);
      }

      phases.push({
        phase: phaseKey,
        name: gate.description,
        passed: gateResult.satisfied,
        blockers,
        warnings,
      });

      if (!gateResult.satisfied) {
        allPassed = false;
      }
    }
  }

  // Custom sort: coverage gates come BEFORE their base gates
  const phaseOrder = (phase: string): number => {
    const match = phase.match(/phase(\d+)(-coverage)?/);
    if (!match) return 999;
    const num = parseInt(match[1], 10);
    const isCoverage = !!match[2];
    return num * 10 + (isCoverage ? 0 : 5);
  };

  return {
    allPassed,
    phases: phases.sort((a, b) => phaseOrder(a.phase) - phaseOrder(b.phase)),
  };
}

/**
 * Update TDD stats in the registry
 */
export function updateTDDStats(stats: Omit<TDDStats, 'lastUpdated'>): void {
  const registry = readRegistry();

  if (!registry.stats) {
    registry.stats = {};
  }

  registry.stats.tdd = {
    ...stats,
    lastUpdated: new Date().toISOString(),
  };

  writeRegistry(registry);
}

/**
 * Get current TDD stats from the registry
 */
export function getTDDStats(): TDDStats | null {
  const registry = readRegistry();
  return registry.stats?.tdd || null;
}
