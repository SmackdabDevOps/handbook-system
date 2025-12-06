---
description: Inject a new feature into the project mid-development
args: "<feature-description>"
---

# Add Feature

Safely inject a new feature using mini-phases.

**Reference:** `skills/feature-injection/SKILL.md`

## Arguments

- `<feature-description>` - Brief description of the feature

## Instructions

### Step 0: Load Configuration

```bash
CONFIG_FILE=$(find . -maxdepth 2 -name "handbook.config.json" -type f | head -1)
if [ -z "$CONFIG_FILE" ]; then
  echo "❌ No handbook.config.json found. Run: npx @smackdab/handbook-init"
  exit 1
fi
CONFIG=$(cat "$CONFIG_FILE")

# Extract paths
STORIES_PATH=$(echo "$CONFIG" | jq -r '.paths.stories // "docs/user-stories/"')
RULES_PATH=$(echo "$CONFIG" | jq -r '.paths.rules // "docs/business-rules/"')
```

Triggers the `feature-injection` skill via `sdd:phase-coordinator`.

### 1. Assign ID Ranges

```bash
grep -r "US-[0-9]" "$STORIES_PATH"*.md | grep -oE "US-[0-9]+" | sort -t- -k2 -n | tail -1
grep -r "BR-[0-9]" "$RULES_PATH"*.md | grep -oE "BR-[0-9]+" | sort -t- -k2 -n | tail -1
```

Start at next round number (e.g., US-315 exists → US-400).

**Note:** Feature will be added to `config.features` array after successful implementation.

### 2. Walk Mini-Phases

| Phase | What | TDD? |
|-------|------|------|
| 1 | Stories/Rules | No |
| 2 | Contracts | No |
| 3 | Backend | **YES** |
| 4 | Specs | No |
| 5 | Validators | No |

### 3. TDD for Phase 3

**Before implementation:**
```bash
VALIDATOR_PATH=$(echo "$CONFIG" | jq -r '.paths.validators // "scripts/validation/"')
npx ts-node "${VALIDATOR_PATH}check-red-phase.ts" <module>
```

**After implementation:**
```bash
npx ts-node "${VALIDATOR_PATH}check-red-phase.ts" <module> --green
```

**Thresholds** (from `config.tdd.thresholds`):
- Unit: ${config.tdd.thresholds.unit_coverage}%
- Contract: ${config.tdd.thresholds.contract_coverage}%
- Integration: ${config.tdd.thresholds.integration_coverage}%

### 4. Integration Check

```bash
GATES_CMD=$(echo "$CONFIG" | jq -r '.commands["validate:gates"] // "npm run validation:gates"')
eval "$GATES_CMD"
```

## Output

```markdown
## Feature Injection: [Name]

### Artifacts Created
| Type | ID | Description |
|------|-----|-------------|
| Story | US-xxx | [title] |
| Rule | BR-xxx | [title] |

### TDD Status (Phase 3)
- RED phase verified: ✅/❌
- GREEN phase verified: ✅/❌

### Validation
- All gates pass: ✅/❌
```

## Rules

1. **Never skip phases** - Even for small features
2. **TDD for Phase 3** - RED phase before implementation
3. **Group IDs** - Keep feature artifacts together
4. **Integration check** - All existing validations must pass
