# UX Validation Spec Authoring Rulebook

> **Purpose:** This rulebook tells agents exactly how to write and edit
> `docs/test-plans/validation-specs/*.md` so specs always match
> **User Stories, Business Rules, and real backend contracts**.
>
> No creativity here. Specs are *not* wishlists. They are
> executable descriptions of how the backend really works.

---

## Definition of "Documented" Status

An endpoint is considered **documented** when BOTH conditions are met:

1. **OpenAPI contract exists** in `openapi/paths/*.yaml` with full request/response schema
2. **User story reference exists** in `docs/user-stories/*.md` with backtick-formatted endpoint

| OpenAPI | User Story | Status |
|---------|------------|--------|
| ✅ Yes | ✅ Yes | **Documented** (complete if also implemented) |
| ✅ Yes | ❌ No | Undocumented (contract exists, no business justification) |
| ❌ No | ✅ Yes | Undocumented (referenced but not defined) |
| ❌ No | ❌ No | Unclassified (implemented without any docs) |

**Why both are required:**
- **OpenAPI** defines the contract shape (fields, types, status codes)
- **User story** provides business justification and acceptance criteria

The `endpoints:validate` script determines documentation status by scanning user story
markdown files for backtick-formatted endpoint references like `` `GET /presence/me` ``.
It matches normalized paths (`:param` format) between stories, OpenAPI, and controllers.

**To document an unclassified endpoint:**
1. Create/update OpenAPI spec: `openapi/paths/{module}.yaml`
2. Add to user story: `- \`METHOD /path\`` under **API Endpoints** section
3. Run `npm run endpoints:validate` to promote to "complete"

---

## 0. Inputs You MUST Use (Aligned With Standard Stack)

When you write or edit a UX validation spec, you MUST read from all
of these, in this order. Do **not** substitute other sources.

1. **User Stories** (`docs/user-stories/*.md`)  
   - Find all `US-xxx` IDs this spec will cover.  
   - Read the **API Endpoints** section, if present.

2. **Business Rules** (`docs/business-rules/*.md`)  
   - Find all `BR-xxx` referenced by those stories.  
   - Understand which rules constrain the behavior.

3. **Endpoint Contracts**

   You must follow the project’s detected stack profile from `SYSTEM_DELIVERY_PLAYBOOK.md`:

   - **Integrated Nx Backend (default for Smackdab CRM‑style projects):**
     - Root OpenAPI spec: `openapi-spec.yaml` at the workspace root (when present).  
     - Per‑app specs: `apps/<app>/src/swagger/*.yaml` or the bundled JSON they generate.  
     - Do **not** invent additional contract files; use these.

   - **Single‑Service Backend (only when `architecture/ENDPOINTS.json` exists and there is no Nx workspace):**
     - OpenAPI files under `openapi/` and/or `openapi/generated/`.  
     - Treat `architecture/ENDPOINTS.json` / `.md` strictly as generated views. They are derived from the contracts and controllers and must never be treated as the source of truth.

   In all cases:
   - Confirm the endpoint exists (method + canonical path) in OpenAPI/DTOs **before** looking at the registry.  
   - Only after confirming the contract may you peek at the registry to see status/AC metadata.  
   - Use the helper script `npm run show:endpoint -- '<METHOD> /path'` (lives under `handbook/scripts/`) whenever you need to cross-check the canonical definition.

4. **Backend Code (DTOs + Controllers/Handlers)**  
   - Open the controller/handler and DTO or validation schema for each endpoint:
     - In an Nx backend: under `apps/<app>/src/modules/*` (and/or shared `packages/*`).  
     - In a single‑service backend: under `src/modules/*` or the documented controller path.  
   - Copy exact field names and types from DTOs/validation schemas.  
   - Confirm status codes and response structure from controllers/handlers.

You are **not allowed** to use any other source for
endpoint shapes or field names.

---

## 1. File Naming and Scope

- Each spec file in this folder represents **one major User Journey**
  (e.g., Auth, Onboarding, Channel Operations).
