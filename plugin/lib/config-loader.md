# Plugin Configuration Loader

## Loading Configuration

When executing commands or agents, first load the project configuration:

```bash
# Find and read handbook.config.json from project root
CONFIG_FILE=$(find . -maxdepth 2 -name "handbook.config.json" -type f | head -1)
if [ -z "$CONFIG_FILE" ]; then
  echo "❌ No handbook.config.json found. Run: npx @smackdab/handbook-init"
  exit 1
fi
```

## Config Path Resolution

Replace hardcoded paths with config lookups:

| Hardcoded Path | Config Key |
|----------------|------------|
| `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` | `${config.paths.handbook}/SYSTEM_DELIVERY_PLAYBOOK.md` |
| `docs/user-stories/` | `${config.paths.stories}` |
| `docs/business-rules/` | `${config.paths.rules}` |
| `docs/test-plans/validation-specs/` | `${config.paths.specs}` |
| `scripts/validation/` | `${config.paths.validators}` |
| `openapi/` | `${config.paths.openapi}` |
| `architecture/ENDPOINTS.json` | `${config.paths.endpointsJson}` |

## Command Resolution

Replace hardcoded npm scripts with config commands:

| Hardcoded Command | Config Key |
|-------------------|------------|
| `npm run validation:gates` | `${config.commands['validate:gates']}` |
| `npm run validation:quick` | `${config.commands['validate:quick']}` |
| `npm run openapi:bundle` | `${config.commands['openapi:bundle']}` |
| `npm run endpoints:validate` | `${config.commands['endpoints:validate']}` |

## Stack-Specific Patterns

The config includes stack-aware patterns:

### NestJS
- Controllers: `src/modules/*/controllers/*.ts`
- Services: `src/modules/*/services/*.ts`
- DTOs: `src/modules/*/dto/*.ts`

### Express
- Controllers: `src/routes/*.ts`
- Services: `src/services/*.ts`
- DTOs: `src/schemas/*.ts`

### Nx Monorepo
- Controllers: `apps/*/src/routes/*.ts`
- Services: `apps/*/src/services/*.ts`
- DTOs: `libs/shared/dto/*.ts`

## Usage in Agents/Commands

In markdown prompt files, instruct Claude to:

1. First read handbook.config.json
2. Resolve all paths using config values
3. Use config.projectName for project identification
4. Check config.phases.enabled before running phase-specific logic
