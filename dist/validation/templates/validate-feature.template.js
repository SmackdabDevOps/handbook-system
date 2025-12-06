#!/usr/bin/env ts-node
"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFeature = validateFeature;
const axios_1 = __importDefault(require("axios"));
const https = __importStar(require("https"));
// CUSTOMIZE: Your feature configuration
const FEATURE_CONFIG = {
    name: '{feature_name}', // e.g., 'user-management'
    specFile: '{feature_name}.md', // e.g., 'user-management.md'
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
const testResults = [];
function fail(msg, detail) {
    console.error('FAIL:', msg);
    if (detail)
        console.error(detail);
    throw new Error(msg);
}
function expect(cond, msg) {
    if (!cond)
        fail(msg);
}
function log(msg) {
    console.log(msg);
}
function client(session) {
    const headers = {};
    if (session) {
        headers.Cookie = `X-Session=${session}`;
    }
    return axios_1.default.create({
        baseURL: FEATURE_CONFIG.baseUrl,
        headers,
        validateStatus: () => true,
        httpsAgent,
    });
}
function extractSession(cookieHeader) {
    const match = cookieHeader.match(/X-Session=([^;]+)/);
    if (!match || !match[1]) {
        fail('cannot parse X-Session cookie', cookieHeader);
    }
    return match[1];
}
async function recordTest(name, testFn) {
    log(`\n--- ${name} ---`);
    try {
        await testFn();
        log(`✓ ${name} PASSED`);
        return { name, passed: true };
    }
    catch (error) {
        log(`✗ ${name} FAILED: ${error.message}`);
        return { name, passed: false, error: error.message };
    }
}
async function registerUser(email, password, name) {
    const res = await axios_1.default.post(`${FEATURE_CONFIG.baseUrl}/auth/register`, { email, password, name }, { validateStatus: () => true, httpsAgent });
    expect(res.status === 201, `register status ${res.status}`);
    const setCookie = res.headers['set-cookie'] || [];
    expect(setCookie.length > 0, 'no session cookie from register');
    const session = extractSession(setCookie[0]);
    const userId = res.data?.data?.user?.id || res.data?.data?.id;
    return { email, password, session, userId };
}
async function loginUser(email, password) {
    const res = await axios_1.default.post(`${FEATURE_CONFIG.baseUrl}/auth/login`, { email, password }, { validateStatus: () => true, httpsAgent });
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
async function testCreateResource() {
    return recordTest('Create Resource', async () => {
        // Setup: Create test user if needed
        const ts = Date.now();
        const user = await registerUser(`test.create.${ts}@example.com`, 'Password123!', 'Test User');
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
async function testGetResource() {
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
async function testUpdateResource() {
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
async function testDeleteResource() {
    return recordTest('Delete Resource', async () => {
        // CUSTOMIZE: Your test implementation
        log('⚠ Test not implemented - customize this template');
    });
}
// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================
async function validateFeature() {
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
        testResults.filter((t) => !t.passed).forEach((t) => {
            log(`  - ${t.name}: ${t.error}`);
        });
    }
    else {
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
        .catch((error) => {
        console.error('Validation error:', error);
        process.exit(1);
    });
}
