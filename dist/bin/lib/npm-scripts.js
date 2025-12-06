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
exports.addNpmScripts = addNpmScripts;
exports.addDevDependencies = addDevDependencies;
exports.getCurrentScripts = getCurrentScripts;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Scripts to add for handbook validation
 */
const HANDBOOK_SCRIPTS = {
    // Core validation
    'validation:gates': 'ts-node ${PATH}/gates.ts',
    'validation:quick': 'ts-node ${PATH}/quick-gate-check.ts',
    'validation:all': 'ts-node ${PATH}/run-all.ts',
    // Dashboard
    'dashboard:update': 'ts-node ${PATH}/dashboard.ts',
    // TDD enforcement
    'tdd:red-check': 'ts-node ${PATH}/check-red-phase.ts',
    'tdd:coverage': 'ts-node ${PATH}/check-unit-test-coverage.ts',
    // Registry
    'registry:freshness': 'ts-node ${PATH}/check-registry-freshness.ts',
};
/**
 * Add handbook scripts to package.json
 */
function addNpmScripts(config) {
    const packageJsonPath = path.join(config.projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        console.log('⚠️  No package.json found. Creating minimal one...');
        const minimal = {
            name: path.basename(config.projectRoot),
            version: '1.0.0',
            scripts: {}
        };
        fs.writeFileSync(packageJsonPath, JSON.stringify(minimal, null, 2));
    }
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    packageJson.scripts = packageJson.scripts || {};
    let added = 0;
    let skipped = 0;
    for (const [name, template] of Object.entries(HANDBOOK_SCRIPTS)) {
        const script = template.replace('${PATH}', config.validatorsPath);
        if (packageJson.scripts[name]) {
            // Don't overwrite existing scripts
            skipped++;
        }
        else {
            packageJson.scripts[name] = script;
            added++;
        }
    }
    // Add lint-staged config if not present (for pre-commit hook)
    if (!packageJson['lint-staged']) {
        packageJson['lint-staged'] = {
            '*.ts': ['eslint --fix'],
            '*.{json,md,yaml,yml}': ['prettier --write']
        };
    }
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`✅ Added ${added} npm scripts (${skipped} already existed)`);
}
/**
 * Add required dev dependencies
 */
function addDevDependencies(config) {
    const packageJsonPath = path.join(config.projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    packageJson.devDependencies = packageJson.devDependencies || {};
    const required = {
        'ts-node': '^10.0.0',
        'typescript': '^5.0.0',
        'lint-staged': '^15.0.0',
        'glob': '^10.0.0',
    };
    let added = 0;
    for (const [pkg, version] of Object.entries(required)) {
        if (!packageJson.devDependencies[pkg]) {
            packageJson.devDependencies[pkg] = version;
            added++;
        }
    }
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    if (added > 0) {
        console.log(`📦 Added ${added} dev dependencies. Run: npm install`);
    }
}
/**
 * Get current scripts from package.json
 */
function getCurrentScripts(projectRoot) {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath))
        return {};
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.scripts || {};
}
