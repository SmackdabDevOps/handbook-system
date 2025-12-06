# Deprecating Endpoints

## When to Use

Use this guide when removing or replacing an endpoint due to:
- Breaking changes (API redesign)
- Functionality moved to another endpoint
- Endpoint no longer needed
- Security or performance issues

---

## Deprecation vs. Immediate Removal

### Use Deprecation When:
- Endpoint is used by external clients
- Breaking changes required
- Replacement endpoint exists
- Need time for migration

### Use Immediate Removal When:
- Endpoint never reached production
- Internal-only endpoint
- Critical security vulnerability
- User explicitly requests removal

**Default: Use deprecation cycle for all production endpoints.**

---

## Deprecation Workflow

### Step 1: Create Replacement (if applicable)

If deprecating due to a redesign, create the replacement endpoint first:

1. Follow [Adding Endpoints](adding-endpoints.md) workflow
2. Ensure new endpoint is tested and validated
3. Document migration path

**Do not deprecate until replacement is ready.**

---

### Step 2: Mark as Deprecated in OpenAPI

Update `openapi/paths/[module].yaml`:

```yaml
/old/endpoint:
  get:
    deprecated: true
    summary: "[DEPRECATED] Get old thing - use GET /new/endpoint instead"
    description: |
      **DEPRECATED:** This endpoint will be removed in v2.0.0.
      Use `GET /new/endpoint` instead.

      **Deprecation Details:**
      - Deprecated: 2025-01-15
      - Removal: 2025-06-01
      - Reason: Replaced by improved endpoint with better validation
      - Migration: See `GET /new/endpoint` for replacement

      **Original Description:**
      Returns the old thing format (legacy).

      **Business Rules:** BR-xxx
      **User Stories:** US-xxx
    tags:
      - ModuleName (Deprecated)
    # ... rest of spec unchanged ...
```

**Key elements:**
- `deprecated: true` - OpenAPI flag
- `[DEPRECATED]` prefix in summary
- Deprecation date, removal date, reason
- Link to replacement endpoint
- Original description preserved

---

### Step 3: Add Deprecation Headers in Controller

Update controller method to include HTTP deprecation headers:

```typescript
// src/modules/[module]/controllers/[module].controller.ts

import { Controller, Get, Header } from '@nestjs/common';

@Controller('module')
export class ModuleController {
  @Get('old/endpoint')
  @Header('Deprecation', 'true')
  @Header('Sunset', 'Sat, 01 Jun 2025 00:00:00 GMT')
  @Header('Link', '</new/endpoint>; rel="alternate"')
  async getOldThing() {
    // Existing implementation unchanged
    return this.service.getOldThing();
  }
}
```

**Headers explained:**
- `Deprecation: true` - Indicates deprecated endpoint
- `Sunset` - RFC 7231 date format for removal
- `Link` - Points to replacement endpoint

---

### Step 4: Add Logging/Monitoring

Add deprecation warning logs:

```typescript
@Get('old/endpoint')
@Header('Deprecation', 'true')
@Header('Sunset', 'Sat, 01 Jun 2025 00:00:00 GMT')
async getOldThing(@Session() session: SessionData) {
  // Log deprecation usage
  this.logger.warn(
    'Deprecated endpoint accessed',
    {
      endpoint: 'GET /old/endpoint',
      userId: session.userId,
      deprecationDate: '2025-01-15',
      removalDate: '2025-06-01',
      replacement: 'GET /new/endpoint',
    },
  );

  return this.service.getOldThing();
}
```

**Use logs to:**
- Track who's still using deprecated endpoints
- Determine when safe to remove
- Contact affected users

---

### Step 5: Update User Stories

Mark endpoint as deprecated in story:

```markdown
## US-xxx: Get Thing

### API Endpoints
- ~~`GET /old/endpoint`~~ **DEPRECATED** (Removal: 2025-06-01)
  - Use `GET /new/endpoint` instead
  - See migration guide: [link]
- `GET /new/endpoint` - Get thing (current)
```

**Format:**
- Strikethrough old endpoint
- Bold "DEPRECATED" label
- Removal date
- Link to replacement

---

### Step 6: Update Business Rules

If rules reference the deprecated endpoint:

```markdown
## BR-xxx: Thing Retrieval Rules

### Affected Endpoints
- ~~`GET /old/endpoint`~~ (Deprecated - use `GET /new/endpoint`)
- `GET /new/endpoint` (Current)

### Rules
1. [Rule text - unchanged]
```

---

### Step 7: Update UX Specs

Mark scenarios as deprecated:

```markdown
### [DEPRECATED] Step N: Get Old Thing

> **⚠ Deprecation Notice:**
> This scenario tests deprecated endpoint `GET /old/endpoint`.
> Will be removed after 2025-06-01.
> See "Step N+1: Get Thing (New)" for current behavior.

**Actor:** Alice
**Action:** Gets a thing using old endpoint

**API Workflow:**
- **Endpoint**: `GET /old/endpoint`
- **Expectations**:
  - Status: `200 OK`
  - Response headers include:
    - `Deprecation: true`
    - `Sunset: Sat, 01 Jun 2025 00:00:00 GMT`
  - Response body: [existing expectations]

---

### Step N+1: Get Thing (New)

**Actor:** Alice
**Action:** Gets a thing using current endpoint

**API Workflow:**
- **Endpoint**: `GET /new/endpoint`
- **Expectations**:
  - Status: `200 OK`
  - Response: [new expectations]
```

**Keep deprecated scenarios** until removal to ensure backward compatibility.

---

### Step 8: Create Migration Guide

Create or update `docs/migrations/deprecation-v2.md`:

