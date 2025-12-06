# NestJS Stack Profile

This stack profile provides handbook-aware configuration for NestJS-based projects. It maps the handbook's System Delivery Playbook phases to NestJS architectural patterns and enforces contract-first, test-driven development.

## Overview

The NestJS stack profile integrates with the handbook system to:

1. **Map phases to code organization** - User stories and business rules map directly to feature modules
2. **Enforce contract-first patterns** - OpenAPI specs drive controller and DTO generation
3. **Validate architectural compliance** - Ensures proper use of NestJS patterns (guards, interceptors, filters, etc.)
4. **Implement TDD guardrails** - Requires test coverage for critical paths (services, controllers, guards, pipes, filters)

## How NestJS Modules Map to Handbook Phases

### Anatomy of a Feature Module

```
src/modules/feature-name/
├── feature-name.module.ts          # Module definition
├── controllers/
│   └── feature-name.controller.ts  # HTTP endpoints (from OpenAPI spec)
├── services/
│   └── feature-name.service.ts     # Business logic (from business rules)
├── dto/
│   ├── create-feature.dto.ts       # Input validation (from OpenAPI request schemas)
│   └── feature-response.dto.ts     # Output shape (from OpenAPI response schemas)
├── guards/
│   └── feature-auth.guard.ts       # Authorization logic (from business rules)
├── interceptors/
│   └── feature-transform.interceptor.ts  # Response transformation
├── pipes/
│   └── feature-validation.pipe.ts  # Custom validation
├── filters/
│   └── feature-error.filter.ts     # Exception handling
├── middleware/
│   └── feature-audit.middleware.ts # Logging and auditing
├── entities/
│   └── feature.entity.ts           # Database model
└── __tests__/
    ├── feature-name.service.spec.ts
    ├── feature-name.controller.spec.ts
    └── feature-auth.guard.spec.ts
```

### Phase → NestJS Mapping

| Handbook Phase | NestJS Artifact | Location | Example |
|---|---|---|---|
| **User Stories** | Module + Controller | `docs/user-stories/*.md` + `src/modules/*/controllers/*.controller.ts` | Feature endpoint that enables user action |
| **Business Rules** | Service + Guard | `docs/business-rules/*.md` + `src/modules/*/services/*.service.ts` + `src/modules/*/guards/*.guard.ts` | Authorization logic, validation rules |
| **OpenAPI Spec** | DTO + Controller | `openapi/paths/*.yaml` → `src/modules/*/dto/*.dto.ts` + `src/modules/*/controllers/*.controller.ts` | Request/response shapes |
| **Validation Specs** | Unit/Integration Tests | `docs/test-plans/validation-specs/*.md` → `test/integration/*.spec.ts` | Test cases verifying business rules |
| **Contract Tests** | Contract Suite | `test/contracts/*.contract.ts` | Verify OpenAPI spec matches implementation |

## Directory Structure

```
project-root/
├── handbook/                        # Handbook reference (submodule or copy)
├── openapi/                         # OpenAPI specifications
│   ├── paths/                       # Endpoint definitions
│   │   └── features.yaml            # Endpoint contracts
│   └── schemas/                     # Reusable schemas
│       ├── error-response.yaml
│       └── pagination.yaml
├── src/
│   ├── modules/                     # Feature modules
│   │   ├── auth/                    # Authentication module
│   │   ├── users/                   # User management module
│   │   ├── channels/                # Channel module
│   │   └── common/                  # Shared resources
│   ├── common/                      # Application-wide utilities
│   │   ├── decorators/              # Custom decorators
│   │   ├── filters/                 # Global exception filters
│   │   ├── interceptors/            # Global interceptors
│   │   ├── guards/                  # Global guards
│   │   └── utils/                   # Helper functions
│   ├── config/                      # Configuration (from .env)
│   ├── database/                    # ORM models & migrations
│   │   ├── models/
│   │   └── migrations/
│   └── app.module.ts                # Root module
├── test/
│   ├── e2e/                         # End-to-end tests
│   ├── integration/                 # Integration tests
│   ├── contracts/                   # OpenAPI contract tests
│   └── unit/                        # Unit tests (colocated with source)
├── docs/
│   ├── user-stories/                # Feature requirements
│   ├── business-rules/              # Constraints and rules
│   └── test-plans/
│       └── validation-specs/        # Acceptance criteria
├── scripts/
│   └── validation/                  # Validation and schema validators
├── architecture/
│   ├── ENDPOINTS.json               # Auto-generated endpoint registry
│   └── ENDPOINTS.md                 # Auto-generated endpoint documentation
├── openapi/
│   └── bundle.yaml                  # Complete merged spec
├── .env                             # Configuration (single source of truth)
└── package.json
```

