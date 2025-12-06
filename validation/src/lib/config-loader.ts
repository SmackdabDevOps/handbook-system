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
    controllers: string;
    dtos: string;
    services: string;
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
    customGates: Record<string, unknown>;
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
    enforcedPatterns: string[];
    excludedPatterns: string[];
  };
  registry: {
    path: string;
    trackRedPhase: boolean;
    trackTDDStats: boolean;
  };
  features: string[];
}

// Stack-specific defaults
export const STACK_DEFAULTS: Record<string, Partial<HandbookConfig['paths']>> = {
  'nestjs-single': {
    controllers: 'src/modules/*/controllers/*.ts',
    dtos: 'src/modules/*/dto/*.ts',
    services: 'src/modules/*/services/*.ts',
    modules: 'src/modules/*/*.module.ts'
  },
  'express-single': {
    controllers: 'src/routes/*.ts',
    dtos: 'src/schemas/*.ts',
    services: 'src/services/*.ts'
  },
  'express-nx': {
    controllers: 'apps/*/src/routes/*.ts',
    dtos: 'libs/shared/dto/*.ts',
    services: 'apps/*/src/services/*.ts'
  },
  'generic': {
    controllers: 'src/**/*controller*.ts',
    services: 'src/**/*service*.ts'
  }
};

/**
 * Find the project root by walking up from cwd looking for handbook.config.json or package.json
 * @returns Absolute path to project root
 * @throws Error if project root cannot be found
 */
export function findProjectRoot(): string {
  let currentDir = process.cwd();
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    // Check for handbook.config.json first (highest priority)
    const handbookConfigPath = path.join(currentDir, 'handbook.config.json');
    if (fs.existsSync(handbookConfigPath)) {
      return currentDir;
    }

    // Check for package.json as fallback
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return currentDir;
    }

    // Move up one directory
    currentDir = path.dirname(currentDir);
  }

  throw new Error(
    'Could not find project root. No handbook.config.json or package.json found in current directory or any parent directory.'
  );
}

/**
 * Validate the loaded config structure
 * @param config Parsed config object
 * @throws Error if config is invalid
 */
