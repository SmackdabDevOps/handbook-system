#!/usr/bin/env node
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const file_operations_1 = require("./lib/file-operations");
const husky_installer_1 = require("./lib/husky-installer");
const npm_scripts_1 = require("./lib/npm-scripts");
// Simple readline interface for prompts
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
/**
 * Prompt user for input with optional default value
 */
async function prompt(question, defaultValue) {
    return new Promise((resolve) => {
        const displayQuestion = defaultValue
            ? `${question} [${defaultValue}]: `
            : `${question}: `;
        rl.question(displayQuestion, (answer) => {
            resolve(answer.trim() || defaultValue || '');
        });
    });
}
/**
 * Multi-select checkbox prompt
 */
async function checkbox(question, options) {
    console.log(`\n${question}`);
    console.log('(Space-separated list, or press Enter for none)\n');
    options.forEach((opt, idx) => {
        console.log(`  ${idx + 1}. ${opt}`);
    });
    const answer = await prompt('\nSelect numbers or names (e.g., "1 3 5" or "auth tenancy")');
    if (!answer)
        return [];
    const selections = answer.split(/\s+/).map(s => s.trim());
    const selected = [];
    for (const sel of selections) {
        // Check if it's a number (index)
        if (/^\d+$/.test(sel)) {
            const idx = parseInt(sel) - 1;
            if (idx >= 0 && idx < options.length) {
                selected.push(options[idx]);
            }
        }
        else {
            // Check if it's a module name
            if (options.includes(sel)) {
                selected.push(sel);
            }
        }
    }
    return Array.from(new Set(selected)); // Remove duplicates
}
/**
 * Auto-detect stack profile based on project files
 */
function detectStack(projectRoot) {
    // Check for NestJS
    if (fs.existsSync(path.join(projectRoot, 'nest-cli.json'))) {
        return 'nestjs-single';
    }
    // Check for Nx workspace
    if (fs.existsSync(path.join(projectRoot, 'nx.json'))) {
        return 'express-nx';
    }
    // Check package.json for framework hints
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (deps['@nestjs/core']) {
            return 'nestjs-single';
        }
        if (deps['express']) {
            return 'express-single';
        }
    }
    return 'generic';
}
/**
 * Generate default paths based on stack profile
 */
function getDefaultPaths(stackProfile) {
    const base = {
        handbook: 'handbook/',
        openapi: 'openapi/',
        stories: 'docs/user-stories/',
        rules: 'docs/business-rules/',
        specs: 'docs/test-plans/validation-specs/',
        validators: 'scripts/validation/',
        endpointsJson: 'architecture/ENDPOINTS.json'
    };
    switch (stackProfile) {
        case 'nestjs-single':
            return {
                ...base,
                controllers: 'src/modules/*/controllers/*.controller.ts',
                dtos: 'src/modules/*/dto/*.dto.ts',
                services: 'src/modules/*/services/*.service.ts',
                modules: 'src/modules/*.module.ts'
            };
        case 'express-single':
            return {
                ...base,
                controllers: 'src/routes/**/*.ts',
                dtos: 'src/dto/**/*.ts',
                services: 'src/services/**/*.ts',
                modules: 'src/modules/**/*.ts'
            };
        case 'express-nx':
            return {
                ...base,
                controllers: 'apps/*/src/routes/**/*.ts',
                dtos: 'libs/*/src/dto/**/*.ts',
                services: 'apps/*/src/services/**/*.ts',
                modules: 'apps/*/src/modules/**/*.ts'
            };
        default:
            return base;
    }
}
/**
 * Generate handbook.config.json
 */
function generateConfig(answers) {
    return {
        version: '1.0.0',
        projectName: answers.projectName,
        stackProfile: answers.stackProfile,
        paths: getDefaultPaths(answers.stackProfile),
        commands: {
            'validate:gates': 'npm run validation:gates',
            'validate:quick': 'npm run validation:quick',
            'openapi:bundle': 'npm run openapi:bundle',
            'endpoints:validate': 'npm run endpoints:validate'
        },
        phases: {
            enabled: [0, 1, 2, 3, 4, 5],
            customGates: {}
        },
        tdd: {
            thresholds: {
                unit_coverage: answers.unitCoverage,
                contract_coverage: answers.contractCoverage,
                integration_coverage: answers.integrationCoverage
            },
            hooks: {
                enforceRedPhase: true,
                blockCommitsWithoutValidation: true,
                version: '2.2.0'
            },
            enforcedPatterns: answers.stackProfile === 'nestjs-single'
                ? [
                    'src/modules/*/services/*.service.ts',
                    'src/modules/*/controllers/*.controller.ts'
                ]
                : [],
            excludedPatterns: [
                'src/database/migrations/*.ts',
                'src/common/**/*.ts',
                'test/**/*.ts'
            ]
        },
        registry: {
            path: 'scripts/validation/validation-registry.json',
            trackRedPhase: true,
            trackTDDStats: true
        },
        features: []
    };
}
/**
 * Get package root (where this script is installed)
 */
