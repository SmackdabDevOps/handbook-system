---
description: Audit plugin against handbook and generate updates for any discrepancies
---

# Sync Handbook

Audit the plugin against the current handbook state and identify any drift.

## Instructions

### Step 0: Load Configuration

```bash
CONFIG_FILE=$(find . -maxdepth 2 -name "handbook.config.json" -type f | head -1)
if [ -z "$CONFIG_FILE" ]; then
  echo "❌ No handbook.config.json found. Run: npx @smackdab/handbook-init"
  exit 1
fi
CONFIG=$(cat "$CONFIG_FILE")

# Extract handbook path
HANDBOOK_PATH=$(echo "$CONFIG" | jq -r '.paths.handbook // "handbook/"')
```

This command triggers the `handbook-sync` skill.

### 1. Scan Handbook

```bash
# List all handbook files with modification times
find "$HANDBOOK_PATH" -name "*.md" -o -name "*.yaml" | while read f; do
  echo "$(stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$f") $f"
done | sort -r
```

### 2. Check Key Sections

For each handbook file, verify plugin alignment:

#### SYSTEM_DELIVERY_PLAYBOOK.md

```bash
# Extract phase definitions
grep -n "### Phase" "${HANDBOOK_PATH}SYSTEM_DELIVERY_PLAYBOOK.md"

# Extract validation scripts
grep -oE "npm run [a-z:-]+|npx ts-node [^ ]+" "${HANDBOOK_PATH}SYSTEM_DELIVERY_PLAYBOOK.md" | sort -u

# Extract failure remediation patterns
grep -n "### 7\." "${HANDBOOK_PATH}SYSTEM_DELIVERY_PLAYBOOK.md"
```

#### SPEC_RULEBOOK.md

```bash
# Extract required sections
grep -n "^## " "${HANDBOOK_PATH}SPEC_RULEBOOK.md"

# Extract templates
grep -n "```markdown" "${HANDBOOK_PATH}SPEC_RULEBOOK.md"
```

#### RULEBOOK.md

```bash
# Extract rules
grep -n "^[0-9])" "${HANDBOOK_PATH}RULEBOOK.md"
```

### 3. Generate Discrepancy Report

Compare extracted data with plugin content:

```markdown
## Handbook-Plugin Sync Report

**Generated:** [timestamp]
**Project:** ${config.projectName}
**Handbook Path:** ${config.paths.handbook}
**Plugin Path:** [plugin location]

### Configuration
- Stack Profile: ${config.stackProfile}
- Enabled Phases: ${config.phases.enabled}

### Files Checked

| Handbook File | Last Modified | Plugin Component | Status |
|---------------|---------------|------------------|--------|
| SYSTEM_DELIVERY_PLAYBOOK.md | [date] | phase-navigator, validation-orchestrator | ✅/❌ |
| SPEC_RULEBOOK.md | [date] | artifact-generator | ✅/❌ |
| RULEBOOK.md | [date] | validation-orchestrator | ✅/❌ |

### Discrepancies Found

[List specific mismatches]

### Recommended Updates

[List specific edits to plugin files]
```

### 4. Apply Updates (if requested)

If user confirms, apply the recommended updates:

1. Edit skill files to match handbook
2. Edit command files if affected
3. Update agent files if affected
4. Bump plugin version in plugin.json

### 5. Validate Plugin

After updates:

```bash
# Check skill syntax
for skill in skills/*/SKILL.md; do
  head -5 "$skill" | grep -q "^---" && echo "✅ $skill" || echo "❌ $skill"
done

# Check plugin.json validity
cat .claude-plugin/plugin.json | jq . > /dev/null && echo "✅ plugin.json valid"
```

## Output

```markdown
## Handbook Sync Complete

**Status:** [IN SYNC / UPDATES APPLIED / MANUAL REVIEW NEEDED]

### Changes Applied

| File | Change | Reason |
|------|--------|--------|
| [path] | [description] | [handbook section] |

### Manual Review Needed

[Any changes that require human decision]

### Plugin Version

- Previous: [X.Y.Z]
- Current: [X.Y.Z+1] (if updated)

### Next Sync

Consider running this command:
- After any handbook file edit
- Weekly as a maintenance task
```

## Important

- **Handbook is truth** - Plugin adapts to handbook, not reverse
- **Document changes** - Keep record of what was synced
- **Version bump** - Significant changes need version update
- **Test after sync** - Verify plugin still works correctly
