#!/usr/bin/env ts-node
/**
 * Phase 1 Validator Template
 *
 * Phase 1 validates: Contract-Code Alignment
 * - OpenAPI specs match DTOs
 * - DTOs match Controllers
 * - Endpoints are properly registered
 *
 * Usage: Copy this file, rename to validate-phase1.ts, customize configuration
 */
declare function validatePhase1(): Promise<boolean>;
export { validatePhase1 };
