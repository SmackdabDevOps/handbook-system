import * as fs from 'fs';
import * as path from 'path';
import { ValidationRegistry, ValidatorEntry } from './validation-registry';
import { loadConfig } from './config-loader';

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

function globToRegex(pattern: string): RegExp {
  const normalized = pattern.split(path.sep).join('/');
  const withPlaceholders = normalized.replace(/\*\*/g, '<<DS>>').replace(/\*/g, '<<S>>');
  const escaped = withPlaceholders.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&');
  const finalPattern = escaped
    .replace(/<<DS>>/g, '.*')
    .replace(/<<S>>/g, '[^/]*');
  return new RegExp(`^${finalPattern}$`);
}

function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  const posixPath = filePath.split(path.sep).join('/');
  return patterns.some((pattern) => globToRegex(pattern).test(posixPath));
}

export function mapFilesToValidators(
  changedFiles: string[],
  mapping: ValidatorPatternMap[],
): Set<string> {
  const validators = new Set<string>();

  for (const file of changedFiles) {
    for (const entry of mapping) {
      if (matchesAnyPattern(file, entry.patterns)) {
        entry.validators.forEach((v) => validators.add(v));
      }
    }
  }

  return validators;
}

function collectStatusBuckets(
  registry: ValidationRegistry,
  requiredValidators: string[],
  currentCommit: string,
  staleThresholdHours: number,
): { missing: string[]; failed: string[]; stale: string[]; checked: string[] } {
  const missing: string[] = [];
  const failed: string[] = [];
  const stale: string[] = [];
  const checked: string[] = [];
  const staleThresholdMs = staleThresholdHours * 60 * 60 * 1000;
  const now = Date.now();

  const getEntry = (name: string): ValidatorEntry | undefined => registry.validators[name];

  for (const validator of requiredValidators) {
    const entry = getEntry(validator);

    if (!entry || !entry.lastRun) {
      missing.push(validator);
      continue;
    }

    checked.push(validator);

    const isFailed = entry.passed === false;
    if (isFailed) {
      const failMsg = `${validator} (${entry.failedTests}/${entry.totalTests} failing)`;
      failed.push(failMsg);
      continue;
    }

    const isStaleCommit = !!entry.gitCommit && entry.gitCommit !== currentCommit;
    const isStaleTime = now - new Date(entry.lastRun).getTime() > staleThresholdMs;
    if (isStaleCommit || isStaleTime) {
      stale.push(validator);
    }
  }

  return { missing, failed, stale, checked };
}

export function evaluateValidatorStatuses(
  registry: ValidationRegistry,
  currentCommit: string,
  requiredValidators: string[],
  staleThresholdHours?: number,
): GuardOutcome {
  // Use config for stale threshold if not provided
  const config = loadConfig();
  const threshold = staleThresholdHours ?? config.tdd.staleThresholdHours ?? 4;

  const { missing, failed, stale, checked } = collectStatusBuckets(
    registry,
    requiredValidators,
    currentCommit,
    threshold,
  );

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (missing.length > 0) {
    const missingMsg = `Missing validator results: ${missing.join(', ')}`;
    blockers.push(missingMsg);
  }

  if (failed.length > 0) {
    const failedMsg = `Failed validators: ${failed.join(', ')}`;
    blockers.push(failedMsg);
  }

  if (stale.length > 0) {
    const staleMsg = `Stale validators (rerun on current commit): ${stale.join(', ')}`;
    blockers.push(staleMsg);
  }

  return {
    passed: blockers.length === 0,
    blockers,
    warnings,
    checkedValidators: checked,
  };
}

export function loadValidatorMapping(mappingPath: string): ValidatorPatternMap[] {
  const resolved = path.resolve(mappingPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Validator mapping not found at ${resolved}`);
  }
  const raw = fs.readFileSync(resolved, 'utf-8');
  return JSON.parse(raw);
}

export function getCurrentCommit(): string {
  try {
    const { execSync } = require('child_process');
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch (error) {
    throw new Error('Unable to read current git commit. Ensure this is a git repo.');
  }
}

export function getChangedFiles(): string[] {
  try {
    const { execSync } = require('child_process');
    const output = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
    return output
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean);
  } catch (error) {
    throw new Error('Unable to read git diff for changed files.');
  }
}
