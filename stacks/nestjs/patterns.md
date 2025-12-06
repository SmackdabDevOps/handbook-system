# NestJS Patterns for Handbook Compliance

This guide documents common NestJS patterns that align with the handbook's contract-first, TDD-driven approach. Use these patterns when implementing features based on OpenAPI specs and business rules.

## Table of Contents

1. [Controller Patterns](#controller-patterns)
2. [DTO Validation Patterns](#dto-validation-patterns)
3. [Service Patterns](#service-patterns)
4. [Guard Patterns](#guard-patterns)
5. [Interceptor Patterns](#interceptor-patterns)
6. [Exception Filter Patterns](#exception-filter-patterns)
7. [Pipe Patterns](#pipe-patterns)
8. [Middleware Patterns](#middleware-patterns)
9. [Testing Patterns](#testing-patterns)

---

## Controller Patterns

### Pattern 1: RESTful Controller with OpenAPI Decorators

Controllers define HTTP endpoints. Always include OpenAPI decorators to align with spec-driven development.

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@Controller('api/v1/users')
@ApiTags('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  // GET endpoint - list users
  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved', type: [UserResponseDto] })
  async list(): Promise<{ data: UserResponseDto[]; message: string }> {
    const users = await this.usersService.findAll();
    return {
      data: users,
      message: 'Users retrieved successfully'
    };
  }

  // POST endpoint - create user
  @Post()
  @HttpCode(201)
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created', type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async create(@Body() createUserDto: CreateUserDto): Promise<{ data: UserResponseDto; message: string }> {
    const user = await this.usersService.create(createUserDto);
    return {
      data: user,
      message: 'User created successfully'
    };
  }

  // GET endpoint - retrieve by ID
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<{ data: UserResponseDto; message: string }> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      data: user,
      message: 'User retrieved successfully'
    };
  }

  // PUT endpoint - update user
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), CanManageUsersGuard)
  @ApiOperation({ summary: 'Update user' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<{ data: UserResponseDto; message: string }> {
    const user = await this.usersService.update(id, updateUserDto);
    return {
      data: user,
      message: 'User updated successfully'
    };
  }

  // DELETE endpoint - delete user
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard('jwt'), CanManageUsersGuard)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
```

### Pattern 2: Endpoint with Request User Context

When an endpoint needs the current user, inject it from the request.

```typescript
import { Controller, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post()
  async sendMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: Request
  ): Promise<{ data: MessageResponseDto; message: string }> {
    const userId = req.user.id; // Set by auth middleware
    const message = await this.messagesService.create(createMessageDto, userId);
    return {
      data: message,
      message: 'Message sent successfully'
    };
  }
}
```

### Pattern 3: Query Parameters and Pagination

Controllers handling pagination follow the handbook's pagination standard.

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiQuery({ name: 'search', type: String, required: false })
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string
  ): Promise<{ data: UserResponseDto[]; message: string; pagination: PaginationDto }> {
    const result = await this.usersService.paginate({ page, limit, search });
    return {
      data: result.data,
      message: 'Users retrieved',
      pagination: result.pagination
    };
  }
}
```

---

## DTO Validation Patterns

### Pattern 1: Request DTO with Validation

DTOs define request shapes from OpenAPI specs. Use `class-validator` decorators for validation.

```typescript
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @IsEmail()
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @ApiProperty({
    example: 'SecurePassword123!',
    description: 'Password (min 8 chars, must include uppercase, lowercase, number, special char)'
  })
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  name: string;

  @IsOptional()
  @IsEnum(['user', 'admin'], { message: 'Role must be user or admin' })
  @ApiProperty({ example: 'user', enum: ['user', 'admin'], required: false })
  role?: 'user' | 'admin' = 'user';
}
```

### Pattern 2: Response DTO (Plain Class)

Response DTOs document the shape of successful responses. They don't need validation (used for serialization).

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  status: 'active' | 'inactive';

  @ApiProperty({ example: '2025-12-06T10:30:00.000Z' })
  createdAt: Date;

  @Exclude() // Never expose password
  password?: string;
}
```

### Pattern 3: DTO with Nested Objects

For complex request bodies with nested structures.

```typescript
import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';

class PermissionDto {
  @IsString()
  resource: string;

  @IsArray()
  @IsString({ each: true })
  actions: string[];
}

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions: PermissionDto[];
}
```

### Pattern 4: Pagination DTO

Standard pagination response structure.

```typescript
export class PaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 500 })
  total: number;

  @ApiProperty({ example: 25 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasMore: boolean;
}

export class PaginatedResponseDto<T> {
  @ApiProperty()
  data: T[];

  pagination: PaginationDto;

  @ApiProperty({ example: 'Users retrieved' })
  message: string;
}
```

---

## Service Patterns

### Pattern 1: Service with Business Logic

Services implement business rules from the handbook. They handle database operations and validate constraints.

```typescript
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    private authService: AuthService,
    private logger: LoggerService
  ) {}

  // Business rule: Email must be unique
  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.userModel.findOne({
      where: { email: createUserDto.email }
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password before storing (security rule)
    const hashedPassword = await this.authService.hashPassword(createUserDto.password);

    const user = await this.userModel.create({
      ...createUserDto,
      password: hashedPassword
    });

    this.logger.log(`User created: ${user.id}`, 'UsersService');
    return user;
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findByPk(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // If updating email, check it's still unique
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await this.userModel.findOne({
        where: { email: updateUserDto.email }
      });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    await user.update(updateUserDto);
    return user;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await user.destroy();
  }

  // Pagination support
  async paginate(options: { page: number; limit: number; search?: string }): Promise<{ data: User[]; pagination: PaginationDto }> {
    const offset = (options.page - 1) * options.limit;
    const where: any = {};

    if (options.search) {
      where.$or = [
        { email: { $iLike: `%${options.search}%` } },
        { name: { $iLike: `%${options.search}%` } }
      ];
    }

    const { count, rows } = await this.userModel.findAndCountAll({
      where,
      offset,
      limit: options.limit
    });

    return {
      data: rows,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: count,
        totalPages: Math.ceil(count / options.limit),
        hasMore: offset + rows.length < count
      }
    };
  }
}
```

### Pattern 2: Service Dependency Injection

Services are injected via constructor to enable testing with mocks.

```typescript
@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order) private orderModel: typeof Order,
    private productsService: ProductsService,  // Inject other services
    private paymentService: PaymentService,
    private logger: LoggerService
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    // Use injected services
    const product = await this.productsService.findOne(createOrderDto.productId);
    const payment = await this.paymentService.process(createOrderDto.paymentInfo);
    // ...
  }
}
```

### Pattern 3: Service with Database Transactions

For operations that must succeed or fail atomically.

```typescript
@Injectable()
export class TransferService {
  constructor(
    @InjectModel(Account) private accountModel: typeof Account,
    private transactionManager: TransactionManager
  ) {}

