/**
 * Config Loader for Validation Scripts
 *
 * Loads handbook.config.json and provides type-safe access to validation configuration
 */
export interface HandbookConfig {
    version: string;
    projectName: string;
    stackProfile: 'nestjs-single' | 'express-single' | 'express-nx' | 'generic';
    paths: {
        handbook: string;
        openapi: string;
        stories: string;
        rules: string;
        specs: string;
        validators: string;
        controllers?: string;
        dtos?: string;
        services?: string;
        modules?: string;
        endpointsJson: string;
    };
    commands: {
        'validate:gates': string;
        'validate:quick': string;
        'openapi:bundle': string;
        'endpoints:validate': string;
    };
    phases: {
        enabled: number[];
        customGates?: Record<string, any>;
    };
    tdd: {
        thresholds: {
            unit_coverage: number;
            contract_coverage: number;
            integration_coverage: number;
        };
        hooks: {
            enforceRedPhase: boolean;
            blockCommitsWithoutValidation: boolean;
            version: string;
        };
        enforcedPatterns?: string[];
        excludedPatterns?: string[];
    };
    registry: {
        path: string;
        trackRedPhase: boolean;
        trackTDDStats: boolean;
    };
    features: string[];
}
/**
 * Find project root by looking for handbook.config.json
 */
export declare function findProjectRoot(startDir?: string): string;
/**
 * Load handbook configuration
 */
export declare function loadConfig(projectRoot?: string): HandbookConfig;
/**
 * Get absolute path for a configured path
 */
export declare function getAbsolutePath(relativePath: string, projectRoot?: string): string;
/**
 * Get registry path
 */
export declare function getRegistryPath(projectRoot?: string): string;
/**
 * Get validators directory path
 */
export declare function getValidatorsPath(projectRoot?: string): string;
/**
 * Clear cached config (useful for testing)
 */
export declare function clearConfigCache(): void;
