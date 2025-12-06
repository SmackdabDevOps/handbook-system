# Express Middleware Patterns

Patterns for organizing and implementing middleware in Express applications following handbook standards.

## Overview

Middleware functions have access to request, response, and next middleware in the application's request-response cycle. This document covers types, patterns, and best practices.

## Middleware Types

### Application-Level Middleware

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger } from './middleware/request-logger.middleware';

const app = express();

// Built-in middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Third-party middleware
app.use(cors());
app.use(helmet());

// Custom middleware
app.use(requestLogger);

export default app;
```

### Router-Level Middleware

```typescript
// src/routes/users.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Apply to all routes in this router
router.use(authMiddleware);

// Or apply to specific routes
router.get('/admin', authMiddleware, adminController.dashboard);

export default router;
```

### Error-Handling Middleware

```typescript
// src/middleware/error-handler.middleware.ts
import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Send response
  res.status(statusCode).json({
    data: null,
    message,
    responseType: 'error',
    toast: {
      type: 'error',
      message
    }
  });
};

// Usage in app.ts (MUST be last middleware)
app.use(errorHandler);
```

## Authentication Middleware

### Session-Based Authentication

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  session?: {
    userId?: string;
  };
  user?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];

    if (!sessionId) {
      return res.status(401).json({
        data: null,
        message: 'Authentication required',
        responseType: 'error'
      });
    }

    // Validate session (from Redis, DB, etc.)
    const session = await sessionService.validate(sessionId);

    if (!session) {
      return res.status(401).json({
        data: null,
        message: 'Invalid or expired session',
        responseType: 'error'
      });
    }

    // Attach user to request
    req.user = await userService.findById(session.userId);
    next();
  } catch (error) {
    next(error);
  }
};
```

### JWT Authentication

```typescript
// src/middleware/jwt-auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  email: string;
}

export const jwtAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        data: null,
        message: 'No token provided',
        responseType: 'error'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    req.user = await userService.findById(decoded.userId);
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        data: null,
        message: 'Invalid token',
        responseType: 'error'
      });
    }
    next(error);
  }
};
```

### Role-Based Authorization

```typescript
// src/middleware/authorization.middleware.ts
import { Request, Response, NextFunction } from 'express';

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        data: null,
        message: 'Authentication required',
        responseType: 'error'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        data: null,
        message: 'Insufficient permissions',
        responseType: 'error'
      });
    }

    next();
  };
};

// Usage
router.get('/admin', authMiddleware, requireRole(['admin']), adminController.dashboard);
```

## Validation Middleware

### express-validator Pattern

```typescript
// src/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      data: null,
      message: 'Validation failed',
      responseType: 'error',
      errors: errors.array()
    });
  };
};

// Usage
import { body } from 'express-validator';

router.post(
  '/users',
  validate([
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('name').notEmpty()
  ]),
  userController.create
);
```

### Schema-Based Validation (Joi)

```typescript
// src/middleware/schema-validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateSchema = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        data: null,
        message: 'Validation failed',
        responseType: 'error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    req.body = value;
    next();
  };
};

// Usage
import Joi from 'joi';

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().required()
});

router.post('/users', validateSchema(createUserSchema), userController.create);
```

## Logging Middleware

### Request Logging

```typescript
// src/middleware/request-logger.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent']
    });
  });

  next();
};
```

### Audit Logging

```typescript
// src/middleware/audit-logger.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

export const auditLogger = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await auditService.log({
        userId: req.user?.id,
        action,
        resource: req.url,
        method: req.method,
        ip: req.ip,
        timestamp: new Date()
      });
      next();
    } catch (error) {
      // Don't block request if audit logging fails
      console.error('Audit logging failed:', error);
      next();
    }
  };
};

// Usage
router.delete('/:id', authMiddleware, auditLogger('delete_user'), userController.delete);
```

## Error Handling Middleware

### Custom Error Classes

```typescript
// src/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}
```

### Comprehensive Error Handler

```typescript
// src/middleware/error-handler.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id
  });

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && !isOperational) {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    data: null,
    message,
    responseType: 'error',
    toast: {
      type: 'error',
      message
    }
  });
};
```

## Middleware Ordering

Critical: Middleware order matters!

```typescript
// src/app.ts
import express from 'express';

const app = express();

// 1. Security middleware (FIRST)
app.use(helmet());
app.use(cors());

// 2. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Logging
app.use(requestLogger);

// 4. Session/auth setup
app.use(sessionMiddleware);

// 5. Routes
app.use('/api/v1', routes);

// 6. 404 handler
app.use((req, res) => {
  res.status(404).json({
    data: null,
    message: 'Route not found',
    responseType: 'error'
  });
});

// 7. Error handler (LAST)
app.use(errorHandler);
```

## Handbook Integration

### Response Envelope Pattern

All middleware should use handbook response format:

```typescript
res.json({
  data: result,
  message: 'Success message',
  responseType: 'success',
  toast: {
    type: 'success',
    message: 'User-facing message'
  }
});
```

### Contract Validation

Middleware should validate against OpenAPI schemas defined in handbook contracts.

## See Also

- [ROUTER_PATTERNS.md](./ROUTER_PATTERNS.md) - Router organization
- [VALIDATION_PATTERNS.md](./VALIDATION_PATTERNS.md) - Request validation
- [../../core/ERROR_HANDLING.md](../../core/ERROR_HANDLING.md) - Error handling standards
