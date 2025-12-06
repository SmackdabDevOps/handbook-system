# Adding New Endpoints

## When to Use

Use this guide when creating a completely new API endpoint that doesn't exist yet.

---

## Contract-First Workflow

**Required Order:**
```
1. Story/Rules → 2. OpenAPI → 3. DTO → 4. Controller → 5. Spec → 6. Validator
```

---

## Step 1: Verify Story Exists

Before creating any endpoint, verify a user story justifies it:

```bash
# Check if a story references this endpoint
grep -r "POST /new/endpoint" ${config.paths.stories}*.md

# If not found, STOP and create story first using artifact-generator skill
```

**Critical:** No endpoint without a story. No story without business rules.

---

## Step 2: Create OpenAPI Contract

### 2.1 Check Existing Patterns

```bash
# Review similar modules for patterns
ls ${config.paths.openapiPaths}
head -50 ${config.paths.openapiPaths}[similar-module].yaml
```

### 2.2 Create Path Definition

Create or update `${config.paths.openapiPaths}[module].yaml`:

```yaml
/new/endpoint:
  post:
    operationId: createNewThing
    summary: Create a new thing
    description: |
      Creates a new thing with validation and authorization.

      **Business Rules:** BR-xxx
      **User Stories:** US-xxx
    tags:
      - ModuleName
    security:
      - cookieAuth: []
    x-acceptance-criteria:
      - AC-US-xxx-1
    x-business-rules:
      - BR-xxx
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '../schemas/thing.yaml#/CreateThingRequest'
    responses:
      '201':
        description: Thing created successfully
        content:
          application/json:
            schema:
              $ref: '../schemas/thing.yaml#/CreateThingResponse'
      '400':
        $ref: '../schemas/common.yaml#/BadRequestResponse'
      '401':
        $ref: '../schemas/common.yaml#/UnauthorizedResponse'
      '403':
        $ref: '../schemas/common.yaml#/ForbiddenResponse'
```

### 2.3 Create Schema Definition

Create or update `${config.paths.openapiSchemas}[resource].yaml`:

```yaml
CreateThingRequest:
  type: object
  required:
    - name
  properties:
    name:
      type: string
      minLength: 1
      maxLength: 255
      description: Human-readable name for the thing
    description:
      type: string
      maxLength: 1000
      description: Optional description

CreateThingResponse:
  type: object
  properties:
    data:
      $ref: '#/Thing'
    message:
      type: string
      example: "Thing created successfully"
    responseType:
      type: string
      enum: [success, error, warning, info]
      example: success

Thing:
  type: object
  properties:
    id:
      type: string
      format: uuid
      description: UUID v7 identifier
    name:
      type: string
    description:
      type: string
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

---

## Step 3: Bundle and Validate OpenAPI

```bash
npm run openapi:bundle
```

If errors occur, fix schema references and try again.

---

## Step 4: Create DTO

Create `src/modules/[module]/dto/create-thing.dto.ts`:

```typescript
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateThingDto {
  @ApiProperty({
    description: 'Human-readable name for the thing',
    minLength: 1,
    maxLength: 255,
    example: 'My Thing',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}
```

**Critical:** DTO fields must match OpenAPI schema exactly.

---

## Step 5: Create Controller Method

Add to `src/modules/[module]/controllers/[module].controller.ts`:

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateThingDto } from '../dto/create-thing.dto';
import { Session } from '@common/decorators/session.decorator';
import { SessionData } from '@common/types/session.types';

@Controller('module')
@ApiTags('ModuleName')
export class ModuleController {
  constructor(private readonly service: ModuleService) {}

  @Post('new/endpoint')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new thing' })
  @ApiResponse({ status: 201, description: 'Thing created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async createThing(
    @Body() dto: CreateThingDto,
    @Session() session: SessionData,
  ): Promise<CreateThingResponse> {
    const result = await this.service.createThing(dto, session.userId);
    return {
      data: result,
      message: 'Thing created successfully',
      responseType: 'success',
    };
  }
}
```

**Response envelope:** All responses must follow the `{ data, message, responseType }` pattern.

---

## Step 6: Update User Story

Add to the story's **API Endpoints** section:

```markdown
### API Endpoints
- `POST /new/endpoint` - Create a new thing
```

If the story doesn't have an API Endpoints section, add it after the description.

---

## Step 7: Validate Everything

Run the full validation chain:

```bash
# Validate endpoint registry
npm run endpoints:validate

# Validate documentation matrix
${config.commands.validation.matrix}
```

Both must pass before proceeding.

---

## Step 8: Create UX Spec Scenario

Add a test scenario to the appropriate spec file in `${config.paths.specs}`:

```markdown
### Step N: Create Thing

**Actor:** Alice
**Action:** Creates a new thing

**API Workflow:**
- **Endpoint**: `POST /new/endpoint`
- **Body**:
  ```json
  {
    "name": "My Thing",
    "description": "A test thing"
  }
  ```
- **Expectations**:
  - Status: `201 Created`
  - Response shape:
    ```json
    {
      "data": {
        "id": "<uuid-v7>",
        "name": "My Thing",
        "description": "A test thing",
        "createdAt": "<iso-8601>",
        "updatedAt": "<iso-8601>"
      },
      "message": "Thing created successfully",
      "responseType": "success"
    }
    ```
  - Response validation:
    - `data.id` is UUID v7 format
    - `data.name` matches request
    - `data.createdAt` is valid ISO-8601 timestamp
```

---

## Step 9: Final Validation

Run story coverage and spec validation:

```bash
# Check story coverage
${config.commands.validation.storyCoverage}

# Validate specs against contracts
${config.commands.validation.specsAgainstContracts}
```

All validations must pass.

---

## Step 10: Run Tests

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run contract tests
npm run test:contract
```

---

## Completion Checklist

- [ ] User story exists and references endpoint
- [ ] Business rules referenced in story and OpenAPI
- [ ] OpenAPI path defined with complete spec
- [ ] OpenAPI schema defined for request/response
- [ ] `npm run openapi:bundle` passes
- [ ] DTO created and matches schema
- [ ] Controller method implemented
- [ ] Response follows envelope pattern
- [ ] Story updated with endpoint reference
- [ ] `npm run endpoints:validate` passes
- [ ] `validate-documentation-matrix.ts` passes
- [ ] UX spec scenario created
- [ ] `check-story-coverage.ts` passes
- [ ] `validate-ux-specs-against-contracts.ts` passes
- [ ] Tests pass

---

## Common Issues

### "Endpoint not found in registry"
- Run `npm run endpoints:validate` to regenerate registry
- Check controller path matches OpenAPI path exactly

### "DTO validation failed"
- Ensure DTO decorators match OpenAPI constraints
- Check required vs optional fields match

### "Unknown fields in spec body"
- Verify spec request body matches OpenAPI schema
- Check for typos in field names

### "Undefined business rule"
- Ensure BR-xxx exists in `${config.paths.rules}`
- Check spelling and formatting of BR references

---

## See Also

- [Modifying Endpoints](modifying-endpoints.md) - For changes to existing endpoints
- [Common Patterns](common-patterns.md) - Reusable patterns for paths, queries, params
- `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` - Complete delivery workflow
- `artifact-generator` skill - Create missing stories or rules
