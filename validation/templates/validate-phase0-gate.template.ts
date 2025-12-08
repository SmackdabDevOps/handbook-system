#!/usr/bin/env ts-node
/**
 * Phase 0 Validation: Combined Gate Check
 *
 * Runs all Phase 0 validation checks:
 * 1. Directory structure validation
 * 2. Required documentation validation
 *
 * Phase 0 MUST pass before any Phase 1+ work can begin.
 *
 * Usage: Copy to scripts/validation/validate-phase0.ts
 * Command: npm run validate:phase0
 */

import { execSync } from 'child_process';
import * as path from 'path';

const SCRIPTS_DIR = __dirname;

interface ValidationRun {
  name: string;
  script: string;
  passed: boolean;
  output: string;
}

function runValidation(name: string, script: string): ValidationRun {
  const scriptPath = path.join(SCRIPTS_DIR, script);

  try {
    const output = execSync(`npx ts-node ${scriptPath}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.resolve(SCRIPTS_DIR, '../..')
    });

    return {
      name,
      script,
      passed: true,
      output
    };
  } catch (error: any) {
    return {
      name,
      script,
      passed: false,
      output: error.stdout || error.message
    };
  }
}

function main(): void {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 0 GATE CHECK');
  console.log('Project Structure & Required Documentation');
  console.log('='.repeat(70));
  console.log('\nPhase 0 must pass before any development work can begin.\n');

  const validations: ValidationRun[] = [];

  // Run directory structure validation
  console.log('Running: Directory Structure Validation...');
  console.log('-'.repeat(50));
  validations.push(runValidation('Directory Structure', 'validate-directory-structure.ts'));
  console.log(validations[0].output);

  // Run required docs validation
  console.log('\nRunning: Required Documentation Validation...');
  console.log('-'.repeat(50));
  validations.push(runValidation('Required Documentation', 'validate-required-docs.ts'));
  console.log(validations[1].output);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 0 GATE SUMMARY');
  console.log('='.repeat(70) + '\n');

  const allPassed = validations.every(v => v.passed);

  for (const v of validations) {
    const icon = v.passed ? '\u2705' : '\u274C';
    console.log(`${icon} ${v.name}: ${v.passed ? 'PASSED' : 'FAILED'}`);
  }

  console.log('\n' + '-'.repeat(70));

  if (allPassed) {
    console.log('\n\u2705 PHASE 0 GATE: PASSED');
    console.log('\nYou may proceed to Phase 1 (User Stories & Business Rules).');
    console.log('Run: npm run validation:gates to check all phase gates.\n');
    process.exit(0);
  } else {
    console.log('\n\u274C PHASE 0 GATE: BLOCKED');
    console.log('\nFix all failing validations before proceeding.');
    console.log('Phase 1+ work is BLOCKED until Phase 0 passes.\n');
    process.exit(1);
  }
}

main();
