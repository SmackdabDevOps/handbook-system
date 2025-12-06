# Multi-App Coordination in Nx Monorepo

**Context:** When building multiple backend services (APIs, WebSocket servers, workers) in a single Nx workspace, coordination becomes critical. This guide shows how to structure, configure, and coordinate multiple applications while maintaining independence.

## Workspace Structure

### Recommended Layout

```
my-workspace/
├── apps/
│   ├── api-gateway/          # Main REST API
│   ├── auth-service/         # Authentication service
│   ├── chat-service/         # Chat/messaging API
│   ├── websocket-server/     # Real-time WebSocket server
│   ├── worker-queue/         # Background job processor
│   └── admin-dashboard/      # Admin backend
├── libs/
│   ├── shared/
│   │   ├── dto/              # Shared DTOs
│   │   ├── types/            # TypeScript types
│   │   ├── config/           # Configuration utilities
│   │   └── utils/            # Common utilities
│   ├── domain/
│   │   ├── users/            # User domain logic
│   │   ├── messages/         # Message domain logic
│   │   └── workspaces/       # Workspace domain logic
│   └── data-access/
│       ├── database/         # Database models/migrations
│       ├── cache/            # Redis client
│       └── storage/          # File storage client
├── tools/
│   ├── generators/           # Custom Nx generators
│   └── scripts/              # Shared scripts
├── openapi/
│   ├── api-gateway/          # OpenAPI specs per service
│   ├── auth-service/
│   └── chat-service/
└── nx.json
```

### Nx Configuration Files

**workspace.json or nx.json (Nx 15+)**
```json
{
  "version": 2,
  "projects": {
    "api-gateway": "apps/api-gateway",
    "auth-service": "apps/auth-service",
    "chat-service": "apps/chat-service",
    "websocket-server": "apps/websocket-server",
    "shared-dto": "libs/shared/dto",
    "shared-types": "libs/shared/types",
    "domain-users": "libs/domain/users"
  }
}
```

**apps/api-gateway/project.json**
```json
{
  "name": "api-gateway",
  "projectType": "application",
  "sourceRoot": "apps/api-gateway/src",
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "options": {
        "outputPath": "dist/apps/api-gateway",
        "main": "apps/api-gateway/src/main.ts",
        "tsConfig": "apps/api-gateway/tsconfig.app.json"
      }
    },
    "serve": {
      "executor": "@nx/js:node",
      "options": {
        "buildTarget": "api-gateway:build",
        "port": 8000
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "options": {
        "jestConfig": "apps/api-gateway/jest.config.ts"
      }
    },
    "lint": {
      "executor": "@nx/linter:eslint",
      "options": {
        "lintFilePatterns": ["apps/api-gateway/**/*.ts"]
      }
    },
    "openapi-validate": {
      "executor": "nx:run-commands",
      "options": {
        "command": "node scripts/validate-openapi.js openapi/api-gateway"
      }
    }
  },
  "tags": ["type:app", "scope:api"]
}
```

## Service-to-Service Communication

### Internal HTTP Communication

**Pattern 1: Direct HTTP calls via shared client**

```typescript
// libs/shared/config/src/service-registry.ts
export const SERVICE_REGISTRY = {
  authService: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:8001',
    healthPath: '/health'
  },
  chatService: {
    url: process.env.CHAT_SERVICE_URL || 'http://localhost:8002',
    healthPath: '/health'
  }
} as const;

// libs/shared/http-client/src/service-client.ts
import { SERVICE_REGISTRY } from '@workspace/shared/config';

export class ServiceClient {
  async callAuthService(path: string, options: RequestInit) {
    const url = `${SERVICE_REGISTRY.authService.url}${path}`;
    return fetch(url, options);
  }
}
```

**Pattern 2: Message queue (preferred for async)**

```typescript
// libs/shared/messaging/src/event-bus.ts
export enum ServiceEvent {
  USER_CREATED = 'user.created',
  MESSAGE_SENT = 'message.sent',
  WORKSPACE_UPDATED = 'workspace.updated'
}

export interface EventPayload {
  [ServiceEvent.USER_CREATED]: { userId: string; email: string };
  [ServiceEvent.MESSAGE_SENT]: { messageId: string; channelId: string };
}

// apps/auth-service/src/services/user.service.ts
import { EventBus, ServiceEvent } from '@workspace/shared/messaging';

export class UserService {
  async createUser(data: CreateUserDto) {
    const user = await this.userRepo.create(data);

    await this.eventBus.publish(ServiceEvent.USER_CREATED, {
      userId: user.id,
      email: user.email
    });

    return user;
  }
}
```

