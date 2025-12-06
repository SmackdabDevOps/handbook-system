export interface ScriptsConfig {
    projectRoot: string;
    validatorsPath: string;
}
/**
 * Add handbook scripts to package.json
 */
export declare function addNpmScripts(config: ScriptsConfig): void;
/**
 * Add required dev dependencies
 */
export declare function addDevDependencies(config: ScriptsConfig): void;
/**
 * Get current scripts from package.json
 */
export declare function getCurrentScripts(projectRoot: string): Record<string, string>;
