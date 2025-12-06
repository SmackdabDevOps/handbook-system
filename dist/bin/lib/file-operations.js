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
exports.copyCoreFiles = copyCoreFiles;
exports.copyOptionalModules = copyOptionalModules;
exports.copyValidationTemplates = copyValidationTemplates;
exports.copyValidationLib = copyValidationLib;
exports.installClaudeHooks = installClaudeHooks;
exports.initializeRegistry = initializeRegistry;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Copy core handbook files to target project
 */
function copyCoreFiles(options) {
    const sourceCore = path.join(options.sourceRoot, 'core');
    const targetHandbook = path.join(options.targetRoot, 'handbook');
    // Recursively copy all core files
    copyDirRecursive(sourceCore, targetHandbook);
    console.log('✅ Copied core handbook files');
}
/**
 * Copy selected optional modules
 */
function copyOptionalModules(options) {
    const sourceOptional = path.join(options.sourceRoot, 'optional');
    const targetHandbook = path.join(options.targetRoot, 'handbook');
    for (const module of options.selectedModules) {
        const sourceModule = path.join(sourceOptional, module);
        const targetModule = path.join(targetHandbook, module);
        if (fs.existsSync(sourceModule)) {
            copyDirRecursive(sourceModule, targetModule);
            console.log(`  ✅ Copied optional module: ${module}`);
        }
    }
}
/**
 * Copy validation templates to target project
 */
function copyValidationTemplates(options) {
    const sourceTemplates = path.join(options.sourceRoot, 'validation', 'templates');
    const targetValidation = path.join(options.targetRoot, 'scripts', 'validation');
    ensureDir(targetValidation);
    // Copy template files, renaming from .template.ts to .ts
    const templates = fs.readdirSync(sourceTemplates).filter(f => f.endsWith('.template.ts'));
    for (const template of templates) {
        const targetName = template.replace('.template.ts', '.ts');
        fs.copyFileSync(path.join(sourceTemplates, template), path.join(targetValidation, targetName));
    }
    console.log('✅ Copied validation templates');
}
/**
 * Copy validation library files
 */
function copyValidationLib(options) {
    const sourceLib = path.join(options.sourceRoot, 'validation', 'src', 'lib');
    const targetLib = path.join(options.targetRoot, 'scripts', 'validation', 'lib');
    ensureDir(targetLib);
    copyDirRecursive(sourceLib, targetLib);
    console.log('✅ Copied validation library');
}
/**
 * Install Claude Code hooks
 */
function installClaudeHooks(options, config) {
    const sourceHooks = path.join(options.sourceRoot, 'claude', 'hooks.json');
    const targetDir = path.join(options.targetRoot, '.claude');
    const targetHooks = path.join(targetDir, 'hooks.json');
    ensureDir(targetDir);
    // Read template and resolve config placeholders
    let hooksContent = fs.readFileSync(sourceHooks, 'utf-8');
    // Replace ${config.*} placeholders with actual values
    hooksContent = hooksContent.replace(/\${config\.paths\.validators}/g, config.paths.validators);
    hooksContent = hooksContent.replace(/\${config\.registry\.path}/g, config.registry.path);
    // ... more replacements
    fs.writeFileSync(targetHooks, hooksContent);
    console.log('✅ Installed Claude Code hooks');
}
/**
 * Initialize empty validation registry
 */
function initializeRegistry(options, config) {
    const registryPath = path.join(options.targetRoot, config.registry.path);
    ensureDir(path.dirname(registryPath));
    const emptyRegistry = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        stats: {
            tdd: {
                unit_tests: { coverage_percent: 0, passing: false },
                contract_tests: { total_endpoints: 0, endpoints_with_tests: 0, coverage_percent: 0, passing: false },
                integration_tests: { cross_module_calls: 0, calls_with_tests: 0, coverage_percent: -1, passing: true }
            }
        },
        redPhaseVerified: {},
        results: []
    };
    fs.writeFileSync(registryPath, JSON.stringify(emptyRegistry, null, 2));
    console.log('✅ Initialized validation registry');
}
// Helper functions
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
function copyDirRecursive(source, target) {
    ensureDir(target);
    const entries = fs.readdirSync(source, { withFileTypes: true });
    for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const targetPath = path.join(target, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(sourcePath, targetPath);
        }
        else {
            fs.copyFileSync(sourcePath, targetPath);
        }
    }
}