## Shared Configuration

### Environment Variables per Service

**apps/api-gateway/.env.example**
```bash
# Service-specific
PORT=8000
SERVICE_NAME=api-gateway

# Shared (imported from root)
DATABASE_URL=postgresql://localhost:5432/myapp
REDIS_URL=redis://localhost:6379
```

**Shared configuration library**
```typescript
// libs/shared/config/src/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production',
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10)
  }
}));
```

## Independent Deployability

### Docker Configuration per App

**apps/api-gateway/Dockerfile**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY nx.json tsconfig.base.json ./

# Copy only dependencies needed for this app
RUN npm ci

COPY apps/api-gateway ./apps/api-gateway
COPY libs ./libs

# Build only this app and its dependencies
RUN npx nx build api-gateway --prod

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/api-gateway ./
COPY --from=builder /app/node_modules ./node_modules

ENV PORT=8000
EXPOSE 8000

CMD ["node", "main.js"]
```

### Kubernetes Deployment per Service

**apps/api-gateway/k8s/deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: "1.0"
    spec:
      containers:
      - name: api-gateway
        image: myregistry/api-gateway:latest
        ports:
        - containerPort: 8000
        env:
        - name: PORT
          value: "8000"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
```

## Development Workflow

### Running Multiple Services

**package.json scripts**
```json
{
  "scripts": {
    "start:all": "nx run-many --target=serve --all --parallel",
    "start:api": "nx run-many --target=serve --projects=api-gateway,auth-service,chat-service --parallel",
    "start:gateway": "nx serve api-gateway",
    "dev": "concurrently \"npm:start:gateway\" \"npm:start:websocket\""
  }
}
```

**Using Nx affected commands**
```bash
# Serve only affected apps
nx affected --target=serve --base=main

# Build only changed services
nx affected --target=build --parallel=3

# Test everything that changed
nx affected --target=test
```

## Health Checks and Service Discovery

### Shared Health Check Pattern

```typescript
// libs/shared/health/src/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dbHealth: DatabaseHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator
  ) {}

  @Get()
  check() {
    return this.healthService.check([
      () => this.dbHealth.pingCheck('database'),
      () => this.redisHealth.pingCheck('redis')
    ]);
  }
}

// Each app imports this from @workspace/shared/health
```

## Handbook Integration

### Phase 0: Planning (Monorepo Context)

When planning features across multiple services:

1. Identify which services are affected
2. Plan OpenAPI contracts for each service
3. Identify shared types/DTOs
4. Plan inter-service communication patterns
5. Document in `docs/architecture/service-dependencies.md`

### Nx Workspace Dependencies

```bash
# Visualize service dependencies
nx graph

# Check circular dependencies
nx affected:graph
```

**Example dependency graph:**
```
api-gateway → auth-service (HTTP)
api-gateway → chat-service (HTTP)
chat-service → websocket-server (Events)
worker-queue → shared/messaging (Library)
```

## Best Practices

1. **Service Isolation:** Each app should be independently deployable
2. **Shared Libraries:** Use libs/ for truly shared code only
3. **Service Registry:** Maintain a registry of service URLs
4. **Health Checks:** Every service exposes /health endpoint
5. **Contract Testing:** Test service-to-service contracts
6. **Nx Tags:** Use tags to enforce dependency rules
7. **Versioning:** Version shared libraries separately from apps

## Anti-Patterns to Avoid

1. Circular dependencies between apps
2. Sharing database connections directly
3. Tight coupling via shared state
4. Bypassing service boundaries
5. Deploying the entire monorepo as one unit
6. Not using Nx affected commands in CI

## Related Handbook Sections

- `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` - Overall delivery process
- `handbook/SPEC_RULEBOOK.md` - OpenAPI contract rules
- `stacks/nx-monorepo/SHARED_PACKAGES.md` - Shared library patterns
- `stacks/nx-monorepo/CROSS_SERVICE_CONTRACTS.md` - Contract testing
