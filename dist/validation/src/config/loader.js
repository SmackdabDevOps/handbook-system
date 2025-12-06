"use strict";
/**
 * Config Loader for Validation Scripts
 *
 * Loads handbook.config.json and provides type-safe access to validation configuration
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
exports.findProjectRoot = findProjectRoot;
exports.loadConfig = loadConfig;
exports.getAbsolutePath = getAbsolutePath;
exports.getRegistryPath = getRegistryPath;
exports.getValidatorsPath = getValidatorsPath;
exports.clearConfigCache = clearConfigCache;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let cachedConfig = null;
let cachedProjectRoot = null;
/**
 * Find project root by looking for handbook.config.json
 */
function findProjectRoot(startDir = process.cwd()) {
    let currentDir = startDir;
    while (currentDir !== path.parse(currentDir).root) {
        const configPath = path.join(currentDir, 'handbook.config.json');
        if (fs.existsSync(configPath)) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }
    throw new Error('Could not find handbook.config.json in project tree');
}
/**
 * Load handbook configuration
 */
function loadConfig(projectRoot) {
    if (cachedConfig && (!projectRoot || projectRoot === cachedProjectRoot)) {
        return cachedConfig;
    }
    const root = projectRoot || findProjectRoot();
    const configPath = path.join(root, 'handbook.config.json');
    if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
    }
    try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        cachedConfig = config;
        cachedProjectRoot = root;
        return config;
    }
    catch (error) {
        throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
    }
}
/**
 * Get absolute path for a configured path
 */
function getAbsolutePath(relativePath, projectRoot) {
    const root = projectRoot || findProjectRoot();
    return path.join(root, relativePath);
}
/**
 * Get registry path
 */
function getRegistryPath(projectRoot) {
    const config = loadConfig(projectRoot);
    return getAbsolutePath(config.registry.path, projectRoot);
}
/**
 * Get validators directory path
 */
function getValidatorsPath(projectRoot) {
    const config = loadConfig(projectRoot);
    return getAbsolutePath(config.paths.validators, projectRoot);
}
/**
 * Clear cached config (useful for testing)
 */
function clearConfigCache() {
    cachedConfig = null;
    cachedProjectRoot = null;
}
