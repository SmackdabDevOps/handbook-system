# Shared Packages in Nx Monorepo

**Context:** Shared libraries (`libs/`) are the foundation of code reuse in an Nx monorepo. This guide shows how to create, version, and maintain shared packages that serve multiple backend services while avoiding tight coupling.

## Library Organization

### Categorizing Shared Code

```
libs/
├── shared/              # Cross-cutting utilities
│   ├── dto/             # Data Transfer Objects
│   ├── types/           # TypeScript type definitions
│   ├── config/          # Configuration utilities
│   ├── utils/           # Pure functions
│   ├── constants/       # Shared constants
│   ├── validators/      # Validation schemas
│   └── http-client/     # HTTP client utilities
├── domain/              # Business domain logic
│   ├── users/           # User domain
│   ├── messages/        # Message domain
│   ├── workspaces/      # Workspace domain
│   └── notifications/   # Notification domain
├── data-access/         # Data layer
│   ├── database/        # Database models/ORM
│   ├── cache/           # Redis client
│   ├── storage/         # File storage
│   └── messaging/       # Message queue
└── testing/             # Test utilities
    ├── fixtures/        # Test data
    ├── mocks/           # Mock implementations
    └── helpers/         # Test helpers
```

### Creating a Shared Library

```bash
# Generate a new shared library
nx generate @nx/js:library dto --directory=shared --importPath=@workspace/shared/dto

# Generate with specific configuration
nx generate @nx/js:library users --directory=domain --importPath=@workspace/domain/users
```

## Shared DTOs

### DTO Organization

```typescript
// libs/shared/dto/src/index.ts
export * from './lib/user.dto';
export * from './lib/message.dto';
export * from './lib/workspace.dto';
export * from './lib/pagination.dto';
export * from './lib/response.dto';

// libs/shared/dto/src/lib/user.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  displayName: string;
}

export class UserResponseDto {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

// libs/shared/dto/src/lib/response.dto.ts
export enum ResponseType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning'
}

export interface StandardResponse<T = any> {
  data?: T;
  message?: string;
  toast?: string;
  responseType: ResponseType;
}
```

### Using Shared DTOs in Services

```typescript
// apps/auth-service/src/controllers/user.controller.ts
import { CreateUserDto, UserResponseDto, StandardResponse } from '@workspace/shared/dto';

@Controller('users')
export class UserController {
  @Post()
  async create(@Body() dto: CreateUserDto): Promise<StandardResponse<UserResponseDto>> {
    const user = await this.userService.create(dto);
    return {
      data: user,
      message: 'User created successfully',
      responseType: ResponseType.SUCCESS
    };
  }
}
```

## Type Definitions

### Shared Types Library

```typescript
// libs/shared/types/src/index.ts
export * from './lib/entities';
export * from './lib/enums';
export * from './lib/interfaces';

// libs/shared/types/src/lib/entities.ts
export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  translations?: Record<string, string>;
  createdAt: Date;
}

// libs/shared/types/src/lib/enums.ts
export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest'
}

export enum ChannelType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  DIRECT_MESSAGE = 'dm'
}

// libs/shared/types/src/lib/interfaces.ts
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

## Common Utilities

### Utility Functions

```typescript
// libs/shared/utils/src/index.ts
export * from './lib/date-utils';
export * from './lib/string-utils';
export * from './lib/validation-utils';

// libs/shared/utils/src/lib/date-utils.ts
export class DateUtils {
  static isExpired(date: Date): boolean {
    return date.getTime() < Date.now();
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}

// libs/shared/utils/src/lib/string-utils.ts
export class StringUtils {
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .trim();
  }

  static truncate(text: string, maxLength: number): string {
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  }
}
```

### Configuration Utilities

```typescript
// libs/shared/config/src/index.ts
export * from './lib/database.config';
export * from './lib/redis.config';
export * from './lib/service-registry';

// libs/shared/config/src/lib/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production',
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10)
  },
  logging: process.env.DB_LOGGING === 'true'
}));

// libs/shared/config/src/lib/service-registry.ts
export interface ServiceEndpoint {
  url: string;
  healthPath: string;
  timeout?: number;
}

