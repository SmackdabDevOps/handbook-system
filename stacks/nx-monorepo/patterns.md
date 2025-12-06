# Nx Monorepo Patterns

Common patterns for Nx monorepo development, from library organization to dependency injection and CI/CD pipelines.

## Table of Contents

- [Library Organization Patterns](#library-organization-patterns)
- [Dependency Injection](#dependency-injection-across-apps-and-libs)
- [Shared DTOs with Barrel Exports](#shared-dtos-with-barrel-exports)
- [Testing Strategies](#testing-strategies)
- [CI/CD Pipelines](#cicd-pipelines-with-nx-cloud)

## Library Organization Patterns

### Layered Library Architecture

Organize feature-specific libraries using a consistent layered pattern:

```
libs/feature-channels/
├── data-access/       # Services, state management, API calls
│   ├── src/
│   │   ├── index.ts
│   │   ├── channels.service.ts
│   │   ├── channels.repository.ts
│   │   └── __tests__/
│   └── project.json
│
├── ui/                # UI components (for frontend apps)
│   ├── src/
│   │   ├── index.ts
│   │   ├── channel-list.component.ts
│   │   └── __tests__/
│   └── project.json
│
└── util/              # Feature-specific utilities
    ├── src/
    │   ├── index.ts
    │   ├── channel.validators.ts
    │   └── __tests__/
    └── project.json
```

**Dependencies:**
```
libs/feature-channels/ui
  → libs/feature-channels/data-access
  → libs/shared/dto
  → libs/shared/models

libs/feature-channels/data-access
  → libs/shared/dto
  → libs/shared/models
  → libs/shared/utils
```

### Shared Library Organization

Organize shared libraries by type and concern:

```
libs/shared/
├── dto/              # Data Transfer Objects
├── models/           # Database models, entities
├── middleware/       # Express middleware, interceptors
├── decorators/       # Custom decorators
├── errors/           # Error classes, handlers
├── config/           # Shared configuration
└── utils/            # General utilities
```

Each library exports a complete public API via `src/index.ts`:

```typescript
// libs/shared/dto/src/index.ts
export * from './user.dto';
export * from './channel.dto';
export * from './message.dto';
export * from './validation.dto';
```

### Library Boundaries (tsconfig paths)

Define path aliases in `tsconfig.base.json` for clean imports:

```json
{
  "compilerOptions": {
    "paths": {
      "@libs/shared/dto": ["libs/shared/dto/src/index.ts"],
      "@libs/shared/models": ["libs/shared/models/src/index.ts"],
      "@libs/shared/middleware": ["libs/shared/middleware/src/index.ts"],
      "@libs/shared/utils": ["libs/shared/utils/src/index.ts"],
      "@libs/feature-channels/data-access": ["libs/feature-channels/data-access/src/index.ts"],
      "@libs/feature-channels/ui": ["libs/feature-channels/ui/src/index.ts"]
    }
  }
}
```

Then import cleanly across the monorepo:

```typescript
import { UserDTO, CreateUserDTO } from '@libs/shared/dto';
import { User } from '@libs/shared/models';
import { UserService } from '@libs/feature-users/data-access';
```

## Dependency Injection Across Apps and Libraries

### NestJS Module Pattern

Use NestJS modules to organize DI at the app and library level:

**Shared DTO Module (libs/shared/dto):**

```typescript
// libs/shared/dto/src/index.ts
export * from './user.dto';
export * from './channel.dto';

// No module needed for DTOs (they're just types)
```

**Shared Models Module (libs/shared/models):**

```typescript
// libs/shared/models/src/index.ts
export { User } from './user.model';
export { Channel } from './channel.model';

// libs/shared/models/src/models.module.ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './user.model';
import { Channel } from './channel.model';

@Module({
  imports: [
    SequelizeModule.forFeature([User, Channel])
  ],
  exports: [SequelizeModule]
})
export class ModelsModule {}
```

**Feature Data-Access Module (libs/feature-channels/data-access):**

```typescript
// libs/feature-channels/data-access/src/channels.module.ts
import { Module } from '@nestjs/common';
import { ModelsModule } from '@libs/shared/models';
import { ChannelsService } from './channels.service';
import { ChannelsRepository } from './channels.repository';

@Module({
  imports: [ModelsModule],
  providers: [ChannelsService, ChannelsRepository],
  exports: [ChannelsService]
})
export class ChannelsModule {}
```

**Application Module (apps/api/src/app.module.ts):**

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ChannelsModule } from '@libs/feature-channels/data-access';
import { ChannelsController } from './routes/channels.controller';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DB_HOST,
      // ... rest of config
    }),
    ChannelsModule
  ],
  controllers: [ChannelsController]
})
export class AppModule {}
```

### Service Injection Pattern

Services are injected through constructors, making testing easier:

**Repository Layer:**

```typescript
// libs/feature-channels/data-access/src/channels.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Channel } from '@libs/shared/models';