function validateConfig(config: unknown): asserts config is HandbookConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be an object');
  }

  const cfg = config as Partial<HandbookConfig>;

  // Required top-level fields
  if (!cfg.version || typeof cfg.version !== 'string') {
    throw new Error('Config must have a "version" string');
  }
  if (!cfg.projectName || typeof cfg.projectName !== 'string') {
    throw new Error('Config must have a "projectName" string');
  }
  if (!cfg.stackProfile || typeof cfg.stackProfile !== 'string') {
    throw new Error('Config must have a "stackProfile" string');
  }

  const validProfiles = ['nestjs-single', 'express-single', 'express-nx', 'generic'];
  if (!validProfiles.includes(cfg.stackProfile)) {
    throw new Error(
      `Invalid stackProfile "${cfg.stackProfile}". Must be one of: ${validProfiles.join(', ')}`
    );
  }

  // Validate paths
  if (!cfg.paths || typeof cfg.paths !== 'object') {
    throw new Error('Config must have a "paths" object');
  }

  const requiredPaths = [
    'handbook',
    'openapi',
    'stories',
    'rules',
    'specs',
    'validators',
    'controllers',
    'dtos',
    'services',
    'endpointsJson'
  ];

  for (const pathKey of requiredPaths) {
    if (!(pathKey in cfg.paths) || typeof cfg.paths[pathKey as keyof typeof cfg.paths] !== 'string') {
      throw new Error(`Config paths must include "${pathKey}" as a string`);
    }
  }

  // Validate commands
  if (!cfg.commands || typeof cfg.commands !== 'object') {
    throw new Error('Config must have a "commands" object');
  }

  const requiredCommands = [
    'validate:gates',
    'validate:quick',
    'openapi:bundle',
    'endpoints:validate'
  ];

  for (const cmdKey of requiredCommands) {
    if (!(cmdKey in cfg.commands) || typeof cfg.commands[cmdKey as keyof typeof cfg.commands] !== 'string') {
      throw new Error(`Config commands must include "${cmdKey}" as a string`);
    }
  }

  // Validate phases
  if (!cfg.phases || typeof cfg.phases !== 'object') {
    throw new Error('Config must have a "phases" object');
  }
  if (!Array.isArray(cfg.phases.enabled)) {
    throw new Error('Config phases.enabled must be an array');
  }
  if (!cfg.phases.customGates || typeof cfg.phases.customGates !== 'object') {
    throw new Error('Config phases.customGates must be an object');
  }

  // Validate tdd
  if (!cfg.tdd || typeof cfg.tdd !== 'object') {
    throw new Error('Config must have a "tdd" object');
  }
  if (!cfg.tdd.thresholds || typeof cfg.tdd.thresholds !== 'object') {
    throw new Error('Config tdd.thresholds must be an object');
  }
  if (typeof cfg.tdd.thresholds.unit_coverage !== 'number') {
    throw new Error('Config tdd.thresholds.unit_coverage must be a number');
  }
  if (typeof cfg.tdd.thresholds.contract_coverage !== 'number') {
    throw new Error('Config tdd.thresholds.contract_coverage must be a number');
  }
  if (typeof cfg.tdd.thresholds.integration_coverage !== 'number') {
    throw new Error('Config tdd.thresholds.integration_coverage must be a number');
  }

  if (!cfg.tdd.hooks || typeof cfg.tdd.hooks !== 'object') {
    throw new Error('Config tdd.hooks must be an object');
  }
  if (typeof cfg.tdd.hooks.enforceRedPhase !== 'boolean') {
    throw new Error('Config tdd.hooks.enforceRedPhase must be a boolean');
  }
  if (typeof cfg.tdd.hooks.blockCommitsWithoutValidation !== 'boolean') {
    throw new Error('Config tdd.hooks.blockCommitsWithoutValidation must be a boolean');
  }
  if (typeof cfg.tdd.hooks.version !== 'string') {
    throw new Error('Config tdd.hooks.version must be a string');
  }

  if (!Array.isArray(cfg.tdd.enforcedPatterns)) {
    throw new Error('Config tdd.enforcedPatterns must be an array');
  }
  if (!Array.isArray(cfg.tdd.excludedPatterns)) {
    throw new Error('Config tdd.excludedPatterns must be an array');
  }

  // Validate registry
  if (!cfg.registry || typeof cfg.registry !== 'object') {
    throw new Error('Config must have a "registry" object');
  }
  if (typeof cfg.registry.path !== 'string') {
    throw new Error('Config registry.path must be a string');
  }
  if (typeof cfg.registry.trackRedPhase !== 'boolean') {
    throw new Error('Config registry.trackRedPhase must be a boolean');
  }
  if (typeof cfg.registry.trackTDDStats !== 'boolean') {
    throw new Error('Config registry.trackTDDStats must be a boolean');
  }

  // Validate features
  if (!Array.isArray(cfg.features)) {
    throw new Error('Config features must be an array');
  }
}

/**
 * Load and parse handbook.config.json
 * @param projectRoot Optional project root path. If not provided, will use findProjectRoot()
 * @returns Parsed and validated config
 * @throws Error if config cannot be loaded or is invalid
 */
export function loadConfig(projectRoot?: string): HandbookConfig {
  const root = projectRoot || findProjectRoot();
  const configPath = path.join(root, 'handbook.config.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `handbook.config.json not found at ${configPath}. ` +
      'Please create a handbook.config.json file in your project root.'
    );
  }

  let configContent: string;
  try {
    configContent = fs.readFileSync(configPath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to read handbook.config.json at ${configPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  let config: unknown;
  try {
    config = JSON.parse(configContent);
  } catch (error) {
    throw new Error(
      `Failed to parse handbook.config.json at ${configPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    validateConfig(config);
  } catch (error) {
    throw new Error(
      `Invalid handbook.config.json at ${configPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return config;
}

/**
 * Resolve a config path relative to project root
 * @param config The loaded config
 * @param configPath Path value from config (may be relative or absolute)
 * @returns Absolute path
 */
export function resolvePath(config: HandbookConfig, configPath: string): string {
  // If already absolute, return as-is
  if (path.isAbsolute(configPath)) {
    return configPath;
  }

  // Find project root
  const root = findProjectRoot();

  // Resolve relative to project root
  return path.resolve(root, configPath);
}

/**
 * Get resolved paths for all configured paths
 * @param config The loaded config
 * @returns Object with all paths resolved to absolute paths
 */
export function getResolvedPaths(config: HandbookConfig): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const [key, value] of Object.entries(config.paths)) {
    if (typeof value === 'string') {
      resolved[key] = resolvePath(config, value);
    }
  }

  return resolved;
}