export const SERVICE_REGISTRY: Record<string, ServiceEndpoint> = {
  authService: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:8001',
    healthPath: '/health',
    timeout: 5000
  },
  chatService: {
    url: process.env.CHAT_SERVICE_URL || 'http://localhost:8002',
    healthPath: '/health',
    timeout: 5000
  }
};
```

## Import Paths and TypeScript Configuration

### TypeScript Path Mapping

**tsconfig.base.json (workspace root)**
```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "es2015",
    "module": "esnext",
    "lib": ["es2020", "dom"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@workspace/shared/dto": ["libs/shared/dto/src/index.ts"],
      "@workspace/shared/types": ["libs/shared/types/src/index.ts"],
      "@workspace/shared/config": ["libs/shared/config/src/index.ts"],
      "@workspace/shared/utils": ["libs/shared/utils/src/index.ts"],
      "@workspace/domain/users": ["libs/domain/users/src/index.ts"],
      "@workspace/domain/messages": ["libs/domain/messages/src/index.ts"],
      "@workspace/data-access/database": ["libs/data-access/database/src/index.ts"]
    }
  }
}
```

### Library project.json

**libs/shared/dto/project.json**
```json
{
  "name": "shared-dto",
  "projectType": "library",
  "sourceRoot": "libs/shared/dto/src",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "options": {
        "outputPath": "dist/libs/shared/dto",
        "main": "libs/shared/dto/src/index.ts",
        "tsConfig": "libs/shared/dto/tsconfig.lib.json",
        "assets": ["libs/shared/dto/*.md"]
      }
    },
    "lint": {
      "executor": "@nx/linter:eslint",
      "options": {
        "lintFilePatterns": ["libs/shared/dto/**/*.ts"]
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "options": {
        "jestConfig": "libs/shared/dto/jest.config.ts"
      }
    }
  },
  "tags": ["type:lib", "scope:shared"]
}
```

## Versioning Shared Code

### Semantic Versioning for Libraries

**libs/shared/dto/package.json**
```json
{
  "name": "@workspace/shared/dto",
  "version": "1.2.0",
  "private": true,
  "description": "Shared DTOs for all services",
  "dependencies": {
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1"
  }
}
```

### Managing Breaking Changes

**CHANGELOG.md pattern**
```markdown
# @workspace/shared/dto

## [2.0.0] - 2024-01-15

### Breaking Changes
- Renamed `UserDto` to `UserResponseDto`
- Removed deprecated `MessageDto.metadata` field

### Added
- New `PaginatedResponseDto<T>` generic type

### Migration Guide
```typescript
// Before
import { UserDto } from '@workspace/shared/dto';

// After
import { UserResponseDto } from '@workspace/shared/dto';
```
```

## Dependency Management

### Library Dependencies

**Nx dependency graph enforcement**

**nx.json**
```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"]
    }
  },
  "namedInputs": {
    "production": ["!{projectRoot}/**/*.spec.ts"]
  }
}
```

### Using Nx Tags for Constraints

**.eslintrc.json (root)**
```json
{
  "overrides": [
    {
      "files": ["*.ts"],
      "rules": {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            "enforceBuildableLibDependency": true,
            "allow": [],
            "depConstraints": [
              {
                "sourceTag": "type:app",
                "onlyDependOnLibsWithTags": ["type:lib"]
              },
              {
                "sourceTag": "scope:shared",
                "onlyDependOnLibsWithTags": ["scope:shared"]
              },
              {
                "sourceTag": "scope:domain",
                "onlyDependOnLibsWithTags": ["scope:shared", "scope:domain"]
              }
            ]
          }
        ]
      }
    }
  ]
}
```

## Testing Shared Libraries

### Unit Tests for Shared Code

```typescript
// libs/shared/utils/src/lib/string-utils.spec.ts
import { StringUtils } from './string-utils';

describe('StringUtils', () => {
  describe('slugify', () => {
    it('should convert text to slug format', () => {
      expect(StringUtils.slugify('Hello World!')).toBe('hello-world');
    });

    it('should handle special characters', () => {
      expect(StringUtils.slugify('Test@#$%')).toBe('test');
    });
  });
});
```

## Best Practices

1. **Single Responsibility:** Each library should have one clear purpose
2. **Minimal Dependencies:** Shared libraries should have few external dependencies
3. **Export Barrel Files:** Always export through index.ts
4. **Version Carefully:** Breaking changes require coordination across apps
5. **Document Changes:** Maintain CHANGELOG.md for each library
6. **Test Thoroughly:** Shared code impacts all consuming apps
7. **Tag Appropriately:** Use Nx tags to enforce dependency rules

## Anti-Patterns to Avoid

1. Creating libraries for single functions
2. Circular dependencies between libraries
3. Mixing domain logic with utilities
4. Over-abstracting too early
5. Creating god libraries (too many responsibilities)
6. Not versioning breaking changes

## Related Handbook Sections

- `stacks/nx-monorepo/MULTI_APP_COORDINATION.md` - Service coordination
- `stacks/nx-monorepo/CROSS_SERVICE_CONTRACTS.md` - Contract sharing
- `handbook/SPEC_RULEBOOK.md` - DTO validation rules
