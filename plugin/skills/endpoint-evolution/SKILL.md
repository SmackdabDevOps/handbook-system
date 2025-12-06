---
name: Endpoint Evolution
description: This skill manages the complete endpoint lifecycle from OpenAPI contracts through implementation and documentation. Use when adding, modifying, or deprecating endpoints, documenting unclassified endpoints, or ensuring contract-code-spec alignment.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Endpoint Evolution

**Reference:** `handbook/contracts/MASTER_API_TEMPLATE_v5_AGENT.yaml`

## Configuration

This skill uses project-specific configuration for endpoint lifecycle management:

**Required config values:**
- `config.paths.openapi` - Path to OpenAPI specs directory (base)
- `config.paths.openapiPaths` - Path to OpenAPI path specs
- `config.paths.openapiSchemas` - Path to OpenAPI schema definitions
- `config.paths.endpointsJson` - Path to endpoints registry JSON file
- `config.paths.stories` - Path to user stories directory
- `config.paths.specs` - Path to UX specs directory
- `config.commands.openapi.bundle` - Command to bundle OpenAPI specs
- `config.commands.endpoints.validate` - Command to validate endpoints

**Example config:**
```json
{
  "paths": {
    "openapi": "openapi/",
    "openapiPaths": "openapi/paths/",
    "openapiSchemas": "openapi/schemas/",
    "endpointsJson": "architecture/ENDPOINTS.json",
    "stories": "docs/user-stories/",
    "specs": "docs/test-plans/validation-specs/"
  },
  "commands": {
    "openapi": {
      "bundle": "npm run openapi:bundle"
    },
    "endpoints": {
      "validate": "npm run endpoints:validate"
    }
  }
}
```

## Purpose

Manage complete endpoint lifecycle: add, modify, deprecate, document.

**Contract-first always:** OpenAPI → DTO → Controller → Spec → Validator

## Trigger Keywords

- "add endpoint"
- "new endpoint"
- "modify endpoint"
- "deprecate endpoint"
- "document endpoint"
- "unclassified endpoint"

---

## Operations

| Operation | Agent | Reference |
|-----------|-------|-----------|
| Add new | `sdd:contract-designer` | [adding-endpoints.md](references/adding-endpoints.md) |
| Modify | `sdd:contract-designer` | [modifying-endpoints.md](references/modifying-endpoints.md) |
| Deprecate | `sdd:contract-designer` | [deprecating-endpoints.md](references/deprecating-endpoints.md) |
| Document unclassified | `sdd:retroactive-documenter` | [documenting-unclassified.md](references/documenting-unclassified.md) |

---

## Quick Workflows

### Add New Endpoint

**Order:** Story → OpenAPI → DTO → Controller → Spec

```bash
# 1. Verify story exists (using config.paths.stories)
grep -r "endpoint-path" ${config.paths.stories}

# 2. Create contract
# Use sdd:contract-designer agent

# 3. Bundle and validate (using config commands)
${config.commands.openapi.bundle}
${config.commands.endpoints.validate}
```

### Document Unclassified (Phase 3.5)

```bash
# 1. Find unclassified (using config.commands.endpoints.validate)
${config.commands.endpoints.validate} | grep unclassified

# 2. Read implementation (using project-specific module structure)
grep -r "/path" ${config.paths.modules}*/controllers/*.ts

# 3. Create matching contract
# Use sdd:retroactive-documenter agent

# 4. Validate
${config.commands.endpoints.validate}
# Endpoint should move to "complete"
```

---

## Validation Chain

```bash
# Uses config commands
${config.commands.openapi.bundle}
${config.commands.endpoints.validate}
${config.commands.validation.matrix}
${config.commands.validation.storyCoverage}
```

---

## Naming Rules

| Location | Convention | Example |
|----------|------------|---------|
| OpenAPI specs | `snake_case` | `channel_id` |
| DTOs | `camelCase` | `channelId` |
| Controller params | `camelCase` | `channelId` |

**Reference:** `handbook/contracts/NAMING_CONVENTIONS.md`

---

## Critical Rules

1. **Contract-first** - OpenAPI before code
2. **No orphan endpoints** - Must have story + rule
3. **Match exactly** - DTO fields = OpenAPI fields
4. **Response envelope** - Always `{ data, message, responseType }`
5. **Never silent removal** - Use deprecation workflow
