#!/usr/bin/env ts-node
"use strict";
/**
 * Run All Validators - Config-Driven
 *
 * Runs all validators for configured features
 * - Discovers validators from config.features list
 * - Generates validator list dynamically
 * - Reports results to validation registry
 * - Updates progress files and dashboard
 *
 * Usage:
 *   npx ts-node run-all.ts
 *   npx ts-node run-all.ts --validator=auth
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
// Import lib functions if available
let runSuite;
let reportValidationResult;
let markFullRunComplete;
try {
    const suiteLib = require('./lib/run-suite');
    runSuite = suiteLib.runSuite;
}
catch {
    // Fallback if lib not available
    runSuite = async (cmds, executor) => {
        const failures = [];
        for (const cmd of cmds) {
            const result = await executor(cmd.command);
            if (result.code !== 0) {
                failures.push(cmd.name);
            }
        }
        return { allPassed: failures.length === 0, failures };
    };
}
try {
    const registryLib = require('./lib/validation-registry');
    reportValidationResult = registryLib.reportValidationResult;
    markFullRunComplete = registryLib.markFullRunComplete;
}
catch {
    // Fallback if lib not available
    reportValidationResult = async () => { };
    markFullRunComplete = () => { };
}
function ensureLogDir(projectRoot) {
    const logDir = path.join(projectRoot, 'validation', 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    return logDir;
}
function runBlocking(title, cmd, cwd) {
    console.log(`>>> ${title}: ${cmd.join(' ')}`);
    const res = (0, child_process_1.spawnSync)(cmd[0], cmd.slice(1), { stdio: 'inherit', cwd });
    if (res.status !== 0) {
        throw new Error(`${title} failed with exit code ${res.status ?? 1}`);
    }
}
function getRequestedValidator() {
    const arg = process.argv.find((a) => a.startsWith('--validator='));
    return arg ? arg.replace('--validator=', '') : null;
}
/**
 * Discover validators from config features
 */
function discoverValidators(config, validatorsPath) {
    const validators = [];
    // Use config.features to generate validator list
    for (const feature of config.features) {
        const validatorPath = path.join(validatorsPath, `validate-${feature}-full.ts`);
        if (fs.existsSync(validatorPath)) {
            validators.push({
                name: feature,
                command: ['npx', 'ts-node', validatorPath],
            });
        }
        else {
            console.warn(`⚠️  Validator script not found for feature: ${feature}`);
            console.warn(`   Expected: ${validatorPath}`);
        }
    }
    return validators;
}
async function runValidators(projectRoot, config, logDir) {
    const validatorsPath = (0, loader_1.getValidatorsPath)(projectRoot);
    const validators = discoverValidators(config, validatorsPath);
    if (validators.length === 0) {
        console.warn('⚠️  No validators found for configured features');
        return { allPassed: true, failures: [] };
    }
    const requested = getRequestedValidator();
    const suite = requested ? validators.filter((v) => v.name === requested) : validators;
    if (requested && suite.length === 0) {
        console.error(`Validator ${requested} not found in configured features.`);
        return { allPassed: false, failures: [requested] };
    }
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const result = await runSuite(suite, async (cmd) => {
        const name = path.basename(cmd[cmd.length - 1]).replace(/^validate-/, '').replace(/-full\.ts$/, '');
        const logPath = path.join(logDir, `${name}-${stamp}.log`);
        console.log(`>>> Running ${name} (log: ${logPath})`);
        console.log(`RUNNER_EVENT {"type":"validator_start","validator":"${name}"}`);
        const startTime = Date.now();
        const proc = (0, child_process_1.spawnSync)(cmd[0], cmd.slice(1), {
            cwd: projectRoot,
            stdio: 'pipe',
            encoding: 'utf-8',
        });
        fs.writeFileSync(logPath, proc.stdout + proc.stderr);
        process.stdout.write(proc.stdout || '');
        process.stderr.write(proc.stderr || '');
        const code = proc.status ?? 1;
        const duration = Date.now() - startTime;
        console.log(`RUNNER_EVENT {"type":"validator_end","validator":"${name}","success":${code === 0}}`);
        // Report failure to registry if crashed
        if (code !== 0) {
            const stderr = proc.stderr || '';
            const errorPreview = stderr.slice(0, 500).trim();
            let errorType = 'Script crashed';
            if (stderr.includes('TSError') || stderr.includes('Unable to compile TypeScript')) {
                errorType = 'TypeScript compilation error';
            }
            else if (stderr.includes('SyntaxError')) {
                errorType = 'JavaScript syntax error';
            }
            else if (stderr.includes('Cannot find module')) {
                errorType = 'Missing module/import error';
            }
            else if (stderr.includes('ECONNREFUSED')) {
                errorType = 'Connection refused - server not running?';
            }
            await reportValidationResult({
                validator: name,
                passed: false,
                totalTests: 0,
                passedTests: 0,
                failedTests: 1,
                skippedTests: 0,
                duration,
                details: {
                    failedTestNames: [errorType],
                    notes: `Exit code: ${code}\n\n${errorPreview}`,
                },
            });
        }
        return { code };
    });
    return result;
}
async function main() {
    let hasFailure = false;
    try {
        const projectRoot = (0, loader_1.findProjectRoot)();
        const config = (0, loader_1.loadConfig)(projectRoot);
        const logDir = ensureLogDir(projectRoot);
        console.log(`Running validation suite for: ${config.projectName}\n`);
        // Run pre-validation checks using configured commands
        runBlocking('OpenAPI bundle', config.commands['openapi:bundle'].split(' '), projectRoot);
        runBlocking('Naming validation', ['npm', 'run', 'validate:naming'], projectRoot);
        runBlocking('OpenAPI-DTO validation', ['npm', 'run', 'validate:openapi-dto'], projectRoot);
        runBlocking('Endpoints validate', config.commands['endpoints:validate'].split(' '), projectRoot);
        runBlocking('Suite coverage check', ['npm', 'run', 'validate:suite-coverage'], projectRoot);
        const suiteResult = await runValidators(projectRoot, config, logDir);
        hasFailure = !suiteResult.allPassed;
        // Mark full run timestamp
        try {
            markFullRunComplete();
        }
        catch {
            console.warn('Warning: unable to mark full run complete');
        }
        // Generate progress and dashboard
        const progressScript = path.join((0, loader_1.getValidatorsPath)(projectRoot), 'generate-progress-files.ts');
        if (fs.existsSync(progressScript)) {
            (0, child_process_1.spawnSync)('npx', ['ts-node', progressScript], { cwd: projectRoot, stdio: 'inherit' });
        }
        (0, child_process_1.spawnSync)('npm', ['run', 'dashboard:update'], { cwd: projectRoot, stdio: 'inherit' });
        if (hasFailure) {
            console.error('❌ Validation suite completed with failures. See logs for details.');
            process.exit(1);
        }
        console.log('✅ Validation suite completed successfully.');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Validation suite failed to execute:', error.message || error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
