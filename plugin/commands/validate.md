---
description: Run validation scripts for a specific phase or all phases
args: "[phase-number | all | quick | gates]"
---

# Validate Phase

Run the validation scripts for the specified phase or scope.

## Arguments

- `quick` - Fast pre-commit check (~1 sec)
- `gates` - All phase gates 1-5 (~15-30 sec) **RECOMMENDED**
- `all` - Full validation suite (~2-5 min)
- `1` - Validate Phase 1 (Stories & Rules)
- `2` - Validate Phase 2 (Contracts & Registry)
- `3` - Validate Phase 3 (Backend Implementation)
- `4` - Validate Phase 4 (UX Specs)
- `5` - Validate Phase 5 (Validation Scripts)

## Quick Reference

| Command | Purpose | Speed |
|---------|---------|-------|
| `/sdd:validate quick` | Pre-commit check | ~1 sec |
| `/sdd:validate gates` | All phase gates | ~15-30 sec |
| `/sdd:validate all` | Full validation suite | ~2-5 min |
| `/sdd:validate 2` | Just Phase 2 | ~10 sec |

## Instructions

### Step 0: Load Configuration

```bash
CONFIG_FILE=$(find . -maxdepth 2 -name "handbook.config.json" -type f | head -1)
if [ -z "$CONFIG_FILE" ]; then
  echo "❌ No handbook.config.json found. Run: npx @smackdab/handbook-init"
  exit 1
fi
CONFIG=$(cat "$CONFIG_FILE")
```

### For `quick` (Pre-commit Check)
```bash
# Use configured command (default: npm run validation:quick)
QUICK_CMD=$(echo "$CONFIG" | jq -r '.commands["validate:quick"] // "npm run validation:quick"')
eval "$QUICK_CMD"
```

### For `gates` (Comprehensive Status)
```bash
# Use configured command (default: npm run validation:gates)
GATES_CMD=$(echo "$CONFIG" | jq -r '.commands["validate:gates"] // "npm run validation:gates"')
eval "$GATES_CMD"
```

This is the **recommended** command for understanding current status.

### For `all` (Full Validation Suite)
```bash
# Project-specific command (usually npm run validation:all)
npm run validation:all
```

### Phase 1 Validations
```bash
# Use configured paths (defaults shown)
SPECS_PATH=$(echo "$CONFIG" | jq -r '.paths.specs // "docs/test-plans/validation-specs/"')
npx ts-node "${SPECS_PATH}../scripts/check-business-rules-coverage.ts"
```

### Phase 2 Validations (Updated)
```bash
# NEW: Naming validation gates
npm run validate:naming
npm run validate:openapi-dto

# Existing checks using configured commands
BUNDLE_CMD=$(echo "$CONFIG" | jq -r '.commands["openapi:bundle"] // "npm run openapi:bundle"')
ENDPOINTS_CMD=$(echo "$CONFIG" | jq -r '.commands["endpoints:validate"] // "npm run endpoints:validate"')

eval "$BUNDLE_CMD"
eval "$ENDPOINTS_CMD"

SPECS_PATH=$(echo "$CONFIG" | jq -r '.paths.specs // "docs/test-plans/validation-specs/"')
npx ts-node "${SPECS_PATH}../scripts/validate-documentation-matrix.ts"
```

### Phase 3 Validations
```bash
ENDPOINTS_CMD=$(echo "$CONFIG" | jq -r '.commands["endpoints:validate"] // "npm run endpoints:validate"')
eval "$ENDPOINTS_CMD"

npm run lint
npm run typecheck
npm test
```

### Phase 4 Validations
```bash
npx ts-node scripts/check-story-coverage.ts
npx ts-node scripts/check-endpoint-coverage.ts  # GATE

SPECS_PATH=$(echo "$CONFIG" | jq -r '.paths.specs // "docs/test-plans/validation-specs/"')
npx ts-node "${SPECS_PATH}../scripts/validate-ux-specs-against-contracts.ts"
```

### Phase 5 Validations
```bash
npx ts-node scripts/check-spec-script-coverage.ts  # GATE

VALIDATOR_PATH=$(echo "$CONFIG" | jq -r '.paths.validators // "scripts/validation/"')
"${VALIDATOR_PATH}run-all-with-logs.sh"
```

## Output Format

After running validations, report:

```markdown
## Validation Results: [Scope]

**Run Time:** [timestamp]
**Duration:** [X seconds]
**Dashboard Refreshed:** Yes

### Phase Gate Status

| Phase | Status | Blockers |
|-------|--------|----------|
| Phase 1 | ✅/❌ | [blockers or -] |
| Phase 2 | ✅/❌ | [blockers or -] |
| Phase 3 | ✅/❌ | [blockers or -] |
| Phase 4 | ✅/❌ | [blockers or -] |
| Phase 5 | ✅/❌ | [blockers or -] |

### Lowest Failing Phase: [N]

**Issues Found:**
[List any failures with details]

### Next Actions

[If failures, list specific fixes needed - fix lowest phase first]
[If all pass, indicate ready for next phase]
```

## On Failure

If any validation fails:
1. Capture the full error output
2. Identify the **lowest failing phase** (fix foundation first)
3. Suggest invoking `failure-recovery` skill with the specific error
4. Do NOT proceed to fix higher phases until lower phases pass

## Chain of Trust Integration

All validation commands automatically:
- Update the validation registry at `${config.registry.path}`
- Refresh the PM Dashboard data

See `${config.paths.handbook}/monitoring/` for complete documentation.
