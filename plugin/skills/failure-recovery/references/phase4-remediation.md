# Phase 4 Remediation: UX Validation Specs

**Validation Script:** `check-story-coverage.ts`

This phase validates that user stories are covered by executable UX validation specs.

---

## Failure: "Missing Stories in Specs"

**Error Pattern:**
```
Stories not covered by any UX Spec:
- US-301: Create Channel
- US-302: Invite to Channel
```

**Root Cause:** Story exists but no spec exercises it

**Fix Steps:**

1. Find appropriate spec file:
   ```bash
   ls docs/test-plans/validation-specs/*.md
   # Channel stories → 03-channel-operations.md
   ```

2. Add story to `## Covered Stories`:
   ```markdown
   ## Covered Stories
   - [US-301] Create Channel
   - [US-302] Invite to Channel
   ```

3. Write at least one scenario exercising the story's endpoints

4. Re-run `npx ts-node scripts/check-story-coverage.ts`

---

## Failure: "Endpoint not found in registry"

**Error Pattern:**
```
Spec validation failed:
- 03-channel-operations.md Step 5: POST /channels/:id/members
  NOT FOUND in ENDPOINTS.json
```

**Root Cause:** Spec uses wrong path format or endpoint doesn't exist

**Fix Steps:**

1. Check for path format mismatch:
   ```bash
   npm run show:endpoint -- 'POST /channels/:id/members'
   # vs
   npm run show:endpoint -- 'POST /channels/:channelId/members'
   ```

2. Fix the spec to match registry exactly

3. Re-run validation

---

## Failure: "Unknown fields in spec body"

**Error Pattern:**
```
Spec validation failed:
- 03-channel-operations.md Step 3: Field 'channelName' not in DTO
  DTO has: name, description, type
```

**Root Cause:** Spec uses wrong field names

**Fix Steps:**

1. Read the actual DTO:
   ```bash
   grep -A 30 "CreateChannelDto" src/modules/channels/dto/*.ts
   ```

2. Update spec to use correct field names:
   ```json
   {
     "name": "General",        // NOT "channelName"
     "description": "General discussion"
   }
   ```

3. Re-run validation

---

## Key Principle

**Specs must match actual contracts.** If validation fails, fix the spec to match the DTO/OpenAPI contract, not the other way around (unless the contract itself is wrong).

---

## Failure: "Endpoints not covered by specs" (GATE)

**Error Pattern:**
```
Endpoint coverage: 85/100 (85%)
Missing endpoints:
- GET /presence/me
- POST /translation/preview
- DELETE /messages/:messageId/reactions/:reactionId
```

**Root Cause:** Endpoints exist in registry but no UX spec exercises them

**⚠️ THIS IS A GATE** - Phase 4 cannot complete until 100% endpoint coverage

### Fix Steps

1. **Identify which spec should cover each endpoint:**
   ```bash
   # Check endpoint's module
   grep -r "presence" src/modules/*/controllers/*.ts
   # → src/modules/presence/controllers/presence.controller.ts
   
   # Find corresponding spec file
   ls docs/test-plans/validation-specs/ | grep presence
   ```

2. **If spec exists, add missing endpoint scenario:**
   - Open the spec file
   - Add a new Experience/Step that exercises the endpoint
   - Include realistic test data
   - Capture any returned IDs for later steps

3. **If no spec exists for this module, create one:**
   ```markdown
   # User Journey [N]: [Module Name]

   > **Status**: Planning
   > **Script**: `scripts/validation/validate-[module]-full.ts`

   ## Covered Stories
   - [US-xxx] [Story that uses this endpoint]

   ## Participants
   - **Alice** - [Role]

   ## Experience 1: [Scenario Name]

   ### Step 1: [Action]
   **Actor:** Alice
   **Action:** [Description]

   **API Workflow:**
   - **Endpoint**: `GET /presence/me`
   - **Headers**: `Cookie: session={{aliceSession}}`
   - **Expectations**:
     - Status: `200 OK`
   ```

4. **Re-run endpoint coverage:**
   ```bash
   npx ts-node scripts/check-endpoint-coverage.ts
   ```

5. **Repeat until 100%:**
   - Coverage must reach 100% before proceeding to Phase 5
   - No exceptions - every public endpoint needs spec coverage

### Grouping Strategy

When many endpoints are missing, group by module:

| Module | Missing Endpoints | Spec File |
|--------|-------------------|-----------|
| presence | GET /presence/me, PUT /presence/status | validation-specs/XX-presence.md |
| translation | POST /preview, POST /apply | validation-specs/XX-translation.md |
| reactions | POST, DELETE /reactions | Add to 04-chat-core-messaging.md |

### Common Mistakes

- ❌ Creating empty placeholder specs (no actual scenarios)
- ❌ Skipping edge cases (only happy path)
- ❌ Not linking to user stories
- ✅ Every endpoint needs at least one full scenario
- ✅ Include error cases where behavior matters
