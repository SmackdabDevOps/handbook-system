#!/usr/bin/env ts-node
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePhase1 = validatePhase1;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const glob = __importStar(require("glob"));
// ============================================================================
// CONFIGURATION - CUSTOMIZE THESE VALUES
// ============================================================================
const PROJECT_ROOT = path.join(__dirname, '..', '..');
// CUSTOMIZE: Adjust these paths to match your project structure
const MANUAL_CONFIG = {
    paths: {
        openapi: 'openapi',
        dtos: 'src/modules/*/dto/*.dto.ts',
        controllers: 'src/modules/*/controllers/*.controller.ts',
        endpointsJson: 'architecture/ENDPOINTS.json',
    },
};
const USE_MANUAL_CONFIG = true;
async function validatePhase1() {
    console.log('=== Phase 1 Validation: Contract-Code Alignment ===\n');
    const config = USE_MANUAL_CONFIG ? MANUAL_CONFIG : null;
    if (!config) {
        console.error('ERROR: Configuration not loaded.');
        return false;
    }
    const results = {
        openapiValid: true,
        dtosFound: 0,
        controllersFound: 0,
        endpointsRegistered: 0,
        misalignments: [],
    };
    // 1. Validate OpenAPI spec can be parsed
    console.log('1. Validating OpenAPI specifications...');
    const openapiDir = path.join(PROJECT_ROOT, config.paths.openapi);
    if (!fs.existsSync(openapiDir)) {
        console.log(`  ✗ OpenAPI directory not found: ${openapiDir}`);
        results.openapiValid = false;
        results.misalignments.push('OpenAPI directory missing');
    }
    else {
        const pathsDir = path.join(openapiDir, 'paths');
        const schemasDir = path.join(openapiDir, 'schemas');
        if (fs.existsSync(pathsDir)) {
            const yamlFiles = glob.sync(path.join(pathsDir, '**/*.yaml'));
            console.log(`  Found ${yamlFiles.length} OpenAPI path files`);
            // Validate YAML syntax
            let invalidCount = 0;
            for (const file of yamlFiles) {
                try {
                    const content = fs.readFileSync(file, 'utf-8');
                    yaml.load(content);
                    console.log(`  ✓ ${path.basename(file)}`);
                }
                catch (error) {
                    console.log(`  ✗ ${path.basename(file)} - Invalid YAML: ${error.message}`);
                    results.openapiValid = false;
                    invalidCount++;
                }
            }
            if (invalidCount > 0) {
                results.misalignments.push(`${invalidCount} invalid OpenAPI files`);
            }
        }
        else {
            console.log(`  ✗ OpenAPI paths directory not found: ${pathsDir}`);
            results.openapiValid = false;
            results.misalignments.push('OpenAPI paths directory missing');
        }
    }
    // 2. Check DTOs exist
    console.log('\n2. Checking DTOs...');
    const dtoPattern = path.join(PROJECT_ROOT, config.paths.dtos);
    const dtoFiles = glob.sync(dtoPattern);
    results.dtosFound = dtoFiles.length;
    console.log(`  Found ${dtoFiles.length} DTO files`);
    if (dtoFiles.length === 0) {
        results.misalignments.push('No DTOs found - expected at least 1');
    }
    else {
        dtoFiles.slice(0, 5).forEach((file) => {
            console.log(`  ✓ ${path.relative(PROJECT_ROOT, file)}`);
        });
        if (dtoFiles.length > 5) {
            console.log(`  ... and ${dtoFiles.length - 5} more`);
        }
    }
    // 3. Check Controllers exist
    console.log('\n3. Checking Controllers...');
    const controllerPattern = path.join(PROJECT_ROOT, config.paths.controllers);
    const controllerFiles = glob.sync(controllerPattern);
    results.controllersFound = controllerFiles.length;
    console.log(`  Found ${controllerFiles.length} controller files`);
    if (controllerFiles.length === 0) {
        results.misalignments.push('No controllers found - expected at least 1');
    }
    else {
        controllerFiles.slice(0, 5).forEach((file) => {
            console.log(`  ✓ ${path.relative(PROJECT_ROOT, file)}`);
        });
        if (controllerFiles.length > 5) {
            console.log(`  ... and ${controllerFiles.length - 5} more`);
        }
    }
    // 4. Check ENDPOINTS.json exists and is valid
    console.log('\n4. Checking endpoint registry...');
    const endpointsPath = path.join(PROJECT_ROOT, config.paths.endpointsJson);
    if (!fs.existsSync(endpointsPath)) {
        console.log(`  ✗ ENDPOINTS.json not found at ${endpointsPath}`);
        console.log('  Run: npm run endpoints:validate (or equivalent) to generate it');
        results.misalignments.push('ENDPOINTS.json missing');
    }
    else {
        try {
            const endpointsContent = fs.readFileSync(endpointsPath, 'utf-8');
            const endpoints = JSON.parse(endpointsContent);
            if (Array.isArray(endpoints)) {
                results.endpointsRegistered = endpoints.length;
                console.log(`  ✓ ${endpoints.length} endpoints registered`);
            }
            else if (endpoints.endpoints && Array.isArray(endpoints.endpoints)) {
                results.endpointsRegistered = endpoints.endpoints.length;
                console.log(`  ✓ ${endpoints.endpoints.length} endpoints registered`);
            }
            else {
                console.log('  ✗ ENDPOINTS.json has unexpected format');
                results.misalignments.push('ENDPOINTS.json format invalid');
            }
        }
        catch (error) {
            console.log(`  ✗ Failed to parse ENDPOINTS.json: ${error.message}`);
            results.misalignments.push('ENDPOINTS.json parse error');
        }
    }
    // Summary
    console.log('\n=== Phase 1 Summary ===');
    console.log(`OpenAPI Valid: ${results.openapiValid ? 'YES' : 'NO'}`);
    console.log(`DTOs Found: ${results.dtosFound}`);
    console.log(`Controllers Found: ${results.controllersFound}`);
    console.log(`Endpoints Registered: ${results.endpointsRegistered}`);
    console.log(`Misalignments: ${results.misalignments.length}`);
    const passed = results.openapiValid &&
        results.dtosFound > 0 &&
        results.controllersFound > 0 &&
        results.endpointsRegistered > 0 &&
        results.misalignments.length === 0;
    if (!passed) {
        console.log('\n❌ Phase 1 FAILED');
        results.misalignments.forEach((issue) => {
            console.log(`  - ${issue}`);
        });
    }
    else {
        console.log('\n✅ Phase 1 PASSED');
    }
    // Optional: Report to validation registry
    /*
    import { reportValidationResult } from './lib/validation-registry';
    reportValidationResult({
      validator: 'phase1',
      passed,
      totalTests: 4,
      passedTests: [
        results.openapiValid,
        results.dtosFound > 0,
        results.controllersFound > 0,
        results.endpointsRegistered > 0
      ].filter(Boolean).length,
      failedTests: results.misalignments.length,
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
    validatePhase1()
        .then(passed => {
        process.exit(passed ? 0 : 1);
    })
        .catch((error) => {
        console.error('Validation error:', error);
        process.exit(1);
    });
}
