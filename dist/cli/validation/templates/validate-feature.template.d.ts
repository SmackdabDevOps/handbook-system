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
declare function validateFeature(): Promise<boolean>;
export { validateFeature };
