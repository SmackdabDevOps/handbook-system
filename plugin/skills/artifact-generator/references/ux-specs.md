# UX Validation Spec Generation Guide

**Reference:** `handbook/SPEC_RULEBOOK.md`

## Template

```markdown
# User Journey [N]: [Title]

> **Status**: [Planning | Verified | Failing]
> **Script**: `${config.paths.validators}validate-[name]-full.ts`

## Covered Stories

- [US-xxx] [Story title]
- [US-yyy] [Story title]

## Overview

[Brief description of the user journey being validated]

## Participants

- **Alice** - [Role, e.g., Workspace Owner]
- **Bob** - [Role, e.g., Team Member]

## Preconditions

- [What must exist before this journey starts]
- [Database state, existing users, etc.]

---

## Experience 1: [Scenario Name]

### Step 1: [Action Description]

**Actor:** Alice
**Action:** [What the user does in UI terms]

**API Workflow:**

- **Endpoint**: `POST /path/to/endpoint`
- **Headers**:
  - `Cookie: session={{aliceSession}}`
- **Body**:
  ```json
  {
    "field1": "value1",
    "field2": "value2"
  }
  ```
- **Expectations**:
  - Status: `201 Created`
  - Response: `data.id` is a UUID v7
  - Response: `data.field1` equals `"value1"`
- **Capture**:
  - `{{resourceId}}` = `data.id`

### Step 2: [Next Action]

[Continue pattern...]

---

## Experience 2: [Error Scenario]

### Step 1: [Attempt Invalid Action]

**Actor:** Bob
**Action:** [What the user attempts]

**API Workflow:**

- **Endpoint**: `POST /path/to/endpoint`
- **Body**:
  ```json
  {
    "invalid": "data"
  }
  ```
- **Expectations**:
  - Status: `400 Bad Request`
  - Response: `message` contains "validation"

---

## Validation Rules Applied

- [BR-xxx] - [How this rule is exercised]
- [BR-yyy] - [How this rule is exercised]
```

## Generation Workflow

### Step 1: Identify Stories to Cover

Determine which user stories this spec will validate:

```bash
# Find stories needing coverage
${config.commands.validation.storyCoverage}
```

Look for stories that:
- Belong to the same user journey
- Share common preconditions
- Test related functionality

### Step 2: Design User Journey

Create a narrative flow:
- **Who are the actors?** (Alice, Bob, etc.)
- **What roles do they have?** (Owner, Member, Guest)
- **What is the happy path?** (primary success scenario)
- **What are the error paths?** (validation failures, auth failures)

### Step 3: Define Preconditions

List what must exist before the journey starts:
- User accounts (Alice, Bob)
- Workspaces, channels, messages
- Authentication sessions
- Any required state

### Step 4: Map API Workflow

For each user action, define:
- **Actor** - Who performs the action
- **Action** - What they do (in UI terms)
- **Endpoint** - Which API endpoint is called
- **Headers** - Session cookies, auth tokens
- **Body** - Request payload
- **Expectations** - Status code, response shape, field values
- **Capture** - Variables to extract for later steps

### Step 5: Add Error Scenarios

Include negative test cases:
- Missing required fields (400)
- Unauthorized access (401)
- Forbidden actions (403)
- Resource not found (404)
- Validation failures (400)

### Step 6: Link Business Rules

In the "Validation Rules Applied" section:
- List all BR-xxx IDs exercised in this spec
- Explain how each rule is tested

### Step 7: Create Validator Script

Create the corresponding TypeScript validator:

**Location:** `${config.paths.validators}validate-[name]-full.ts`

**Pattern:**
```typescript
import { describe, test, expect } from '@jest/globals';
import { ApiClient } from './helpers/api-client';

describe('User Journey: [Name]', () => {
  let alice: ApiClient;
  let bob: ApiClient;

  beforeAll(async () => {
    // Setup preconditions
  });

  test('Experience 1: [Scenario]', async () => {
    // Implement workflow
  });

  test('Experience 2: [Error Scenario]', async () => {
    // Implement error test
  });
});
```

