/**
 * Dashboard Data Collector - Generalized for Handbook System
 *
 * Collects project status data from validation registries for PM dashboards.
 * Uses config-based paths for portability across projects.
 *
 * Extracted from: smackchat/scripts/dashboard/collect-dashboard-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration Interface (to be implemented by projects)
// ============================================================================

export interface ProjectConfig {
  projectName: string;
  projectRoot: string;
  registry: {
    path: string; // Path to validation-registry.json
  };
  paths: {
    endpoints?: string; // Optional: ENDPOINTS.json
    coverage?: string; // Optional: jest coverage-summary.json
    userStories?: string; // Optional: user stories directory
  };
}

// ============================================================================
// Dashboard Data Contracts
// ============================================================================

export interface DashboardData {
  generated_at: string;
  project_name: string;
  tdd_stats: {
    unit_tests: {
      total_files: number;
      files_with_tests: number;
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
      coverage_percent: number; // -1 for N/A (no integration tests needed)
      passing: boolean;
    };
  };
  phase_status: Record<number, 'pass' | 'fail' | 'pending'>;
  red_phase_verified: Record<
    string,
    {
      verified: boolean;
      timestamp: string;
      gitCommit?: string;
    }
  >;
  validators: Array<{
    name: string;
    lastRun: string;
    status: 'pass' | 'fail' | 'stale';
  }>;
}

export interface ValidationRegistry {
  lastFullRun?: string;
  validators: Record<
    string,
    {
      passed: boolean;
      lastRun?: string;
      duration?: number;
      totalTests: number;
      passedTests: number;
      failedTests: number;
      details?: {
        notes?: string;
        failedTestNames?: string[];
      };
      gitCommit?: string;
    }
  >;
  stats?: {
    tdd?: {
      contract_tests?: {
        total_endpoints: number;
        endpoints_with_tests: number;
        coverage_percent: number;
        passing: boolean;
      };
      integration_tests?: {
        cross_module_calls: number;
        calls_with_tests: number;
        coverage_percent: number; // -1 for N/A
        passing: boolean;
      };
    };
  };
  phaseGates?: Record<string, unknown>;
}

// ============================================================================
// N/A Rendering Helpers
// ============================================================================

/**
 * Render coverage percentage, handling N/A case (-1 sentinel)
 */
export function renderCoverage(percent: number): string {
  if (percent === -1) return 'N/A';
  return `${percent}%`;
}

/**
 * Check if integration tests are applicable (i.e., not N/A)
 */
export function isIntegrationTestsApplicable(data: DashboardData): boolean {
  return data.tdd_stats.integration_tests.cross_module_calls > 0;
}

/**
 * Get human-readable status for integration tests
 */
export function getIntegrationTestStatus(data: DashboardData): string {
  const stats = data.tdd_stats.integration_tests;

  if (stats.coverage_percent === -1) {
    return 'N/A (no cross-module calls)';
  }

  if (stats.passing) {
    return `${stats.coverage_percent}% (${stats.calls_with_tests}/${stats.cross_module_calls})`;
  }

  return `${stats.coverage_percent}% - FAILING`;
}

// ============================================================================
// TDD Stats Collection (extracted from SmackChat)
// ============================================================================

/**
 * Collect TDD statistics from registry and coverage files
 *
 * Priority order:
 * 1. registry.stats.tdd (authoritative source)
 * 2. registry.validators (fallback for contract/integration)
 * 3. Jest coverage-summary.json (for unit tests only)
 *
 * Integration tests use -1 sentinel for N/A when no cross-module calls exist.
 */
