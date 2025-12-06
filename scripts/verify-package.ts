#!/usr/bin/env node
/**
 * Package Verification Script
 *
 * Verifies all required components of @smackdab/handbook-system exist
 * Run: npx ts-node scripts/verify-package.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

interface Check {
  name: string;
  path: string;
  type: 'file' | 'dir';
  required: boolean;
}

const REQUIRED_COMPONENTS: Check[] = [
  // Root files
  { name: 'package.json', path: 'package.json', type: 'file', required: true },
  { name: 'tsconfig.json', path: 'tsconfig.json', type: 'file', required: true },
  { name: 'README.md', path: 'README.md', type: 'file', required: true },
  { name: 'Config Schema', path: 'handbook.config.schema.json', type: 'file', required: true },
  { name: 'Config Example', path: 'handbook.config.example.json', type: 'file', required: true },

  // CLI
  { name: 'CLI Entry', path: 'bin/handbook-init.ts', type: 'file', required: true },
  { name: 'CLI Doctor', path: 'bin/handbook-doctor.ts', type: 'file', required: true },
  { name: 'File Operations', path: 'bin/lib/file-operations.ts', type: 'file', required: true },
  { name: 'Husky Installer', path: 'bin/lib/husky-installer.ts', type: 'file', required: true },
  { name: 'NPM Scripts', path: 'bin/lib/npm-scripts.ts', type: 'file', required: true },

  // Core handbook
  { name: 'Core Directory', path: 'core', type: 'dir', required: true },
  { name: 'Playbook', path: 'core/SYSTEM_DELIVERY_PLAYBOOK.md', type: 'file', required: true },
  { name: 'Spec Rulebook', path: 'core/SPEC_RULEBOOK.md', type: 'file', required: true },
  { name: 'Contracts', path: 'core/contracts', type: 'dir', required: true },
  { name: 'Monitoring', path: 'core/monitoring', type: 'dir', required: true },

  // Optional modules
  { name: 'Optional Directory', path: 'optional', type: 'dir', required: true },
  { name: 'Auth Module', path: 'optional/auth', type: 'dir', required: false },

  // Validation
  { name: 'Validation Src', path: 'validation/src', type: 'dir', required: true },
  { name: 'Config Loader', path: 'validation/src/lib/config-loader.ts', type: 'file', required: true },
  { name: 'Validation Registry', path: 'validation/src/lib/validation-registry.ts', type: 'file', required: true },
  { name: 'Validation Templates', path: 'validation/templates', type: 'dir', required: true },

  // Stacks
  { name: 'NestJS Stack', path: 'stacks/nestjs/config.json', type: 'file', required: true },
  { name: 'Express Stack', path: 'stacks/express/config.json', type: 'file', required: true },
  { name: 'Nx Stack', path: 'stacks/nx-monorepo/config.json', type: 'file', required: true },

  // Scaffolds
  { name: 'NestJS Scaffold', path: 'scaffolds/nestjs-single', type: 'dir', required: true },
  { name: 'Express Scaffold', path: 'scaffolds/express-single', type: 'dir', required: true },
  { name: 'Nx Scaffold', path: 'scaffolds/express-nx', type: 'dir', required: true },
  { name: 'Generic Scaffold', path: 'scaffolds/generic', type: 'dir', required: true },

  // Plugin
  { name: 'Plugin Directory', path: 'plugin', type: 'dir', required: true },
  { name: 'Plugin Agents', path: 'plugin/agents', type: 'dir', required: true },
  { name: 'Plugin Commands', path: 'plugin/commands', type: 'dir', required: true },
  { name: 'Plugin Skills', path: 'plugin/skills', type: 'dir', required: true },

  // Claude hooks
  { name: 'Claude Hooks', path: 'claude/hooks.json', type: 'file', required: true },

  // Husky hooks
  { name: 'Husky Directory', path: 'husky', type: 'dir', required: true },
];

function verify(): void {
  console.log('📦 Verifying @smackdab/handbook-system package...\n');

  let passed = 0;
  let failed = 0;
  let optional = 0;

  for (const check of REQUIRED_COMPONENTS) {
    const fullPath = path.join(ROOT, check.path);
    const exists = fs.existsSync(fullPath);

    if (exists) {
      const stat = fs.statSync(fullPath);
      const typeMatch = check.type === 'dir' ? stat.isDirectory() : stat.isFile();

      if (typeMatch) {
        console.log(`✅ ${check.name}`);
        passed++;
      } else {
        console.log(`❌ ${check.name} (wrong type: expected ${check.type})`);
        failed++;
      }
    } else if (check.required) {
      console.log(`❌ ${check.name} (missing: ${check.path})`);
      failed++;
    } else {
      console.log(`⚪ ${check.name} (optional, not present)`);
      optional++;
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed, ${optional} optional skipped`);

  if (failed > 0) {
    console.log('\n❌ Package verification FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ Package verification PASSED');
    process.exit(0);
  }
}

verify();
