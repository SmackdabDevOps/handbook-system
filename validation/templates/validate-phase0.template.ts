#!/usr/bin/env ts-node
/**
 * Phase 0 Validator Template
 *
 * Phase 0 validates: User Stories, Business Rules, OpenAPI contracts exist
 *
 * Usage: Copy this file, rename to validate-phase0.ts, customize FEATURES array
 *
 * This template assumes you have the handbook-system config loaded and accessible.
 * Adjust paths according to your project structure.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

// ============================================================================
// CONFIGURATION - CUSTOMIZE THESE VALUES
// ============================================================================

const PROJECT_ROOT = path.join(__dirname, '..', '..');

// Option 1: Load from handbook config (recommended)
// import { loadConfig, resolvePath } from './lib/config-loader';
// const config = loadConfig();

// Option 2: Manual configuration (for standalone use)
const MANUAL_CONFIG = {
  paths: {
    stories: 'docs/user-stories',
    rules: 'docs/business-rules',
    openapi: 'openapi',
  },
  features: [
    // CUSTOMIZE: Add your feature names here
    // 'auth',
    // 'channels',
    // 'messages',
    // 'notifications',
  ],
};

// CUSTOMIZE: Set this to true to use manual config, false to use config loader
const USE_MANUAL_CONFIG = true;

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

interface Phase0Results {
  stories: { found: number; missing: string[] };
  rules: { found: number; missing: string[] };
  contracts: { found: number; missing: string[] };
}

async function validatePhase0(): Promise<boolean> {
  console.log('=== Phase 0 Validation: Requirements & Contracts ===\n');

  const config = USE_MANUAL_CONFIG ? MANUAL_CONFIG : null;
  if (!config || config.features.length === 0) {
    console.error('ERROR: No features configured. Please customize the FEATURES array.');
    console.error('Edit this file and add your feature names to MANUAL_CONFIG.features\n');
    return false;
  }

  const results: Phase0Results = {
    stories: { found: 0, missing: [] },
    rules: { found: 0, missing: [] },
    contracts: { found: 0, missing: [] },
  };

  // Check user stories exist
  console.log('Checking user stories...');
  for (const feature of config.features) {
    const storyPath = path.join(PROJECT_ROOT, config.paths.stories, `${feature}.md`);
    if (fs.existsSync(storyPath)) {
      results.stories.found++;
      console.log(`  ✓ ${feature}.md`);
    } else {
      results.stories.missing.push(feature);
      console.log(`  ✗ ${feature}.md (MISSING)`);
    }
  }

  // Check business rules exist
  console.log('\nChecking business rules...');
  for (const feature of config.features) {
    const rulePath = path.join(PROJECT_ROOT, config.paths.rules, `${feature}.md`);
    if (fs.existsSync(rulePath)) {
      results.rules.found++;
      console.log(`  ✓ ${feature}.md`);
    } else {
      results.rules.missing.push(feature);
      console.log(`  ✗ ${feature}.md (MISSING)`);
    }
  }

  // Check OpenAPI contracts exist
  console.log('\nChecking OpenAPI contracts...');
  const contractPattern = path.join(PROJECT_ROOT, config.paths.openapi, 'paths', '*.yaml');
  const contractFiles = glob.sync(contractPattern);
  results.contracts.found = contractFiles.length;
  console.log(`  Found ${contractFiles.length} contract files`);

  if (contractFiles.length === 0) {
    console.log(`  ✗ No contract files found at ${config.paths.openapi}/paths/*.yaml`);
    results.contracts.missing.push('openapi-contracts');
  } else {
    contractFiles.forEach(file => {
      console.log(`  ✓ ${path.basename(file)}`);
    });
  }

  // Summary
  console.log('\n=== Phase 0 Summary ===');
  console.log(`User Stories: ${results.stories.found} found, ${results.stories.missing.length} missing`);
  console.log(`Business Rules: ${results.rules.found} found, ${results.rules.missing.length} missing`);
  console.log(`OpenAPI Contracts: ${results.contracts.found} files found`);

  const passed =
    results.stories.missing.length === 0 &&
    results.rules.missing.length === 0 &&
    results.contracts.found > 0;

  if (!passed) {
    console.log('\n❌ Phase 0 FAILED');
    if (results.stories.missing.length > 0) {
      console.log(`Missing stories: ${results.stories.missing.join(', ')}`);
    }
    if (results.rules.missing.length > 0) {
      console.log(`Missing rules: ${results.rules.missing.join(', ')}`);
    }
    if (results.contracts.found === 0) {
      console.log('Missing OpenAPI contracts');
    }
  } else {
    console.log('\n✅ Phase 0 PASSED');
  }

  // Optional: Report to validation registry
  // Uncomment if you have the validation registry set up
  /*
  import { reportValidationResult } from './lib/validation-registry';
  reportValidationResult({
    validator: 'phase0',
    passed,
    totalTests: config.features.length * 2 + 1, // stories + rules + contracts check
    passedTests: results.stories.found + results.rules.found + (results.contracts.found > 0 ? 1 : 0),
    failedTests: results.stories.missing.length + results.rules.missing.length + (results.contracts.found === 0 ? 1 : 0),
    skippedTests: 0,
    duration: 0,
    details: results,
  });
  */

  return passed;
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  validatePhase0()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation error:', error);
      process.exit(1);
    });
}

export { validatePhase0 };