  async transfer(fromId: string, toId: string, amount: number): Promise<void> {
    const transaction = await this.transactionManager.begin();

    try {
      // Deduct from source
      await this.accountModel.decrement('balance', {
        by: amount,
        where: { id: fromId },
        transaction
      });

      // Add to destination
      await this.accountModel.increment('balance', {
        by: amount,
        where: { id: toId },
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw new BadRequestException('Transfer failed: insufficient funds');
    }
  }
}
```

---

## Guard Patterns

### Pattern 1: Authentication Guard

Guards protect endpoints from unauthenticated requests.

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const payload = await this.authService.verifyToken(token);
      request.user = payload; // Attach user to request
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromRequest(request: Request): string | null {
    // Try Authorization header first (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Fall back to cookie (for session-based auth)
    return request.cookies.sessionToken || null;
  }
}
```

### Pattern 2: Authorization Guard (Role-Based)

Guards that check if user has required permissions.

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const REQUIRED_ROLE = 'requiredRole';

export const RequireRole = (role: string) => SetMetadata(REQUIRED_ROLE, role);

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.get<string>(REQUIRED_ROLE, context.getHandler());
    if (!requiredRole) return true; // No role required

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== requiredRole) {
      throw new ForbiddenException(`This action requires ${requiredRole} role`);
    }

