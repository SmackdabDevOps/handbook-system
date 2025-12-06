#!/usr/bin/env ts-node
/**
 * Feature Validator Template
 *
 * Use this to create feature-specific validators that test actual API behavior
 * against UX specs and business rules.
 *
 * Usage:
 *   1. Copy this file
 *   2. Rename to validate-{feature}-full.ts
 *   3. Customize FEATURE_CONFIG
 *   4. Implement test cases based on your UX spec
 *
 * Example: validate-auth-full.ts, validate-channels-full.ts
 */

import axios, { AxiosInstance } from 'axios';
import * as https from 'https';

// ============================================================================
// CONFIGURATION - CUSTOMIZE FOR YOUR FEATURE
// ============================================================================

interface FeatureValidatorConfig {
  name: string;                    // Feature name (e.g., 'auth', 'channels')
  specFile: string;                // UX spec file (e.g., 'auth.md')
  baseUrl: string;                 // API base URL
  auth?: {
    type: 'session' | 'bearer';
    testCredentials: {
      email: string;
      password: string;
    };
  };
}

// CUSTOMIZE: Your feature configuration
const FEATURE_CONFIG: FeatureValidatorConfig = {
  name: '{feature_name}',          // e.g., 'user-management'
  specFile: '{feature_name}.md',   // e.g., 'user-management.md'
  baseUrl: process.env.API_BASE_URL || 'http://localhost:8000/api/v1',
  auth: {
    type: 'session',
    testCredentials: {
      email: 'test.user@example.com',
      password: 'Password123!',
    },
  },
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

let startTime = 0;
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

type TestResult = {
  name: string;
  passed: boolean;
  error?: string;
};

const testResults: TestResult[] = [];

function fail(msg: string, detail?: any): never {
  console.error('FAIL:', msg);
  if (detail) console.error(detail);
  throw new Error(msg);
}

function expect(cond: any, msg: string) {
  if (!cond) fail(msg);
}

function log(msg: string) {
  console.log(msg);
}

function client(session?: string): AxiosInstance {
  const headers: any = {};
  if (session) {
    headers.Cookie = `X-Session=${session}`;
  }

  return axios.create({
    baseURL: FEATURE_CONFIG.baseUrl,
    headers,
    validateStatus: () => true,
    httpsAgent,
  });
}

function extractSession(cookieHeader: string): string {
  const match = cookieHeader.match(/X-Session=([^;]+)/);
  if (!match || !match[1]) {
    fail('cannot parse X-Session cookie', cookieHeader);
  }
  return match[1];
}

async function recordTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  log(`\n--- ${name} ---`);
  try {
    await testFn();
    log(`✓ ${name} PASSED`);
    return { name, passed: true };
  } catch (error) {
    log(`✗ ${name} FAILED: ${error.message}`);
    return { name, passed: false, error: error.message };
  }
}

// ============================================================================
// AUTHENTICATION HELPER (if needed)
// ============================================================================

type UserContext = {
  email: string;
  password: string;
  session?: string;
  userId?: string;
};

async function registerUser(email: string, password: string, name: string): Promise<UserContext> {
  const res = await axios.post(
    `${FEATURE_CONFIG.baseUrl}/auth/register`,
    { email, password, name },
    { validateStatus: () => true, httpsAgent }
  );

  expect(res.status === 201, `register status ${res.status}`);

  const setCookie = res.headers['set-cookie'] || [];
  expect(setCookie.length > 0, 'no session cookie from register');

  const session = extractSession(setCookie[0]);
  const userId = res.data?.data?.user?.id || res.data?.data?.id;

  return { email, password, session, userId };
}

async function loginUser(email: string, password: string): Promise<UserContext> {
  const res = await axios.post(
    `${FEATURE_CONFIG.baseUrl}/auth/login`,
    { email, password },
    { validateStatus: () => true, httpsAgent }
  );

  expect(res.status === 200, `login status ${res.status}`);

  const setCookie = res.headers['set-cookie'] || [];
  expect(setCookie.length > 0, 'no session cookie from login');

  const session = extractSession(setCookie[0]);
  const userId = res.data?.data?.user?.id || res.data?.data?.id;

  return { email, password, session, userId };
}

