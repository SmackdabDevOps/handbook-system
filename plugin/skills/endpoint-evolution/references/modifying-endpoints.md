# Modifying Existing Endpoints

## When to Use

Use this guide when adding fields, changing behavior, or updating responses for an existing endpoint.

---

## Types of Modifications

### Additive Changes (Safe)
- Adding optional fields to request
- Adding fields to response
- Adding new optional query parameters
- Expanding enum values

**Impact:** Usually backward compatible

### Breaking Changes (Requires Deprecation)
- Removing fields from request/response
- Changing field types (string → number)
- Making optional fields required
- Changing validation rules (stricter)
- Renaming fields

**Impact:** Requires deprecation cycle (see [Deprecating Endpoints](deprecating-endpoints.md))

### Behavioral Changes
- Changing business logic
- Modifying authorization rules
- Altering side effects
- Changing error conditions

**Impact:** May require spec updates and communication

---

## Modification Workflow

### Step 1: Identify Impact

Before making any changes, understand what depends on this endpoint:

```bash
# What stories reference this endpoint?
grep -r "POST /existing/endpoint" docs/user-stories/*.md

# What specs use this endpoint?
grep -r "POST /existing/endpoint" docs/test-plans/validation-specs/*.md

# What rules govern this endpoint?
grep -r "POST /existing/endpoint" docs/business-rules/*.md

# What tests cover this endpoint?
grep -r "/existing/endpoint" test/**/*.spec.ts
```

**Document findings** before proceeding.

---

### Step 2: Update OpenAPI Contract First

Always update the contract before code.

#### 2.1 Update Path Definition

Modify `openapi/paths/[module].yaml`:

```yaml
/existing/endpoint:
  post:
    # ... existing spec ...
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '../schemas/thing.yaml#/UpdatedRequest'
    responses:
      '200':
        content:
          application/json:
            schema:
              $ref: '../schemas/thing.yaml#/UpdatedResponse'
```

#### 2.2 Update Schema Definition

Modify `openapi/schemas/[resource].yaml`:

**Adding optional field:**
```yaml
UpdatedRequest:
  type: object
  required:
    - name  # Existing required field
  properties:
    name:
      type: string
    newOptionalField:  # New addition
      type: string
      maxLength: 100
      description: New optional field added in v1.2
```

**Adding response field:**
```yaml
UpdatedResponse:
  type: object
  properties:
    data:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        newComputedField:  # New addition
          type: number
          description: Computed value added in v1.2
```

---

### Step 3: Bundle and Validate OpenAPI

```bash
npm run openapi:bundle
```

Fix any schema errors before proceeding.

---

### Step 4: Update DTO

Modify the DTO to match the updated schema.

**Adding optional field:**
```typescript
// src/modules/[module]/dto/update-thing.dto.ts

import { IsString, MaxLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateThingDto {
  @ApiProperty({ description: 'Name', example: 'Thing Name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'New optional field added in v1.2',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  newOptionalField?: string;  // New addition
}
```

**Critical:** DTO changes must match OpenAPI schema exactly.

---

### Step 5: Update Controller/Service

Implement the new behavior.

**Controller changes:**
```typescript
// src/modules/[module]/controllers/[module].controller.ts

@Post('existing/endpoint')
async updateThing(
  @Body() dto: UpdateThingDto,  // Updated DTO
  @Session() session: SessionData,
): Promise<UpdateThingResponse> {
  const result = await this.service.updateThing(dto, session.userId);
  return {
    data: {
      ...result,
      newComputedField: this.service.computeValue(result),  // New field
    },
    message: 'Thing updated successfully',
    responseType: 'success',
  };
}
```

**Service changes:**
```typescript
// src/modules/[module]/services/[module].service.ts

async updateThing(dto: UpdateThingDto, userId: string) {
  const thing = await this.findThing(userId);

  // Update existing fields
  thing.name = dto.name;

  // Handle new optional field
  if (dto.newOptionalField) {
    thing.metadata = { ...thing.metadata, newField: dto.newOptionalField };
  }

  await thing.save();
  return thing;
}

computeValue(thing: Thing): number {
  // New computation logic
  return thing.someValue * 2;
}
```

---

### Step 6: Update Documentation

#### 6.1 Update User Story (if needed)

If behavior changed significantly, update the story description:

```markdown
## US-xxx: Update Thing

### Description
Users can update a thing's properties, including the new optional field.

### API Endpoints
- `POST /existing/endpoint` - Update a thing (supports newOptionalField as of v1.2)
```

#### 6.2 Update Business Rules (if needed)

If business logic changed:

```markdown
## BR-xxx: Thing Update Rules

### Rule
- Name is required
- newOptionalField is optional but must be under 100 chars if provided
```