### Step 8: Validate

Run the validator script:

```bash
# Run the validator
npx ts-node scripts/validation/validate-[name]-full.ts

# Check coverage
${config.commands.validation.storyCoverage}
```

## File Placement

**Specs:** `${config.paths.specs}` (typically `docs/test-plans/validation-specs/`)
**Scripts:** `${config.paths.validators}` (typically `scripts/validation/`)

**Naming Pattern:** `NN-journey-name.md`

Examples:
- `01-authentication.md` → `validate-authentication-full.ts`
- `03-channel-operations.md` → `validate-channel-operations-full.ts`

## API Workflow Structure

Each workflow step follows this pattern:

```markdown
### Step N: [Action Description]

**Actor:** [Who]
**Action:** [What in UI terms]

**API Workflow:**

- **Endpoint**: `METHOD /path`
- **Headers**: (if needed)
  - `Cookie: session={{varName}}`
  - `X-Custom-Header: value`
- **Body**: (for POST/PUT/PATCH)
  ```json
  {
    "field": "value"
  }
  ```
- **Expectations**:
  - Status: `XXX Status Name`
  - Response: `path.to.field` meets condition
  - Response: `another.field` equals `value`
- **Capture**: (if needed)
  - `{{varName}}` = `response.path.to.value`
```

## Variable Capture and Reuse

Variables captured in earlier steps can be used in later steps:

```markdown
### Step 1: Create Workspace

- **Capture**:
  - `{{workspaceId}}` = `data.id`

### Step 2: Create Channel

- **Endpoint**: `POST /chat/workspaces/{{workspaceId}}/channels`
```

## Common Expectations

| Expectation | Meaning |
|-------------|---------|
| Status: `201 Created` | Resource created successfully |
| Status: `200 OK` | Request succeeded |
| Status: `204 No Content` | Deletion succeeded |
| Status: `400 Bad Request` | Validation error |
| Status: `401 Unauthorized` | Not authenticated |
| Status: `403 Forbidden` | Not authorized |
| Status: `404 Not Found` | Resource doesn't exist |
| Response: `data.id` is a UUID v7 | ID field is valid UUID |
| Response: `data.name` equals `"Test"` | Field matches expected value |
| Response: `message` contains "success" | Message includes substring |

## Common Mistakes to Avoid

1. **Not linking to user stories** in Covered Stories section
2. **Vague action descriptions** (be specific about what user does)
3. **Missing error scenarios** (always include negative tests)
4. **Not capturing variables** for multi-step workflows
5. **Wrong endpoint paths** (must match OpenAPI specs exactly)
6. **Missing field expectations** (validate all critical fields)
7. **Not creating validator script** (spec without script is not runnable)

## Example: Complete UX Spec

