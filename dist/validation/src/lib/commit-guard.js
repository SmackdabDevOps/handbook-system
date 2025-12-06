"use strict";
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
exports.mapFilesToValidators = mapFilesToValidators;
exports.evaluateValidatorStatuses = evaluateValidatorStatuses;
exports.loadValidatorMapping = loadValidatorMapping;
exports.getCurrentCommit = getCurrentCommit;
exports.getChangedFiles = getChangedFiles;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_loader_1 = require("./config-loader");
function globToRegex(pattern) {
    const normalized = pattern.split(path.sep).join('/');
    const withPlaceholders = normalized.replace(/\*\*/g, '<<DS>>').replace(/\*/g, '<<S>>');
    const escaped = withPlaceholders.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&');
    const finalPattern = escaped
        .replace(/<<DS>>/g, '.*')
        .replace(/<<S>>/g, '[^/]*');
    return new RegExp(`^${finalPattern}$`);
}
function matchesAnyPattern(filePath, patterns) {
    const posixPath = filePath.split(path.sep).join('/');
    return patterns.some((pattern) => globToRegex(pattern).test(posixPath));
}
function mapFilesToValidators(changedFiles, mapping) {
    const validators = new Set();
    for (const file of changedFiles) {
        for (const entry of mapping) {
            if (matchesAnyPattern(file, entry.patterns)) {
                entry.validators.forEach((v) => validators.add(v));
            }
        }
    }
    return validators;
}
function collectStatusBuckets(registry, requiredValidators, currentCommit, staleThresholdHours) {
    const missing = [];
    const failed = [];
    const stale = [];
    const checked = [];
    const staleThresholdMs = staleThresholdHours * 60 * 60 * 1000;
    const now = Date.now();
    const getEntry = (name) => registry.validators[name];
    for (const validator of requiredValidators) {
        const entry = getEntry(validator);
        if (!entry || !entry.lastRun) {
            missing.push(validator);
            continue;
        }
        checked.push(validator);
        const isFailed = entry.passed === false;
        if (isFailed) {
            const failMsg = `${validator} (${entry.failedTests}/${entry.totalTests} failing)`;
            failed.push(failMsg);
            continue;
        }
        const isStaleCommit = !!entry.gitCommit && entry.gitCommit !== currentCommit;
        const isStaleTime = now - new Date(entry.lastRun).getTime() > staleThresholdMs;
        if (isStaleCommit || isStaleTime) {
            stale.push(validator);
        }
    }
    return { missing, failed, stale, checked };
}
function evaluateValidatorStatuses(registry, currentCommit, requiredValidators, staleThresholdHours) {
    // Use config for stale threshold if not provided
    const config = (0, config_loader_1.loadConfig)();
    const threshold = staleThresholdHours ?? config.tdd.staleThresholdHours ?? 4;
    const { missing, failed, stale, checked } = collectStatusBuckets(registry, requiredValidators, currentCommit, threshold);
    const blockers = [];
    const warnings = [];
    if (missing.length > 0) {
        const missingMsg = `Missing validator results: ${missing.join(', ')}`;
        blockers.push(missingMsg);
    }
    if (failed.length > 0) {
        const failedMsg = `Failed validators: ${failed.join(', ')}`;
        blockers.push(failedMsg);
    }
    if (stale.length > 0) {
        const staleMsg = `Stale validators (rerun on current commit): ${stale.join(', ')}`;
        blockers.push(staleMsg);
    }
    return {
        passed: blockers.length === 0,
        blockers,
        warnings,
        checkedValidators: checked,
    };
}
function loadValidatorMapping(mappingPath) {
    const resolved = path.resolve(mappingPath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`Validator mapping not found at ${resolved}`);
    }
    const raw = fs.readFileSync(resolved, 'utf-8');
    return JSON.parse(raw);
}
function getCurrentCommit() {
    try {
        const { execSync } = require('child_process');
        return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    }
    catch (error) {
        throw new Error('Unable to read current git commit. Ensure this is a git repo.');
    }
}
function getChangedFiles() {
    try {
        const { execSync } = require('child_process');
        const output = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
        return output
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
    }
    catch (error) {
        throw new Error('Unable to read git diff for changed files.');
    }
}
