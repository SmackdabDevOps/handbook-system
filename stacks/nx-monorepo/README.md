# Nx Monorepo Stack Profile

This stack profile defines the structure, conventions, and tooling for Nx-based monorepos in the handbook-system. It ensures consistency across multiple applications and shared libraries while maintaining clear dependency boundaries.

## Table of Contents

- [Directory Structure](#directory-structure)
- [Apps vs Libraries](#apps-vs-libraries)
- [Shared Libraries](#shared-libraries)
- [Path Configuration](#path-configuration)
- [Nx Affected Commands](#nx-affected-commands)
- [Project Boundaries](#project-boundaries)
- [Running Commands](#running-commands)

## Directory Structure

```
monorepo-root/
├── apps/                          # Applications (APIs, services, tools)
│   ├── api/                       # Main REST API
│   │   ├── src/
│   │   │   ├── routes/            # API endpoints (must have tests)
│   │   │   ├── services/          # Business logic (must have tests)
│   │   │   ├── middleware/        # Request/response handlers
│   │   │   └── main.ts
│   │   ├── test/
│   │   │   ├── integration/       # Integration tests
│   │   │   └── contracts/         # Contract tests
│   │   ├── e2e/                   # End-to-end tests
│   │   └── project.json           # Nx project configuration
│   │
│   ├── admin/                     # Admin dashboard/tool
│   │   ├── src/
│   │   └── project.json
│   │
│   └── validator/                 # Validation tool
│       ├── src/
│       └── project.json
│
├── libs/                          # Shared libraries
│   ├── shared/
│   │   ├── dto/                   # Data Transfer Objects
│   │   │   ├── src/
│   │   │   │   ├── index.ts       # Barrel export
│   │   │   │   └── *.ts
│   │   │   └── project.json
│   │   │
│   │   ├── models/                # Data models and types
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   └── *.ts
│   │   │   └── project.json
│   │   │
│   │   ├── middleware/            # Shared middleware
│   │   │   ├── src/
│   │   │   │   ├── index.ts
│   │   │   │   └── *.ts
│   │   │   └── project.json
│   │   │
│   │   └── utils/                 # Shared utilities
│   │       ├── src/
│   │       │   ├── index.ts
│   │       │   └── *.ts
│   │       └── project.json
│   │
│   └── feature-{name}/            # Feature-specific libraries
│       ├── data-access/           # Services, API calls, state
│       ├── ui/                    # Components (if frontend)
│       └── util/                  # Feature utilities
│
├── docs/                          # Documentation
│   ├── handbook/                  # Development handbook
│   ├── openapi/                   # OpenAPI specifications
│   ├── user-stories/              # User stories
│   ├── business-rules/            # Business rules
│   ├── test-plans/                # Test plans and validation specs
│   └── architecture/              # Architecture docs (ENDPOINTS.json)
│
├── tools/                         # Build tools and scripts
│   ├── validation/                # Validation validators
│   └── generators/                # Nx generators
│
├── nx.json                        # Nx workspace configuration
├── package.json                   # Dependencies and scripts
├── tsconfig.base.json             # Base TypeScript configuration
└── .env                           # Environment variables
```

## Apps vs Libraries

### Applications (`apps/`)

Applications are runnable services or tools that have entry points. They depend on libraries but are not depended upon by other projects.

**Characteristics:**
- Have a main entry point (`main.ts`)
- Are executables or deployable services
- Can have their own test suites
- Can depend on libraries but not on other apps
- Examples: API server, admin dashboard, CLI tools

**File Organization:**
```
apps/api/
├── src/
│   ├── routes/           # Controller layer (must have tests)
│   ├── services/         # Service layer (must have tests)
│   ├── middleware/       # Request/response handlers
│   ├── config/           # App configuration
│   └── main.ts           # Entry point
├── test/
│   ├── integration/      # Integration tests (apps + libs)
│   └── contracts/        # Contract tests (API contracts)
├── e2e/                  # End-to-end tests
└── project.json
```

### Libraries (`libs/`)

Libraries are importable code that other projects depend on. They must have clear public APIs and should be focused on a single concern.

**Characteristics:**
- Export a public API via `src/index.ts`
- Can depend on other libraries but not on apps
- Focused on a single concern (DTOs, models, utilities)
- Must have tests alongside source code
- Examples: shared DTOs, data models, utilities

**File Organization:**
```
libs/shared/dto/
├── src/
│   ├── index.ts          # Public API (barrel export)
│   ├── user.dto.ts
│   ├── channel.dto.ts
│   └── __tests__/
│       ├── user.dto.spec.ts
│       └── channel.dto.spec.ts
├── tsconfig.json
├── tsconfig.spec.json
└── project.json
```

## Shared Libraries

### `libs/shared/dto/`

Contains all Data Transfer Objects (DTOs) used across applications. DTOs are the contract between layers and services.

**Rules:**
- One DTO file per entity
- DTOs are plain TypeScript interfaces or classes
- Re-export all DTOs in `src/index.ts`
- No business logic in DTOs
- Include validation decorators if using class-validator

**Example:**
```typescript
// libs/shared/dto/src/user.dto.ts
export interface UserDTO {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface CreateUserDTO {
  email: string;
  name: string;
}

// libs/shared/dto/src/index.ts
export * from './user.dto';
export * from './channel.dto';
export * from './message.dto';
```

### `libs/shared/models/`

Contains database models, type definitions, and domain models.

**Rules:**
- One model file per entity
- Models represent database tables or domain entities
- Include type definitions alongside models
- Can use Sequelize models or TypeORM entities
- Re-export all models in `src/index.ts`

### `libs/shared/middleware/`

Contains shared middleware and request/response handling utilities.

**Rules:**
- One middleware per concern
- Include error handlers, authentication, validation
- Must be framework-agnostic or clearly documented
- Re-export all middleware in `src/index.ts`

### `libs/shared/utils/`

Contains shared utility functions.

**Rules:**
- Utility functions, helpers, validators
- No side effects
- Highly reusable
- Re-export all utilities in `src/index.ts`

## Path Configuration

The `config.json` file maps logical paths to file patterns for validation and tooling:

```json
{
  "paths": {
    "controllers": "apps/*/src/routes/*.ts",
    "dtos": "libs/shared/dto/src/**/*.ts",
    "services": "apps/*/src/services/*.ts",
    "models": "libs/shared/models/src/**/*.ts",
    "endpointsJson": "docs/architecture/ENDPOINTS.json"
  }
}
```

**Usage:**
- Validators use these paths to find files needing tests
- Documentation generators use these to index endpoints
- CI/CD pipelines use these to determine affected areas

## Nx Affected Commands

Nx provides "affected" commands that only run on files changed since a base branch (typically `main`). This dramatically speeds up CI/CD.

### Quick Validation (changed files only)

```bash
# Validate files changed in current branch
nx affected --target=validate

# Run tests for changed projects
nx affected --target=test

# Run lint for changed projects
nx affected --target=lint
```

### Full Validation (all projects)

```bash
# Validate everything
nx run-many --target=validate --all

# Test everything
nx run-many --target=test --all

# Lint everything
nx run-many --target=lint --all
```

### Showing Affected Projects

```bash
# List projects affected by current branch
nx affected --target=test --print

# Show dependency graph
nx dep-graph

# Show affected projects in a branch
nx affected --graph
```

## Project Boundaries

Nx enforces project boundaries to maintain clean dependency architecture.

### Allowed Dependencies

```
apps/api → libs/shared/* ✓
libs/feature-{name}/data-access → libs/shared/* ✓
libs/feature-{name}/ui → libs/feature-{name}/data-access ✓
libs/feature-{name}/ui → libs/shared/* ✓
```

### Forbidden Dependencies

```
apps/* → apps/* ✗ (apps cannot depend on other apps)
libs/shared/* → libs/feature-{name}/* ✗ (shared cannot depend on specific features)
libs/* → apps/* ✗ (libraries cannot depend on apps)
```

### Configuring Boundaries

Boundaries are defined in `nx.json`:

```json
{
  "plugins": [
    {
      "plugin": "@nx/enforcer",
      "options": {
        "rules": [
          {
            "sourceTag": "type:app",
            "onlyDependsOnLibsWithTags": ["type:lib"],
            "bannedExternalImports": ["react"]
          }
        ]
      }
    }
  ]
}
```

## Running Commands

### Build a specific app

```bash
nx build api
nx build admin
```

### Test a specific app

```bash
# All tests for api app
nx test api

# Only unit tests
nx test api --testFile='**/*.spec.ts' --exclude='**/e2e/**'
```

### Run a generator to create a new library

```bash
nx generate @nx/express:lib shared/new-lib --directory=libs

# With testing configuration
nx generate @nx/express:lib shared/new-lib --skipFormat --unitTestRunner=jest
```

### View project configuration

```bash
# Show project.json for api app
nx show project api --json

# Show all projects and dependencies
nx show projects --json
```

### Format and lint

```bash
# Format all files
nx format:write

# Lint changed files
nx affected --target=lint --fix

# Lint everything
nx lint --fix
```

## TypeScript Configuration

### Base Configuration (`tsconfig.base.json`)

Defines path aliases for all libraries:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@libs/shared/dto": ["libs/shared/dto/src/index.ts"],
      "@libs/shared/models": ["libs/shared/models/src/index.ts"],
      "@libs/shared/middleware": ["libs/shared/middleware/src/index.ts"],
      "@libs/shared/utils": ["libs/shared/utils/src/index.ts"]
    }
  }
}
```

### Using Path Aliases

```typescript
// Instead of:
import { UserDTO } from '../../../libs/shared/dto/src/user.dto';

// Use:
import { UserDTO } from '@libs/shared/dto';
```

## Integration with Handbook

This stack profile integrates with the handbook-system for:

- **Path-based validation**: Validators find files using paths in `config.json`
- **Test coverage**: Enforces tests for controllers and services
- **Contract validation**: Validates API contracts against OpenAPI specs
- **Architecture documentation**: Tracks ENDPOINTS.json in docs/architecture/
- **Dependency mapping**: Uses Nx dep-graph for architecture diagrams

See `handbook/system-delivery-playbook.md` for complete workflow integration.
