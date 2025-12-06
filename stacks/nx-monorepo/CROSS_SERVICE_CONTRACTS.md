# Cross-Service Contracts in Nx Monorepo

**Context:** In an Nx monorepo with multiple backend services, each service needs its own OpenAPI contract while sharing common schemas. This guide shows how to organize, share, and validate contracts across services while maintaining independence.

## OpenAPI Structure per Service

### Directory Organization

```
openapi/
├── shared/                    # Shared schemas
│   ├── schemas/
│   │   ├── User.yaml
│   │   ├── Message.yaml
│   │   ├── Workspace.yaml
│   │   ├── Pagination.yaml
│   │   └── Response.yaml
│   └── parameters/
│       ├── PaginationParams.yaml
│       └── CommonHeaders.yaml
├── api-gateway/               # API Gateway service
│   ├── openapi.yaml          # Main spec
│   ├── paths/
│   │   ├── health.yaml
│   │   └── proxy.yaml
│   └── schemas/
│       └── Gateway.yaml
├── auth-service/              # Auth service
│   ├── openapi.yaml
│   ├── paths/
│   │   ├── login.yaml
│   │   ├── register.yaml
│   │   ├── logout.yaml
│   │   └── refresh.yaml
│   └── schemas/
│       ├── LoginRequest.yaml
│       └── AuthResponse.yaml
├── chat-service/              # Chat service
│   ├── openapi.yaml
│   ├── paths/
│   │   ├── messages/
│   │   │   ├── create.yaml
│   │   │   ├── list.yaml
│   │   │   └── get.yaml
│   │   └── channels/
│   │       ├── create.yaml
│   │       └── list.yaml
│   └── schemas/
│       ├── CreateMessageRequest.yaml
│       └── MessageResponse.yaml
└── scripts/
    ├── validate-all-contracts.js
    ├── bundle-contract.js
    └── generate-client.js
```

### Main OpenAPI Spec per Service

**openapi/auth-service/openapi.yaml**
```yaml
openapi: 3.0.3
info:
  title: Auth Service API
  version: 1.0.0
  description: Authentication and user management service
servers:
  - url: http://localhost:8001
    description: Local development
  - url: https://auth.myapp.com
    description: Production

paths:
  /auth/login:
    $ref: './paths/login.yaml'
  /auth/register:
    $ref: './paths/register.yaml'
  /auth/logout:
    $ref: './paths/logout.yaml'
  /auth/refresh:
    $ref: './paths/refresh.yaml'

components:
  schemas:
    User:
      $ref: '../shared/schemas/User.yaml'
    StandardResponse:
      $ref: '../shared/schemas/Response.yaml'
    LoginRequest:
      $ref: './schemas/LoginRequest.yaml'
    AuthResponse:
      $ref: './schemas/AuthResponse.yaml'
```

**openapi/chat-service/openapi.yaml**
```yaml
openapi: 3.0.3
info:
  title: Chat Service API
  version: 2.1.0
  description: Messaging and channel management service
servers:
  - url: http://localhost:8002
    description: Local development
  - url: https://chat.myapp.com
    description: Production

paths:
  /chat/messages:
    $ref: './paths/messages/create.yaml'
  /chat/messages/{messageId}:
    $ref: './paths/messages/get.yaml'
  /chat/channels:
    $ref: './paths/channels/list.yaml'

components:
  schemas:
    User:
      $ref: '../shared/schemas/User.yaml'
    Message:
      $ref: '../shared/schemas/Message.yaml'
    StandardResponse:
      $ref: '../shared/schemas/Response.yaml'
    CreateMessageRequest:
      $ref: './schemas/CreateMessageRequest.yaml'
```

## Shared Schemas

### Common Response Envelope

**openapi/shared/schemas/Response.yaml**
```yaml
StandardResponse:
  type: object
  required:
    - responseType
  properties:
    data:
      description: Response payload (type varies by endpoint)
    message:
      type: string
      description: Human-readable message
      example: "Operation completed successfully"
    toast:
      type: string
      description: User-facing toast message
      example: "User created successfully"
    responseType:
      type: string
      enum: [success, error, warning]
      description: Type of response
      example: success
```

### Shared Entity Schemas

