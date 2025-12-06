/**
 * Validation Registry - Single Source of Truth for Validation Status
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
 */
export interface TDDStats {
    lastUpdated?: string | null;
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
export interface RedPhaseVerification {
    verified: boolean;
    timestamp: string;
    gitCommit?: string;
}
export interface ValidationResult {
    validator: string;
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    duration: number;
    details?: {
        failedTestNames?: string[];
        skippedTestNames?: string[];
        notes?: string;
    };
}
export interface HistoryEntry {
    timestamp: string;
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    transition?: 'pass->fail' | 'fail->pass' | 'first-run';
    gitCommit?: string;
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
export interface ValidationRegistry {
    version: string;
    lastFullRun: string | null;
    validators: Record<string, ValidatorEntry>;
    stats?: {
        tdd?: TDDStats;
    };
    redPhaseVerified?: Record<string, RedPhaseVerification>;
    regressions: {
        active: Regression[];
        resolved: Regression[];
    };
    phaseGates: Record<string, PhaseGate1to3 | PhaseGate4to5>;
}
/**
 * Check if integration tests are marked as N/A
 * Integration tests are N/A when coverage_percent is -1
 */
export declare function isIntegrationNA(stats: TDDStats): boolean;
/**
 * Format coverage percentage, handling N/A case
 * Returns "N/A" for -1, otherwise returns formatted percentage
 */
export declare function formatCoverage(percent: number): string;
/**
 * Read the current registry state
 */
export declare function readRegistry(): ValidationRegistry;
/**
 * Write the registry to disk
 */
export declare function writeRegistry(registry: ValidationRegistry): void;
/**
 * Report a validation result to the registry
 */
export declare function reportValidationResult(result: ValidationResult, runBy?: 'script' | 'manual' | 'ci'): Promise<void>;
/**
 * Report a validation result WITH regression tracking
 * Tracks pass->fail transitions and updates history
 */
export declare function reportValidationResultWithRegression(result: ValidationResult, runBy?: 'script' | 'manual' | 'ci'): Promise<void>;
/**
 * Mark a full validation run as complete
 */
export declare function markFullRunComplete(): void;
/**
 * Mark a validator's RED phase as verified
 * RED phase = test fails before implementation
 */
export declare function markRedPhaseVerified(validatorName: string): void;
/**
 * Check if a validator's RED phase has been verified
 */
export declare function isRedPhaseVerified(validatorName: string): boolean;
/**
 * Get RED phase verification status for a validator
 */
export declare function getRedPhaseVerification(validatorName: string): RedPhaseVerification | null;
/**
 * Clear RED phase verification for a validator
 * Used when validator is significantly modified
 */
export declare function clearRedPhaseVerification(validatorName: string): void;
/**
 * Check if a phase gate is satisfied
 */
export declare function checkPhaseGate(phaseName: string): {
    satisfied: boolean;
    passRate: number;
    missing: string[];
    failed: string[];
    stale: string[];
};
/**
 * Get summary of all validators
 */
export declare function getValidatorSummary(): {
    total: number;
    passed: number;
    failed: number;
    missing: number;
    validators: Array<{
        name: string;
        status: 'pass' | 'fail' | 'missing';
        lastRun?: string | null;
    }>;
};
/**
 * Detect active regressions (validators that went from pass to fail)
 */
export declare function detectRegressions(): Regression[];
/**
 * Get history for a specific validator
 */
export declare function getValidatorHistory(validatorName: string): HistoryEntry[];
/**
 * Check all phase gates (phases 1-5)
 * Returns structured result showing which phases pass/fail
 */
export declare function checkAllPhaseGates(): {
    allPassed: boolean;
    phases: Array<{
        phase: string;
        name?: string;
        passed: boolean;
        blockers: string[];
        warnings: string[];
    }>;
};
/**
 * Update TDD stats in the registry
 * Called by TDD gate scripts after they run
 */
export declare function updateTDDStats(stats: Omit<TDDStats, 'lastUpdated'>): void;
/**
 * Get current TDD stats from the registry
 */
export declare function getTDDStats(): TDDStats | null;
/**
 * Update unit test stats in the registry
 */
export declare function updateUnitTestStats(stats: TDDStats['unit_tests']): void;
/**
 * Update contract test stats in the registry
 */
export declare function updateContractTestStats(stats: TDDStats['contract_tests']): void;
/**
 * Update integration test stats in the registry
 */
export declare function updateIntegrationTestStats(stats: TDDStats['integration_tests']): void;
