# Phase 2 Remediation: Contracts & Registry Coverage

**Validation Scripts:**
- `validate-documentation-matrix.ts`
- `npm run endpoints:validate`

This phase validates that endpoints are properly documented in stories and rules.

---

## Failure: "Endpoints NOT covered by User Story"

**Error Pattern:**
```
Endpoints NOT covered by any User Story:
- POST /channels/:channelId/messages
- GET /users/:userId/preferences
```

**Root Cause:** Endpoint exists but no story references it

**Fix Steps:**

1. Find or create the appropriate story:
   ```bash
   # Search for related stories
   grep -l "channel" docs/user-stories/*.md
   grep -l "message" docs/user-stories/*.md
   ```

2. Add endpoint to story's API Endpoints section:
   ```markdown
   ### API Endpoints
   - `POST /channels/:channelId/messages` - Send a message to channel
   ```

3. If internal/infra endpoint, mark in ENDPOINTS.json:
   ```json
   {
     "path": "/health",
     "internal": true,
     "description": "Health check endpoint"
   }
   ```

4. Re-run validation

---

## Failure: "Endpoints NOT covered by Business Rule"

**Error Pattern:**
```
Endpoints NOT covered by any Business Rule:
- DELETE /messages/:messageId
- PUT /channels/:channelId/archive
```

**Fix Steps:**

1. Identify what rules should govern this endpoint:
   - DELETE operations → typically need authorization rules
   - PUT operations → typically need validation rules

2. Either link existing rules or create new ones

3. Add to rule's "Related Endpoints" section

4. Re-run validation

---

## Failure: "Undefined Endpoints"

**Error Pattern:**
```
Undefined Endpoints referenced in User Stories/Business Rules:
- POST /auth/magic-link (referenced in US-105)
- GET /analytics/dashboard (referenced in BR-301)
```

**Root Cause:** Docs reference an endpoint that doesn't exist

**Fix Steps:**

1. Check for typo:
   ```bash
   npm run show:endpoint -- 'POST /auth/magic-link'
   ```

2. If typo → fix the reference

3. If endpoint should exist:
   - Add to OpenAPI: `openapi/paths/auth.yaml`
   - Implement in controller
   - Run `npm run endpoints:validate`

4. Re-run documentation matrix