export function collectTDDStats(config: ProjectConfig): DashboardData['tdd_stats'] {
  // Read unit test coverage from Jest if available
  let unitCoverage = { total: 0, covered: 0, percent: 0 };

  if (config.paths.coverage && fs.existsSync(config.paths.coverage)) {
    try {
      const coverage = JSON.parse(fs.readFileSync(config.paths.coverage, 'utf-8'));
      const total = coverage.total;
      unitCoverage = {
        total: total.lines?.total || 0,
        covered: total.lines?.covered || 0,
        percent: total.lines?.pct || 0,
      };
    } catch (e) {
      // Coverage file may not exist yet or be malformed
    }
  }

  // Count total endpoints if ENDPOINTS.json exists
  let totalEndpoints = 0;

  if (config.paths.endpoints && fs.existsSync(config.paths.endpoints)) {
    try {
      const endpoints = JSON.parse(fs.readFileSync(config.paths.endpoints, 'utf-8'));
      totalEndpoints = endpoints.endpoints?.length || 0;
    } catch (e) {
      // File may not exist or be malformed
    }
  }

  // Read contract/integration coverage from registry ONLY (no file-count fallback)
  // File counting can overstate coverage - rely on validators for accurate data
  let contractStats = {
    totalEndpoints,
    endpointsWithTests: 0,
    coveragePercent: 0,
    passing: false,
  };
  let integrationStats = {
    crossModuleCalls: 0,
    callsWithTests: 0,
    percent: -1, // Default to N/A
    passing: false,
  };

  if (fs.existsSync(config.registry.path)) {
    try {
      const registry: ValidationRegistry = JSON.parse(
        fs.readFileSync(config.registry.path, 'utf-8')
      );

      // Read TDD stats from registry if available (authoritative source)
      if (registry.stats?.tdd) {
        const tddStats = registry.stats.tdd;

        // Read contract test stats
        if (tddStats.contract_tests) {
          contractStats = {
            totalEndpoints: tddStats.contract_tests.total_endpoints || totalEndpoints,
            endpointsWithTests: tddStats.contract_tests.endpoints_with_tests || 0,
            coveragePercent: tddStats.contract_tests.coverage_percent || 0,
            passing: tddStats.contract_tests.passing || false,
          };
        }

        // Read integration test stats
        if (tddStats.integration_tests) {
          integrationStats = {
            crossModuleCalls: tddStats.integration_tests.cross_module_calls || 0,
            callsWithTests: tddStats.integration_tests.calls_with_tests || 0,
            // Preserve -1 as N/A sentinel (don't fallback to 0)
            percent:
              typeof tddStats.integration_tests.coverage_percent === 'number'
                ? tddStats.integration_tests.coverage_percent
                : -1,
            passing: tddStats.integration_tests.passing || false,
          };
        }
      }

      // Fallback: read from validators if stats.tdd not populated
      if (contractStats.coveragePercent === 0 && registry.validators?.['contract-test-coverage']) {
        const contractValidator = registry.validators['contract-test-coverage'];
        if (contractValidator.totalTests > 0) {
          contractStats = {
            totalEndpoints: contractValidator.totalTests,
            endpointsWithTests: contractValidator.passedTests,
            coveragePercent: Math.round(
              (contractValidator.passedTests / contractValidator.totalTests) * 100
            ),
            passing: contractValidator.passed === true,
          };
        }
      }

      // Read integration coverage from validator if stats.tdd not populated
      if (
        integrationStats.percent === -1 &&
        registry.validators?.['integration-test-coverage']
      ) {
        const intValidator = registry.validators['integration-test-coverage'];
        if (intValidator.details?.notes) {
          const match = intValidator.details.notes.match(/coverage:\s*(-?\d+)%/i);
          if (match) {
            integrationStats.percent = parseInt(match[1], 10);
            integrationStats.passing = intValidator.passed === true;
          }
        }
        // Use totalTests as cross_module_calls count
        if (intValidator.totalTests > 0) {
          integrationStats.crossModuleCalls = intValidator.totalTests;
          integrationStats.callsWithTests = intValidator.passedTests;
        }
      }
    } catch (e) {
      // Registry may not exist or be malformed
    }
  }

  return {
    unit_tests: {
      total_files: unitCoverage.total,
      files_with_tests: unitCoverage.covered,
      coverage_percent: unitCoverage.percent,
      passing: unitCoverage.percent >= 90,
    },
    contract_tests: {
      total_endpoints: contractStats.totalEndpoints,
      endpoints_with_tests: contractStats.endpointsWithTests,
      coverage_percent: contractStats.coveragePercent,
      passing: contractStats.passing,
    },
    integration_tests: {
      cross_module_calls: integrationStats.crossModuleCalls,
      calls_with_tests: integrationStats.callsWithTests,
      coverage_percent: integrationStats.percent,
      passing: integrationStats.passing,
    },
  };
}

