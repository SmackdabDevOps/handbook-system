---
description: Check the cross-reference matrix (stories ↔ rules ↔ endpoints ↔ specs)
---

# Cross-Reference Matrix Check

Verify the integrity of cross-references across all playbook artifacts.

## Instructions

### Step 0: Load Configuration

```bash
CONFIG_FILE=$(find . -maxdepth 2 -name "handbook.config.json" -type f | head -1)
if [ -z "$CONFIG_FILE" ]; then
  echo "❌ No handbook.config.json found. Run: npx @smackdab/handbook-init"
  exit 1
fi
CONFIG=$(cat "$CONFIG_FILE")

# Extract paths
STORIES_PATH=$(echo "$CONFIG" | jq -r '.paths.stories // "docs/user-stories/"')
RULES_PATH=$(echo "$CONFIG" | jq -r '.paths.rules // "docs/business-rules/"')
SPECS_PATH=$(echo "$CONFIG" | jq -r '.paths.specs // "docs/test-plans/validation-specs/"')
OPENAPI_PATH=$(echo "$CONFIG" | jq -r '.paths.openapi // "openapi/"')
ENDPOINTS_JSON=$(echo "$CONFIG" | jq -r '.paths.endpointsJson // "architecture/ENDPOINTS.json"')
```

### Step 1: Run Cross-Reference Validations

Run all cross-reference validations and report the matrix status:

### 1. Stories ↔ Rules

```bash
npx ts-node "${SPECS_PATH}../scripts/check-business-rules-coverage.ts"
```

**Checks:**
- Every US-xxx in `${STORIES_PATH}` references at least one BR-xxx
- Every BR-xxx in `${RULES_PATH}` is referenced by at least one US-xxx
- No undefined BR-xxx references

### 2. Stories/Rules ↔ Endpoints

```bash
npx ts-node "${SPECS_PATH}../scripts/validate-documentation-matrix.ts"
```

**Checks:**
- Every endpoint in `${ENDPOINTS_JSON}` has at least one story reference
- Every endpoint has at least one rule reference
- No undefined endpoint references in stories/rules

### 3. Endpoints ↔ Code

```bash
ENDPOINTS_CMD=$(echo "$CONFIG" | jq -r '.commands["endpoints:validate"] // "npm run endpoints:validate"')
eval "$ENDPOINTS_CMD"
```

**Checks:**
- Every registered endpoint in `${ENDPOINTS_JSON}` has controller implementation
- Every implemented endpoint is in registry
- No orphan implementations

### 4. Stories ↔ Specs

```bash
npx ts-node scripts/check-story-coverage.ts
```

**Checks:**
- Every US-xxx in `${STORIES_PATH}` appears in at least one spec in `${SPECS_PATH}`
- No undefined story references in specs

### 5. Specs ↔ Contracts

```bash
npx ts-node "${SPECS_PATH}../scripts/validate-ux-specs-against-contracts.ts"
```

**Checks:**
- Every endpoint in specs exists in registry
- Every body field in specs exists in DTOs (from `${config.paths.dtos}` pattern)

## Output Format

```markdown
## Cross-Reference Matrix Status

**Checked:** [timestamp]

### Matrix Health

```
Stories ←→ Rules     : [✅ ALIGNED / ❌ DRIFT]
Stories ←→ Endpoints : [✅ ALIGNED / ❌ DRIFT]
Rules ←→ Endpoints   : [✅ ALIGNED / ❌ DRIFT]
Endpoints ←→ Code    : [✅ ALIGNED / ❌ DRIFT]
Stories ←→ Specs     : [✅ ALIGNED / ❌ DRIFT]
Specs ←→ Contracts   : [✅ ALIGNED / ❌ DRIFT]
```

### Detailed Results

| Check | Script | Result | Issues |
|-------|--------|--------|--------|
| Stories↔Rules | check-business-rules-coverage | PASS/FAIL | [count] |
| Docs↔Endpoints | validate-documentation-matrix | PASS/FAIL | [count] |
| Endpoints↔Code | endpoints:validate | PASS/FAIL | [count] |
| Stories↔Specs | check-story-coverage | PASS/FAIL | [count] |
| Specs↔Contracts | validate-ux-specs-against-contracts | PASS/FAIL | [count] |

### Issues Detail

[List each issue with artifact type and suggested fix]

### Integrity Score

**[X]/6** checks passing
**Matrix integrity:** [STRONG / WEAK / BROKEN]
```

## On Drift

If any check shows drift:
1. Identify the upstream artifact (usually stories or contracts)
2. Trace the reference chain to find the break
3. Suggest specific fix using `failure-recovery` skill patterns
