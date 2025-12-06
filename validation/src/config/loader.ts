/**
 * Config Loader for Validation Scripts
 *
 * Loads handbook.config.json and provides type-safe access to validation configuration
 */

import * as fs from 'fs';
import * as path from 'path';

export interface HandbookConfig {
  version: string;
  projectName: string;
  stackProfile: 'nestjs-single' | 'express-single' | 'express-nx' | 'generic';
  paths: {
    handbook: string;
    openapi: string;
    stories: string;
    rules: string;
    specs: string;
    validators: string;
    controllers?: string;
    dtos?: string;
    services?: string;
    modules?: string;
    endpointsJson: string;
  };
  commands: {
    'validate:gates': string;
    'validate:quick': string;
    'openapi:bundle': string;
    'endpoints:validate': string;
  };
  phases: {
    enabled: number[];
    customGates?: Record<string, any>;
  };
  tdd: {
    thresholds: {
      unit_coverage: number;
      contract_coverage: number;
      integration_coverage: number;
    };
    hooks: {
      enforceRedPhase: boolean;
      blockCommitsWithoutValidation: boolean;
      version: string;
    };
    enforcedPatterns?: string[];
    excludedPatterns?: string[];
  };
  registry: {
    path: string;
    trackRedPhase: boolean;
    trackTDDStats: boolean;
  };
  features: string[];
}

let cachedConfig: HandbookConfig | null = null;
let cachedProjectRoot: string | null = null;

/**
 * Find project root by looking for handbook.config.json
 */
export function findProjectRoot(startDir: string = process.cwd()): string {
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
export function loadConfig(projectRoot?: string): HandbookConfig {
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
    const config = JSON.parse(configContent) as HandbookConfig;

    cachedConfig = config;
    cachedProjectRoot = root;

    return config;
  } catch (error: any) {
    throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
  }
}

/**
 * Get absolute path for a configured path
 */
export function getAbsolutePath(relativePath: string, projectRoot?: string): string {
  const root = projectRoot || findProjectRoot();
  return path.join(root, relativePath);
}

/**
 * Get registry path
 */
export function getRegistryPath(projectRoot?: string): string {
  const config = loadConfig(projectRoot);
  return getAbsolutePath(config.registry.path, projectRoot);
}

/**
 * Get validators directory path
 */
export function getValidatorsPath(projectRoot?: string): string {
  const config = loadConfig(projectRoot);
  return getAbsolutePath(config.paths.validators, projectRoot);
}

/**
 * Clear cached config (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
  cachedProjectRoot = null;
}
