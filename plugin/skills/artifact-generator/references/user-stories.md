# User Story Generation Guide

**Reference:** `handbook/stories/USER_STORY_AUTHORING_GUIDE.md`

## Template

```markdown
## US-[NNN]: [Title - Action-oriented, user perspective]

**As a** [role],
**I want to** [action],
**So that** [benefit].

### Acceptance Criteria

- [ ] **[AC-US-NNN-1]** [Criterion 1 - testable, specific]
- [ ] **[AC-US-NNN-2]** [Criterion 2]
- [ ] **[AC-US-NNN-3]** [Criterion 3]

### Business Rules

- [BR-XXX] - [Rule title]
- [BR-YYY] - [Rule title]

### API Endpoints

- `POST /path/to/endpoint` - [Description]
- `GET /path/to/endpoint` - [Description]

### Notes

[Optional: Edge cases, dependencies, future considerations]
```

## ID Assignment Rules

1. **Read existing stories** to find the highest US-xxx number
2. **Assign next sequential number** (never skip)
3. **Use 3-digit format** (US-101, US-102, etc.)
4. **Group by domain** (convention, not strict rule):
   - 100s = Authentication
   - 200s = Workspace management
   - 300s = Channels
   - 400s = Messaging
   - 500s = Collaboration
   - 600s = Search
   - 700s = Advanced features
   - 800s = Admin

## Generation Workflow

### Step 1: Gather Context

Before creating a user story:

```bash
# Find highest existing US ID (using config.paths.stories)
grep -r "US-[0-9]" ${config.paths.stories}*.md | grep -oE "US-[0-9]+" | sort -u | tail -5

# Read similar stories for patterns
head -100 ${config.paths.stories}01-*.md
```

### Step 2: Check Dependencies

Ensure:
- **Referenced BR-xxx IDs exist** (or will be created)
- **Referenced endpoints exist** (or will be created in OpenAPI specs)
- **No duplicate US-xxx IDs**

```bash
# Verify business rules exist (using config.paths.rules)
grep "BR-XXX" ${config.paths.rules}*.md

# Check for duplicate IDs (using config.paths.stories)
grep -r "US-NNN" ${config.paths.stories}*.md
```

### Step 3: Create the Story

Write the story following the template exactly:
- Use **action-oriented titles** ("Send a message", not "Message sending")
- Write from **user perspective** ("As a team member")
- Make acceptance criteria **testable and specific**
- Include **all relevant BR references**
- List **all API endpoints** this story touches

### Step 4: Cross-Link

After creating the story:
- Add BR-xxx references in the Business Rules section
- Add endpoint references in the API Endpoints section
- Ensure all referenced artifacts exist or are tracked

### Step 5: Validate

Run validation to ensure completeness:

```bash
# Check business rules coverage (using config commands)
${config.commands.validation.businessRules}

# Check endpoint coverage
${config.commands.endpoints.validate}
```

## File Placement

**Location:** `${config.paths.stories}` (typically `docs/user-stories/`)

**Naming Pattern:** `NN-domain-stories.md`

Examples:
- `01-authentication-stories.md`
- `02-workspace-stories.md`
- `03-channel-stories.md`

Stories are grouped by domain in files. Add new stories to the appropriate domain file.

## Common Mistakes to Avoid

1. **Inventing US-xxx IDs** without checking existing highest ID
2. **Referencing non-existent BR-xxx IDs**
3. **Vague acceptance criteria** ("User can send messages")
4. **Missing endpoint references**
5. **Orphaning stories** (no BR links, no endpoint links)
6. **Technical jargon in story text** (write for users, not developers)

## Example: Complete User Story

```markdown
## US-401: Send a text message in a channel

**As a** team member,
**I want to** send text messages in a channel,
**So that** I can communicate with my team.

### Acceptance Criteria

- [ ] **[AC-US-401-1]** Message appears in channel immediately after sending
- [ ] **[AC-US-401-2]** Message includes sender name, timestamp, and content
- [ ] **[AC-US-401-3]** Message is persisted and visible after page refresh
- [ ] **[AC-US-401-4]** User receives confirmation when message is sent
- [ ] **[AC-US-401-5]** Message length is limited to 10,000 characters

### Business Rules

- [BR-501] - Messages must have non-empty content
- [BR-502] - User must be channel member to send messages
- [BR-503] - Message length limits apply

### API Endpoints

- `POST /chat/channels/{channelId}/messages` - Send message
- `GET /chat/channels/{channelId}/messages` - Retrieve messages

### Notes

Future considerations:
- Rich text formatting
- @mentions and reactions
- File attachments
```

## Cross-References

When generating user stories, ensure they link to:
- **Business Rules** (BR-xxx) that constrain the story
- **API Endpoints** that implement the story
- **UX Specs** that validate the story (added later in Phase 4)
