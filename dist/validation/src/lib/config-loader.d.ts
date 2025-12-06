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
        controllers: string;
        dtos: string;
        services: string;
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
        customGates: Record<string, unknown>;
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
        staleThresholdHours?: number;
        enforcedPatterns: string[];
        excludedPatterns: string[];
    };
    registry: {
        path: string;
        trackRedPhase: boolean;
        trackTDDStats: boolean;
    };
    features: string[];
}
export declare const STACK_DEFAULTS: Record<string, Partial<HandbookConfig['paths']>>;
/**
 * Find the project root by walking up from cwd looking for handbook.config.json or package.json
 * @returns Absolute path to project root
 * @throws Error if project root cannot be found
 */
export declare function findProjectRoot(): string;
/**
 * Load and parse handbook.config.json
 * @param projectRoot Optional project root path. If not provided, will use findProjectRoot()
 * @returns Parsed and validated config
 * @throws Error if config cannot be loaded or is invalid
 */
export declare function loadConfig(projectRoot?: string): HandbookConfig;
/**
 * Resolve a config path relative to project root
 * @param config The loaded config
 * @param configPath Path value from config (may be relative or absolute)
 * @returns Absolute path
 */
export declare function resolvePath(config: HandbookConfig, configPath: string): string;
/**
 * Get resolved paths for all configured paths
 * @param config The loaded config
 * @returns Object with all paths resolved to absolute paths
 */
export declare function getResolvedPaths(config: HandbookConfig): Record<string, string>;
