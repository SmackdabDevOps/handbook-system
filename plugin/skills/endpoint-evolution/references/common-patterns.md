# Common Endpoint Patterns

## Overview

This guide provides reusable patterns for common endpoint elements like path parameters, query parameters, pagination, and response envelopes.

Use these patterns to ensure consistency across all endpoints.

---

## Path Parameters

### OpenAPI Pattern

```yaml
/resources/{resourceId}:
  get:
    operationId: getResource
    summary: Get resource by ID
    parameters:
      - name: resourceId
        in: path
        required: true
        description: UUID v7 identifier for the resource
        schema:
          type: string
          format: uuid
        example: "01234567-89ab-cdef-0123-456789abcdef"
```

### Controller Pattern

```typescript
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';

@Controller('resources')
export class ResourcesController {
  @Get(':resourceId')
  async getResource(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
  ): Promise<ResourceResponse> {
    const resource = await this.service.findById(resourceId);
    return {
      data: resource,
      message: 'Resource retrieved successfully',
      responseType: 'success',
    };
  }
}
```

### UX Spec Pattern

```markdown
### Step N: Get Resource

**Actor:** Alice
**Action:** Retrieves a specific resource by ID

**API Workflow:**
- **Endpoint**: `GET /resources/:resourceId`
- **Path Parameters**:
  - `resourceId`: `{aliceResourceId}` (from previous step)
- **Expectations**:
  - Status: `200 OK`
  - Response: `data.id` matches `{aliceResourceId}`
```

**Key points:**
- Use `:paramName` in specs (Express/NestJS format)
- Use `{paramName}` in OpenAPI
- Always validate UUIDs with `ParseUUIDPipe`

---

## Query Parameters

### OpenAPI Pattern - Simple

```yaml
/resources:
  get:
    operationId: listResources
    summary: List resources with optional filtering
    parameters:
      - name: status
        in: query
        required: false
        description: Filter by status
        schema:
          type: string
          enum: [active, inactive, archived]
        example: active
      - name: search
        in: query
        required: false
        description: Search term for resource name
        schema:
          type: string
          minLength: 1
          maxLength: 100
```

### OpenAPI Pattern - Pagination

```yaml
parameters:
  - name: page
    in: query
    required: false
    description: Page number (1-indexed)
    schema:
      type: integer
      minimum: 1
      default: 1
    example: 1
  - name: limit
    in: query
    required: false
    description: Items per page
    schema:
      type: integer
      minimum: 1
      maximum: 100
      default: 20
    example: 20
  - name: sortBy
    in: query
    required: false
    description: Field to sort by
    schema:
      type: string
      enum: [createdAt, updatedAt, name]
      default: createdAt
  - name: sortOrder
    in: query
    required: false
    description: Sort direction
    schema:
      type: string
      enum: [asc, desc]
      default: desc
```

### Controller Pattern - Query Params

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { IsOptional, IsEnum, IsString, MaxLength } from 'class-validator';

