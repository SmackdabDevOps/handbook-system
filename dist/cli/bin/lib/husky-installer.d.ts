export interface HuskyOptions {
    projectRoot: string;
    validatorsPath: string;
}
/**
 * Install Husky and configure git hooks
 */
export declare function installHusky(options: HuskyOptions): boolean;
/**
 * Check if Husky is already installed
 */
export declare function isHuskyInstalled(projectRoot: string): boolean;