```markdown
# API Deprecations - v2.0.0

## GET /old/endpoint → GET /new/endpoint

**Deprecation Date:** 2025-01-15
**Removal Date:** 2025-06-01

### What Changed
The old endpoint returned data in format X, the new endpoint returns format Y.

### Migration Steps

#### Before (Deprecated):
```javascript
const response = await fetch('/old/endpoint');
const data = response.data;
// data.oldField
```

#### After (Current):
```javascript
const response = await fetch('/new/endpoint');
const data = response.data;
// data.newField (renamed from oldField)
```

### Breaking Changes
- `oldField` renamed to `newField`
- Response includes additional `metadata` object
- Query parameters changed: `filter` → `filters` (array)

### Backward Compatibility
The deprecated endpoint will continue working until 2025-06-01.
Update before removal date.
```

---

### Step 9: Bundle and Validate

```bash
npm run openapi:bundle
npm run endpoints:validate
npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts
```

---

### Step 10: Communicate Deprecation

**Internal communication:**
- Update API changelog
- Notify team in standup/Slack
- Update API documentation site

**External communication (if applicable):**
- Email affected users (from logs)
- Post on developer forum
- Update SDK documentation

---

## Removal Workflow

When the removal date arrives:

### Step 1: Verify Zero Usage

Check logs to confirm no recent usage:

```bash
# Search logs for deprecated endpoint usage
grep "Deprecated endpoint accessed" /tmp/smackchat_dev.log | grep "/old/endpoint"
```

If still in use, consider extending deprecation period.

---

### Step 2: Remove from OpenAPI

Delete the endpoint definition from `openapi/paths/[module].yaml`:

```yaml
# DELETE THIS ENTIRE BLOCK
/old/endpoint:
  get:
    deprecated: true
    # ...
```

---

### Step 3: Remove from Controller

Delete or comment out the controller method:

```typescript
// src/modules/[module]/controllers/[module].controller.ts

// REMOVED: Old deprecated endpoint
// @Get('old/endpoint')
// async getOldThing() { ... }
```

**Consider leaving a comment** explaining what was removed and when.

---

### Step 4: Remove from Service

If the service method was only used by the deprecated endpoint:

```typescript
// src/modules/[module]/services/[module].service.ts

// REMOVED: getOldThing() - deprecated endpoint removed 2025-06-01
```

---

### Step 5: Archive Documentation

Move deprecated stories/specs to archive:

```bash
mkdir -p docs/archive/deprecated-v2/
mv docs/user-stories/old-thing.md docs/archive/deprecated-v2/
```

Update story index to remove archived items.

---

### Step 6: Update Migration Guide

Update `docs/migrations/deprecation-v2.md`:

```markdown
## GET /old/endpoint → GET /new/endpoint

**Status:** ~~Deprecated~~ **REMOVED** (2025-06-01)

Endpoint has been removed. Use `GET /new/endpoint`.
```

---

### Step 7: Bundle and Validate

```bash
npm run openapi:bundle
npm run endpoints:validate
npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts
```

Ensure no references to removed endpoint remain.

---

### Step 8: Run Tests

```bash
npm test
npm run test:e2e
```

Remove any tests that were specifically for the deprecated endpoint.

---

### Step 9: Update Changelog

Add removal notice:

```markdown
# Changelog

## v2.0.0 - 2025-06-01

### Removed
- **GET /old/endpoint** - Deprecated since v1.5.0
  - Use `GET /new/endpoint` instead
  - See migration guide: [link]
```

---

## Deprecation Checklist

### During Deprecation Period

- [ ] Replacement endpoint created and tested (if applicable)
- [ ] OpenAPI marked with `deprecated: true`
- [ ] Summary includes `[DEPRECATED]` prefix
- [ ] Description includes deprecation/removal dates and reason
- [ ] Controller has deprecation headers (Deprecation, Sunset, Link)
- [ ] Deprecation logging added
- [ ] User story updated with strikethrough and warning
- [ ] Business rules updated
- [ ] UX specs marked as deprecated
- [ ] Migration guide created
- [ ] `npm run openapi:bundle` passes
- [ ] All validation scripts pass
- [ ] Internal team notified
- [ ] External users notified (if applicable)

### At Removal Time

- [ ] Verified zero usage in logs
- [ ] Removed from OpenAPI
- [ ] Removed from controller
- [ ] Removed from service (if unused)
- [ ] Documentation archived
- [ ] Migration guide updated to "REMOVED"
- [ ] Changelog updated
- [ ] All validation scripts pass
- [ ] Tests updated/removed
- [ ] Team notified of removal

---

## Common Issues

### "Still seeing traffic to deprecated endpoint"
- Check logs for user IDs
- Contact affected users directly
- Consider extending deprecation period

### "Validation fails after removal"
- Search for remaining references in specs
- Check business rules for endpoint mentions
- Update or archive affected documentation

### "Breaking compatibility too soon"
- Always provide minimum 3-month deprecation period
- Log usage to track who's affected
- Communicate early and often

---

## Deprecation Timeline

**Recommended timeline:**

```
Day 0: Create replacement endpoint (if applicable)
Day 1: Mark as deprecated in OpenAPI + add headers
Day 7: Notify users via email/documentation
Day 30: First usage check - identify active users
Day 60: Second usage check - contact high-volume users
Day 90: Final usage check before removal
Day 120: Remove endpoint (minimum 4 months from deprecation)
```

**Adjust timeline based on:**
- Endpoint usage volume
- Complexity of migration
- User feedback
- Business requirements

---

## See Also

- [Adding Endpoints](adding-endpoints.md) - For creating replacements
- [Modifying Endpoints](modifying-endpoints.md) - For additive changes
- `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` - Complete delivery workflow
- RFC 8594 - Sunset HTTP Header
- RFC 7231 - HTTP date format