class ListResourcesQuery {
  @IsOptional()
  @IsEnum(['active', 'inactive', 'archived'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

@Controller('resources')
export class ResourcesController {
  @Get()
  async listResources(
    @Query() query: ListResourcesQuery,
  ): Promise<ResourceListResponse> {
    const resources = await this.service.findAll(query);
    return {
      data: resources,
      message: 'Resources retrieved successfully',
      responseType: 'success',
    };
  }
}
```

### Controller Pattern - Pagination

```typescript
import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';

@Controller('resources')
export class ResourcesController {
  @Get()
  async listResources(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc',
  ): Promise<PaginatedResourceResponse> {
    const result = await this.service.findAll({
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return {
      data: result.items,
      message: 'Resources retrieved successfully',
      responseType: 'success',
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
```

### UX Spec Pattern - Query Params

```markdown
### Step N: List Active Resources

**Actor:** Alice
**Action:** Lists resources filtered by status

**API Workflow:**
- **Endpoint**: `GET /resources?status=active&limit=10`
- **Query Parameters**:
  - `status`: `active`
  - `limit`: `10`
- **Expectations**:
  - Status: `200 OK`
  - Response: `data` is array with max 10 items
  - All items have `status: "active"`
```

---

## Request Body Patterns

### OpenAPI Pattern - Simple

```yaml
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: '../schemas/resource.yaml#/CreateResourceRequest'
```

### OpenAPI Pattern - With Examples

```yaml
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: '../schemas/resource.yaml#/CreateResourceRequest'
      examples:
        basic:
          summary: Basic resource creation
          value:
            name: "My Resource"
            type: "document"
        withMetadata:
          summary: With optional metadata
          value:
            name: "My Resource"
            type: "document"
            metadata:
              tags: ["important", "review"]
```

### Schema Pattern - Nested Objects

```yaml
CreateResourceRequest:
  type: object
  required:
    - name
    - type
  properties:
    name:
      type: string
      minLength: 1
      maxLength: 255
    type:
      type: string
      enum: [document, image, video]
    metadata:
      type: object
      properties:
        tags:
          type: array
          items:
            type: string
            maxLength: 50
          maxItems: 10
        priority:
          type: integer
          minimum: 1
          maximum: 5
```

### DTO Pattern - Nested Objects

```typescript
import { IsString, IsEnum, IsOptional, ValidateNested, IsArray, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

class ResourceMetadata {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  tags?: string[];

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  priority?: number;
}

export class CreateResourceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsEnum(['document', 'image', 'video'])
  type: string;

  @ValidateNested()
  @Type(() => ResourceMetadata)
  @IsOptional()
  metadata?: ResourceMetadata;
}
```

---

## Response Envelope Pattern

### Standard Success Response

All endpoints MUST follow this pattern:

```yaml
SuccessResponse:
  type: object
  required:
    - data
    - message
    - responseType
  properties:
    data:
      description: The actual payload (type varies by endpoint)
    message:
      type: string
      description: Human-readable message
      example: "Resource created successfully"
    toast:
      type: string
      description: Optional toast notification message
    responseType:
      type: string
      enum: [success, error, warning, info]
      example: success
```

### Standard Error Response

```yaml
ErrorResponse:
  type: object
  required:
    - message
    - responseType
  properties:
    message:
      type: string
      description: Error message
      example: "Resource not found"
    responseType:
      type: string
      enum: [error]
      example: error
    toast:
      type: string
      description: User-facing error message
    errors:
      type: array
      description: Detailed validation errors
      items:
        type: object
        properties:
          field:
            type: string
          message:
            type: string
```

### Controller Pattern - Success Response

```typescript
return {
  data: resource,
  message: 'Resource created successfully',
  responseType: 'success',
};
```

### Controller Pattern - Success with Toast

```typescript
return {
  data: resource,
  message: 'Resource created successfully',
  toast: 'Your resource is ready!',
  responseType: 'success',
};
```

### Controller Pattern - Error Response

```typescript
throw new BadRequestException({
  message: 'Invalid resource data',
  responseType: 'error',
  toast: 'Please check your input',
  errors: [
    { field: 'name', message: 'Name must be at least 1 character' },
  ],
});
```

---

## Pagination Response Pattern

### OpenAPI Pattern

```yaml
PaginatedResourceResponse:
  type: object
  properties:
    data:
      type: array
      items:
        $ref: '#/Resource'
    message:
      type: string
    responseType:
      type: string
    pagination:
      $ref: '#/PaginationMetadata'

PaginationMetadata:
  type: object
  required:
    - page
    - limit
    - total
    - totalPages
  properties:
    page:
      type: integer
      description: Current page (1-indexed)
      example: 1
    limit:
      type: integer
      description: Items per page
      example: 20
    total:
      type: integer
      description: Total items available
      example: 150
    totalPages:
      type: integer
      description: Total pages available
      example: 8
```

### Controller Pattern

```typescript
return {
  data: items,
  message: 'Resources retrieved successfully',
  responseType: 'success',
  pagination: {
    page: currentPage,
    limit: itemsPerPage,
    total: totalItems,
    totalPages: Math.ceil(totalItems / itemsPerPage),
  },
};
```

### UX Spec Pattern

```markdown
**Expectations**:
  - Status: `200 OK`
  - Response shape:
    ```json
    {
      "data": [/* array of resources */],
      "message": "Resources retrieved successfully",
      "responseType": "success",
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 150,
        "totalPages": 8
      }
    }
    ```
  - Response validation:
    - `data` is array with max `pagination.limit` items
    - `pagination.total` >= `data.length`
    - `pagination.totalPages` = ceil(total / limit)
```

---

## Authentication Patterns

### OpenAPI - Session Auth

```yaml
security:
  - cookieAuth: []
```

### OpenAPI - No Auth (Public)

```yaml
security: []
```

### Controller - Session Required

```typescript
import { Session } from '@common/decorators/session.decorator';
import { SessionData } from '@common/types/session.types';

@Get('profile')
async getProfile(@Session() session: SessionData) {
  return this.service.getProfile(session.userId);
}
```

### Controller - Optional Auth

```typescript
import { OptionalSession } from '@common/decorators/session.decorator';

@Get('public-data')
async getPublicData(@OptionalSession() session: SessionData | null) {
  if (session) {
    return this.service.getPersonalizedData(session.userId);
  }
  return this.service.getPublicData();
}
```

---

## File Upload Pattern

### OpenAPI Pattern

```yaml
/resources/upload:
  post:
    operationId: uploadResource
    summary: Upload a resource file
    requestBody:
      required: true
      content:
        multipart/form-data:
          schema:
            type: object
            required:
              - file
            properties:
              file:
                type: string
                format: binary
                description: File to upload (max 10MB)
              name:
                type: string
                description: Optional resource name
```

### Controller Pattern

```typescript
import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('resources')
export class ResourcesController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name?: string,
  ): Promise<UploadResponse> {
    const resource = await this.service.upload(file, name);
    return {
      data: resource,
      message: 'File uploaded successfully',
      responseType: 'success',
    };
  }
}
```

---

## Common Response Codes

### Success Codes

| Code | Usage | Example |
|------|-------|---------|
| 200 | Success (read/update) | `GET /resources/:id` |
| 201 | Created | `POST /resources` |
| 204 | No Content (delete) | `DELETE /resources/:id` |

### Client Error Codes

| Code | Usage | Example |
|------|-------|---------|
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Authenticated but no permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Validation failed |

### Server Error Codes

| Code | Usage | Example |
|------|-------|---------|
| 500 | Internal Server Error | Unexpected error |
| 503 | Service Unavailable | Database down |

---

## See Also

- [Adding Endpoints](adding-endpoints.md) - Complete workflow for new endpoints
- [Modifying Endpoints](modifying-endpoints.md) - Changing existing endpoints
- [Deprecating Endpoints](deprecating-endpoints.md) - Removing endpoints
- `handbook/errors/` - Error handling patterns
- `handbook/SPEC_RULEBOOK.md` - Spec authoring rules
