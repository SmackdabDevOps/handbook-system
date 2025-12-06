/**
 * Dashboard Data Collector - Generalized for Handbook System
 *
 * Collects project status data from validation registries for PM dashboards.
 * Uses config-based paths for portability across projects.
 *
 * Extracted from: smackchat/scripts/dashboard/collect-dashboard-data.ts
 */
export interface ProjectConfig {
    projectName: string;
    projectRoot: string;
    registry: {
        path: string;
    };
    paths: {
        endpoints?: string;
        coverage?: string;
        userStories?: string;
    };
}
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
            coverage_percent: number;
            passing: boolean;
        };
    };
    phase_status: Record<number, 'pass' | 'fail' | 'pending'>;
    red_phase_verified: Record<string, {
        verified: boolean;
        timestamp: string;
        gitCommit?: string;
    }>;
    validators: Array<{
        name: string;
        lastRun: string;
        status: 'pass' | 'fail' | 'stale';
    }>;
}
export interface ValidationRegistry {
    lastFullRun?: string;
    validators: Record<string, {
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
    }>;
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
                coverage_percent: number;
                passing: boolean;
            };
        };
    };
    phaseGates?: Record<string, unknown>;
}
/**
 * Render coverage percentage, handling N/A case (-1 sentinel)
 */
export declare function renderCoverage(percent: number): string;
/**
 * Check if integration tests are applicable (i.e., not N/A)
 */
export declare function isIntegrationTestsApplicable(data: DashboardData): boolean;
/**
 * Get human-readable status for integration tests
 */
export declare function getIntegrationTestStatus(data: DashboardData): string;
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
export declare function collectTDDStats(config: ProjectConfig): DashboardData['tdd_stats'];
/**
 * Collect dashboard data using project configuration
 */
export declare function collectDashboardData(config: ProjectConfig): DashboardData;
/**
 * Format TDD stats for console display
 */
export declare function formatTDDStats(stats: DashboardData['tdd_stats']): string;
/**
 * Get summary status for dashboard
 */
export declare function getDashboardSummary(data: DashboardData): {
    passing: number;
    failing: number;
    stale: number;
    total: number;
};
