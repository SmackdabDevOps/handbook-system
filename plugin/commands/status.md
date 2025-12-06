---
description: Show current project phase status and what to do next
---

# Project Phase Status

Show current project state following the System Delivery Playbook.

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

### Step 1: Run Gate Check

```bash
# Use configured command (default: npm run validation:gates)
GATES_CMD=$(echo "$CONFIG" | jq -r '.commands["validate:gates"] // "npm run validation:gates"')
eval "$GATES_CMD"
```

### Step 2: Read Dashboard + TDD Stats

```bash
# Read from configured validator path (default: scripts/validation/)
VALIDATOR_PATH=$(echo "$CONFIG" | jq -r '.paths.validators // "scripts/validation/"')
cat "${VALIDATOR_PATH}../dashboard/dashboard-data.json" | jq '.all_phase_gates, .blockers, .tdd_stats'
```

### Step 3: Report Status

```markdown
## Project Status

**All Gates Passed:** [Yes/No]

### Phase Gates

| Phase | Status | Blockers |
|-------|--------|----------|
| 1 | ✅/❌ | - |
| 2 | ✅/❌ | - |
| 3 | ✅/❌ | - |
| 4 | ✅/❌ | - |
| 5 | ✅/❌ | - |

### TDD Stats

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Unit | X% | 90% | ✅/❌ |
| Contract | X% | 100% | ✅/❌ |
| Integration | X%/N/A | 100% | ✅/N/A |

### Lowest Failing Phase: [N]

### Next Steps
1. [action - fix lowest phase first]
```

## Quick Commands

Based on config (defaults shown):

| Command | Purpose | Config Key |
|---------|---------|------------|
| `npm run validation:quick` | Pre-commit | `config.commands['validate:quick']` |
| `npm run validation:gates` | All phase gates | `config.commands['validate:gates']` |
| `npm run validation:all` | Full suite | (project-specific) |

**Reference:** `${config.paths.handbook}/monitoring/README.md`
