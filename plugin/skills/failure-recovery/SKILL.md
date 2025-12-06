---
name: Failure Recovery
description: This skill guides through fixing validation failures following the System Delivery Playbook remediation procedures. Use when any validation script fails and you need structured remediation guidance.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Failure Recovery

**Reference:** `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` §7 (Failure Handling)

## Configuration

This skill uses project-specific configuration to locate validation scripts and remediation targets:

**Required config values:**
- `config.paths.validators` - Path to validation scripts directory
- `config.paths.stories` - Path to user stories directory (for Phase 1 fixes)
- `config.paths.rules` - Path to business rules directory (for Phase 1 fixes)
- `config.paths.openapiPaths` - Path to OpenAPI paths (for Phase 2 fixes)
- `config.paths.specs` - Path to UX specs (for Phase 4 fixes)
- `config.commands.validation.gates` - Command to run phase gates

**Example config:**
```json
{
  "paths": {
    "validators": "scripts/validation/",
    "stories": "docs/user-stories/",
    "rules": "docs/business-rules/",
    "openapiPaths": "openapi/paths/",
    "specs": "docs/test-plans/validation-specs/"
  },
  "commands": {
    "validation": {
      "gates": "npm run validation:gates"
    }
  }
}
```

## Purpose

Fix validation failures by identifying root cause and applying correct remediation.

**CRITICAL:** Fix lowest failing phase first. Foundation before building.

## Trigger Keywords

- "validation failed"
- "fix this error"
- "script failed"
- "phase gate blocked"

---

## Quick Diagnosis

```bash
# 1. Run comprehensive check (uses config.commands.validation.gates)
${config.commands.validation.gates}

# 2. Identify lowest failing phase

# 3. Read specific error

# 4. Apply fix from table below

# 5. Re-run validation check
${config.commands.validation.gates}
```

---

## Failure Matrix

| Script | Failure | Phase | Fix Reference |
|--------|---------|-------|---------------|
| check-business-rules-coverage | Stories missing rules | 1 | [phase1-remediation.md](references/phase1-remediation.md) |
| check-business-rules-coverage | Rules not referenced | 1 | [phase1-remediation.md](references/phase1-remediation.md) |
| validate:naming | Naming violation | 2 | [phase2-remediation.md](references/phase2-remediation.md) |
| validate:openapi-dto | Field mismatch | 2 | [phase2-remediation.md](references/phase2-remediation.md) |
| endpoints:validate | Missing endpoints | 3 | [phase3-remediation.md](references/phase3-remediation.md) |
| endpoints:validate | Unclassified endpoints | 3.5 | [phase3-remediation.md](references/phase3-remediation.md) |
| check-story-coverage | Missing stories in specs | 4 | [phase4-remediation.md](references/phase4-remediation.md) |
| validate-ux-specs | Unknown endpoint/field | 4 | [phase4-remediation.md](references/phase4-remediation.md) |
| Validator script | HTTP errors | 5 | [phase5-remediation.md](references/phase5-remediation.md) |

---

## Common Quick Fixes

### Phase 2: Naming Violation

**OpenAPI must use `snake_case`:**
```yaml
# WRONG
channelId:
# CORRECT
channel_id:
```

**DTOs must use `camelCase`:**
```typescript
// WRONG
channel_id: string;
// CORRECT
channelId: string;
```

### Phase 4: Unknown Field

Check DTO for exact field names. Spec must match DTO.

```bash
# Find DTO (using project-specific module structure)
cat ${config.paths.modules}[module]/dto/*.ts | grep "field"
```

---

## Recovery Checklist

```markdown
## Failure Recovery

### Diagnosis
- [ ] Run validation:gates
- [ ] Identify lowest failing phase
- [ ] Read exact error message
- [ ] Find matching row in failure matrix

### Fix
- [ ] Read remediation reference
- [ ] Apply fix
- [ ] Re-run validation:gates
- [ ] If still failing, repeat

### Verification
- [ ] All gates pass
- [ ] No regression on other phases
```

---

## Critical Rules

1. **Fix lowest phase first** - Foundation issues cascade
2. **Never modify specs to pass broken code** - Fix the code
3. **Never remove requirements** - Add implementations
4. **Re-run validation:gates** - Verify fix
5. **Check for regression** - Other phases still pass
