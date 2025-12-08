#!/usr/bin/env ts-node
/**
 * Phase 0 Validation: Directory Structure
 *
 * Validates that the project directory structure follows handbook standards.
 * This is a Phase 0 gate that must pass before any other work begins.
 *
 * Usage: Copy to scripts/validation/validate-directory-structure.ts
 * Command: npm run validate:dirs
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  passed: boolean;
  checks: CheckResult[];
  summary: { passed: number; failed: number };
}

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  fix?: string;
}

const PROJECT_ROOT = path.resolve(__dirname, '../..');

// ============================================================================
// CONFIGURATION - CUSTOMIZE FOR YOUR PROJECT
// ============================================================================

// Required directories that MUST exist
const REQUIRED_DIRECTORIES = [
  { path: 'docs/user-stories', description: 'User stories directory' },
  { path: 'docs/business-rules', description: 'Business rules directory' },
  { path: 'docs/test-plans/validation-specs', description: 'Validation specs directory' },
  { path: 'handbook', description: 'Handbook directory' },
  { path: 'src', description: 'Source code directory' },
  // CUSTOMIZE: Choose one based on your stack:
  // { path: 'specs', description: 'OpenAPI specs directory' },        // Single-Service
  // { path: 'openapi', description: 'OpenAPI specs directory' },      // Nx Backend
  { path: 'scripts/validation', description: 'Validation scripts directory' },
];

// Files that are ALLOWED at root level
const ALLOWED_ROOT_MD_FILES = [
  'README.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
  // CUSTOMIZE: Add project-specific allowed files
  // 'API_FIRST_WORKFLOW.md',
  // 'SETUP_API_FIRST.md',
];

// Patterns for forbidden root-level files with suggested locations
const FORBIDDEN_ROOT_PATTERNS: Array<{
  pattern: RegExp;
  suggestion: string;
  description: string;
}> = [
  {
    pattern: /^FEATURES\.md$/i,
    suggestion: 'docs/product/FEATURES.md',
    description: 'Features documentation'
  },
  {
    pattern: /^STATUS\.md$/i,
    suggestion: 'docs/progress/STATUS.md',
    description: 'Project status'
  },
  {
    pattern: /^IMPLEMENTATION.*\.md$/i,
    suggestion: 'docs/plans/',
    description: 'Implementation plans'
  },
  {
    pattern: /^.*SPECIFICATION.*\.md$/i,
    suggestion: 'docs/product/',
    description: 'Product specifications'
  },
  {
    pattern: /^.*_ANALYSIS.*\.md$/i,
    suggestion: 'docs/research/',
    description: 'Analysis documents'
  },
  {
    pattern: /^MVP.*\.md$/i,
    suggestion: 'docs/product/',
    description: 'MVP planning documents'
  },
  {
    pattern: /^DATABASE.*\.md$/i,
    suggestion: 'docs/architecture/',
    description: 'Database documentation'
  },
  {
    pattern: /^.*COLLABORATION.*\.md$/i,
    suggestion: 'docs/architecture/',
    description: 'Collaboration documentation'
  },
];

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

function checkDirectoryExists(dirPath: string, description: string): CheckResult {
  const fullPath = path.join(PROJECT_ROOT, dirPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();

  return {
    name: `Directory: ${dirPath}`,
    passed: exists,
    message: exists
      ? `${description} exists`
      : `${description} missing at ${dirPath}`,
    fix: exists ? undefined : `mkdir -p ${dirPath}`
  };
}

function checkForbiddenRootFiles(): CheckResult[] {
  const results: CheckResult[] = [];
  const rootFiles = fs.readdirSync(PROJECT_ROOT);

  for (const file of rootFiles) {
    // Skip non-markdown files
    if (!file.endsWith('.md')) continue;

    // Skip allowed files
    if (ALLOWED_ROOT_MD_FILES.includes(file)) continue;

    // Check against forbidden patterns
    for (const { pattern, suggestion, description } of FORBIDDEN_ROOT_PATTERNS) {
      if (pattern.test(file)) {
        results.push({
          name: `Forbidden root file: ${file}`,
          passed: false,
          message: `${description} should not be at project root`,
          fix: `git mv ${file} ${suggestion}`
        });
        break;
      }
    }
  }

  // If no forbidden files found, add a passing check
  if (results.length === 0) {
    results.push({
      name: 'Root-level documentation',
      passed: true,
      message: 'No forbidden documentation files at project root'
    });
  }

  return results;
}

function validate(): ValidationResult {
  const checks: CheckResult[] = [];

  // Check required directories
  for (const { path: dirPath, description } of REQUIRED_DIRECTORIES) {
    checks.push(checkDirectoryExists(dirPath, description));
  }

  // Check for forbidden root files
  checks.push(...checkForbiddenRootFiles());

  const passed = checks.filter(c => c.passed).length;
  const failed = checks.filter(c => !c.passed).length;

  return {
    passed: failed === 0,
    checks,
    summary: { passed, failed }
  };
}

function printResults(result: ValidationResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('Phase 0 Validation: Directory Structure');
  console.log('='.repeat(60) + '\n');

  for (const check of result.checks) {
    const icon = check.passed ? '\u2705' : '\u274C';
    console.log(`${icon} ${check.name}`);
    console.log(`   ${check.message}`);
    if (check.fix) {
      console.log(`   Fix: ${check.fix}`);
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`Summary: ${result.summary.passed} passed, ${result.summary.failed} failed`);

  if (result.passed) {
    console.log('\n\u2705 Directory structure validation PASSED\n');
  } else {
    console.log('\n\u274C Directory structure validation FAILED');
    console.log('Fix the issues above before proceeding.\n');
  }
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  const result = validate();
  printResults(result);
  process.exit(result.passed ? 0 : 1);
}

export { validate, ValidationResult, CheckResult };
