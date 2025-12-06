---
name: Artifact Generator
description: This skill generates properly formatted artifacts following handbook templates: user stories, business rules, OpenAPI contracts, and UX specs. Use when creating new playbook artifacts or generating documentation from specifications.
allowed-tools: Read, Write, Glob, Grep, Bash
---

# Artifact Generator

**Reference:** `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` Phases 1-4

## Configuration

This skill uses project-specific configuration to locate artifact directories:

**Required config values:**
- `config.paths.stories` - Path to user stories directory
- `config.paths.rules` - Path to business rules directory
- `config.paths.openapi` - Path to OpenAPI specs directory (base)
- `config.paths.openapiPaths` - Path to OpenAPI path specs
- `config.paths.openapiSchemas` - Path to OpenAPI schema definitions
- `config.paths.specs` - Path to UX validation specs directory
- `config.paths.validators` - Path to validation scripts directory

**Example config:**
```json
{
  "paths": {
    "stories": "docs/user-stories/",
    "rules": "docs/business-rules/",
    "openapi": "openapi/",
    "openapiPaths": "openapi/paths/",
    "openapiSchemas": "openapi/schemas/",
    "specs": "docs/test-plans/validation-specs/",
    "validators": "scripts/validation/"
  }
}
```

## Purpose

Generate playbook artifacts: stories, rules, contracts, specs.

## Trigger Keywords

- "create user story"
- "generate business rule"
- "write openapi spec"
- "create ux spec"

---

## Artifact Types

| Artifact | Location | ID Pattern | Template Guide |
|----------|----------|------------|----------------|
| User Stories | `${config.paths.stories}` | US-NNN | [user-stories.md](references/user-stories.md) |
| Business Rules | `${config.paths.rules}` | BR-NNN | [business-rules.md](references/business-rules.md) |
| OpenAPI Contracts | `${config.paths.openapiPaths}`, `${config.paths.openapiSchemas}` | N/A | [openapi-contracts.md](references/openapi-contracts.md) |
| UX Specs | `${config.paths.specs}` | Journey N | [ux-specs.md](references/ux-specs.md) |

---

## Quick Workflow

### 1. Find Highest IDs

```bash
# Use config paths for stories and rules
grep -r "US-[0-9]" ${config.paths.stories}*.md | grep -oE "US-[0-9]+" | sort -t- -k2 -n | tail -1
grep -r "BR-[0-9]" ${config.paths.rules}*.md | grep -oE "BR-[0-9]+" | sort -t- -k2 -n | tail -1
```

### 2. Read Template Guide

See table above for artifact type → template guide.

### 3. Generate Artifact

Follow template exactly. Cross-link to related artifacts.

### 4. Validate

```bash
npm run validation:gates
```

---

## ID Assignment

| Type | Format | Grouping |
|------|--------|----------|
| Stories | US-NNN | 100s=auth, 200s=workspace, 300s=channels... |
| Rules | BR-NNN | 1xx=auth, 2xx=authz, 3xx=data, 4xx=rate... |

**Always assign next sequential ID. Never skip.**

---

## Cross-Reference Requirements

| Artifact | Must Link To |
|----------|--------------|
| Story | BR-xxx, `METHOD /path` |
| Rule | US-xxx, `METHOD /path` |
| Contract | x-acceptance-criteria, x-business-rules |
| Spec | Covered Stories, Validation Rules Applied |

---

## File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Stories | `NN-domain-stories.md` | `01-authentication-stories.md` |
| Rules | `NN-domain-rules.md` | `02-authorization-rules.md` |
| Paths | `module.yaml` | `channels.yaml` |
| Schemas | `resource.yaml` | `channel.yaml` |
| Specs | `NN-journey-name.md` | `03-channel-operations.md` |

---

## Critical Rules

1. **Never invent IDs** - Check existing, assign next sequential
2. **Never orphan references** - Every link must resolve
3. **Follow templates exactly** - No creative formatting
4. **Validate after generation** - Run validation:gates
5. **Use UUID v7** - For all new identifiers
6. **Cross-link everything** - Stories ↔ Rules ↔ Endpoints ↔ Specs

---

## Detailed Template Guides

- [User Stories](references/user-stories.md) - Complete template, ID rules, workflow
- [Business Rules](references/business-rules.md) - Categories, enforcement layers
- [OpenAPI Contracts](references/openapi-contracts.md) - Paths, schemas, envelope
- [UX Specs](references/ux-specs.md) - Journey structure, API workflow

---

## See Also

- `handbook/SPEC_RULEBOOK.md` - Spec authoring rules
- `handbook/contracts/MASTER_API_TEMPLATE_v5_AGENT.yaml` - API template
- `failure-recovery` skill - Fix validation failures
