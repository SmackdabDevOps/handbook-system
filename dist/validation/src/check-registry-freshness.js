#!/usr/bin/env ts-node
"use strict";
/**
 * Registry Freshness Checker - Chain of Trust System (Config-Driven)
 *
 * Detects when the validation registry is stale:
 * 1. New validators exist that aren't in the registry
 * 2. Validator scripts modified after their last run
 * 3. Registry hasn't had a full run in threshold time
 *
 * Exit codes:
 *   0 = Fresh (all validators accounted for and recent)
 *   1 = Stale (missing validators, old results, or code changed)
 *
 * Usage:
 *   npx ts-node check-registry-freshness.ts
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const loader_1 = require("./config/loader");
// Import registry functions if available
let readRegistry;
try {
    const registryLib = require('./lib/validation-registry');
    readRegistry = registryLib.readRegistry;
}
catch {
    // Fallback implementation if lib not available
    readRegistry = () => {
        const registryPath = (0, loader_1.getRegistryPath)();
        return JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    };
}
// Staleness thresholds (could be made configurable)
const STALE_THRESHOLD_HOURS = 2;
const STALE_THRESHOLD_MS = STALE_THRESHOLD_HOURS * 60 * 60 * 1000;
/**
 * Discover all validator scripts from config features
 */
function discoverValidators(config, validatorsPath) {
    const validators = [];
    for (const feature of config.features) {
        const validatorPath = path.join(validatorsPath, `validate-${feature}-full.ts`);
        if (fs.existsSync(validatorPath)) {
            validators.push(feature);
        }
    }
    return validators.sort();
}
/**
 * Get file modification time
 */
function getFileMtime(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.mtime;
    }
    catch {
        return null;
    }
}
/**
 * Get current git commit hash
 */
function getCurrentGitCommit(projectRoot) {
    try {
        return (0, child_process_1.execSync)('git rev-parse HEAD', {
            cwd: projectRoot,
            encoding: 'utf-8',
        })
            .trim()
            .slice(0, 7);
    }
    catch {
        return null;
    }
}
/**
 * Get commit count between two commits
 */
function getCommitsBetween(from, to, projectRoot) {
    try {
        const output = (0, child_process_1.execSync)(`git rev-list ${from}..${to} --count`, {
            cwd: projectRoot,
            encoding: 'utf-8',
        }).trim();
        return parseInt(output, 10) || 0;
    }
    catch {
        return 0;
    }
}
/**
 * Check registry freshness
 */
function checkFreshness(projectRoot, config, validatorsPath, registryPath) {
    const report = {
        isFresh: true,
        missingValidators: [],
        modifiedSinceLastRun: [],
        staleValidators: [],
        registryAge: null,
        currentCommit: null,
        registryCommit: null,
        commitsBehind: 0,
    };
    // Read registry
    let registry;
    try {
        registry = readRegistry();
    }
    catch (error) {
        console.error('❌ Failed to read validation registry');
        report.isFresh = false;
        return report;
    }
    // Get current git commit
    report.currentCommit = getCurrentGitCommit(projectRoot);
    // Discover validators from config
    const discoveredValidators = discoverValidators(config, validatorsPath);
    const registeredValidators = new Set(Object.keys(registry.validators || {}));
    // Also check phase gate required validators
    const requiredValidators = new Set();
    for (const gate of Object.values(registry.phaseGates || {})) {
        for (const v of gate.requiredValidators || []) {
            requiredValidators.add(v);
        }
    }
    // Check for missing validators (scripts exist but not in registry)
    for (const validator of discoveredValidators) {
        if (!registeredValidators.has(validator)) {
            report.missingValidators.push(validator);
            report.isFresh = false;
        }
    }
    // Check for required validators not run
    for (const validator of requiredValidators) {
        if (!registeredValidators.has(validator)) {
            if (!report.missingValidators.includes(validator)) {
                report.missingValidators.push(validator);
            }
            report.isFresh = false;
        }
    }
    // Check for modified scripts since last run
    const now = Date.now();
    for (const validator of discoveredValidators) {
        const entry = registry.validators[validator];
        if (!entry)
            continue;
        const scriptPath = path.join(validatorsPath, `validate-${validator}-full.ts`);
        const mtime = getFileMtime(scriptPath);
        if (mtime && entry.lastRun) {
            const lastRun = new Date(entry.lastRun);
            if (mtime > lastRun) {
                report.modifiedSinceLastRun.push(validator);
                report.isFresh = false;
            }
        }
        // Check staleness (older than threshold)
        if (entry.lastRun) {
            const age = now - new Date(entry.lastRun).getTime();
            if (age > STALE_THRESHOLD_MS) {
                report.staleValidators.push(validator);
            }
        }
    }
    // Check registry age
    if (registry.lastFullRun) {
        report.registryAge = now - new Date(registry.lastFullRun).getTime();
    }
    // Check git commit tracking
    const firstEntry = Object.values(registry.validators)[0];
    if (firstEntry?.gitCommit) {
        report.registryCommit = firstEntry.gitCommit;
        if (report.currentCommit && report.registryCommit) {
            report.commitsBehind = getCommitsBetween(report.registryCommit, report.currentCommit, projectRoot);
        }
    }
    return report;
}
/**
 * Format duration for display
 */
function formatDuration(ms) {
    if (ms < 60000)
        return `${Math.floor(ms / 1000)}s`;
    if (ms < 3600000)
        return `${Math.floor(ms / 60000)}m`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}
/**
 * Main function
 */
function main() {
    try {
        const projectRoot = (0, loader_1.findProjectRoot)();
        const config = (0, loader_1.loadConfig)(projectRoot);
        const validatorsPath = (0, loader_1.getValidatorsPath)(projectRoot);
        const registryPath = (0, loader_1.getRegistryPath)(projectRoot);
        console.log('🔍 Checking validation registry freshness...\n');
        console.log(`Project: ${config.projectName}`);
        console.log(`Registry: ${config.registry.path}\n`);
        const report = checkFreshness(projectRoot, config, validatorsPath, registryPath);
        // Display report
        console.log('Registry Status:');
        console.log(`  Current commit: ${report.currentCommit || 'Unknown'}`);
        console.log(`  Registry commit: ${report.registryCommit || 'Unknown'}`);
        console.log(`  Commits behind: ${report.commitsBehind}`);
        console.log(`  Last full run: ${report.registryAge !== null ? formatDuration(report.registryAge) + ' ago' : 'Never'}`);
        console.log('');
        if (report.missingValidators.length > 0) {
            console.log('❌ Missing validators (not in registry):');
            for (const v of report.missingValidators) {
                console.log(`   - ${v}`);
            }
            console.log('');
        }
        if (report.modifiedSinceLastRun.length > 0) {
            console.log('⚠️  Scripts modified since last run:');
            for (const v of report.modifiedSinceLastRun) {
                console.log(`   - ${v}`);
            }
            console.log('');
        }
        if (report.staleValidators.length > 0) {
            console.log(`⏰ Stale results (>${STALE_THRESHOLD_HOURS}h old):`);
            for (const v of report.staleValidators) {
                console.log(`   - ${v}`);
            }
            console.log('');
        }
        // Final verdict
        if (report.isFresh) {
            console.log('✅ Registry is fresh - all validators accounted for');
            process.exit(0);
        }
        else {
            console.log('❌ Registry is STALE - validation required before commit');
            console.log('');
            console.log('To fix, run:');
            console.log('  npm run validation:all');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Registry freshness check failed:', error.message);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