**openapi/shared/schemas/User.yaml**
```yaml
User:
  type: object
  required:
    - id
    - email
    - displayName
  properties:
    id:
      type: string
      format: uuid
      description: User UUID (v7)
      example: "01936d42-8f3a-7b5c-9d6e-f2a1c4b8e7d3"
    email:
      type: string
      format: email
      example: "user@example.com"
    displayName:
      type: string
      minLength: 1
      maxLength: 100
      example: "John Doe"
    createdAt:
      type: string
      format: date-time
      example: "2024-01-15T10:30:00Z"
    updatedAt:
      type: string
      format: date-time
      example: "2024-01-15T10:30:00Z"
```

**openapi/shared/schemas/Pagination.yaml**
```yaml
PaginationParams:
  type: object
  properties:
    page:
      type: integer
      minimum: 1
      default: 1
    limit:
      type: integer
      minimum: 1
      maximum: 100
      default: 20
    sortBy:
      type: string
      example: "createdAt"
    sortOrder:
      type: string
      enum: [asc, desc]
      default: desc

PaginatedResponse:
  type: object
  required:
    - items
    - total
    - page
    - limit
    - hasMore
  properties:
    items:
      type: array
      items: {}
      description: Array of result items
    total:
      type: integer
      description: Total number of items
      example: 150
    page:
      type: integer
      description: Current page number
      example: 1
    limit:
      type: integer
      description: Items per page
      example: 20
    hasMore:
      type: boolean
      description: Whether more pages exist
      example: true
```

## Service-Specific Schemas

**openapi/auth-service/schemas/LoginRequest.yaml**
```yaml
LoginRequest:
  type: object
  required:
    - email
    - password
  properties:
    email:
      type: string
      format: email
      example: "user@example.com"
    password:
      type: string
      format: password
      minLength: 8
      example: "Password123!"
```

**openapi/chat-service/schemas/CreateMessageRequest.yaml**
```yaml
CreateMessageRequest:
  type: object
  required:
    - channelId
    - content
  properties:
    channelId:
      type: string
      format: uuid
      description: Channel UUID where message is posted
      example: "01936d42-8f3a-7b5c-9d6e-f2a1c4b8e7d3"
    content:
      type: string
      minLength: 1
      maxLength: 5000
      description: Message content
      example: "Hello, world!"
    replyToId:
      type: string
      format: uuid
      description: Optional message ID for threading
      example: "01936d42-8f3a-7b5c-9d6e-f2a1c4b8e7d4"
```

## API Versioning in Monorepo

### Version Strategy

**Per-service versioning:**
- Each service maintains its own version (e.g., auth-service v1.0, chat-service v2.1)
- Breaking changes increment major version
- Shared schemas versioned separately

**openapi/shared/schemas/User.yaml (versioned)**
```yaml
# v1 schema
User_v1:
  type: object
  properties:
    id: { type: string }
    email: { type: string }
    name: { type: string }  # deprecated

# v2 schema
User_v2:
  type: object
  properties:
    id: { type: string }
    email: { type: string }
    displayName: { type: string }  # replaced 'name'
    avatar: { type: string }       # new field
```

## Breaking Change Detection

### Automated Breaking Change Detection

**scripts/detect-breaking-changes.js**
```javascript
const { execSync } = require('child_process');
const path = require('path');

const SERVICES = ['auth-service', 'chat-service', 'api-gateway'];

function detectBreakingChanges(service) {
  const specPath = path.join('openapi', service, 'openapi.yaml');

  try {
    // Compare current spec with main branch
    execSync(`oasdiff breaking ${specPath} <(git show main:${specPath})`, {
      shell: '/bin/bash',
      stdio: 'inherit'
    });
  } catch (error) {
    console.error(`Breaking changes detected in ${service}`);
    process.exit(1);
  }
}

SERVICES.forEach(detectBreakingChanges);
```

### Contract Validation Script

