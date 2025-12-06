---
description: Add or document an API endpoint following contract-first approach
args: "<method> <path> [--document]"
---

# Add Endpoint

Add a new endpoint or document an existing unclassified endpoint.

## Arguments

- `<method>` - HTTP method (GET, POST, PUT, PATCH, DELETE)
- `<path>` - API path (e.g., /users/:userId/profile)
- `--document` - Flag to indicate this is documenting an existing implemented endpoint

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
OPENAPI_PATH=$(echo "$CONFIG" | jq -r '.paths.openapi // "openapi/"')
STORIES_PATH=$(echo "$CONFIG" | jq -r '.paths.stories // "docs/user-stories/"')
SPECS_PATH=$(echo "$CONFIG" | jq -r '.paths.specs // "docs/test-plans/validation-specs/"')
CONTROLLERS_GLOB=$(echo "$CONFIG" | jq -r '.paths.controllers // "src/modules/*/controllers/*.controller.ts"')
DTOS_GLOB=$(echo "$CONFIG" | jq -r '.paths.dtos // "src/modules/*/dto/*.dto.ts"')
```

This command triggers the `endpoint-evolution` skill.

### Mode 1: New Endpoint (Default)

Contract-first approach for completely new endpoints.

**Order:** Story → OpenAPI → DTO → Controller → Spec

```bash
# Check if story exists for this endpoint
grep -r "$METHOD $PATH" "$STORIES_PATH"*.md

# If no story, STOP - create story first
```

**Steps:**

1. **Verify Story Reference**
   - Find the user story in `${STORIES_PATH}` that justifies this endpoint
   - If none exists, create one first

2. **Create OpenAPI Contract**
   - Create/update `${OPENAPI_PATH}paths/[module].yaml`
   - Create/update `${OPENAPI_PATH}schemas/[resource].yaml`
   - Run `${config.commands['openapi:bundle']}`

3. **Create DTO**
   - Create DTO matching `${DTOS_GLOB}` pattern
   - Example: `src/modules/[module]/dto/[action]-[resource].dto.ts`
   - Fields must match OpenAPI schema exactly

4. **Create Controller Method**
   - Add method to appropriate controller (matching `${CONTROLLERS_GLOB}` pattern)
   - Use DTO for request body
   - Return response matching schema

5. **Update Story**
   - Add endpoint to `### API Endpoints` section in story file

6. **Update UX Spec**
   - Add scenario using this endpoint in `${SPECS_PATH}`

7. **Validate**
   ```bash
   ENDPOINTS_CMD=$(echo "$CONFIG" | jq -r '.commands["endpoints:validate"] // "npm run endpoints:validate"')
   eval "$ENDPOINTS_CMD"

   npx ts-node "${SPECS_PATH}../scripts/validate-documentation-matrix.ts"
   npx ts-node scripts/check-story-coverage.ts
   ```

### Mode 2: Document Existing (--document flag)

For Phase 3.5 retroactive documentation of unclassified endpoints.

**Order:** Read Code → OpenAPI → Story → Validate

```bash
# Find the implementation using configured controller pattern
grep -r "$PATH" $CONTROLLERS_GLOB
```

**Steps:**

1. **Read Implementation**
   - Find controller method matching `${CONTROLLERS_GLOB}` pattern
   - Understand what it does
   - Note request/response shapes from DTOs

2. **Create OpenAPI Contract**
   - Based on actual implementation
   - Create in `${OPENAPI_PATH}paths/[module].yaml`
   - Match field names exactly from DTOs

3. **Add Story Reference**
   - Find appropriate story in `${STORIES_PATH}`
   - Add endpoint to `### API Endpoints`

4. **Validate**
   ```bash
   BUNDLE_CMD=$(echo "$CONFIG" | jq -r '.commands["openapi:bundle"] // "npm run openapi:bundle"')
   ENDPOINTS_CMD=$(echo "$CONFIG" | jq -r '.commands["endpoints:validate"] // "npm run endpoints:validate"')

   eval "$BUNDLE_CMD"
   eval "$ENDPOINTS_CMD"
   ```
   - Endpoint should move from "unclassified" to "complete"

## Output

```markdown
## Endpoint Added: [METHOD] [PATH]

### Contract
- OpenAPI: `${config.paths.openapi}paths/[module].yaml`
- Schema: `${config.paths.openapi}schemas/[resource].yaml`

### Implementation
- Controller: (matches pattern: `${config.paths.controllers}`)
- DTO: (matches pattern: `${config.paths.dtos}`)

### Documentation
- Story: US-xxx in `${config.paths.stories}XX-domain.md`
- Spec: Scenario in `${config.paths.specs}XX-journey.md`

### Validation
- [x] ${config.commands['openapi:bundle']} passes
- [x] ${config.commands['endpoints:validate']} passes
- [x] validate-documentation-matrix passes
- [x] Endpoint status: complete
```

## Common Issues

### Path Parameter Format

Ensure consistency:
- OpenAPI: `/users/{userId}`
- Controller: `@Get(':userId')`
- Story/Spec: `/users/:userId`

All normalize to `:param` for matching.

### Field Name Mismatch

If validation shows unknown fields:
1. Check DTO for exact field names
2. Update spec to match DTO
3. Or update DTO if spec is correct and contract changes

### Endpoint Still Unclassified

If endpoint stays unclassified after documentation:
1. Check path format matches exactly
2. Verify story uses backtick format: `` `GET /path` ``
3. Run validation with verbose output