    return true;
  }
}

// Usage in controller
@Post()
@RequireRole('admin')
@UseGuards(AuthGuard, RoleGuard)
async create(@Body() createUserDto: CreateUserDto): Promise<any> {
  // Only admins can execute this
}
```

### Pattern 3: Resource Ownership Guard

Guards that check if user owns the resource they're modifying.

```typescript
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const { id } = request.params;

    const resource = await this.usersService.findOne(id);

    if (resource.ownerId !== user.id) {
      throw new ForbiddenException('You do not own this resource');
    }

    return true;
  }
}
```

---

## Interceptor Patterns

### Pattern 1: Response Transformation Interceptor

Wraps responses in the standard envelope format.

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // If data is already an envelope (has 'data' field), return as-is
        if (data && typeof data === 'object' && 'data' in data) {
          return data;
        }

        // Otherwise, wrap in envelope
        return {
          data: data,
          message: 'Request completed successfully',
          responseType: 'success',
          toast: true
        };
      })
    );
  }
}
```

### Pattern 2: Logging Interceptor

Logs incoming requests and outgoing responses for debugging.

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url, query, body } = request;
    const start = Date.now();

    this.logger.log(`${method} ${url}`);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(`${method} ${url} ${response.statusCode} ${duration}ms`);
      })
    );
  }
}
```

### Pattern 3: Error Handling Interceptor

Catches and logs errors from handlers.

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  private logger = new Logger('ErrorInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(error => {
        this.logger.error(`Error: ${error.message}`, error.stack);
        return throwError(() => error);
      })
    );
  }
}
```

---

## Exception Filter Patterns

### Pattern 1: Global Exception Filter

Catches all exceptions and formats them uniformly.

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorType = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
      errorType = exception.name;
    }

    const errorResponse = {
      data: null,
      message: message,
      responseType: 'error',
      statusCode: status,
      errorType: errorType,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method
    };

    this.logger.error(
      `${request.method} ${request.url} - ${status}: ${message}`,
      exception instanceof Error ? exception.stack : ''
    );

    response.status(status).json(errorResponse);
  }
}

// Register in main.ts
app.useGlobalFilters(new GlobalExceptionFilter());
```

### Pattern 2: HTTP Exception Filter

Specialized filter for validation and business logic errors.

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    response.status(status).json({
      data: null,
      message: exceptionResponse.message || exception.message,
      responseType: 'error',
      statusCode: status,
      errors: exceptionResponse.errors // From class-validator
    });
  }
}
```

---

## Pipe Patterns

### Pattern 1: Validation Pipe

Global validation pipe that validates all request DTOs.

```typescript
import { PipeTransform, Injectable, BadRequestException, ValidationError } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, metadata: ArgumentMetadata) {
    if (!metadata.type || metadata.type !== 'body') {
      return value;
    }

    const object = plainToClass(metadata.metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      throw new BadRequestException(this.formatErrors(errors));
    }

    return value;
  }

  private formatErrors(errors: ValidationError[]): any {
    return errors.map(error => ({
      field: error.property,
      messages: Object.values(error.constraints || {})
    }));
  }
}

// Register in main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true }
  })
);
```

### Pattern 2: Custom Validation Pipe

Domain-specific validation that checks business rules.

```typescript
@Injectable()
export class EmailAvailabilityPipe implements PipeTransform {
  constructor(private usersService: UsersService) {}

  async transform(value: any): Promise<any> {
    if (!value.email) return value;

    const exists = await this.usersService.emailExists(value.email);
    if (exists) {
      throw new BadRequestException('Email already registered');
    }

    return value;
  }
}

// Usage
@Post()
async create(
  @Body(EmailAvailabilityPipe) createUserDto: CreateUserDto
): Promise<any> {
  // Email is guaranteed unique
}
```

### Pattern 3: Parse UUID Pipe