## NestJS-Specific Patterns

### 1. Controllers (from OpenAPI Specs)

Controllers expose HTTP endpoints defined in OpenAPI specs. Each endpoint maps directly to a business rule or user story.

**Pattern:** One controller per feature module

```typescript
@Controller('api/v1/users')
@ApiTags('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Req() req: Request
  ): Promise<{ data: UserResponseDto; message: string }> {
    const user = await this.usersService.create(createUserDto, req.user.id);
    return {
      data: user,
      message: 'User created successfully'
    };
  }
}
```

### 2. DTOs (from OpenAPI Request/Response Schemas)

DTOs define request and response shapes, validated using `class-validator`.

**Pattern:** Separate request (Create, Update) and response DTOs

```typescript
// CreateUserDto - from OpenAPI requestBody schema
export class CreateUserDto {
  @IsEmail()
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'SecurePassword123!' })
  password: string;

  @IsString()
  @ApiProperty({ example: 'John Doe' })
  name: string;
}

// UserResponseDto - from OpenAPI response schema
export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: '2025-12-06T10:30:00Z' })
  createdAt: Date;
}
```

### 3. Services (Business Logic)

Services implement business rules from the handbook. They orchestrate database operations and enforce constraints.

**Pattern:** One service per feature module, injected into controllers

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    private authService: AuthService,
    private logger: LoggerService
  ) {}

  async create(createUserDto: CreateUserDto, creatorId: string): Promise<User> {
    // Validate business rule: email must be unique
    const existingUser = await this.userModel.findOne({
      where: { email: createUserDto.email }
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password (security rule)
    const hashedPassword = await this.authService.hashPassword(createUserDto.password);

    // Create user
    const user = await this.userModel.create({
      ...createUserDto,
      password: hashedPassword,
      createdBy: creatorId
    });

    this.logger.log(`User created: ${user.id}`, 'UsersService');
    return user;
  }
}
```

### 4. Guards (Authorization)

Guards enforce authorization rules from business rules. They determine who can access endpoints.

**Pattern:** Guard per permission type

```typescript
@Injectable()
export class CanManageUsersGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Business rule: Only workspace admins can manage users
    const workspace = await this.usersService.getUserWorkspace(user.id);
    if (!workspace || workspace.role !== 'admin') {
      throw new ForbiddenException('You do not have permission to manage users');
    }

    return true;
  }
}
```

### 5. Interceptors (Response Transformation)

Interceptors wrap responses in the standard envelope format.

**Pattern:** Global response interceptor

```typescript
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        data: data,
        message: 'Request completed successfully',
        responseType: 'success',
        toast: true
      }))
    );
  }
}
```

### 6. Exception Filters (Error Handling)

Filters catch exceptions and format them according to the response envelope.

**Pattern:** Global exception filter

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    response.status(status).json({
      data: null,
      message: message,
      responseType: 'error',
      statusCode: status
    });
  }
}
```

### 7. Pipes (Input Validation)

Pipes validate and transform request data.

**Pattern:** Global validation pipe + custom pipes for domain-specific validation

```typescript
// app.module.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true }
  })
);

// Custom pipe for domain logic
@Injectable()
export class IsUniqueEmailPipe implements PipeTransform {
  constructor(private usersService: UsersService) {}

  async transform(value: any) {
    const exists = await this.usersService.emailExists(value.email);
    if (exists) {
      throw new BadRequestException('Email already registered');
    }
    return value;
  }
}
```

## OpenAPI Integration

NestJS generates OpenAPI specs from code using `@nestjs/swagger`. Reverse this: write specs first, generate code second.

### Workflow

1. **Write OpenAPI spec** in `openapi/paths/` and `openapi/schemas/`
2. **Generate DTOs** from request/response schemas
3. **Implement controller** following spec structure
4. **Run validation**: `npm run endpoints:validate`

### Example OpenAPI Spec → Code

