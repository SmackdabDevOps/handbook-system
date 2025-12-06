# Migration Guide: Adopting @smackdab/handbook-system

This guide explains how to migrate an existing project (like SmackChat) to use the portable handbook-system package.

## Overview

The migration process:
1. Install the package
2. Create handbook.config.json
3. Update validation scripts to use config loader
4. Replace hardcoded paths with config references
5. Verify with handbook doctor

## Prerequisites

- Existing project with handbook methodology in use
- Node.js 18+
- Git repository initialized

## Step 1: Install the Package

```bash
npm install @smackdab/handbook-system --save-dev
```

## Step 2: Create Configuration

Create `handbook.config.json` in your project root:

```bash
# Interactive setup
npx handbook-init --config-only

# Or copy from template
cp node_modules/@smackdab/handbook-system/handbook.config.example.json handbook.config.json
```

Edit the configuration to match your project structure. See `docs/migration/smackchat-config.json` for a complete example.

## Step 3: Update Validation Scripts

### Before (hardcoded paths):
```typescript
const REGISTRY_PATH = path.join(__dirname, 'validation-registry.json');
const ENDPOINTS_PATH = path.join(__dirname, '../../architecture/ENDPOINTS.json');
```

### After (config-driven):
```typescript
import { loadConfig, resolvePath } from '@smackdab/handbook-system/validation';

const config = loadConfig();
const REGISTRY_PATH = resolvePath(config, config.registry.path);
const ENDPOINTS_PATH = resolvePath(config, config.paths.endpointsJson);
```

## Step 4: Update Import Paths

Replace local imports with package imports:

```typescript
// Before
import { readRegistry, writeRegistry } from './lib/validation-registry';

// After
import { readRegistry, writeRegistry } from '@smackdab/handbook-system/validation';
```

## Step 5: Update Claude Hooks

The package provides config-driven hooks. To use them:

```bash
# Backup existing hooks
cp .claude/hooks.json .claude/hooks.json.backup

# Install package hooks
npx handbook-init --hooks-only
```

The new hooks will read paths from your `handbook.config.json`.

## Step 6: Verify Migration

```bash
# Run diagnostics
npx handbook-doctor

# Expected: All checks should pass
```

## Step 7: Remove Duplicated Code

After migration, you can remove:
- Local copies of validation library (if using package version)
- Hardcoded path constants
- Duplicated handbook documentation (use package's core/)

Keep:
- Project-specific validators (validate-*-full.ts)
- Project-specific business rules
- Project-specific user stories

## Gradual Migration Strategy

For large projects, migrate incrementally:

### Week 1: Configuration
- Create handbook.config.json
- Update one validator to use config loader
- Verify it works

### Week 2: Validation Library
- Replace validation-registry.ts with package version
- Update remaining validators

### Week 3: Hooks
- Replace Claude hooks with package version
- Update Husky hooks

### Week 4: Cleanup
- Remove duplicated code
- Update documentation
- Run full validation suite

## Rollback Plan

If issues occur:
1. Restore backup hooks: `cp .claude/hooks.json.backup .claude/hooks.json`
2. Revert to local validation scripts
3. Remove handbook.config.json

The package is designed to be adopted incrementally - you don't have to migrate everything at once.

## SmackChat-Specific Notes

SmackChat was the original project this system was extracted from. Key considerations:

1. **Features list**: All 11 feature validators are listed in config
2. **TDD thresholds**: Using v2.2.0 enforcement with 90% unit coverage
3. **Integration tests**: Set to -1 (N/A) as SmackChat uses contract tests instead
4. **Registry path**: Standard location at scripts/validation/validation-registry.json

See `docs/migration/smackchat-config.json` for the exact configuration.

## Troubleshooting

### "Config not found" error
Ensure handbook.config.json is in project root and valid JSON.

### "Path does not exist" warning
Check that all paths in config match your actual directory structure.

### Hooks not triggering
Verify .claude/hooks.json exists and Claude Code is restarted.

### Validation scripts fail
Check that all paths in config match your actual directory structure.

## Support

- GitHub Issues: https://github.com/smackdab/handbook-system/issues
- Documentation: See package README.md