@Injectable()
export class ChannelsRepository {
  constructor(
    @InjectModel(Channel)
    private channelModel: typeof Channel
  ) {}

  async findById(id: string): Promise<Channel | null> {
    return this.channelModel.findByPk(id);
  }

  async findAll(workspaceId: string): Promise<Channel[]> {
    return this.channelModel.findAll({
      where: { workspaceId }
    });
  }
}
```

**Service Layer:**

```typescript
// libs/feature-channels/data-access/src/channels.service.ts
import { Injectable } from '@nestjs/common';
import { ChannelsRepository } from './channels.repository';
import { CreateChannelDTO } from '@libs/shared/dto';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly channelsRepository: ChannelsRepository
  ) {}

  async getChannel(id: string) {
    return this.channelsRepository.findById(id);
  }

  async listChannels(workspaceId: string) {
    return this.channelsRepository.findAll(workspaceId);
  }

  async createChannel(dto: CreateChannelDTO) {
    return this.channelsRepository.create(dto);
  }
}
```

**Controller Layer:**

```typescript
// apps/api/src/routes/channels.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ChannelsService } from '@libs/feature-channels/data-access';
import { CreateChannelDTO } from '@libs/shared/dto';

@Controller('/channels')
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService
  ) {}

  @Get()
  async list() {
    return this.channelsService.listChannels(/* workspaceId */);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.channelsService.getChannel(id);
  }

  @Post()
  async create(@Body() dto: CreateChannelDTO) {
    return this.channelsService.createChannel(dto);
  }
}
```

## Shared DTOs with Barrel Exports

### DTO File Organization

One DTO interface per file, organized by entity:

```
libs/shared/dto/src/
├── index.ts           # Barrel export
├── user.dto.ts        # User-related DTOs
├── channel.dto.ts     # Channel-related DTOs
├── message.dto.ts     # Message-related DTOs
└── __tests__/
    ├── user.dto.spec.ts
    ├── channel.dto.spec.ts
    └── message.dto.spec.ts
```

### DTO File Pattern

```typescript
// libs/shared/dto/src/channel.dto.ts

// Response DTOs (what API returns)
export interface ChannelDTO {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create DTOs (what client sends)
export interface CreateChannelDTO {
  name: string;
  description?: string;
  isPrivate?: boolean;
}

// Update DTOs (for PATCH requests)
export interface UpdateChannelDTO {
  name?: string;
  description?: string;
  isPrivate?: boolean;
}

// Query DTOs (for filtering/pagination)
export interface ListChannelsQueryDTO {
  workspaceId: string;
  skip?: number;
  take?: number;
  search?: string;
}
```

### Barrel Export Pattern

```typescript
// libs/shared/dto/src/index.ts
// User DTOs
export * from './user.dto';

// Channel DTOs
export * from './channel.dto';

// Message DTOs
export * from './message.dto';

// Pagination DTOs
export * from './pagination.dto';
```

### Using DTOs in Controllers

```typescript
// apps/api/src/routes/channels.controller.ts
import {
  ChannelDTO,
  CreateChannelDTO,
  UpdateChannelDTO,
  ListChannelsQueryDTO
} from '@libs/shared/dto';

@Controller('/channels')
export class ChannelsController {
  @Post()
  async create(@Body() dto: CreateChannelDTO): Promise<ChannelDTO> {
    // Implementation
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChannelDTO
  ): Promise<ChannelDTO> {
    // Implementation
  }

  @Get()
  async list(
    @Query() query: ListChannelsQueryDTO
  ): Promise<ChannelDTO[]> {
    // Implementation
  }
}
```

## Testing Strategies

### Test Location Pattern

Place tests next to source code in `__tests__` subdirectory:

```
libs/feature-channels/data-access/src/
├── channels.service.ts
├── channels.repository.ts
└── __tests__/
    ├── channels.service.spec.ts
    └── channels.repository.spec.ts
```

Or use `.spec.ts` file colocation:

```
libs/shared/dto/src/
├── user.dto.ts
├── user.dto.spec.ts
├── channel.dto.ts
└── channel.dto.spec.ts
```

### Unit Test Pattern (Service Layer)

```typescript
// libs/feature-channels/data-access/src/__tests__/channels.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ChannelsService } from '../channels.service';
import { ChannelsRepository } from '../channels.repository';

describe('ChannelsService', () => {
  let service: ChannelsService;
  let repository: ChannelsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelsService,
        {
          provide: ChannelsRepository,
          useValue: {
            findById: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<ChannelsService>(ChannelsService);
    repository = module.get<ChannelsRepository>(ChannelsRepository);
  });

  describe('getChannel', () => {
    it('should return channel by id', async () => {
      const mockChannel = { id: '123', name: 'general' };
      jest.spyOn(repository, 'findById').mockResolvedValue(mockChannel);

      const result = await service.getChannel('123');

      expect(result).toEqual(mockChannel);
      expect(repository.findById).toHaveBeenCalledWith('123');
    });
  });

  describe('createChannel', () => {
    it('should create and return new channel', async () => {
      const dto = { name: 'new-channel' };
      const mockChannel = { id: '456', ...dto };
      jest.spyOn(repository, 'create').mockResolvedValue(mockChannel);

      const result = await service.createChannel(dto);

      expect(result).toEqual(mockChannel);
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });
});
```

### Integration Test Pattern

```typescript
// apps/api/test/integration/channels.e2e.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Channels (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /channels', () => {
    it('should create a channel', () => {
      return request(app.getHttpServer())
        .post('/channels')
        .send({ name: 'test-channel' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toEqual('test-channel');
        });
    });
  });

