import { ValidationRegistry } from './validation-registry';
export interface ValidatorPatternMap {
    patterns: string[];
    validators: string[];
}
export interface GuardOutcome {
    passed: boolean;
    blockers: string[];
    warnings: string[];
    checkedValidators: string[];
}
export declare function mapFilesToValidators(changedFiles: string[], mapping: ValidatorPatternMap[]): Set<string>;
export declare function evaluateValidatorStatuses(registry: ValidationRegistry, currentCommit: string, requiredValidators: string[], staleThresholdHours?: number): GuardOutcome;
export declare function loadValidatorMapping(mappingPath: string): ValidatorPatternMap[];
export declare function getCurrentCommit(): string;
export declare function getChangedFiles(): string[];
