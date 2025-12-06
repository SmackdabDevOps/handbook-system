# Phase 1 Remediation: Stories & Rules Coverage

**Validation Script:** `check-business-rules-coverage.ts`

This phase validates the relationship between User Stories and Business Rules.

---

## Failure: "User Stories missing Business Rules"

**Error Pattern:**
```
Stories missing Business Rules:
- US-101: User Registration
- US-102: User Login
```

**Root Cause:** Story doesn't reference any BR-xxx IDs

**Fix Steps:**

1. Open the story file:
   ```bash
   grep -l "US-101" docs/user-stories/*.md
   ```

2. Read the story to understand what rules apply:
   ```bash
   grep -A 30 "US-101" docs/user-stories/*.md
   ```

3. Identify applicable rules:
   - Authentication stories → BR-1xx
   - Authorization stories → BR-2xx
   - Data integrity stories → BR-3xx

4. Either link existing rules:
   ```markdown
   ### Business Rules
   - [BR-101] - Password complexity requirements
   - [BR-102] - Session management
   ```

5. Or create new rules if none exist:
   - Use `artifact-generator` skill
   - Place in appropriate `docs/business-rules/*.md` file

6. Re-run validation:
   ```bash
   npx ts-node docs/test-plans/scripts/check-business-rules-coverage.ts
   ```

---

## Failure: "Business Rules not referenced"

**Error Pattern:**
```
Business Rules not referenced by any User Story:
- BR-105: Rate limiting for API calls
- BR-106: Session timeout policy
```

**Root Cause:** Rule exists but no story uses it

**Fix Steps:**

1. Determine if rule is needed:
   - Read the rule: `grep -A 20 "BR-105" docs/business-rules/*.md`
   - If obsolete → delete the rule
   - If needed → find or create a story that uses it

2. Link rule to appropriate story:
   - Find related stories by domain
   - Add BR-xxx reference to story's Business Rules section

3. Re-run validation

---

## Failure: "Undefined Business Rules"

**Error Pattern:**
```
Undefined Business Rules referenced:
- BR-999 referenced in US-101
- BR-888 referenced in US-102
```

**Root Cause:** Story references a rule ID that doesn't exist

**Fix Steps:**

1. Check for typo:
   ```bash
   grep "BR-" docs/business-rules/*.md | grep -oE "BR-[0-9]+" | sort -u
   ```

2. If typo → fix the reference in the story

3. If rule should exist → create it using `artifact-generator` skill

4. Re-run validation