**openapi/paths/users.yaml:**
```yaml
/users:
  post:
    summary: Create a new user
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateUserDto'
    responses:
      201:
        description: User created
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  $ref: '#/components/schemas/UserResponseDto'
                message:
                  type: string
```

**Generated Controller:**
```typescript
@Post()
@HttpCode(201)
async createUser(@Body() createUserDto: CreateUserDto): Promise<{ data: UserResponseDto }> {
  // Implementation...
}
```

## TDD Enforcement

This stack enforces test-driven development for critical paths:

### Required Test Coverage

| Artifact | Must Have Tests | Pattern |
|---|---|---|
| Services | YES | `src/modules/{name}/services/__tests__/{name}.service.spec.ts` |
| Controllers | YES | `src/modules/{name}/controllers/__tests__/{name}.controller.spec.ts` |
| Guards | YES | `src/modules/{name}/guards/__tests__/{name}.guard.spec.ts` |
| Pipes | YES | `src/modules/{name}/pipes/__tests__/{name}.pipe.spec.ts` |
| Filters | YES | `src/modules/{name}/filters/__tests__/{name}.filter.spec.ts` |
| Interceptors | RECOMMENDED | `src/modules/{name}/interceptors/__tests__/{name}.interceptor.spec.ts` |
| DTOs | NO | (Validation is in pipes and test the pipe) |
| Entities | NO | (Sequelize models tested implicitly) |

### Excluded from TDD

- DTOs (test through pipes and controllers)
- Entities/Models (test through services)
- Modules (test through integration tests)
- Interfaces and type definitions
- Constants
- Index/barrel exports

### Example Test Structure

**Service Test:**
```typescript
describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UsersService, AuthService, LoggerService]
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should create a user when email is unique', async () => {
      const createUserDto = { email: 'test@example.com', password: '123456', name: 'Test' };
      const result = await service.create(createUserDto, 'creator-id');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw ConflictException when email exists', async () => {
      await expect(
        service.create({ email: 'existing@example.com', password: '123456', name: 'Test' }, 'creator-id')
      ).rejects.toThrow(ConflictException);
    });
  });
});
```

**Controller Test:**
```typescript
describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }]
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  describe('POST /users', () => {
    it('should return 201 with user data on success', async () => {
      const createUserDto = { email: 'test@example.com', password: '123456', name: 'Test' };
      const result = await controller.createUser(createUserDto, mockRequest);
      expect(result.data.email).toBe('test@example.com');
      expect(result.message).toBe('User created successfully');
    });
  });
});
```

## Integration with Handbook Phases

### Phase 1: Plan
- Write user stories in `docs/user-stories/`
- Write business rules in `docs/business-rules/`
- Write OpenAPI specs in `openapi/`
- Create validation specs in `docs/test-plans/validation-specs/`

### Phase 2: Red
- Write failing tests in `test/` directories
- Create DTOs with validation rules
- Implement test cases matching OpenAPI contracts

### Phase 3: Green
- Implement controllers from OpenAPI specs
- Implement services enforcing business rules
- Create guards for authorization rules
- Add pipes for input validation

### Phase 4: Refactor
- Extract shared logic to common utilities
- Improve naming and structure
- Add middleware for cross-cutting concerns
- Ensure no behavior changes (tests stay green)

### Phase 5: Validate
- Run contract tests: `npm run test:contract`
- Run integration tests: `npm run test:integration`
- Run e2e tests: `npm run test:e2e`
- Verify OpenAPI compliance: `npm run endpoints:validate`

## Configuration File Format

The `config.json` in this directory defines:

- **paths** - glob patterns for each artifact type (controllers, services, guards, etc.)
- **tdd.enforcedPatterns** - files that must have corresponding test files
- **tdd.excludedPatterns** - file types excluded from TDD requirements
- **tdd.testPatterns** - where to place test files for each type

This allows the handbook system to:
1. Validate NestJS projects use proper patterns
2. Enforce test coverage for critical paths
3. Locate and validate OpenAPI contract compliance
4. Extract architecture information for visualization

## See Also

- **patterns.md** - Common NestJS patterns for handbook compliance
- **handbook/SYSTEM_DELIVERY_PLAYBOOK.md** - Complete delivery workflow
- **handbook/SPEC_RULEBOOK.md** - How to write specs
- **openapi/** - OpenAPI specification structure
