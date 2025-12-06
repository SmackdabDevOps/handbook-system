# API Naming Conventions Standard

> **Version:** 1.0.0
> **Last Updated:** 2025-11-28
> **Status:** MANDATORY for all Smackdab projects
> **Enforcement:** `npm run validate:naming` (automated gate)

---

## 1. Overview

This document defines the **mandatory** naming conventions for all API-related code. These conventions are enforced by automated validation scripts that must pass before any phase can progress.

### Why This Matters

Inconsistent naming causes:
- Frontend/backend integration bugs
- Documentation drift from implementation
- Confusion for API consumers
- Maintenance burden across projects

**These rules are non-negotiable.**

---

## 2. The Standard: Hybrid Convention

Smackdab projects use a **hybrid naming convention** that balances REST API standards with PostgreSQL conventions:

| Context | Convention | Example |
|---------|------------|---------|
| **Path Parameters** | camelCase | `/channels/{channelId}/members/{userId}` |
| **Query Parameters** | snake_case | `?workspace_id=...&include_archived=true` |
| **Request Body Fields** | snake_case | `{ "workspace_id": "...", "channel_type": "..." }` |
| **Response Body Fields** | snake_case | `{ "data": { "channel_id": "...", "created_at": "..." } }` |
| **Database Columns** | snake_case | `workspace_id`, `created_at`, `is_archived` |
| **TypeScript DTO Properties** | snake_case | `workspace_id: string;` |
| **TypeScript Interfaces** | snake_case | `channel_id: string;` |

### 2.1 Path Parameters (camelCase)

Path parameters follow REST conventions and use **camelCase**:

```yaml
# CORRECT
/channels/{channelId}
/workspaces/{workspaceId}/members/{userId}
/messages/{messageId}/reactions/{reactionId}

# WRONG - Never use snake_case in paths
/channels/{channel_id}  # ❌
/workspaces/{workspace_id}/members/{user_id}  # ❌
```

### 2.2 Query Parameters (snake_case)

Query parameters use **snake_case** to match body fields:

```yaml
# CORRECT
?workspace_id=01924c8f-7b3a-7890-b123-456789abcdef
?include_archived=true
?filter_by=status
?sort_by=created_at
?sort_order=desc

# WRONG
?workspaceId=...  # ❌
?includeArchived=true  # ❌
```

### 2.3 Request Body Fields (snake_case)

All request body fields use **snake_case**:

```json
// CORRECT
{
  "workspace_id": "01924c8f-7b3a-7890-b123-456789abcdef",
  "channel_type": "private_channel",
  "who_can_post": "admins",
  "allow_file_uploads": true,
  "member_ids": ["..."]
}

// WRONG - Never use camelCase in body fields
{
  "workspaceId": "...",  // ❌
  "channelType": "...",  // ❌
  "whoCanPost": "...",   // ❌
  "allowFileUploads": true,  // ❌
  "memberIds": ["..."]  // ❌
}
```

### 2.4 Response Body Fields (snake_case)

All response body fields use **snake_case**:

```json
// CORRECT
{
  "data": {
    "channel_id": "01924c8f-7b3a-7890-b123-456789abcdef",
    "workspace_id": "...",
    "channel_type": "private_channel",
    "created_at": "2025-11-28T12:00:00Z",
    "updated_at": "2025-11-28T12:00:00Z",
    "is_archived": false
  },
  "message": "Channel created successfully",
  "responseType": "success"
}

// WRONG
{
  "data": {
    "channelId": "...",  // ❌
    "workspaceId": "...",  // ❌
    "createdAt": "...",  // ❌
    "isArchived": false  // ❌
  }
}
```

### 2.5 Database Columns (snake_case)

All database columns use **snake_case**. Sequelize models must use `underscored: true`:

```typescript
// CORRECT - Sequelize model configuration
@Table({
  tableName: 'channels',
  timestamps: true,
  paranoid: true,
  underscored: true,  // ← MANDATORY
})
export class Channel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true })
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  workspace_id: string;  // ← snake_case

  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt: Date;  // TypeScript can use camelCase, but DB field is snake_case
}
```

### 2.6 TypeScript DTOs (snake_case)

DTO properties must use **snake_case** to match API bodies:

```typescript
// CORRECT
export class CreateChannelDto {
  workspace_id: string;
  channel_type: 'public_channel' | 'private_channel';
  who_can_post?: 'all' | 'admins' | 'moderators';
  allow_file_uploads?: boolean;
  member_ids?: string[];
}

// WRONG
export class CreateChannelDto {
  workspaceId: string;  // ❌
  channelType: string;  // ❌
  whoCanPost?: string;  // ❌
  allowFileUploads?: boolean;  // ❌
  memberIds?: string[];  // ❌
}
```

---

## 3. OpenAPI Contract Rules

OpenAPI specifications must follow these naming rules exactly.

