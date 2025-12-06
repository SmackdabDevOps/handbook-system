---
name: Handbook Sync
description: This skill audits the plugin against the handbook to identify discrepancies and generates updates to maintain alignment with handbook evolution. Use when the handbook changes, periodically to check alignment, or to update plugin accuracy.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
---

# Handbook Sync

## Configuration

This skill uses project-specific configuration to locate the handbook:

**Required config values:**
- `config.paths.handbook` - Path to handbook directory
- `config.paths.playbookFile` - Path to main playbook file
- `config.paths.rulebookFile` - Path to spec rulebook file
- `config.paths.validatorRulebookFile` - Path to validator rulebook file

**Example config:**
```json
{
  "paths": {
    "handbook": "handbook/",
    "playbookFile": "handbook/SYSTEM_DELIVERY_PLAYBOOK.md",
    "rulebookFile": "handbook/SPEC_RULEBOOK.md",
    "validatorRulebookFile": "handbook/RULEBOOK.md"
  }
}
```

## Purpose

Maintain alignment between the SDD plugin and the handbook.

**Rule:** Handbook is source of truth. Plugin adapts to handbook, never reverse.

## Trigger Keywords

- "sync with handbook"
- "handbook changed"
- "audit plugin"
- "check plugin alignment"

---

## Plugin-Handbook Mapping

| Plugin Component | Handbook Source |
|------------------|-----------------|
| `phase-navigator` | `${config.paths.playbookFile}` §4-5 |
| `validation-orchestrator` | `${config.paths.playbookFile}` §3 |
| `artifact-generator` | `${config.paths.handbook}stories/`, `rules/`, `${config.paths.rulebookFile}` |
| `failure-recovery` | `${config.paths.playbookFile}` §7 |
| `feature-injection` | `${config.paths.playbookFile}` §5 |
| `endpoint-evolution` | `${config.paths.handbook}contracts/`, `${config.paths.rulebookFile}` |

---

## Quick Sync Process

### 1. Detect Changes

```bash
# Recent handbook changes (using config.paths.handbook)
find ${config.paths.handbook} -name "*.md" -mtime -7 | head -20

# Check key files
git log --oneline -5 ${config.paths.playbookFile}
```

### 2. Check Key Elements

```bash
# Phases in handbook
grep -n "### Phase" ${config.paths.playbookFile}

# Validation scripts in handbook
grep -oE "npm run [a-z:-]+" ${config.paths.playbookFile} | sort -u

# TDD scripts
grep -oE "check-.*\.ts" ${config.paths.handbook}monitoring/*.md | sort -u
```

### 3. Compare with Plugin

```bash
# Scripts in plugin
grep -oE "npm run [a-z:-]+" skills/validation-orchestrator/SKILL.md | sort -u
```

### 4. Generate Report

```markdown
## Handbook-Plugin Sync Report

**Date:** [timestamp]

### Discrepancies Found

| Handbook Section | Plugin File | Status |
|------------------|-------------|--------|
| [section] | [file] | ✅/❌ |

### Required Updates

1. [file]: [change needed]
```

### 5. Apply Updates

Use `sdd:handbook-auditor` agent to apply fixes.

### 6. Validate

```bash
# Check skill syntax
for skill in skills/*/SKILL.md; do
  head -5 "$skill" | grep -q "^---" || echo "INVALID: $skill"
done
```

---

## Git Workflow

**Source repo:** `/Users/brooksswift/Coding/Smackdab/dev/smackdab-driven-dev`

```bash
git add -A && git commit -m "type(scope): description"
git push origin main
```

**Users update:** `/plugin update sdd@smackdab-plugins` + restart Claude Code

**Reference:** `skills/handbook-sync/references/git-workflow.md`

---

## Critical Rules

1. **Handbook is truth** - Plugin adapts, never reverse
2. **Never skip sync** - Drift compounds
3. **Validate after sync** - Ensure plugin works
4. **Version bump** - Significant changes need version update
