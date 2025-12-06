#!/usr/bin/env node
/**
 * handbook doctor - Diagnostic tool for handbook system health
 *
 * Checks:
 * 1. handbook.config.json exists and is valid
 * 2. All configured paths exist
 * 3. Claude Code hooks are installed
 * 4. Husky git hooks are installed
 * 5. Validation registry exists and is fresh
 * 6. Required npm scripts are present
 * 7. Required dependencies are installed
 */

import * as fs from 'fs';
import * as path from 'path';

interface DiagnosticResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

const results: DiagnosticResult[] = [];

function check(name: string, condition: boolean, passMsg: string, failMsg: string, fix?: string): void {
  results.push({
    name,
    status: condition ? 'pass' : 'fail',
    message: condition ? passMsg : failMsg,
    fix: condition ? undefined : fix
  });
}

function warn(name: string, message: string, fix?: string): void {
  results.push({ name, status: 'warn', message, fix });
}

async function runDiagnostics(): Promise<void> {
  const projectRoot = process.cwd();

  console.log('🔍 Running handbook diagnostics...\n');

  // 1. Check handbook.config.json
  const configPath = path.join(projectRoot, 'handbook.config.json');
  const configExists = fs.existsSync(configPath);
  check(
    'Configuration',
    configExists,
    'handbook.config.json found',
    'handbook.config.json missing',
    'Run: npx @smackdab/handbook-init'
  );

  if (!configExists) {
    printResults();
    return;
  }

  // Parse config
  let config: any;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    check('Config Parse', true, 'Configuration is valid JSON', '', undefined);
  } catch (e) {
    check('Config Parse', false, '', 'Configuration has invalid JSON', 'Fix JSON syntax errors');
    printResults();
    return;
  }

  // 2. Check required config fields
  const requiredFields = ['version', 'projectName', 'stackProfile', 'paths', 'tdd'];
  for (const field of requiredFields) {
    check(
      `Config: ${field}`,
      config[field] !== undefined,
      `${field} is configured`,
      `${field} is missing from config`,
      `Add "${field}" to handbook.config.json`
    );
  }

  // 3. Check configured paths exist
  if (config.paths) {
    const pathChecks = [
      ['handbook', 'Handbook directory'],
      ['validators', 'Validators directory'],
      ['stories', 'User stories directory'],
      ['rules', 'Business rules directory'],
    ];

    for (const [key, label] of pathChecks) {
      if (config.paths[key]) {
        const fullPath = path.join(projectRoot, config.paths[key]);
        check(
          `Path: ${label}`,
          fs.existsSync(fullPath),
          `${label} exists at ${config.paths[key]}`,
          `${label} missing at ${config.paths[key]}`,
          `Create directory: mkdir -p ${config.paths[key]}`
        );
      }
    }
  }

  // 4. Check Claude hooks
  const claudeHooksPath = path.join(projectRoot, '.claude', 'hooks.json');
  check(
    'Claude Hooks',
    fs.existsSync(claudeHooksPath),
    'Claude Code hooks installed',
    'Claude Code hooks missing',
    'Run: npx @smackdab/handbook-init --hooks-only'
  );

  // 5. Check Husky
  const huskyPath = path.join(projectRoot, '.husky', 'pre-commit');
  check(
    'Git Hooks',
    fs.existsSync(huskyPath),
    'Husky git hooks installed',
    'Husky git hooks missing',
    'Run: npx husky install'
  );

  // 6. Check validation registry
  if (config.registry?.path) {
    const registryPath = path.join(projectRoot, config.registry.path);
    const registryExists = fs.existsSync(registryPath);
    check(
      'Registry',
      registryExists,
      'Validation registry exists',
      'Validation registry missing',
      'Run: npm run validation:gates'
    );

    if (registryExists) {
      try {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
        const lastUpdated = new Date(registry.lastUpdated);
        const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

        if (hoursSinceUpdate > 24) {
          warn('Registry Freshness', `Registry last updated ${Math.round(hoursSinceUpdate)} hours ago`, 'Run: npm run validation:gates');
        } else {
          check('Registry Freshness', true, `Registry updated ${Math.round(hoursSinceUpdate)} hours ago`, '', undefined);
        }
      } catch (e) {
        check('Registry Parse', false, '', 'Registry has invalid JSON', 'Delete and regenerate registry');
      }
    }
  }

  // 7. Check package.json scripts
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const requiredScripts = ['validation:gates', 'validation:quick'];

    for (const script of requiredScripts) {
      check(
        `Script: ${script}`,
        packageJson.scripts?.[script] !== undefined,
        `npm run ${script} is configured`,
        `npm run ${script} is missing`,
        'Run: npx @smackdab/handbook-init --scripts-only'
      );
    }
  }

  printResults();
}

function printResults(): void {
  console.log('\n📋 Diagnostic Results:\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (result.fix) {
      console.log(`   Fix: ${result.fix}`);
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`Summary: ${passed} passed, ${warned} warnings, ${failed} failed`);

  if (failed > 0) {
    console.log('\n🔧 Run the suggested fix commands to resolve issues.');
    process.exit(1);
  } else if (warned > 0) {
    console.log('\n⚠️  Some warnings detected. Consider addressing them.');
    process.exit(0);
  } else {
    console.log('\n🎉 All checks passed! Your handbook setup is healthy.');
    process.exit(0);
  }
}

runDiagnostics().catch(console.error);
