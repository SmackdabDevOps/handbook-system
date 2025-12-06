export interface CopyOptions {
    sourceRoot: string;
    targetRoot: string;
    stackProfile: string;
    selectedModules: string[];
}
/**
 * Copy core handbook files to target project
 */
export declare function copyCoreFiles(options: CopyOptions): void;
/**
 * Copy selected optional modules
 */
export declare function copyOptionalModules(options: CopyOptions): void;
/**
 * Copy validation templates to target project
 */
export declare function copyValidationTemplates(options: CopyOptions): void;
/**
 * Copy validation library files
 */
export declare function copyValidationLib(options: CopyOptions): void;
/**
 * Install Claude Code hooks
 */
export declare function installClaudeHooks(options: CopyOptions, config: any): void;
/**
 * Initialize empty validation registry
 */
export declare function initializeRegistry(options: CopyOptions, config: any): void;
