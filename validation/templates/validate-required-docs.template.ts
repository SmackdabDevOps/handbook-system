#!/usr/bin/env ts-node
/**
 * Phase 0 Validation: Required Documentation
 *
 * Validates that minimum required documentation exists.
 * This is a Phase 0 gate that must pass before any other work begins.
 *
 * Usage: Copy to scripts/validation/validate-required-docs.ts
 * Command: npm run validate:required-docs
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

interface ValidationResult {
  passed: boolean;
  checks: CheckResult[];
  summary: { passed: number; failed: number };
}

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string[];
  fix?: string;
}

const PROJECT_ROOT = path.resolve(__dirname, '../..');

// ============================================================================
// CONFIGURATION - CUSTOMIZE FOR YOUR PROJECT
// ============================================================================

// Required documentation checks
interface RequiredDocCheck {
  name: string;
  pattern: string;
  minCount: number;
  description: string;
  fixInstructions: string;
}

const REQUIRED_DOCS: RequiredDocCheck[] = [
  {
    name: 'User Stories',
    pattern: 'docs/user-stories/*.md',
    minCount: 1,
    description: 'At least one user story document',
    fixInstructions: 'Create docs/user-stories/01-feature-name.md with US-xxx story IDs'
  },
  {
    name: 'Business Rules',
    pattern: 'docs/business-rules/BR-*.md',
    minCount: 1,
    description: 'At least one business rule document',
    fixInstructions: 'Create docs/business-rules/BR-001-rule-name.md'
  },
  // CUSTOMIZE: Choose one based on your stack:
  {
    name: 'OpenAPI Spec',
    pattern: 'specs/*.yaml',       // Single-Service (NestJS)
    // pattern: 'openapi/paths/*.yaml', // Nx Backend
    minCount: 1,
    description: 'OpenAPI specification file',
    fixInstructions: 'Create specs/api.yaml with OpenAPI 3.0 specification'
  },
  {
    name: 'Handbook Playbook',
    pattern: 'handbook/SYSTEM_DELIVERY_PLAYBOOK.md',
    minCount: 1,
    description: 'System Delivery Playbook in handbook',
    fixInstructions: 'Run npx @smackdab/handbook-init to install handbook'
  },
];

// Optional but recommended documentation
const RECOMMENDED_DOCS: RequiredDocCheck[] = [
  {
    name: 'Validation Specs',
    pattern: 'docs/test-plans/validation-specs/*.md',
    minCount: 1,
    description: 'At least one UX validation spec',
    fixInstructions: 'Create docs/test-plans/validation-specs/01-feature.md'
  },
  {
    name: 'Product Features',
    pattern: 'docs/product/FEATURES.md',
    minCount: 1,
    description: 'Features documentation',
    fixInstructions: 'Create docs/product/FEATURES.md with feature list'
  },
];

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

function checkDocumentation(check: RequiredDocCheck): CheckResult {
  const fullPattern = path.join(PROJECT_ROOT, check.pattern);

  try {
    const files = glob.sync(fullPattern);
    const count = files.length;
    const passed = count >= check.minCount;

    // Get relative paths for display
    const relativePaths = files.map((f: string) => path.relative(PROJECT_ROOT, f));

    return {
      name: check.name,
      passed,
      message: passed
        ? `Found ${count} file(s) matching ${check.pattern}`
        : `${check.description} - found ${count}, need at least ${check.minCount}`,
      details: passed && relativePaths.length > 0 ? relativePaths.slice(0, 5) : undefined,
      fix: passed ? undefined : check.fixInstructions
    };
  } catch (error) {
    return {
      name: check.name,
      passed: false,
      message: `Error checking ${check.pattern}: ${error}`,
      fix: check.fixInstructions
    };
  }
}

function validate(): ValidationResult {
  const checks: CheckResult[] = [];

  console.log('Checking required documentation...\n');

  // Check required docs
  for (const doc of REQUIRED_DOCS) {
    const result = checkDocumentation(doc);
    checks.push(result);
  }

  // Check recommended docs (warnings only, don't fail)
  console.log('\nChecking recommended documentation...\n');
  for (const doc of RECOMMENDED_DOCS) {
    const result = checkDocumentation(doc);
    // Mark as passed even if missing (it's a warning)
    if (!result.passed) {
      result.name = `[Recommended] ${result.name}`;
    }
    checks.push(result);
  }

  // Only count required docs for pass/fail
  const requiredChecks = checks.slice(0, REQUIRED_DOCS.length);
  const passed = requiredChecks.filter(c => c.passed).length;
  const failed = requiredChecks.filter(c => !c.passed).length;

  return {
    passed: failed === 0,
    checks,
    summary: { passed, failed }
  };
}

function printResults(result: ValidationResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('Phase 0 Validation: Required Documentation');
  console.log('='.repeat(60) + '\n');

  for (const check of result.checks) {
    const isRecommended = check.name.startsWith('[Recommended]');
    const icon = check.passed ? '\u2705' : (isRecommended ? '\u26A0\uFE0F' : '\u274C');

    console.log(`${icon} ${check.name}`);
    console.log(`   ${check.message}`);

    if (check.details && check.details.length > 0) {
      for (const detail of check.details) {
        console.log(`      - ${detail}`);
      }
      if (check.details.length === 5) {
        console.log(`      ... and more`);
      }
    }

    if (check.fix) {
      console.log(`   Fix: ${check.fix}`);
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`Required: ${result.summary.passed} passed, ${result.summary.failed} failed`);

  if (result.passed) {
    console.log('\n\u2705 Required documentation validation PASSED\n');
  } else {
    console.log('\n\u274C Required documentation validation FAILED');
    console.log('Fix the required issues above before proceeding.\n');
  }
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  try {
    const result = validate();
    printResults(result);
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('Validation error:', error);
    process.exit(1);
  }
}

export { validate, ValidationResult, CheckResult };