// ============================================================================
// Dashboard Data Collection
// ============================================================================

/**
 * Collect dashboard data using project configuration
 */
export function collectDashboardData(config: ProjectConfig): DashboardData {
  const tddStats = collectTDDStats(config);

  // Read validators from registry
  const validators: DashboardData['validators'] = [];
  const phaseStatus: Record<number, 'pass' | 'fail' | 'pending'> = {};
  const redPhaseVerified: DashboardData['red_phase_verified'] = {};

  if (fs.existsSync(config.registry.path)) {
    try {
      const registry: ValidationRegistry = JSON.parse(
        fs.readFileSync(config.registry.path, 'utf-8')
      );

      // Extract validator statuses
      const now = Date.now();
      const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

      for (const [name, entry] of Object.entries(registry.validators)) {
        const ageMs = entry.lastRun ? now - new Date(entry.lastRun).getTime() : Infinity;
        const isStale = ageMs > STALE_THRESHOLD_MS;

        let status: 'pass' | 'fail' | 'stale';
        if (!entry.lastRun) {
          status = 'stale';
        } else if (isStale) {
          status = 'stale';
        } else if (entry.passed) {
          status = 'pass';
        } else {
          status = 'fail';
        }

        validators.push({
          name,
          lastRun: entry.lastRun || 'never',
          status,
        });
      }
    } catch (e) {
      // Registry may not exist or be malformed
    }
  }

  return {
    generated_at: new Date().toISOString(),
    project_name: config.projectName,
    tdd_stats: tddStats,
    phase_status: phaseStatus,
    red_phase_verified: redPhaseVerified,
    validators,
  };
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Format TDD stats for console display
 */
export function formatTDDStats(stats: DashboardData['tdd_stats']): string {
  const lines: string[] = [];

  lines.push('TDD Statistics:');
  lines.push(
    `  Unit Tests:        ${stats.unit_tests.coverage_percent}% (${stats.unit_tests.files_with_tests}/${stats.unit_tests.total_files} files) ${stats.unit_tests.passing ? '✅' : '❌'}`
  );
  lines.push(
    `  Contract Tests:    ${stats.contract_tests.coverage_percent}% (${stats.contract_tests.endpoints_with_tests}/${stats.contract_tests.total_endpoints} endpoints) ${stats.contract_tests.passing ? '✅' : '❌'}`
  );

  const intStatus = renderCoverage(stats.integration_tests.coverage_percent);
  const intDetail =
    stats.integration_tests.coverage_percent === -1
      ? ''
      : ` (${stats.integration_tests.calls_with_tests}/${stats.integration_tests.cross_module_calls} calls)`;
  const intEmoji = stats.integration_tests.passing ? '✅' : '❌';

  lines.push(`  Integration Tests: ${intStatus}${intDetail} ${intEmoji}`);

  return lines.join('\n');
}

/**
 * Get summary status for dashboard
 */
export function getDashboardSummary(data: DashboardData): {
  passing: number;
  failing: number;
  stale: number;
  total: number;
} {
  let passing = 0;
  let failing = 0;
  let stale = 0;

  for (const validator of data.validators) {
    switch (validator.status) {
      case 'pass':
        passing++;
        break;
      case 'fail':
        failing++;
        break;
      case 'stale':
        stale++;
        break;
    }
  }

  return {
    passing,
    failing,
    stale,
    total: data.validators.length,
  };
}
