# Business Rule Generation Guide

**Reference:** `handbook/rules/BUSINESS_RULE_AUTHORING_GUIDE.md`

## Template

```markdown
## BR-[NNN]: [Title - Declarative statement]

**Category:** [Authentication | Authorization | Data Integrity | Rate Limiting | Business Logic | Validation | Security]

**Rule:** [Clear, unambiguous statement of the rule]

**Rationale:** [Why this rule exists]

**Enforcement:**
- **Layer:** [API | Service | Database | All]
- **Mechanism:** [Guard | Validator | Constraint | Check]

**Violations:**
- **Response:** [HTTP status code and error message]
- **Logging:** [What gets logged]

**Related:**
- Stories: [US-xxx, US-yyy]
- Endpoints: `METHOD /path`
- Other Rules: [BR-zzz]

**Examples:**
- **Valid:** [Example of compliant behavior]
- **Invalid:** [Example of non-compliant behavior]
```

## Categories and ID Ranges

Business rules are categorized by type and assigned ID ranges:

| Category | ID Range | Purpose | Examples |
|----------|----------|---------|----------|
| **Authentication** | BR-1xx | Login, logout, session, tokens | Session expiry, login attempts |
| **Authorization** | BR-2xx | Permissions, roles, ownership | Workspace access, channel membership |
| **Data Integrity** | BR-3xx | Constraints, relationships, consistency | Foreign keys, unique values |
| **Rate Limiting** | BR-4xx | Throttling, quotas, limits | API rate limits, message frequency |
| **Business Logic** | BR-5xx | Domain-specific rules | Message validation, channel rules |
| **Validation** | BR-6xx | Input validation, format requirements | Email format, password strength |
| **Security** | BR-7xx | XSS, CSRF, injection prevention | Input sanitization, auth checks |

## Generation Workflow

### Step 1: Gather Context

Before creating a business rule:

```bash
# Find highest existing BR ID
grep -r "BR-[0-9]" ${config.paths.rules}*.md | grep -oE "BR-[0-9]+" | sort -u | tail -5

# Read similar rules for patterns
head -100 ${config.paths.rules}01-*.md
```

### Step 2: Determine Category

Choose the appropriate category based on the rule's purpose:
- Does it control **who can access**? → Authorization
- Does it validate **input format**? → Validation
- Does it enforce **domain logic**? → Business Logic
- Does it prevent **abuse**? → Rate Limiting or Security
- Does it maintain **data consistency**? → Data Integrity

### Step 3: Check Dependencies

Ensure:
- **Referenced US-xxx IDs exist** (or will be created)
- **Referenced endpoints exist** (or will be created in OpenAPI specs)
- **Referenced BR-xxx IDs exist** (for related rules)
- **No duplicate BR-xxx IDs**

```bash
# Verify user stories exist (using config.paths.stories)
grep "US-XXX" ${config.paths.stories}*.md

# Check for duplicate IDs (using config.paths.rules)
grep -r "BR-NNN" ${config.paths.rules}*.md
```

### Step 4: Create the Rule

Write the rule following the template exactly:
- Use **declarative titles** ("Users must be authenticated", not "Authenticate users")
- Write **clear, unambiguous rule statements**
- Explain **why** the rule exists (rationale)
- Specify **where** it's enforced (layer)
- Define **what happens** when violated (violations)
- Provide **concrete examples** (valid and invalid)

### Step 5: Cross-Link

After creating the rule:
- Add US-xxx references in the Related section
- Add endpoint references in the Related section
- Add BR-xxx references for related rules
- Ensure all referenced artifacts exist or are tracked

### Step 6: Validate

Run validation to ensure completeness:

```bash
# Check business rules coverage
${config.commands.validation.businessRules}

# Check endpoint coverage
npm run endpoints:validate
```

## File Placement

**Location:** `${config.paths.rules}` (typically `docs/business-rules/`)

**Naming Pattern:** `NN-domain-rules.md`

Examples:
- `01-authentication-rules.md`
- `02-authorization-rules.md`
- `03-data-integrity-rules.md`

Rules are grouped by category in files. Add new rules to the appropriate category file.

## Enforcement Layers

| Layer | Description | Implementation |
|-------|-------------|----------------|
| **API** | Controller/route level | Guards, interceptors, decorators |
| **Service** | Business logic layer | Service methods, validators |
| **Database** | Data layer | Constraints, triggers, checks |
| **All** | Enforced at every layer | Critical rules (auth, security) |

## Common Mistakes to Avoid

1. **Inventing BR-xxx IDs** without checking existing highest ID
2. **Referencing non-existent US-xxx IDs**
3. **Vague rule statements** ("Users should be careful")
4. **Missing rationale** (developers need to understand why)
5. **Orphaning rules** (no US links, no endpoint links)
6. **Wrong category** (auth vs. authorization confusion)

## Example: Complete Business Rule

```markdown
## BR-502: User must be channel member to send messages

**Category:** Authorization

**Rule:** Users can only send messages to channels where they have an active membership record.

**Rationale:** Prevents unauthorized users from sending messages to private channels and maintains channel privacy boundaries.

**Enforcement:**
- **Layer:** Service
- **Mechanism:** Guard in MessagesService.sendMessage()

**Violations:**
- **Response:** `403 Forbidden` with message "You are not a member of this channel"
- **Logging:** `WARN: User {userId} attempted to send message to channel {channelId} without membership`

**Related:**
- Stories: [US-401], [US-402], [US-403]
- Endpoints: `POST /chat/channels/{channelId}/messages`
- Other Rules: [BR-201], [BR-203]

**Examples:**
- **Valid:** Alice is a member of #general and sends a message
- **Invalid:** Bob is not a member of #private and attempts to send a message (403 error)
```

## Cross-References

When generating business rules, ensure they link to:
- **User Stories** (US-xxx) that implement or test the rule
- **API Endpoints** that enforce the rule
- **Other Rules** (BR-xxx) that are related or dependent
- **UX Specs** that validate the rule (added later in Phase 4)
