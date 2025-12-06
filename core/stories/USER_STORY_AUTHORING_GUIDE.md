# User Story Authoring Guide

This guide defines how user stories must be written in projects that use this handbook. It is designed so that project managers and agents can follow it mechanically without improvising formats or structure.

---

## 1. Purpose of User Stories

User stories describe product behavior from the end‑user’s point of view. They are used to:

- Capture **why** a feature exists and **who** it serves.  
- Provide **Acceptance Criteria** that define “done” for that story.  
- Drive API contracts, UX specs, and automated tests.  
- Anchor Business Rules when behavior is reusable or global.

Stories are not implementation notes; they are user‑facing requirements.

---

## 2. Location and Naming

- **Location:** `docs/user-stories/*.md`  
- **ID format:** `US-<number>` where the number encodes the feature area.

Recommended numbering scheme:

- `US-1xx` – Authentication & session management  
- `US-2xx` – Workspace / organization  
- `US-3xx` – Channels / rooms / spaces  
- `US-4xx` – Messaging & threads  
- `US-5xx` – Files & attachments  
- `US-6xx` – Search / notifications / collaboration  
- `US-7xx` – Advanced features (translation, forking, multi‑view, etc.)  
- `US-8xx` – Admin & analytics  
- `US-9xx` – User profile & settings  
- `US-10xx` – Direct messaging  
- `US-11xx` – Multi‑view / layouts and similar meta‑features

Projects may extend this pattern, but IDs **must** remain stable once used.

---

## 3. Required Story Structure

Every story **must** use this structure, including explicit IDs for each Acceptance Criterion:

```markdown
## US-XXX: [Story Title]

**As a** [user role]  
**I want** [goal/desire]  
**So that** [business value or outcome]

**User Journey**: "[Short narrative from the user’s perspective]"

**Acceptance Criteria**:
- **AC-US-XXX-1 [API]** – Criterion 1 (API-visible behavior)
- **AC-US-XXX-2 [API]** – Criterion 2
- **AC-US-XXX-3 [UI]** – Criterion 3 (purely UI/UX behavior)

**Business Rules**: BR-XXX, BR-YYY (optional, when global rules apply)

**API Endpoints**:           (optional until contracts exist)
- `METHOD /path`

**Priority**: Critical | High | Medium | Low  
**Status**: ✅ Implemented | 🚧 In Progress | 📋 Planned | ❌ Blocked

**Related Stories**: US-YYY, US-ZZZ
```

### 3.1 Acceptance Criteria – Non‑Negotiable

Acceptance Criteria are the **authoritative checklist** for the story. They:

- Must be written as clear, testable bullets, each with a stable ID:  
  - Format: `AC-US-<story number>-<index>` (for example, `AC-US-101-1`).  
  - The ID is what contracts/specs/scripts use; the text stays human‑readable.
- Must cover:
  - Happy path (success behavior).  
  - Key error paths (invalid input, permission errors).  
  - Edge conditions (limits, timeouts, visibility).  
- Drive UX validation specs and automated tests directly.

#### 3.1.1 Acceptance Criteria Types

To support automated coverage:

- Each AC ID may include a tag in square brackets:
  - `[API]` – Must be validated via contracts + UX specs (API-visible behavior).  
  - `[UI]`, `[UX]`, `[NON-API]` – Validated by other means (design review, UI tests, performance tests), not required to map to an endpoint.
- The coverage scripts treat `[API]` ACs as **mandatory** for endpoint/spec coverage.

If Acceptance Criteria are weak or missing, the story is not ready for implementation.

### 3.2 Business Rules in Stories

The `**Business Rules**` line is:

- **Optional per story**, but **mandatory** when the story depends on **reusable, system‑wide laws** such as:
  - Authentication and session behavior.  
  - Role/permission constraints.  
  - Expiration policies, quotas, or rate limits.  
  - Cross‑feature behaviors (presence, translation, forking, multi‑view limits).
- Uses numeric IDs (`BR-xxx`) that are defined in `docs/business-rules/*.md`.

Local, one‑off behavior can live purely in Acceptance Criteria. Shared behavior must be captured as Business Rules.

---

## 4. Authoring Rules for Project Managers and Agents

When creating or editing a user story:

1. **Start with the user and outcome.**
   - Never write “As a developer / as the system”.
   - Focus on who benefits and what changes for them.

2. **Write Acceptance Criteria before implementation.**
   - Treat them as the contract for this story.  
   - Ensure you can imagine concrete tests for each bullet.

3. **Only reference Business Rules when needed.**
   - If the behavior will be reused across stories or services, add a `BR-xxx` and link it.  
   - If the behavior is unique to this story, keep it in Acceptance Criteria.

4. **Do not invent endpoints in stories.**
   - Only add `**API Endpoints**` after contracts are defined in the endpoint registry/OpenAPI (see the contracts phase).  
   - Endpoints listed in stories must match the canonical contracts exactly.

5. **Keep stories stable.**
   - Once a story is in use, avoid renumbering or major reframing.  
   - If behavior changes significantly, create a new story and close or supersede the old one.

---

## 5. Relationship to Other Artifacts

- **Stories → Business Rules**  
  - Stories reference `BR-xxx` when they rely on shared laws.  
  - Business Rules are defined once and reused.

- **Stories → Contracts**  
  - Stories describe intent and Acceptance Criteria; contracts express the HTTP/WS boundary that satisfies them.

- **Stories → UX Specs**  
  - UX validation specs (`docs/test-plans/validation-specs/*.md`) enumerate API flows that prove Acceptance Criteria via real calls.

Following this guide ensures that stories are consistent, testable, and ready to support the rest of the playbook (rules, contracts, specs, and validators).
