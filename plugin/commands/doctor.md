---
description: Run handbook system diagnostics to detect configuration drift and issues
---

# /sdd:doctor

Run the handbook diagnostic tool to check for configuration issues, missing files, stale validators, and other problems.

## What It Checks

1. **Configuration** - handbook.config.json exists and is valid
2. **Paths** - All configured paths actually exist on disk
3. **Orphans** - Folders in docs/ not tracked by config
4. **Validators** - Each feature has a corresponding validator
5. **Staleness** - Validators that haven't run in >24 hours
6. **Hooks** - Claude and Husky hooks are installed
7. **Schema** - Config file matches expected schema

## Usage

```
/sdd:doctor
```

## Example Output

```
🩺 Handbook Doctor - Diagnostic Report
============================================================

✅ Config file: handbook.config.json exists
✅ Path: handbook: handbook/ exists
✅ Path: stories: docs/user-stories/ exists
✅ Path: rules: docs/business-rules/ exists
⚠️  Orphan detection: Orphaned folder: docs/architecture/ (not in config)
   Fix: Add to handbook.config.json paths or remove if unused
⚠️  Stale: auth: Validator 'auth' last run 3 days ago
   Fix: Run: npm run validation:all
✅ Claude hooks: .claude/hooks.json installed
✅ Husky hooks: .husky/ directory exists

============================================================

Summary: 6 passed, 2 warnings, 0 failures

⚠️  Warnings found. Consider addressing them.
```

## Fix Suggestions

The doctor provides fix suggestions for each issue:

| Issue | Suggested Fix |
|-------|---------------|
| Missing config | `npx @smackdab/handbook-init` |
| Missing path | `mkdir -p <path>` |
| Missing validator | Create `validate-<feature>-full.ts` |
| Stale validator | `npm run validation:all` |
| Missing hooks | `npx @smackdab/handbook-init --hooks-only` |

## Running Programmatically

```bash
npx handbook-doctor
```

Exit codes:
- `0` - All checks passed (or only warnings)
- `1` - Failures detected

## Configuration

The doctor reads from `handbook.config.json` to understand:
- Expected paths and their locations
- Feature list for validator coverage
- Registry location for staleness checks
