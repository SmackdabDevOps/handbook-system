# Documenting Unclassified Endpoints (Phase 3.5)

## When to Use

Use this guide when `npm run endpoints:validate` shows "unclassified" endpoints:

```
Endpoint Status Report:
✓ Complete: 45 endpoints
⚠ Unclassified: 3 endpoints
  - GET /presence/me
  - POST /channels/:channelId/typing
  - GET /workspaces/:workspaceId/activity
```

**Unclassified = Implemented but not documented**

This is Phase 3.5 - retroactive documentation for code-first endpoints.

---

## What "Unclassified" Means

An endpoint is "unclassified" when:
- ✓ Controller method exists
- ✓ Endpoint is functional
- ✗ No OpenAPI contract
- ✗ Not referenced in user stories
- ✗ No UX spec coverage

**Goal:** Document existing behavior without changing implementation.

---

## Documenting Workflow

### Step 1: Identify the Endpoint

Run validation to see unclassified endpoints:

```bash
npm run endpoints:validate 2>&1 | grep "unclassified"
```

Output:
```
⚠ GET /presence/me - unclassified
```

Note the method and path.

---

### Step 2: Locate the Implementation

Find the controller and understand what it does:

```bash
# Search for the route in controllers
grep -r "@Get('presence/me')" src/modules/*/controllers/*.ts
grep -r "presence" src/modules/*/controllers/*.ts

# Read the controller file
cat src/modules/presence/controllers/presence.controller.ts
```

**What to identify:**
- Controller method name
- Route parameters (path/query/body)
- Response shape
- Authentication requirements
- Error cases

---

### Step 3: Understand the Implementation

Read the controller and service to understand:

#### What does it do?
```typescript
@Get('presence/me')
async getMyPresence(@Session() session: SessionData) {
  const presence = await this.presenceService.getUserPresence(session.userId);
  return {
    data: presence,
    message: 'Presence retrieved successfully',
    responseType: 'success',
  };
}
```

**Analysis:**
- Returns current user's presence status
- Requires authentication (uses @Session)
- Returns standard envelope

#### What does it return?
```typescript
interface PresenceStatus {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  workspaceId: string;
}
```

#### What inputs does it accept?
- No request body
- No query parameters
- Path parameter: none
- Auth: Session required

---

### Step 4: Create OpenAPI Contract

Based on the actual implementation, create the contract.

#### 4.1 Create or Update Path File

Create or update `openapi/paths/[module].yaml`:

```yaml
# openapi/paths/presence.yaml

/presence/me:
  get:
    operationId: getMyPresence
    summary: Get current user's presence status
    description: |
      Returns the presence status for the authenticated user within their current workspace.

      **Business Rules:** BR-PRE-001
      **User Stories:** US-PRE-001
    tags:
      - Presence
    security:
      - cookieAuth: []
    x-acceptance-criteria:
      - AC-US-PRE-001-1
    x-business-rules:
      - BR-PRE-001
    responses:
      '200':
        description: Presence status retrieved successfully
        content:
          application/json:
            schema:
              $ref: '../schemas/presence.yaml#/PresenceResponse'
      '401':
        $ref: '../schemas/common.yaml#/UnauthorizedResponse'
```

**Tips:**
- Use actual controller method name for `operationId`
- Write description from user perspective
- List likely status codes based on implementation
- Reference appropriate security scheme

---

#### 4.2 Create Schema File

Create `openapi/schemas/[resource].yaml` if it doesn't exist:

```yaml
# openapi/schemas/presence.yaml

PresenceResponse:
  type: object
  properties:
    data:
      $ref: '#/PresenceStatus'
    message:
      type: string
      example: "Presence retrieved successfully"
    responseType:
      type: string
      enum: [success, error, warning, info]
      example: success

PresenceStatus:
  type: object
  required:
    - userId
    - status
    - workspaceId
  properties:
    userId:
      type: string
      format: uuid
      description: User's UUID v7 identifier
    status:
      type: string
      enum: [online, away, busy, offline]
      description: Current presence status
    lastSeen:
      type: string
      format: date-time
      description: Timestamp of last activity
    workspaceId:
      type: string
      format: uuid
      description: Workspace context for presence
```

**Match the actual response shape** from the implementation.

---

### Step 5: Bundle and Validate OpenAPI

```bash
npm run openapi:bundle
```

Fix any schema errors or broken references.

---

### Step 6: Find or Create User Story

Determine which story justifies this endpoint:

```bash
# Search for related stories
grep -r "presence" docs/user-stories/*.md
```

#### If story exists:
Add endpoint reference:

```markdown
## US-PRE-001: View Presence Status

### Description
Users can see their current presence status and the presence of other users.

### API Endpoints
- `GET /presence/me` - Get current user's presence status
- `GET /presence/:userId` - Get another user's presence status
```

#### If no story exists:
Create a minimal story using the `artifact-generator` skill:

```markdown
## US-PRE-001: View Presence Status

**As a** user
**I want to** see my current presence status
**So that** I can verify my availability is shown correctly

### Acceptance Criteria
- AC-US-PRE-001-1: User can retrieve their own presence status
- AC-US-PRE-001-2: Status is one of: online, away, busy, offline
- AC-US-PRE-001-3: Last seen timestamp is included

### API Endpoints
- `GET /presence/me` - Get current user's presence status

### Business Rules
- BR-PRE-001: Presence Status Rules
```

---

### Step 7: Find or Create Business Rules

