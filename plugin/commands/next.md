---
description: Determine and execute the next required action in the playbook
---

# Next Step

Determine and recommend the next action needed.

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

### Step 1: Assess Current State

1. Run `/sdd:status` to assess current state
2. Identify lowest failing phase
3. Recommend action from table below

## Next Action by Phase

| Phase Failing | Action | Agent |
|---------------|--------|-------|
| 1 | Fix story-rule coverage | `sdd:story-rule-linker` |
| 2 | Fix contracts/naming | `sdd:contract-designer` |
| 3 | Implement endpoints + TDD | (implementation) |
| 3.5 | Document unclassified | `sdd:retroactive-documenter` |
| 4 | Write UX specs | `sdd:spec-author` |
| 5 | Run validators | `sdd:validation-runner` |
| All Pass | Proceed to frontend | - |

## Phase 3: TDD Workflow

**Before implementation:**
```bash
VALIDATOR_PATH=$(echo "$CONFIG" | jq -r '.paths.validators // "scripts/validation/"')
npx ts-node "${VALIDATOR_PATH}check-red-phase.ts" <module>
```

**After implementation:**
```bash
npx ts-node "${VALIDATOR_PATH}check-red-phase.ts" <module> --green
```

**Reference:** `${config.paths.handbook}monitoring/TDD_ENFORCEMENT_SETUP.md`

## Output Format

```markdown
## Next Step: [Action]

**Phase:** [N]
**Blocker:** [specific issue]

**Command:**
```bash
[command to run]
```

**Agent:** `[agent to dispatch]`
```

## Always Provide

1. Specific command to run
2. Agent to invoke if help needed
3. Expected outcome
