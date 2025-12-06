# Express Validation Patterns

Patterns for validating requests in Express applications following handbook contract-first methodology.

## Overview

Request validation ensures incoming data matches expected schemas before processing. Express supports multiple validation libraries that can integrate with handbook OpenAPI contracts.

## express-validator

### Installation

```bash
npm install express-validator
```

### Basic Usage

```typescript
// src/validators/user.validator.ts
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const createUserValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters')
];

export const updateUserValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid user ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL')
];

export const listUsersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Limit must be between 1 and 100')
];
```

### Validation Middleware

```typescript
// src/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg
    }));

    res.status(400).json({
      data: null,
      message: 'Validation failed',
      responseType: 'error',
      errors: formattedErrors,
      toast: {
        type: 'error',
        message: 'Please check your input and try again'
      }
    });
  };
};

// Usage in routes
import { validate } from '../middleware/validation.middleware';
import { createUserValidation } from '../validators/user.validator';

router.post('/users', validate(createUserValidation), userController.create);
```

## Joi Validation

### Installation

```bash
npm install joi
npm install -D @types/joi
```

### Schema Definition

```typescript
// src/schemas/user.schema.ts
import Joi from 'joi';

export const createUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, and number',
      'any.required': 'Password is required'
    }),
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name cannot be empty',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required'
    })
});

export const updateUserSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
  avatar: Joi.string()
    .uri()
    .optional()
    .allow(null)
});

export const queryUserSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  sortBy: Joi.string()
    .valid('name', 'email', 'createdAt')
    .default('createdAt'),
  order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
});
```

### Validation Middleware

```typescript
// src/middleware/joi-validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

type ValidationTarget = 'body' | 'query' | 'params';

export const validateSchema = (
  schema: Joi.ObjectSchema,
  target: ValidationTarget = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const formattedErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        data: null,
        message: 'Validation failed',
        responseType: 'error',
        errors: formattedErrors,
        toast: {
          type: 'error',
          message: 'Please check your input and try again'
        }
      });
    }

    // Replace with validated and sanitized value
    req[target] = value;
    next();
  };
};

// Usage
import { validateSchema } from '../middleware/joi-validation.middleware';
import { createUserSchema } from '../schemas/user.schema';

router.post('/users', validateSchema(createUserSchema), userController.create);
router.get('/users', validateSchema(queryUserSchema, 'query'), userController.list);
```

## Zod Validation

### Installation

```bash
npm install zod
```

### Schema Definition

```typescript
// src/schemas/user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
  avatar: z
    .string()
    .url('Avatar must be a valid URL')
    .optional()
    .nullable()
});

export const queryUserSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc')
});

// Type inference
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type QueryUserInput = z.infer<typeof queryUserSchema>;
```

### Validation Middleware

```typescript
// src/middleware/zod-validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

export const validateZod = <T>(
  schema: ZodSchema<T>,
  target: ValidationTarget = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req[target]);
      req[target] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          data: null,
          message: 'Validation failed',
          responseType: 'error',
          errors: formattedErrors,
          toast: {
            type: 'error',
            message: 'Please check your input and try again'
          }
        });
      }
      next(error);
    }
  };
};

// Usage
import { validateZod } from '../middleware/zod-validation.middleware';
import { createUserSchema } from '../schemas/user.schema';

router.post('/users', validateZod(createUserSchema), userController.create);
```

## Custom Validators

### Unique Email Validator

```typescript
// src/validators/custom.validator.ts
import { body } from 'express-validator';
import { userService } from '../services/user.service';

export const uniqueEmail = body('email')
  .custom(async (email) => {
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already in use');
    }
    return true;
  });
```

### UUID Validator

```typescript
import { param } from 'express-validator';

export const validateUUID = (paramName: string) =>
  param(paramName)
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Invalid UUID format');
```

## Error Response Formatting

### Handbook-Compliant Errors

```typescript
// src/utils/format-validation-errors.ts
interface ValidationError {
  field: string;
  message: string;
}

export const formatValidationResponse = (errors: ValidationError[]) => {
  return {
    data: null,
    message: 'Validation failed',
    responseType: 'error' as const,
    errors,
    toast: {
      type: 'error' as const,
      message: `${errors.length} validation error${errors.length > 1 ? 's' : ''} occurred`
    }
  };
};
```

## Integration with OpenAPI Contracts

### Generate Validators from OpenAPI

```typescript
// scripts/generate-validators.ts
import fs from 'fs';
import YAML from 'yaml';
import { z } from 'zod';

const openapi = YAML.parse(fs.readFileSync('./openapi/openapi.yaml', 'utf8'));

// Generate Zod schemas from OpenAPI schemas
Object.entries(openapi.components.schemas).forEach(([name, schema]: [string, any]) => {
  // Convert OpenAPI schema to Zod schema
  // (implementation depends on schema complexity)
});
```

## See Also

- [ROUTER_PATTERNS.md](./ROUTER_PATTERNS.md) - Router organization
- [MIDDLEWARE_PATTERNS.md](./MIDDLEWARE_PATTERNS.md) - Middleware patterns
- [../../core/CONTRACT_FIRST_DEVELOPMENT.md](../../core/CONTRACT_FIRST_DEVELOPMENT.md) - Contract-first methodology