- Do **not** mix unrelated domains in one file.
- Use the existing naming pattern:
  - `01-authentication.md`
  - `02-onboarding-workspaces.md`
  - `03-channel-operations.md`
  - ...

If you need a new journey:
- Use the next available number and a clear name.

---

## 2. Required Sections in Every Spec

Each spec **MUST** contain these sections:

1. Title and Script reference
   ```markdown
   # User Journey N: [Title]

   > **Status**: [📝 Planning | 🧪 Verified | ❌ Failing]
   > **Script**: `scripts/validation/validate-[short-name]-full.ts`
   ```

2. **Covered Stories**
   ```markdown
   ## Covered Stories
   - [US-101]
   - [US-102]
   - [US-103]
   ```

3. Overview / Participants / Preconditions
   - Short human summary.
   - Who the actors are (Alice, Bob, Charlie).
   - What must exist before the flow starts
     (e.g., workspace created, users registered).

4. Experience Workflow sections
   - One section per scenario (e.g., "New user signup", "Logout").
   - Each scenario broken into steps with:
     - Actor
     - Action (UI view)
     - API Workflow (endpoint, body, expectations).

---

## 3. How to Define Steps (STRICT Rules)

For **every step** you write in a spec, follow this checklist:

### 3.1 Endpoint Line

- Format:
  ```markdown
  - **Endpoint**: `METHOD /path`
  ```
- METHOD must be one of: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- `/path` MUST exist in the OpenAPI contracts for the active stack profile. The registry is a generated mirror and cannot be used to invent or rename paths.

**How to verify:**

- Run `npm run show:endpoint -- 'METHOD /path'` first; it dumps the canonical contract block (OpenAPI opId, schema file, controller path).  
- In an Integrated Nx Backend:
  - Search `openapi-spec.yaml` and/or `apps/<app>/src/swagger/*.yaml` (or their bundled JSON equivalents) for that method and path.  
- In a Single‑Service Backend:
  - Search the OpenAPI file(s) under `openapi/` (and only then consult the generated registry for metadata).

If you cannot find the endpoint in any canonical contract file for the active profile:

- You are **not** allowed to use it in the spec.  
- Either:
  - Add the endpoint to the contracts and code first (following the manual’s contract‑change rules), **or**  
  - Do not mention it.

### 3.2 Request Body

- If the endpoint has a body, you **must**:
  - Open the DTO or validation schema for that endpoint in the project’s code (for example `src/modules/.../dto/*.ts`).
  - Copy field names exactly from the DTO.
- In the spec step, include a complete JSON example:

```markdown
- **Body**:
  ```json
  {
    "email": "alice@example.com",
    "password": "Password123!",
    "name": "Alice Owner",
    "organization_name": "Main Org"
  }
  ```
```

**Forbidden:**
- Adding new fields that do not exist in the DTO.
- Renaming fields (e.g., using `organizationName` when the DTO has `organization_name`).

### 3.3 Headers

- Only use headers that the controllers actually read
  (e.g., `Cookie: X-Session={{session}}`, `Authorization: Bearer ...`).
- Confirm usage by inspecting the controller.

### 3.4 Expectations

- **Status code:** must match `@ApiResponse` or actual controller behavior.
- **Response structure:** base it on:
  - DTOs used for responses.
  - Example in controller’s `@ApiResponse` if present.

Example:
```markdown
- **Expectations**:
  - Status: `201 Created`
  - Response: `data.user.id` is a UUID, `data.workspace.id` is a UUID.
```

**Do not** invent fields in responses either. If you want a field,
ensure it exists in the response type or contract and in code.

**Identifier format – UUID v7 only**

- When you show IDs in specs (request bodies, responses, or path parameters), you must:
  - Use **lowercase UUID v7** values as examples (for example `"019358f4-6c6c-7e2e-9a3a-3c5d3f84a0b1"`).  
  - Ensure that any contract or DTO field described as an ID is treated as a UUID v7 throughout
    the system (contracts, DB schema, code, and specs).