---

### Step 7: Update UX Specs

Modify test scenarios to reflect the changes.

**Update existing scenario:**
```markdown
### Step N: Update Thing

**Actor:** Alice
**Action:** Updates a thing with new optional field

**API Workflow:**
- **Endpoint**: `POST /existing/endpoint`
- **Body**:
  ```json
  {
    "name": "Updated Name",
    "newOptionalField": "New value"
  }
  ```
- **Expectations**:
  - Status: `200 OK`
  - Response shape:
    ```json
    {
      "data": {
        "id": "<uuid-v7>",
        "name": "Updated Name",
        "newComputedField": 42,
        "updatedAt": "<iso-8601>"
      },
      "message": "Thing updated successfully",
      "responseType": "success"
    }
    ```
  - Response validation:
    - `data.name` matches request
    - `data.newComputedField` is a number
    - `data.updatedAt` is updated
```

**Add new scenario for the new field:**
```markdown
### Step N+1: Update Thing Without Optional Field

**Actor:** Alice
**Action:** Updates a thing without providing optional field (backward compatibility)

**API Workflow:**
- **Endpoint**: `POST /existing/endpoint`
- **Body**:
  ```json
  {
    "name": "Updated Name"
  }
  ```
- **Expectations**:
  - Status: `200 OK`
  - Behavior unchanged from previous version
```

---

### Step 8: Validate Changes

Run the full validation chain:

```bash
# Validate endpoint registry
npm run endpoints:validate

# Validate documentation matrix
npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts

# Check story coverage
npx ts-node scripts/check-story-coverage.ts

# Validate specs against contracts
npx ts-node docs/test-plans/scripts/validate-ux-specs-against-contracts.ts
```

All validations must pass.

---

### Step 9: Run Tests

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run contract tests
npm run test:contract
```

**Add new tests** for the modified behavior:

```typescript
// test/e2e/thing.e2e-spec.ts

describe('POST /existing/endpoint', () => {
  it('should accept new optional field', async () => {
    const response = await request(app.getHttpServer())
      .post('/existing/endpoint')
      .send({
        name: 'Test',
        newOptionalField: 'New value',
      })
      .expect(200);

    expect(response.body.data.newComputedField).toBeDefined();
  });

  it('should work without new optional field (backward compat)', async () => {
    const response = await request(app.getHttpServer())
      .post('/existing/endpoint')
      .send({ name: 'Test' })
      .expect(200);

    expect(response.body.data.name).toBe('Test');
  });
});
```

---

## Breaking Change Workflow

If your change is **breaking** (removes fields, changes types, etc.):

1. **DO NOT** modify the existing endpoint
2. **CREATE** a new endpoint with a version suffix or new path
3. **DEPRECATE** the old endpoint (see [Deprecating Endpoints](deprecating-endpoints.md))
4. **DOCUMENT** the migration path in both endpoints

Example:
```yaml
# Old endpoint (deprecated)
/things/{id}:
  get:
    deprecated: true
    summary: "[DEPRECATED] Get thing - use GET /v2/things/{id}"

# New endpoint (current)
/v2/things/{id}:
  get:
    summary: Get thing (v2 - includes new fields)"
```

---

## Modification Checklist

- [ ] Impact analysis completed (stories, specs, rules, tests)
- [ ] Determined change type (additive/breaking/behavioral)
- [ ] OpenAPI contract updated
- [ ] Schema updated
- [ ] `npm run openapi:bundle` passes
- [ ] DTO updated to match schema
- [ ] Controller/service logic implemented
- [ ] Response envelope maintained
- [ ] User story updated (if needed)
- [ ] Business rules updated (if needed)
- [ ] UX specs updated with new scenarios
- [ ] Backward compatibility tested
- [ ] All validation scripts pass
- [ ] Tests updated and passing
- [ ] Migration plan documented (if breaking)

---

## Common Issues

### "DTO validation failed after update"
- Ensure new validators match OpenAPI constraints
- Check that optional fields use `@IsOptional()` decorator

### "Spec validation failed with unknown fields"
- Update spec request bodies to match new schema
- Add new response fields to expectations

### "Backward compatibility broken"
- Verify optional fields have defaults or are truly optional
- Check existing tests still pass

### "Breaking change detected"
- Stop modification workflow
- Use deprecation workflow instead
- Create new versioned endpoint

---

## See Also

- [Adding Endpoints](adding-endpoints.md) - For creating new endpoints
- [Deprecating Endpoints](deprecating-endpoints.md) - For breaking changes
- [Common Patterns](common-patterns.md) - Reusable patterns
- `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` - Complete delivery workflow
