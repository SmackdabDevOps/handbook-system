# Business Rule Authoring Guide

This guide defines how Business Rules must be written and maintained in projects that use this handbook. It turns scattered constraints into a reusable, traceable rule set that supports contracts, code, and tests.

---

## 1. Purpose of Business Rules

Business Rules describe the **laws of the system**:

- Security and permission models (who can do what).  
- Cross‑cutting constraints (quotas, limits, expirations).  
- Behavioral guarantees (how channels, messages, workspaces, files behave).  
- Compliance or policy requirements that must hold across features.

They are:

- **Global and reusable** – shared across multiple stories and endpoints.  
- **Traceable** – referenced by story IDs, contracts, and validation scripts.  
- **Stable** – they change only when the underlying business decision changes.

---

## 2. Location, Naming, and Categories

- **Location:** `docs/business-rules/*.md`  
- **ID format:** `BR-<number>` where the number encodes the category.

Recommended numbering scheme:

- `BR-1xx` – Authentication & session rules  
- `BR-2xx` – Workspace & organization rules  
- `BR-3xx` – Channel rules  
- `BR-4xx` – Messaging rules  
- `BR-5xx` – File management rules  
- `BR-6xx` – Permission / RBAC rules  
- `BR-7xx` – Feature‑specific rules (translation, forking, multi‑view, etc.)

Each category lives in its own file (for example, `01-authentication-rules.md`, `02-workspace-rules.md`).

---

## 3. Required Business Rule Structure

Every rule **must** use this pattern inside its category file:

```markdown
## BR-XXX: [Rule Title]

**Description**: Clear statement of the rule.

**Rationale**:
- Why this rule exists
- What risk or requirement it addresses

**Applies To**:
- Features, endpoints, or components this rule governs

**Constraints**:
- Specific constraint 1
- Specific constraint 2

**Examples**:
- ✅ Valid: [example]
- ❌ Invalid: [example]

**Related Rules**: BR-YYY, BR-ZZZ

**Implementation Notes**:
```typescript
// Optional, language-agnostic pseudocode or real code examples
```
```

Rules may include more detail, but this structure is the baseline.

---

## 4. When to Create or Update a Business Rule

Only create or modify a numeric `BR-xxx` rule when:

- The behavior is **reused** across multiple stories, endpoints, or services, or  
- The behavior is **critical** to:
  - Security (auth, permissions, access control).  
  - Compliance (retention, auditing, privacy).  
  - System‑wide guarantees (quotas, limits, presence, translation, multi‑view constraints).

Do **not** create numeric rules for every minor detail. Unique, one‑off behavior should live in Acceptance Criteria of the relevant story.

When a new cross‑cutting requirement emerges:

1. Add or update the Business Rule in the appropriate file.  
2. Link it from:
   - The user stories that depend on it.  
   - The endpoints in `ENDPOINTS.json` or OpenAPI (`businessRules` field).  
3. Ensure tests and UX specs exercise the rule (directly or indirectly).

---

## 5. Authoring Rules for Project Managers and Agents

When creating or editing a Business Rule:

1. **Start from stories and architecture, not from code.**
   - Identify which stories and flows need a shared law.  
   - Confirm the architecture supports the behavior.

2. **Write the rule in plain language.**
   - Describe what must be true and why.  
   - Keep technical details in “Implementation Notes”.

3. **Be explicit about scope.**
   - Use “Applies To” to list endpoints, components, or contexts.  
   - If the rule only applies in certain environments (e.g., dev vs prod), state that.

4. **Capture constraints and edge cases.**
   - Enumerate limits, timeouts, permission checks, error conditions.  
   - Include concrete valid/invalid examples so agents cannot misinterpret the rule.

5. **Link to and from other artifacts.**
   - Stories: add `BR-xxx` under `**Business Rules**` in user stories that rely on this behavior.  
   - Contracts: ensure endpoints that implement the rule refer to it in `ENDPOINTS.json`.  
   - Tests/specs: make sure there is a path for the rule to be validated (via existing or new specs).

6. **Avoid duplication.**
   - If an existing rule already covers the behavior, reference it instead of creating a new one.  
   - If rules overlap, refactor them into a single, clearer rule plus supporting notes.

---

## 6. Relationship to Stories, Contracts, and Validation

- **Stories ↔ Rules**  
  - Stories reference `BR-xxx` when they depend on shared laws.  
  - Rules reference `US-xxx` (where appropriate) to show which stories they support.

- **Contracts ↔ Rules**  
  - Endpoints in `ENDPOINTS.json` list `businessRules: ["BR-xxx", ...]`.  
  - This connects HTTP/WS contracts back to the global laws they implement.

- **Validation Scripts ↔ Rules**  
  - Matrix scripts (for example, `check-business-rules-coverage.ts`) ensure:
    - Every referenced rule is defined.  
    - No global rule is left completely unused without explicit reason.

Following this guide ensures Business Rules remain a small, high‑value set of global laws: understandable by non‑developers and enforceable by contracts, code, and tests.