// ============================================================================
// TEST CASES - IMPLEMENT BASED ON YOUR UX SPEC
// ============================================================================

/**
 * Example Test: Create Resource
 *
 * CUSTOMIZE: Replace with your actual test based on UX spec
 */
async function testCreateResource(): Promise<TestResult> {
  return recordTest('Create Resource', async () => {
    // Setup: Create test user if needed
    const ts = Date.now();
    const user = await registerUser(
      `test.create.${ts}@example.com`,
      'Password123!',
      'Test User'
    );

    const c = client(user.session);

    // CUSTOMIZE: Your API call
    const res = await c.post('/resources', {
      name: `Test Resource ${ts}`,
      // ... other fields
    });

    // CUSTOMIZE: Your assertions
    expect(res.status === 201, `Expected 201, got ${res.status}`);
    expect(res.data?.data?.id, 'Resource ID missing');
    expect(res.data?.data?.name, 'Resource name missing');

    log(`✓ Created resource: ${res.data?.data?.id}`);
  });
}

/**
 * Example Test: Get Resource
 *
 * CUSTOMIZE: Replace with your actual test
 */
async function testGetResource(): Promise<TestResult> {
  return recordTest('Get Resource', async () => {
    // CUSTOMIZE: Your test implementation
    log('⚠ Test not implemented - customize this template');
  });
}

/**
 * Example Test: Update Resource
 *
 * CUSTOMIZE: Replace with your actual test
 */
async function testUpdateResource(): Promise<TestResult> {
  return recordTest('Update Resource', async () => {
    // CUSTOMIZE: Your test implementation
    log('⚠ Test not implemented - customize this template');
  });
}

/**
 * Example Test: Delete Resource
 *
 * CUSTOMIZE: Replace with your actual test
 */
async function testDeleteResource(): Promise<TestResult> {
  return recordTest('Delete Resource', async () => {
    // CUSTOMIZE: Your test implementation
    log('⚠ Test not implemented - customize this template');
  });
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

async function validateFeature(): Promise<boolean> {
  startTime = Date.now();

  log(`\n========================================`);
  log(`${FEATURE_CONFIG.name} Feature Validation`);
  log(`Base URL: ${FEATURE_CONFIG.baseUrl}`);
  log(`Spec: ${FEATURE_CONFIG.specFile}`);
  log(`========================================\n`);

  // Run all test cases
  // CUSTOMIZE: Add your test cases here
  testResults.push(await testCreateResource());
  testResults.push(await testGetResource());
  testResults.push(await testUpdateResource());
  testResults.push(await testDeleteResource());

  // Summary
  const duration = Date.now() - startTime;
  const passedCount = testResults.filter(t => t.passed).length;
  const failedCount = testResults.filter(t => !t.passed).length;

  log(`\n========================================`);
  log(`${FEATURE_CONFIG.name} Validation Summary`);
  log(`========================================`);
  log(`Total Tests: ${testResults.length}`);
  log(`Passed: ${passedCount}`);
  log(`Failed: ${failedCount}`);
  log(`Duration: ${duration}ms`);

  const passed = failedCount === 0;

  if (!passed) {
    log('\n❌ VALIDATION FAILED');
    log('\nFailed tests:');
    testResults.filter(t => !t.passed).forEach(t => {
      log(`  - ${t.name}: ${t.error}`);
    });
  } else {
    log('\n✅ VALIDATION PASSED');
  }

  // Optional: Report to validation registry
  /*
  import { reportValidationResult } from './lib/validation-registry';
  reportValidationResult({
    validator: FEATURE_CONFIG.name,
    passed,
    totalTests: testResults.length,
    passedTests: passedCount,
    failedTests: failedCount,
    skippedTests: 0,
    duration,
    details: { tests: testResults },
  });
  */

  return passed;
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  validateFeature()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation error:', error);
      process.exit(1);
    });
}

export { validateFeature };