Validates that ID parameters are valid UUIDs.

```typescript
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { validate as validateUuid } from 'uuid';

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!validateUuid(value)) {
      throw new BadRequestException(`Invalid UUID: ${value}`);
    }
    return value;
  }
}

// Usage
@Get(':id')
async findOne(
  @Param('id', ParseUUIDPipe) id: string
): Promise<UserResponseDto> {
  // id is guaranteed valid UUID
}
```

---

## Middleware Patterns

### Pattern 1: Authentication Middleware

Extracts user from token/session and attaches to request.

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.sessionToken;

      if (token) {
        const payload = await this.authService.verifyToken(token);
        req.user = payload;
      }

      next();
    } catch (error) {
      next();
    }
  }
}

// Register in module
@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
```

### Pattern 2: Request ID Middleware

Adds unique request ID for tracing.

```typescript
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] || uuidv7();
    req.id = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
```

---

## Testing Patterns

### Pattern 1: Service Unit Test

Test service business logic in isolation.

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;
  let authService: AuthService;

  beforeEach(async () => {
    const mockUserModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findByPk: jest.fn()
    };

    const mockAuthService = {
      hashPassword: jest.fn()
    };

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: 'UserModel', useValue: mockUserModel },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get('UserModel');
    authService = module.get<AuthService>(AuthService);
  });

  describe('create', () => {
    it('should create user when email is unique', async () => {
      const createUserDto = { email: 'test@example.com', password: 'Test123!', name: 'Test' };

      userModel.findOne.mockResolvedValue(null); // Email not found
      authService.hashPassword.mockResolvedValue('hashed_password');
      userModel.create.mockResolvedValue({ id: '123', ...createUserDto });

      const result = await service.create(createUserDto);

      expect(result.email).toBe('test@example.com');
      expect(authService.hashPassword).toHaveBeenCalledWith('Test123!');
    });

    it('should throw ConflictException when email exists', async () => {
      const createUserDto = { email: 'existing@example.com', password: 'Test123!', name: 'Test' };

      userModel.findOne.mockResolvedValue({ id: '456', email: 'existing@example.com' });

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });
});
```

### Pattern 2: Controller Integration Test

Test controller with mocked service.

```typescript
describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findOne: jest.fn()
    };

    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }]
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  describe('POST /users', () => {
    it('should return 201 with user data', async () => {
      const createUserDto = { email: 'test@example.com', password: 'Test123!', name: 'Test' };
      const userResponseDto = { id: '123', ...createUserDto };

      service.create.mockResolvedValue(userResponseDto);

      const result = await controller.create(createUserDto);

      expect(result.data).toEqual(userResponseDto);
      expect(result.message).toBe('User created successfully');
    });
  });
});
```

### Pattern 3: Guard Test

Test authorization logic.

```typescript
describe('RoleGuard', () => {
  let guard: RoleGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RoleGuard(reflector);
  });

  it('should allow access when user has required role', () => {
    const mockContext = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: '123', role: 'admin' }
        })
      })
    } as any;

    reflector.get = jest.fn().mockReturnValue('admin');

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should deny access when user lacks required role', () => {
    const mockContext = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: '123', role: 'user' }
        })
      })
    } as any;

    reflector.get = jest.fn().mockReturnValue('admin');

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });
});
```

---

## Summary

These patterns provide a foundation for building NestJS applications that align with the handbook. Key principles:

1. **Contract-first** - Write OpenAPI specs before code, use decorators to document contracts
2. **TDD-driven** - Write tests before implementation for critical paths
3. **Dependency injection** - Services and guards are injected for testability
4. **Separation of concerns** - Controllers expose endpoints, services handle logic, guards check permissions
5. **Consistent responses** - All endpoints return envelope format `{ data, message, responseType }`
6. **Error handling** - Global filters and specific exception types for consistent error responses
7. **Middleware and interceptors** - Cross-cutting concerns applied globally

For more patterns and best practices, see the handbook's SYSTEM_DELIVERY_PLAYBOOK and SmackChat's implementation examples.