**scripts/validate-all-contracts.js**
```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OPENAPI_DIR = path.join(__dirname, '../openapi');
const SERVICES = fs.readdirSync(OPENAPI_DIR)
  .filter(f => {
    const stat = fs.statSync(path.join(OPENAPI_DIR, f));
    return stat.isDirectory() && f !== 'shared';
  });

console.log('Validating OpenAPI contracts for services:', SERVICES);

SERVICES.forEach(service => {
  const specPath = path.join(OPENAPI_DIR, service, 'openapi.yaml');

  console.log(`\nValidating ${service}...`);

  try {
    // Bundle the spec (resolve $refs)
    execSync(`npx swagger-cli bundle ${specPath} -o dist/openapi/${service}.json`, {
      stdio: 'inherit'
    });

    // Validate the bundled spec
    execSync(`npx swagger-cli validate dist/openapi/${service}.json`, {
      stdio: 'inherit'
    });

    console.log(`✅ ${service} contract is valid`);
  } catch (error) {
    console.error(`❌ ${service} contract validation failed`);
    process.exit(1);
  }
});

console.log('\n✅ All service contracts validated successfully');
```

## Contract Testing Between Services

### Consumer-Driven Contract Tests

**Pattern: Auth Service → Chat Service**

```typescript
// apps/chat-service/test/contracts/auth-service.contract.spec.ts
import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { SERVICE_REGISTRY } from '@workspace/shared/config';

describe('Auth Service Contract', () => {
  let httpService: HttpService;
  const authServiceUrl = SERVICE_REGISTRY.authService.url;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [HttpService]
    }).compile();

    httpService = module.get(HttpService);
  });

  describe('GET /auth/user/:userId', () => {
    it('should return user in expected format', async () => {
      const userId = 'test-user-id';
      const response = await httpService
        .get(`${authServiceUrl}/auth/user/${userId}`)
        .toPromise();

      // Contract: Auth service must return User schema
      expect(response.data).toMatchObject({
        data: {
          id: expect.any(String),
          email: expect.any(String),
          displayName: expect.any(String),
          createdAt: expect.any(String)
        },
        responseType: 'success'
      });
    });
  });
});
```

### Integration with Handbook Phase 1

**Phase 1 Checklist for Cross-Service Contracts:**

1. **Identify Service Dependencies**
   - Document which services call which
   - Map shared schemas

2. **Define Shared Schemas**
   - Create in `openapi/shared/schemas/`
   - Version if breaking changes expected

3. **Create Service-Specific Contracts**
   - Reference shared schemas via `$ref`
   - Define service-specific request/response types

4. **Validate Contracts**
   - Run `npm run contracts:validate`
   - Check for breaking changes

5. **Generate Contract Tests**
   - Consumer-driven tests for each dependency
   - Add to CI pipeline

## Nx Integration

### Project Configuration for Contract Validation

**apps/auth-service/project.json**
```json
{
  "name": "auth-service",
  "targets": {
    "contract-validate": {
      "executor": "nx:run-commands",
      "options": {
        "command": "swagger-cli validate openapi/auth-service/openapi.yaml"
      }
    },
    "contract-bundle": {
      "executor": "nx:run-commands",
      "options": {
        "command": "swagger-cli bundle openapi/auth-service/openapi.yaml -o dist/openapi/auth-service.json"
      }
    },
    "contract-test": {
      "executor": "@nx/jest:jest",
      "options": {
        "jestConfig": "apps/auth-service/jest.contract.config.ts",
        "testPathPattern": ".*\\.contract\\.spec\\.ts$"
      }
    }
  }
}
```

### Running Contract Validation for All Services

```bash
# Validate all service contracts
nx run-many --target=contract-validate --all

# Bundle all contracts
nx run-many --target=contract-bundle --all

# Run contract tests
nx run-many --target=contract-test --all

# Affected contracts only
nx affected --target=contract-validate
```

## Best Practices

1. **Shared Schemas:** Use `openapi/shared/` for entity schemas used by multiple services
2. **Service Independence:** Each service's contract is independently versioned
3. **Breaking Changes:** Detect automatically in CI before merging
4. **Contract Tests:** Write consumer-driven tests for service dependencies
5. **Documentation:** Generate API docs per service from bundled specs
6. **Validation:** Run contract validation on every commit

## Anti-Patterns to Avoid

1. Duplicating schemas across services (use shared schemas)
2. Making breaking changes without versioning
3. Skipping contract validation in CI
4. Not testing cross-service contracts
5. Hardcoding service URLs (use service registry)

## Related Handbook Sections

- `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` - Phase 1: Contract definition
- `handbook/SPEC_RULEBOOK.md` - OpenAPI authoring rules
- `stacks/nx-monorepo/SHARED_PACKAGES.md` - Shared DTO libraries
- `stacks/nx-monorepo/MULTI_APP_COORDINATION.md` - Service coordination
