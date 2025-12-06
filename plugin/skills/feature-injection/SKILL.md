---
name: Feature Injection
description: This skill safely adds new features to an in-progress project by walking through all required phases for just the new feature while preserving validated existing work. Use when adding features after initial development has started or when scope expands mid-project.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
---

# Feature Injection

**Reference:** `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` §5 (Phases)

## Configuration

This skill uses project-specific configuration to inject features across all phases:

**Required config values:**
- `config.paths.stories` - Path to user stories directory
- `config.paths.rules` - Path to business rules directory
- `config.paths.openapiPaths` - Path to OpenAPI path specs
- `config.paths.specs` - Path to UX validation specs
- `config.paths.validators` - Path to validation scripts
- `config.commands.validation.gates` - Command to run phase gates
- `config.commands.tdd.redPhase` - Command to verify RED phase (tests fail)
- `config.commands.tdd.greenPhase` - Command to verify GREEN phase (tests pass)

**Example config:**
```json
{
  "paths": {
    "stories": "docs/user-stories/",
    "rules": "docs/business-rules/",
    "openapiPaths": "openapi/paths/",
    "specs": "docs/test-plans/validation-specs/",
    "validators": "scripts/validation/"
  },
  "commands": {
    "validation": {
      "gates": "npm run validation:gates"
    },
    "tdd": {
      "redPhase": "npx ts-node scripts/validation/check-red-phase.ts",
      "greenPhase": "npx ts-node scripts/validation/check-red-phase.ts --green"
    }
  }
}
```

## Purpose

Add new features to a project that's already in progress by walking through mini-phases (1-5) for just the new feature.

## Trigger Keywords

- "add new feature"
- "inject feature"
- "new requirement"
- "scope change"

---

## Quick Process

### 1. Assign ID Ranges

```bash
# Find highest existing IDs (using config paths)
grep -r "US-[0-9]" ${config.paths.stories}*.md | grep -oE "US-[0-9]+" | sort -t- -k2 -n | tail -1
grep -r "BR-[0-9]" ${config.paths.rules}*.md | grep -oE "BR-[0-9]+" | sort -t- -k2 -n | tail -1
```

Start new feature at next round number (e.g., US-315 exists → US-400).

### 2. Walk Mini-Phases

| Phase | What | Agent | TDD Required? |
|-------|------|-------|---------------|
| 1 | Stories/Rules | `sdd:story-rule-linker` | No |
| 2 | Contracts | `sdd:contract-designer` | No |
| 3 | Backend | (implementation) | **YES** |
| 4 | Specs | `sdd:spec-author` | No |
| 5 | Validators | `sdd:validation-runner` | No |

### 3. TDD Enforcement (Phase 3 Only)

**Before implementation:**
```bash
# Uses config.commands.tdd.redPhase
${config.commands.tdd.redPhase} <module>
```
Must show tests FAIL.

**After implementation:**
```bash
# Uses config.commands.tdd.greenPhase
${config.commands.tdd.greenPhase} <module>
```
Must show tests PASS.

**Reference:** `handbook/monitoring/TDD_ENFORCEMENT_SETUP.md`

### 4. Integration Validation

```bash
# Uses config.commands.validation.gates
${config.commands.validation.gates}
```

All existing validations must still pass.

---

## Checklist

```markdown
## Feature: [Name]

### Phase 1
- [ ] Story IDs assigned (US-xxx range)
- [ ] Stories written
- [ ] Rules linked
- [ ] check-business-rules-coverage PASS

### Phase 2
- [ ] OpenAPI contracts created
- [ ] Stories updated with endpoints
- [ ] openapi:bundle PASS
- [ ] endpoints:validate PASS

### Phase 3 (TDD Required)
- [ ] Tests written FIRST
- [ ] RED phase verified
- [ ] Implementation complete
- [ ] GREEN phase verified
- [ ] lint/typecheck/test PASS

### Phase 4
- [ ] Spec created/updated
- [ ] check-story-coverage PASS

### Phase 5
- [ ] Validator created
- [ ] Validator runs successfully

### Integration
- [ ] validation:gates PASS
- [ ] No regression
```

---

## Detailed References

| Topic | Location |
|-------|----------|
| Story templates | `skills/artifact-generator/references/user-stories.md` |
| Rule templates | `skills/artifact-generator/references/business-rules.md` |
| Contract templates | `handbook/contracts/MASTER_API_TEMPLATE_v5_AGENT.yaml` |
| Spec rules | `handbook/SPEC_RULEBOOK.md` |
| TDD setup | `handbook/monitoring/TDD_ENFORCEMENT_SETUP.md` |

---

## Critical Rules

1. **Never skip phases** - Even for "small" features
2. **TDD for Phase 3** - RED phase before implementation
3. **Group IDs** - Keep feature artifacts together
4. **Integration check** - Existing validations must still pass
5. **Escalate conflicts** - Don't make business decisions
