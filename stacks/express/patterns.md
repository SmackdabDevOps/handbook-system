# Express Stack Patterns

Common patterns and best practices for Express.js applications in the Smackdab ecosystem.

## Router Organization Pattern

### Single Responsibility Router

Each router file should be responsible for one feature domain:

```
src/routes/
├── auth.ts          # Authentication endpoints
├── users.ts         # User management endpoints
├── channels.ts      # Channel management endpoints
└── messages.ts      # Message endpoints
```

### Router Registration

```typescript
// src/index.ts
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import channelRoutes from './routes/channels';
import messageRoutes from './routes/messages';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
```

### Route File Pattern

```typescript
// src/routes/users.ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validate-request';
import { UserSchema } from '../schemas/user.schema';
import { UserService } from '../services/user.service';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const userService = new UserService();

// List users
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const users = await userService.list();
  res.json({ data: users, message: 'Users retrieved', responseType: 'success' });
}));

// Get user by ID
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json({ data: user, message: 'User retrieved', responseType: 'success' });
}));

// Create user
router.post('/', validateRequest(UserSchema.create), asyncHandler(async (req, res) => {
  const user = await userService.create(req.body);
  res.status(201).json({ data: user, message: 'User created', responseType: 'success' });
}));

// Update user
router.put('/:id', authenticate, validateRequest(UserSchema.update), asyncHandler(async (req, res) => {
  const user = await userService.update(req.params.id, req.body);
  res.json({ data: user, message: 'User updated', responseType: 'success' });
}));

// Delete user
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await userService.delete(req.params.id);
  res.json({ data: null, message: 'User deleted', responseType: 'success' });
}));

export default router;
```

## Async Error Handling Wrapper

### Implementation

```typescript
// src/utils/async-handler.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers to catch errors and pass them to error middleware
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

### Usage

```typescript
// Without asyncHandler - manual try/catch required
router.get('/:id', (req, res, next) => {
  try {
    const user = await userService.findById(req.params.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// With asyncHandler - automatic error propagation
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json(user);
}));
```

## Validation Middleware Pattern

### Multi-source Validation

```typescript
// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/app-error';

interface ValidationSource {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate = (source: ValidationSource) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const errors: Record<string, string[]> = {};

    // Validate body
    if (source.body) {
      try {
        req.body = source.body.parse(req.body);
      } catch (error: any) {
        error.errors?.forEach((err: any) => {
          const field = err.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(err.message);
        });
      }
    }

    // Validate query
    if (source.query) {
      try {
        req.query = source.query.parse(req.query) as any;
      } catch (error: any) {
        error.errors?.forEach((err: any) => {
          const field = `query.${err.path.join('.')}`;
          if (!errors[field]) errors[field] = [];
          errors[field].push(err.message);
        });
      }
    }

    // Validate params
    if (source.params) {
      try {
        req.params = source.params.parse(req.params);
      } catch (error: any) {
        error.errors?.forEach((err: any) => {
          const field = `params.${err.path.join('.')}`;
          if (!errors[field]) errors[field] = [];
          errors[field].push(err.message);
        });
      }
    }

    // Return validation errors
    if (Object.keys(errors).length > 0) {
      throw new AppError(400, 'Validation failed', 'validation_error', errors);
    }

    next();
  };
};
```

### Usage

```typescript
// Validate request body only
router.post('/', validate({ body: UserSchema.create }), asyncHandler(async (req, res) => {
  // req.body is validated and typed
  const user = await userService.create(req.body);
  res.json({ data: user, message: 'User created', responseType: 'success' });
}));

// Validate multiple sources
router.get('/', validate({
  query: PaginationSchema,
}), asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const users = await userService.list({ page, limit });
  res.json({ data: users, message: 'Users retrieved', responseType: 'success' });
}));