  describe('GET /channels/:id', () => {
    it('should return channel', () => {
      return request(app.getHttpServer())
        .get('/channels/123')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
        });
    });
  });
});
```

### Contract Test Pattern

```typescript
// apps/api/test/contracts/channels.contract.ts
import { OpenAPIValidator } from '@libs/shared/utils';

describe('Channels API Contract', () => {
  const validator = new OpenAPIValidator();

  it('should match OpenAPI spec: POST /channels', async () => {
    const response = await request(app.getHttpServer())
      .post('/channels')
      .send({ name: 'test' });

    expect(validator.validate('/channels', 'POST', response)).toEqual(true);
  });

  it('should match OpenAPI spec: GET /channels/:id', async () => {
    const response = await request(app.getHttpServer())
      .get('/channels/123');

    expect(validator.validate('/channels/{id}', 'GET', response)).toEqual(true);
  });
});
```

### Running Tests in Nx

```bash
# Run all tests in feature-channels
nx test feature-channels--data-access

# Run tests in api app only
nx test api

# Run tests for affected projects
nx affected --target=test

# Run tests for all projects
nx run-many --target=test --all

# Run with coverage
nx test api --coverage
```

## CI/CD Pipelines with Nx Cloud

### GitHub Actions Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci

      # Lint affected projects
      - name: Lint
        run: nx affected --target=lint

      # Test affected projects
      - name: Test
        run: nx affected --target=test --coverage

      # Build affected projects
      - name: Build
        run: nx affected --target=build

      # Validate against handbook
      - name: Validate
        run: nx affected --target=validate
```

### Nx Cloud Setup

Enable Nx Cloud for faster CI/CD:

```json
{
  "nxCloudId": "YOUR-CLOUD-ID",
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"]
    },
    "test": {
      "cache": true,
      "inputs": [
        "default",
        "^default",
        "{workspaceRoot}/jest.config.ts"
      ]
    }
  }
}
```

### Distributed Task Execution

With Nx Cloud, tasks are distributed across machines:

```bash
# Run all tests with distribution (much faster on CI)
NX_CLOUD_DISTRIBUTED_EXECUTION=true nx run-many --target=test --all
```

## Project Configuration Pattern

Each library and app needs a `project.json` configuration:

**Minimal configuration (libs/shared/dto/project.json):**

```json
{
  "name": "shared-dto",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/shared/dto/src",
  "prefix": "libs",
  "targets": {
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "libs/shared/dto/jest.config.ts",
        "passWithNoTests": true
      }
    },
    "lint": {
      "executor": "@nx/linter:eslint",
      "outputs": ["{options.outputFile}"],
      "options": {
        "lintFilePatterns": ["libs/shared/dto/**/*.ts"]
      }
    }
  },
  "tags": ["type:lib", "scope:shared"]
}
```

**Extended configuration (apps/api/project.json):**

```json
{
  "name": "api",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/api/src",
  "prefix": "api",
  "targets": {
    "serve": {
      "executor": "@nx/node:node",
      "options": {
        "buildTarget": "api:build",
        "inspect": true
      }
    },
    "build": {
      "executor": "@nx/node:build",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/api",
        "main": "apps/api/src/main.ts"
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "apps/api/jest.config.ts",
        "passWithNoTests": false
      }
    }
  },
  "tags": ["type:app", "scope:api"]
}
```

## Workspace Scripts

Useful npm scripts for development (package.json):

```json
{
  "scripts": {
    "nx": "nx",
    "affected": "nx affected",
    "dev": "nx serve api --poll",
    "build": "nx run-many --target=build --all",
    "test": "nx run-many --target=test --all",
    "test:affected": "nx affected --target=test",
    "lint": "nx run-many --target=lint --all",
    "lint:affected": "nx affected --target=lint",
    "format": "nx format:write",
    "format:check": "nx format:check",
    "graph": "nx dep-graph",
    "validate": "nx run-many --target=validate --all",
    "validate:affected": "nx affected --target=validate"
  }
}
```

Then run with npm:

```bash
npm run test:affected      # Test only changed files
npm run lint:affected      # Lint only changed files
npm run validate           # Full validation
npm run graph              # Show dependency graph
```
