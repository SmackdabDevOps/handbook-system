---
description: Execute work for a specific phase of the playbook
args: "<phase-number> [--start | --complete | --info]"
---

# Execute Phase

Work on a specific phase of the System Delivery Playbook.

## Instructions

### Step 0: Load Configuration

```bash
CONFIG_FILE=$(find . -maxdepth 2 -name "handbook.config.json" -type f | head -1)
if [ -z "$CONFIG_FILE" ]; then
  echo "❌ No handbook.config.json found. Run: npx @smackdab/handbook-init"
  exit 1
fi
CONFIG=$(cat "$CONFIG_FILE")
HANDBOOK_PATH=$(echo "$CONFIG" | jq -r '.paths.handbook // "handbook/"')
```

**Reference:** `${HANDBOOK_PATH}SYSTEM_DELIVERY_PLAYBOOK.md`

## Arguments

- `<phase-number>` - Phase to work on (check config.phases.enabled for available phases)
- `--start` - Begin working on this phase
- `--complete` - Validate and complete this phase
- `--info` - Show detailed info (default)

## Phase Reference

Check `config.phases.enabled` for active phases in this project (default: [0,1,2,3,4,5]).

| Phase | Name | Validations | TDD? |
|-------|------|-------------|------|
| 0 | Features | None | No |
| 1 | Stories & Rules | `check-business-rules-coverage.ts` | No |
| 2 | Contracts | `validate:naming`, `${config.commands['openapi:bundle']}`, `${config.commands['endpoints:validate']}` | No |
| 3 | Backend | `lint`, `typecheck`, `test`, TDD gates | **YES** |
| 3.5 | Retroactive Docs | `${config.commands['endpoints:validate']}` | No |
| 4 | UX Specs | `check-story-coverage.ts`, `check-endpoint-coverage.ts` | No |
| 5 | Validators | `check-spec-script-coverage.ts`, validators | No |

## Usage Instructions

### For `--info` (Default)

Show phase details from `${config.paths.handbook}SYSTEM_DELIVERY_PLAYBOOK.md`

### For `--start`

1. Run validation gates first:
   ```bash
   GATES_CMD=$(echo "$CONFIG" | jq -r '.commands["validate:gates"] // "npm run validation:gates"')
   eval "$GATES_CMD"
   ```
2. Dispatch appropriate agent via `/sdd:start`

### For `--complete`

1. Run all phase validations
2. If Phase 3: Verify TDD coverage meets `config.tdd.thresholds`
3. Report results

## Phase 3: TDD Requirements

**Before implementation:**
```bash
VALIDATOR_PATH=$(echo "$CONFIG" | jq -r '.paths.validators // "scripts/validation/"')
npx ts-node "${VALIDATOR_PATH}check-red-phase.ts" <module>
```

**After implementation:**
```bash
npx ts-node "${VALIDATOR_PATH}check-red-phase.ts" <module> --green
```

**TDD Thresholds** (from config.tdd.thresholds):
- Unit: ${config.tdd.thresholds.unit_coverage}% (default: 90%)
- Contract: ${config.tdd.thresholds.contract_coverage}% (default: 100%)
- Integration: ${config.tdd.thresholds.integration_coverage}% (default: 100%, or N/A)

**Reference:** `${config.paths.handbook}monitoring/TDD_ENFORCEMENT_SETUP.md`

## Output Format

```markdown
## Phase [N]: [Name]

**Mode:** [Info / Starting / Completing]

### Validations
| Script | Status |
|--------|--------|
| [name] | ✅/❌ |

### TDD Stats (Phase 3 only)
| Metric | Value | Threshold |
|--------|-------|-----------|
| Unit | X% | 90% |

### Next Action
[What to do next]
```