```markdown
# User Journey 3: Channel Operations

> **Status**: Verified
> **Script**: `scripts/validation/validate-channel-operations-full.ts`

## Covered Stories

- [US-301] Create a channel
- [US-302] Invite member to channel
- [US-303] List channel members

## Overview

This journey validates the complete workflow of creating a channel, inviting members, and viewing the member list.

## Participants

- **Alice** - Workspace Owner
- **Bob** - Team Member (to be invited)

## Preconditions

- Alice has an account and is authenticated
- Bob has an account and is authenticated
- Alice owns a workspace
- Both users are workspace members

---

## Experience 1: Happy Path - Channel Creation and Invitation

### Step 1: Alice creates a channel

**Actor:** Alice
**Action:** Creates a new channel named "project-alpha" in her workspace

**API Workflow:**

- **Endpoint**: `POST /chat/workspaces/{{workspaceId}}/channels`
- **Headers**:
  - `Cookie: session={{aliceSession}}`
- **Body**:
  ```json
  {
    "name": "project-alpha",
    "description": "Project Alpha Discussion",
    "isPrivate": true
  }
  ```
- **Expectations**:
  - Status: `201 Created`
  - Response: `data.id` is a UUID v7
  - Response: `data.name` equals `"project-alpha"`
  - Response: `data.isPrivate` equals `true`
  - Response: `message` contains "created"
- **Capture**:
  - `{{channelId}}` = `data.id`

### Step 2: Alice invites Bob to the channel

**Actor:** Alice
**Action:** Invites Bob to join the channel

**API Workflow:**

- **Endpoint**: `POST /chat/channels/{{channelId}}/members`
- **Headers**:
  - `Cookie: session={{aliceSession}}`
- **Body**:
  ```json
  {
    "userId": "{{bobUserId}}"
  }
  ```
- **Expectations**:
  - Status: `201 Created`
  - Response: `data.userId` equals `"{{bobUserId}}"`
  - Response: `data.channelId` equals `"{{channelId}}"`

### Step 3: Bob sees the channel in his list

**Actor:** Bob
**Action:** Fetches his channel list

**API Workflow:**

- **Endpoint**: `GET /chat/workspaces/{{workspaceId}}/channels`
- **Headers**:
  - `Cookie: session={{bobSession}}`
- **Expectations**:
  - Status: `200 OK`
  - Response: `data` includes channel with id `{{channelId}}`

---

## Experience 2: Error Path - Unauthorized Invitation

### Step 1: Bob attempts to invite someone (fails)

**Actor:** Bob
**Action:** Tries to invite another user (but lacks permission)

**API Workflow:**

- **Endpoint**: `POST /chat/channels/{{channelId}}/members`
- **Headers**:
  - `Cookie: session={{bobSession}}`
- **Body**:
  ```json
  {
    "userId": "{{someUserId}}"
  }
  ```
- **Expectations**:
  - Status: `403 Forbidden`
  - Response: `message` contains "permission"

---

## Validation Rules Applied

- [BR-301] - Channel names must be unique within workspace (tested in creation)
- [BR-302] - Only workspace admins can create channels (tested implicitly)
- [BR-303] - Only channel owners can invite members (tested in error path)
```

## Cross-References

When generating UX specs, ensure they link to:
- **User Stories** (US-xxx) in Covered Stories section
- **Business Rules** (BR-xxx) in Validation Rules Applied section
- **OpenAPI Endpoints** (exact paths) in API Workflow sections
- **Validator Scripts** (must exist and match the spec)

---

## Creating Validator Scripts

When creating the validator script (`${config.paths.validators}validate-*-full.ts`) for a UX spec:

### Follow Testing Standards

**IMPORTANT:** Reference `handbook/testing/TESTING_STANDARDS.md` for all script implementation.

**Required patterns:**

1. **Test data through factories**
   ```typescript
   // ✅ Correct - use factory
   const user = await UserFactory.create({ role: 'admin' });
   
   // ❌ Wrong - inline data
   const user = { id: 'fake-id', name: 'Test' };
   ```

2. **Transaction isolation**
   ```typescript
   // Option A: Transaction rollback
   beforeEach(async () => {
     await sequelize.transaction(async (t) => {
       // test runs here
       throw new Error('rollback'); // always rollback
     });
   });
   
   // Option B: Truncation
   afterEach(async () => {
     await sequelize.truncate({ cascade: true });
   });
   ```

3. **Test independence**
   - Each test must be completely independent
   - No shared state between tests
   - No reliance on test execution order
   - Each test sets up its own preconditions

4. **Real API calls**
   - Validators call actual API endpoints
   - No mocking of the application under test
   - Use test database with real data

### Script Structure

```typescript
import { TestContext } from '../test-utils';
import { UserFactory, WorkspaceFactory } from '../../test/factories';

describe('User Journey X: [Name]', () => {
  let ctx: TestContext;
  
  beforeAll(async () => {
    ctx = await TestContext.create();
  });
  
  afterAll(async () => {
    await ctx.cleanup();
  });
  
  describe('Experience 1: [Name]', () => {
    it('Step 1: [Action]', async () => {
      // Setup via factories
      const alice = await UserFactory.create();
      
      // API call
      const response = await ctx.api.post('/endpoint').send(body);
      
      // Assertions from spec expectations
      expect(response.status).toBe(201);
      expect(response.body.data.id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });
});
```