// Validate params and body
router.put('/:id', validate({
  params: IdSchema,
  body: UserSchema.update,
}), asyncHandler(async (req, res) => {
  const user = await userService.update(req.params.id, req.body);
  res.json({ data: user, message: 'User updated', responseType: 'success' });
}));
```

## Authentication Middleware Pattern

### JWT Authentication

```typescript
// src/middleware/authenticate.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/app-error';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req);

  if (!token) {
    throw new AppError(401, 'No authorization token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded as any;
    next();
  } catch (error) {
    throw new AppError(401, 'Invalid or expired token');
  }
};

function extractToken(req: Request): string | null {
  // From Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // From cookie
  if (req.cookies?.token) {
    return req.cookies.token;
  }

  return null;
}
```

### Role-based Authorization

```typescript
// src/middleware/authorize.ts
import { Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';
import { AuthRequest } from './authenticate';

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, 'Insufficient permissions');
    }

    next();
  };
};
```

### Usage

```typescript
// Admin only
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  await userService.delete(req.params.id);
  res.json({ data: null, message: 'User deleted', responseType: 'success' });
}));

// Admin or moderator
router.put('/:id/ban', authenticate, authorize('admin', 'moderator'), asyncHandler(async (req, res) => {
  await userService.ban(req.params.id);
  res.json({ data: null, message: 'User banned', responseType: 'success' });
}));
```

## Response Formatting Middleware Pattern

### Response Formatter

```typescript
// src/middleware/response-formatter.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Wraps response.json to ensure consistent response format
 */
export const responseFormatter = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = function(body: any) {
    // If already formatted, return as-is
    if (body && typeof body === 'object' && 'responseType' in body) {
      return originalJson(body);
    }

    // Wrap response in standard envelope
    const formatted = {
      data: body,
      message: body?.message || 'Success',
      responseType: 'success',
    };

    // Remove message from data if it was duplicated
    if (formatted.data?.message === formatted.message) {
      delete formatted.data.message;
    }

    return originalJson(formatted);
  };

  next();
};
```

### Usage in Application

```typescript
app.use(responseFormatter);

router.get('/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  // Response automatically formatted:
  // { data: user, message: 'Success', responseType: 'success' }
  res.json(user);
}));
```

## Error Handling Pattern

### Custom Error Class

```typescript
// src/utils/app-error.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public responseType: string = 'error',
    public errors?: Record<string, string[]>
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, errors?: Record<string, string[]>) {
    return new AppError(400, message, 'validation_error', errors);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new AppError(401, message, 'unauthorized');
  }

  static forbidden(message: string = 'Forbidden') {
    return new AppError(403, message, 'forbidden');
  }

  static notFound(message: string = 'Not found') {
    return new AppError(404, message, 'not_found');
  }

  static conflict(message: string, errors?: Record<string, string[]>) {
    return new AppError(409, message, 'conflict', errors);
  }

  static internal(message: string = 'Internal server error') {
    return new AppError(500, message, 'internal_error');
  }
}
```

### Global Error Handler

```typescript
// src/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log error
  logger.error('Unhandled error', {
    path: req.path,
    method: req.method,
    message: err.message,
    stack: err.stack,
  });

  // Known app error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      data: null,
      message: err.message,
      responseType: err.responseType,
      ...(err.errors && { errors: err.errors }),
    });
  }

  // Unexpected error
  res.status(500).json({
    data: null,
    message: 'Internal server error',
    responseType: 'internal_error',
  });
};
```

## Data Access Pattern

### Repository Pattern (Optional)

For complex queries, use the repository pattern to abstract database access:

```typescript
// src/repositories/user.repository.ts
import { User } from '../models/user.model';

export class UserRepository {
  async findById(id: string) {
    return User.findByPk(id);
  }

  async findByEmail(email: string) {
    return User.findOne({ where: { email } });
  }

  async findAll(options?: { limit: number; offset: number }) {
    return User.findAll(options);
  }

  async create(data: any) {
    return User.create(data);
  }

  async update(id: string, data: any) {
    const user = await this.findById(id);
    if (!user) return null;
    return user.update(data);
  }