- Do **not** introduce other ID styles (numeric IDs, random strings, UUID v4) for new entities in
  specs. If you see legacy formats, keep them only where they already exist and do not extend them
  to new flows.

### 3.5 Preflight checklist (run before editing any spec)

Every spec edit must start with this sequence:

1. `git status` → ensure you understand existing changes (don’t stack edits blindly).
2. `npm run show:endpoint -- 'METHOD /path'` for every endpoint you plan to touch.
3. Open the corresponding controller/DTO to confirm fields and status codes.
4. Only after Steps 2–3 may you edit the spec file.
5. When finished, rerun `npm run openapi:bundle` (if contracts changed) followed by
   `npx ts-node docs/test-plans/scripts/validate-ux-specs-against-contracts.ts`.

Skipping the checklist is a protocol violation.

---

## 4. Allowed vs Forbidden Actions (Spec Authors)

### 4.1 You MAY

- Add a new UX step **only if** the endpoint and fields exist in:
  - `ENDPOINTS.json` **and**
  - Relevant DTOs/controllers.
- Refine expectations to match what the backend actually returns
  (after verifying in code and real responses).
- Split large journeys into multiple coherent scenarios.

### 4.2 You MUST

- Update `## Covered Stories` whenever you add/remove stories.
- Re-run:
  - `npx ts-node scripts/check-story-coverage.ts`
  - `npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts`
- Fix any reported issues before considering the spec “ready”.

### 4.3 You MUST NOT

- Add endpoints that do not exist in `ENDPOINTS.json`.
- Add body fields not present in DTOs.
- Change field names to match your preference.
- Describe behavior that the backend does not implement
  **without** marking it clearly as "Future" and updating
  contracts + code accordingly.

If you absolutely must describe a future endpoint or field:
- Prefix the scenario or step with `**[FUTURE]**` and ensure
  it is not wired into validators until the backend supports it.

---

## 5. After Editing a Spec – Mandatory Checks

Every time you change a spec file in this folder, you MUST:

1. **Run story coverage**
   ```bash
   npx ts-node scripts/check-story-coverage.ts
   ```
2. **Run documentation matrix**
   ```bash
   npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts
   ```
3. **(When validators exist) Run the corresponding validation script**
   ```bash
   npx ts-node scripts/validation/validate-[short-name]-full.ts
   ```

If *any* of these fail:
- Do **not** “fix” by loosening the spec.
- Instead:
  - Align stories/rules/contracts/specs so they all say the same thing.
  - Then re-run.

---

## 6. Relationship to Validation Scripts

Validation scripts are downstream of specs:

- Specs describe **what** to call and expect.
- Scripts implement those steps **exactly**, with logging.

**Spec authors MUST NOT:**
- Change specs to match a broken validator.

**Validator authors MUST NOT:**
- Change scripts to send different payloads than the spec.

If backend behavior and spec disagree:
- That is a contract failure.
- Fix the backend and/or contracts, then reconcile specs and scripts.

**Script Implementation Standards:**

When implementing validation scripts (or any test code), authors MUST follow:
- `handbook/testing/TESTING_STANDARDS.md` for test data factories and database isolation.
- All test data must be created through factories, not inline.
- All database operations must use transaction rollback or truncation for isolation.

---

## 7. Quick Checklist for Writing a Spec Step

For each new step you write:

1. Find the story ID(s) this step serves (US-xxx).
2. Find the related rules (BR-xxx).
3. Find the endpoint in the canonical contracts (registry and/or OpenAPI) with the correct METHOD + path.
4. Open the controller + DTO/validation schema for that endpoint.
5. Copy field names from DTO/validation schema **exactly**.
6. Write the **Endpoint**, **Body**, **Headers**, **Expectations**.
7. Add any captured variables (`{{workspaceId}}`, `{{channelId}}`).
8. Re-run the required scripts (coverage + matrix + validator).

If any of these steps fail, stop and fix the upstream artifact
(story, rule, contract, or code) rather than guessing.
