# Phase 3 Remediation: Backend Implementation

**Validation Script:** `npm run endpoints:validate`

This phase validates that planned endpoints are implemented and that implemented endpoints are documented.

---

## Failure: "Missing Endpoints" (not implemented)

**Error Pattern:**
```
Missing Endpoints (in registry but not implemented):
- POST /workspaces/:workspaceId/invite
- DELETE /channels/:channelId
```

**Root Cause:** Endpoint planned but not yet implemented

**Fix Steps:**

1. Decide:
   - Implement the endpoint → create controller method
   - Remove from plan → update OpenAPI and registry

2. If implementing:
   ```bash
   # Find the right controller
   ls src/modules/workspaces/controllers/

   # Read existing patterns
   head -100 src/modules/workspaces/controllers/workspaces.controller.ts
   ```

3. Implement following existing patterns

4. Re-run `npm run endpoints:validate`

---

## Failure: "Unclassified Endpoints" (implemented but not documented)

**Error Pattern:**
```
Unclassified Endpoints (implemented but not in registry):
- GET /presence/me
- POST /search/messages
```

**This is Phase 3.5 - Retroactive Documentation**

**Fix Steps:**

1. **Create OpenAPI Contract:**
   ```bash
   # Determine the module
   grep -r "presence" src/modules/*/controllers/*.ts

   # Check if path file exists
   ls openapi/paths/presence.yaml
   ```

   If no OpenAPI file:
   - Create `openapi/paths/presence.yaml`
   - Add full endpoint definition with schema refs
   - Add `x-acceptance-criteria` and `x-business-rules`

2. **Add User Story Reference:**
   ```bash
   # Find related story
   grep -l "presence" docs/user-stories/*.md
   ```

   Add to story:
   ```markdown
   ### API Endpoints
   - `GET /presence/me` - Get current user's presence status
   ```

3. **Regenerate Registry:**
   ```bash
   npm run openapi:bundle
   npm run endpoints:validate
   ```

4. **Verify promoted:**
   - Endpoint should move from "unclassified" to "complete"

---

## Key Principle

**Phase 3.5 ensures no endpoint goes live without proper documentation.** Every implemented endpoint must have:
- OpenAPI contract
- User story reference
- Business rules (if applicable)
- UX validation spec (Phase 4)

---

## Common Endpoint Validation Troubleshooting (§7.7)

### Issue: Implemented endpoints show as "Unclassified"

**Symptoms:**
```
Unclassified Endpoints (implemented but not in registry):
- GET /presence/me
- POST /search/messages
```

**Root Causes:**

1. **Missing user story reference**
   - Endpoint not listed in any `docs/user-stories/*.md` file
   - Fix: Add to relevant story's "API Endpoints" section

2. **Path format mismatch**
   - Controller uses `:id` but OpenAPI uses `{id}`
   - Controller path doesn't match OpenAPI path exactly
   - Fix: Ensure paths match between code and spec

3. **Missing OpenAPI spec**
   - No `openapi/paths/*.yaml` file defines this endpoint
   - Fix: Create OpenAPI spec for the endpoint

**Resolution:**
```bash
# Find where endpoint is implemented
grep -r "presence/me" src/modules/*/controllers/*.ts

# Check if OpenAPI exists
cat openapi/paths/presence.yaml

# Check story references
grep -r "presence" docs/user-stories/*.md
```

---

### Issue: Controller endpoints not detected

**Symptoms:**
```
Missing Endpoints (in registry but not implemented):
- POST /workspaces/:workspaceId/invite
```

**Root Causes:**

1. **Controller decorator not recognized**
   - Missing `@Controller()` decorator on class
   - Fix: Ensure controller class has proper decorator

2. **Route decorator missing**
   - Method exists but no `@Get()`, `@Post()`, etc. decorator
   - Fix: Add appropriate HTTP method decorator

3. **Controller not registered in module**
   - Controller class not in module's `controllers` array
   - Fix: Add to module definition

**Debug Commands:**
```bash
# Find all controllers and their routes
grep -r "@Controller\|@Get\|@Post\|@Put\|@Delete\|@Patch" src/modules/*/controllers/*.ts

# Check module registration
grep -A 20 "controllers:" src/modules/*/\*.module.ts
```

---

### Issue: Path parameter mismatch

**Symptoms:**
```
Path mismatch: 
  OpenAPI: /channels/{channelId}/messages
  Code:    /channels/:id/messages
```

**Fix:**
1. OpenAPI uses `{paramName}` format
2. NestJS uses `:paramName` format
3. The endpoint validator normalizes these - but param NAMES must match
4. Change `:id` to `:channelId` to match OpenAPI `{channelId}`

---

### Debug Commands Reference

```bash
# Full endpoint validation with details
npm run endpoints:validate

# Check what's in the registry
cat architecture/ENDPOINTS.json | jq '.endpoints | length'

# Find all controller routes
grep -rn "@Controller\|@Get\|@Post" src/modules/*/controllers/*.ts | head -50

# Check OpenAPI paths defined
ls openapi/paths/*.yaml

# Validate OpenAPI syntax
npm run openapi:bundle
```