Check if rules already exist:

```bash
grep -r "presence" docs/business-rules/*.md
```

#### If rules exist:
Add endpoint reference:

```markdown
## BR-PRE-001: Presence Status Rules

### Affected Endpoints
- `GET /presence/me`
- `POST /presence/status`

### Rules
1. Presence status must be one of: online, away, busy, offline
2. Status automatically changes to 'away' after 5 minutes of inactivity
3. Status changes to 'offline' when user disconnects
```

#### If no rules exist:
Create minimal rules:

```markdown
## BR-PRE-001: Presence Status Rules

### Affected Endpoints
- `GET /presence/me`

### Rules
1. Users can only retrieve their own presence status
2. Presence status must be within current workspace context
3. Authentication is required
```

---

### Step 8: Validate Documentation

```bash
# Validate endpoint registry
npm run endpoints:validate

# Validate documentation matrix
npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts
```

The endpoint should now move from "unclassified" to "complete":

```
Endpoint Status Report:
✓ Complete: 46 endpoints (+1)
⚠ Unclassified: 2 endpoints (-1)
```

---

### Step 9: Create UX Spec Scenario

Add a test scenario to appropriate spec file in `docs/test-plans/validation-specs/`:

```markdown
### Step N: Get Own Presence Status

**Actor:** Alice
**Action:** Retrieves her current presence status

**API Workflow:**
- **Endpoint**: `GET /presence/me`
- **Expectations**:
  - Status: `200 OK`
  - Response shape:
    ```json
    {
      "data": {
        "userId": "<alice-uuid>",
        "status": "online",
        "lastSeen": "<iso-8601>",
        "workspaceId": "<workspace-uuid>"
      },
      "message": "Presence retrieved successfully",
      "responseType": "success"
    }
    ```
  - Response validation:
    - `data.userId` matches authenticated user's ID
    - `data.status` is one of: online, away, busy, offline
    - `data.lastSeen` is valid ISO-8601 timestamp
    - `data.workspaceId` matches current workspace
```

---

### Step 10: Final Validation

Run the complete validation chain:

```bash
# Check story coverage
npx ts-node scripts/check-story-coverage.ts

# Validate specs against contracts
npx ts-node docs/test-plans/scripts/validate-ux-specs-against-contracts.ts
```

All validations must pass.

---

## Batch Documentation

If multiple unclassified endpoints exist, document them systematically:

### Step 1: List All Unclassified

```bash
npm run endpoints:validate 2>&1 | grep "unclassified" > unclassified-endpoints.txt
cat unclassified-endpoints.txt
```

### Step 2: Group by Module

Organize by feature area:
- Presence: 3 endpoints
- Notifications: 2 endpoints
- Activity: 1 endpoint

### Step 3: Document Module by Module

For each module:
1. Create OpenAPI path file (if needed)
2. Create schema file (if needed)
3. Find/create user story
4. Find/create business rules
5. Validate
6. Create UX specs

**Avoid mixing modules** in a single documentation pass.

---

## Documentation Checklist

- [ ] Identified unclassified endpoint from validation
- [ ] Located controller implementation
- [ ] Read and understood service logic
- [ ] Documented actual input requirements
- [ ] Documented actual response shape
- [ ] Created OpenAPI path definition
- [ ] Created or updated schema file
- [ ] `npm run openapi:bundle` passes
- [ ] Found or created user story
- [ ] Added endpoint reference to story
- [ ] Found or created business rules
- [ ] Added endpoint reference to rules
- [ ] `npm run endpoints:validate` shows endpoint as "complete"
- [ ] `validate-documentation-matrix.ts` passes
- [ ] Created UX spec scenario
- [ ] `check-story-coverage.ts` passes
- [ ] `validate-ux-specs-against-contracts.ts` passes

---

## Common Issues

### "Can't find the controller"
```bash
# Broader search
grep -r "presence" src/modules/
# Or search by route segment
grep -r "me" src/modules/*/controllers/*.ts
```

### "Response shape unclear"
- Read the service method
- Check the model definition
- Look at existing tests
- Run the endpoint manually and inspect response

### "Multiple stories could fit"
- Choose the most specific story
- If truly ambiguous, create new story
- Link related stories with "See also" section

### "Endpoint not showing as complete after documentation"
- Check for typos in endpoint path
- Verify OpenAPI operationId matches pattern
- Ensure story/rules reference exact path
- Re-run `openapi:bundle` first

### "Specs fail with 'endpoint not found'"
- Check path format in spec (`:param` vs `{param}`)
- Ensure `openapi:bundle` was run
- Verify path matches OpenAPI exactly

---

## Best Practices

### Be Accurate
- Document actual behavior, not ideal behavior
- Match exact response shape from implementation
- Include all error cases that exist in code

### Be Complete
- Don't skip optional fields
- Document all query parameters
- List all possible response codes

### Be Consistent
- Follow existing OpenAPI patterns
- Use same terminology as other docs
- Match existing story/rule formats

### Don't Change Code
- Phase 3.5 is documentation-only
- If code needs changes, file separate task
- Focus on capturing current state

---

## See Also

- [Adding Endpoints](adding-endpoints.md) - For new endpoints (contract-first)
- [Modifying Endpoints](modifying-endpoints.md) - For changes to existing endpoints
- [Common Patterns](common-patterns.md) - Reusable patterns
- `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` - Section 5.3.5: Phase 3.5
- `artifact-generator` skill - Create missing stories/rules