### 3.1 Path Definitions

```yaml
# CORRECT
paths:
  /channels/{channelId}:  # ← camelCase path param
    get:
      parameters:
        - name: channelId  # ← camelCase
          in: path

  /channels/{channelId}/permissions:
    patch:
      requestBody:
        content:
          application/json:
            schema:
              properties:
                who_can_post:  # ← snake_case body field
                  type: string
                allow_file_uploads:  # ← snake_case body field
                  type: boolean
```

### 3.2 Schema Definitions

```yaml
# CORRECT
components:
  schemas:
    Channel:
      type: object
      properties:
        id:
          type: string
        workspace_id:  # ← snake_case
          type: string
        channel_type:  # ← snake_case
          type: string
        created_at:  # ← snake_case
          type: string
          format: date-time
        is_archived:  # ← snake_case
          type: boolean
```

---

## 4. Exceptions (Must Be Documented)

There are **NO general exceptions**. If a field must deviate from these conventions (e.g., for third-party API compatibility), it must be:

1. Documented in the OpenAPI spec with a comment explaining why
2. Added to an exceptions list in `handbook/contracts/NAMING_EXCEPTIONS.md`
3. Approved by project lead

**Current approved exceptions:** None.

---

## 5. Enforcement: Validation Scripts

These conventions are enforced by automated scripts that **must pass** before phase progression.

### 5.1 Scripts

| Script | Purpose | Phase Gate |
|--------|---------|------------|
| `npm run validate:naming` | Check all naming conventions | Phase 2 |
| `npm run validate:openapi-dto` | Check OpenAPI ↔ DTO alignment | Phase 2 |

### 5.2 What They Check

**`validate-naming-conventions.ts`:**
- OpenAPI path parameters use camelCase
- OpenAPI body/response fields use snake_case
- OpenAPI query parameters use snake_case
- DTO properties use snake_case

**`validate-openapi-dto-alignment.ts`:**
- Every OpenAPI request body field has matching DTO property
- Every OpenAPI response field has matching model property
- Field names match exactly between layers
- Types are compatible

### 5.3 Running Validation

```bash
# Individual checks
npm run validate:naming
npm run validate:openapi-dto

# Full Phase 2 gate (includes naming)
npm run validate:gate
```

### 5.4 Failure Handling

When validation fails:

1. **DO NOT** modify the validation script to ignore failures
2. **DO NOT** add exceptions without approval
3. **FIX** the non-compliant code/contracts

---

## 6. Migration Guide (Fixing Violations)

When you find naming violations, fix them in this order:

### 6.1 Fix OpenAPI First (Contract-First)

```yaml
# Before (WRONG)
properties:
  whoCanPost:  # ❌ camelCase in body
    type: string

# After (CORRECT)
properties:
  who_can_post:  # ✅ snake_case
    type: string
```

### 6.2 Verify DTO Matches

```typescript
// DTO should already be correct (snake_case)
export class UpdatePermissionsDto {
  who_can_post?: WhoCanPost;  // ✅ Already correct
}
```

### 6.3 Regenerate/Validate

```bash
npm run openapi:bundle
npm run validate:naming
npm run validate:openapi-dto
npm run endpoints:validate
```

---

## 7. Quick Reference

### DO:
- ✅ Use camelCase for path parameters: `{channelId}`
- ✅ Use snake_case for query parameters: `?workspace_id=...`
- ✅ Use snake_case for all body fields: `{ "who_can_post": "..." }`
- ✅ Use snake_case for all response fields
- ✅ Use snake_case for all DTO properties
- ✅ Use `underscored: true` in Sequelize models
- ✅ Run `npm run validate:naming` before committing

### DON'T:
- ❌ Mix conventions in the same context
- ❌ Use camelCase in request/response bodies
- ❌ Create exceptions without documented approval
- ❌ Modify validation scripts to pass non-compliant code
- ❌ Copy-paste from other projects without checking conventions

---

## 8. Rationale

**Why hybrid convention?**

1. **Path Parameters (camelCase):**
   - REST API standard
   - URL-friendly (no encoding needed)
   - Familiar to frontend developers

2. **Body/Query Fields (snake_case):**
   - Matches PostgreSQL column naming
   - No transformation needed between DB and API
   - Common in Python/Ruby APIs
   - Reduces serialization complexity

3. **Single Source of Truth:**
   - Database defines field names
   - API mirrors database
   - No transformation layer needed
   - Less code = fewer bugs

---

## 9. Related Documents

- `handbook/contracts/MASTER_API_TEMPLATE_v5_AGENT.yaml` - API contract template
- `handbook/contracts/NESTJS_CONTROLLER_PATTERNS.md` - Controller patterns
- `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` - Phase gates and validation
- `scripts/validate-naming-conventions.ts` - Enforcement script
- `scripts/validate-openapi-dto-alignment.ts` - Alignment checker