function getPackageRoot() {
    // When run via npx @smackdab/handbook-init, __dirname is dist/cli/
    // We need to go up to the package root
    let current = __dirname;
    // Look for package.json with @smackdab/handbook-system
    while (current !== path.parse(current).root) {
        const pkgPath = path.join(current, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            if (pkg.name === '@smackdab/handbook-system') {
                return current;
            }
        }
        current = path.dirname(current);
    }
    throw new Error('Could not locate @smackdab/handbook-system package root');
}
/**
 * Main CLI function
 */
async function main() {
    console.log('\n🚀 @smackdab/handbook-system initializer\n');
    console.log('This wizard will set up the Handbook System for your project.\n');
    const projectRoot = process.cwd();
    const packageRoot = getPackageRoot();
    // Step 1: Gather configuration
    console.log('📋 Configuration\n');
    const projectName = await prompt('Project name', path.basename(projectRoot));
    const detectedStack = detectStack(projectRoot);
    console.log(`\n🔍 Detected stack: ${detectedStack}`);
    const stackProfile = await prompt('Stack profile (nestjs-single, express-single, express-nx, generic)', detectedStack);
    const optionalModules = await checkbox('📦 Select optional modules to include:', [
        'auth',
        'tenancy',
        'caching',
        'messaging',
        'permissions',
        'config',
        'flags',
        'observability',
        'logging',
        'schema'
    ]);
    console.log('\n🎯 TDD Coverage Thresholds\n');
    const unitCoverage = parseInt(await prompt('Unit test coverage (%)', '90')) || 90;
    const contractCoverage = parseInt(await prompt('Contract test coverage (%)', '100')) || 100;
    const integrationCoverage = parseInt(await prompt('Integration test coverage (%)', '100')) || 100;
    const answers = {
        projectName,
        stackProfile,
        optionalModules,
        unitCoverage,
        contractCoverage,
        integrationCoverage
    };
    // Step 2: Confirm
    console.log('\n📝 Summary:\n');
    console.log(`  Project: ${projectName}`);
    console.log(`  Stack: ${stackProfile}`);
    console.log(`  Modules: ${optionalModules.length > 0 ? optionalModules.join(', ') : 'none'}`);
    console.log(`  TDD: unit=${unitCoverage}%, contract=${contractCoverage}%, integration=${integrationCoverage}%`);
    console.log('');
    const confirm = await prompt('Proceed with installation? (yes/no)', 'yes');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        console.log('❌ Installation cancelled');
        rl.close();
        process.exit(0);
    }
    // Step 3: Generate config
    console.log('\n⚙️  Generating configuration...\n');
    const config = generateConfig(answers);
    const configPath = path.join(projectRoot, 'handbook.config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Created handbook.config.json');
    // Step 4: Copy files
    console.log('\n📁 Copying files...\n');
    const copyOptions = {
        sourceRoot: packageRoot,
        targetRoot: projectRoot,
        stackProfile,
        selectedModules: optionalModules
    };
    (0, file_operations_1.copyCoreFiles)(copyOptions);
    if (optionalModules.length > 0) {
        (0, file_operations_1.copyOptionalModules)(copyOptions);
    }
    (0, file_operations_1.copyValidationTemplates)(copyOptions);
    (0, file_operations_1.copyValidationLib)(copyOptions);
    // Step 5: Install hooks
    console.log('\n🪝 Installing hooks...\n');
    (0, file_operations_1.installClaudeHooks)(copyOptions, config);
    const huskyOptions = {
        projectRoot,
        validatorsPath: config.paths.validators
    };
    if (!(0, husky_installer_1.isHuskyInstalled)(projectRoot)) {
        (0, husky_installer_1.installHusky)(huskyOptions);
    }
    else {
        console.log('ℹ️  Husky already installed, skipping...');
    }
    // Step 6: Add npm scripts
    console.log('\n📜 Adding npm scripts...\n');
    const scriptsConfig = {
        projectRoot,
        validatorsPath: config.paths.validators
    };
    (0, npm_scripts_1.addNpmScripts)(scriptsConfig);
    (0, npm_scripts_1.addDevDependencies)(scriptsConfig);
    // Step 7: Initialize registry
    console.log('\n📊 Initializing validation registry...\n');
    (0, file_operations_1.initializeRegistry)(copyOptions, config);
    // Done!
    console.log('\n✅ Handbook system initialized successfully!\n');
    console.log('📖 Next steps:\n');
    console.log('  1. Run: npm install');
    console.log('  2. Review handbook.config.json and adjust paths if needed');
    console.log('  3. Check handbook/ directory for core documentation');
    console.log('  4. Run: npm run validation:quick -- to verify setup\n');
    console.log('💡 For SDD plugin users, run: /sdd:status to check your setup\n');
    rl.close();
}
// Run CLI
main().catch((error) => {
    console.error('\n❌ Error during initialization:\n');
    console.error(error);
    rl.close();
    process.exit(1);
});