  async delete(id: string) {
    const user = await this.findById(id);
    if (!user) return false;
    await user.destroy();
    return true;
  }
}
```

### Service Using Repository

```typescript
// src/services/user.service.ts
import { UserRepository } from '../repositories/user.repository';
import { AppError } from '../utils/app-error';

export class UserService {
  private repository = new UserRepository();

  async findById(id: string) {
    const user = await this.repository.findById(id);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.repository.findByEmail(email);
  }

  async list(options?: { page: number; limit: number }) {
    const offset = (options?.page ?? 1 - 1) * (options?.limit ?? 20);
    return this.repository.findAll({ limit: options?.limit ?? 20, offset });
  }

  async create(data: any) {
    const existing = await this.repository.findByEmail(data.email);
    if (existing) {
      throw AppError.conflict('Email already registered');
    }
    return this.repository.create(data);
  }

  async update(id: string, data: any) {
    await this.findById(id);
    return this.repository.update(id, data);
  }

  async delete(id: string) {
    const success = await this.repository.delete(id);
    if (!success) {
      throw AppError.notFound('User not found');
    }
  }
}
```

## Request Logging Pattern

### Structured Logging Middleware

```typescript
// src/middleware/request-logging.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogging = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log response when it's sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).user?.id,
    });
  });

  next();
};
```

## CORS Pattern

### Flexible CORS Configuration

```typescript
// src/middleware/cors.ts
import cors from 'cors';

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

## Pagination Pattern

### Pagination Schema and Middleware

```typescript
// src/schemas/pagination.schema.ts
import { z } from 'zod';

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationSchema>;
```

### Usage in Routes

```typescript
router.get('/', validate({ query: PaginationSchema }), asyncHandler(async (req, res) => {
  const { page, limit } = req.query as any;
  const { data, total } = await userService.paginate({ page, limit });

  res.json({
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    message: 'Users retrieved',
    responseType: 'success',
  });
}));
```

## File Upload Pattern

### Multer Configuration

```typescript
// src/middleware/upload.ts
import multer from 'multer';
import path from 'path';

const upload = multer({
  dest: process.env.UPLOAD_DIR || './uploads',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 5);
```

### Usage in Routes

```typescript
router.post('/avatar', authenticate, uploadSingle, asyncHandler(async (req, res) => {
  if (!req.file) {
    throw AppError.badRequest('No file uploaded');
  }

  const user = await userService.updateAvatar(req.user.id, req.file.path);
  res.json({ data: user, message: 'Avatar uploaded', responseType: 'success' });
}));
```

## Testing Best Practices

### Service Testing

```typescript
// tests/unit/user.service.test.ts
import { UserService } from '../../src/services/user.service';
import { AppError } from '../../src/utils/app-error';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const user = await service.findById('valid-id');
      expect(user).toBeDefined();
    });

    it('should throw NotFound when user does not exist', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(AppError);
    });
  });
});
```

### Route Testing

```typescript
// tests/integration/users.test.ts
import request from 'supertest';
import app from '../../src/index';

describe('Users API', () => {
  describe('GET /api/users/:id', () => {
    it('should return user by ID', async () => {
      const response = await request(app)
        .get('/api/users/valid-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('data.id');
      expect(response.body).toHaveProperty('message');
      expect(response.body.responseType).toBe('success');
    });

    it('should return 404 when user not found', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.responseType).toBe('not_found');
    });
  });
});
```

## Key Takeaways

1. **Consistency:** All patterns should be applied consistently across the codebase
2. **Separation of Concerns:** Routes, services, and data access should be separate
3. **Error Handling:** Use AppError for consistent error responses
4. **Type Safety:** Leverage TypeScript and Zod for runtime type checking
5. **Testing:** Write tests alongside implementation (TDD)
6. **Documentation:** Document routes with OpenAPI comments
7. **Middleware Order:** Follow the standard middleware chain order
8. **Async Safety:** Always wrap async handlers with asyncHandler
