# Express Router Patterns

Patterns for organizing routes in Express applications following handbook contract-first methodology.

## Overview

Express Router enables modular, mountable route handlers. This document covers patterns for organizing routes that align with OpenAPI contracts and handbook validation.

## Basic Router Structure

### TypeScript Example

```typescript
// src/routes/users.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema';

const router = Router();
const userController = new UserController();

// GET /users - List users
router.get(
  '/',
  authMiddleware,
  userController.list.bind(userController)
);

// GET /users/:id - Get user by ID
router.get(
  '/:id',
  authMiddleware,
  userController.getById.bind(userController)
);

// POST /users - Create user
router.post(
  '/',
  validateRequest(createUserSchema),
  userController.create.bind(userController)
);

// PUT /users/:id - Update user
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateUserSchema),
  userController.update.bind(userController)
);

// DELETE /users/:id - Delete user
router.delete(
  '/:id',
  authMiddleware,
  userController.delete.bind(userController)
);

export default router;
```

### JavaScript Example

```javascript
// src/routes/users.routes.js
const { Router } = require('express');
const UserController = require('../controllers/user.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { createUserSchema, updateUserSchema } = require('../schemas/user.schema');

const router = Router();
const userController = new UserController();

router.get('/', authMiddleware, userController.list.bind(userController));
router.get('/:id', authMiddleware, userController.getById.bind(userController));
router.post('/', validateRequest(createUserSchema), userController.create.bind(userController));
router.put('/:id', authMiddleware, validateRequest(updateUserSchema), userController.update.bind(userController));
router.delete('/:id', authMiddleware, userController.delete.bind(userController));

module.exports = router;
```

## Route Grouping Strategies

### Feature-Based Grouping

```typescript
// src/routes/index.ts
import { Router } from 'express';
import usersRouter from './users.routes';
import channelsRouter from './channels.routes';
import messagesRouter from './messages.routes';
import authRouter from './auth.routes';

const router = Router();

// Version 1 API
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/channels', channelsRouter);
router.use('/messages', messagesRouter);

export default router;
```

### Versioned Routes

```typescript
// src/routes/v1/index.ts
import { Router } from 'express';
import usersRouter from './users.routes';
import channelsRouter from './channels.routes';

const v1Router = Router();
v1Router.use('/users', usersRouter);
v1Router.use('/channels', channelsRouter);

export { v1Router };

// src/app.ts
import { v1Router } from './routes/v1';
import { v2Router } from './routes/v2';

app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
```

## Parameter Handling

### Route Parameters

```typescript
// Single parameter
router.get('/:id', (req, res) => {
  const { id } = req.params;
  // Use id
});

// Multiple parameters
router.get('/:workspaceId/channels/:channelId', (req, res) => {
  const { workspaceId, channelId } = req.params;
  // Use workspaceId and channelId
});

// Parameter middleware
router.param('id', async (req, res, next, id) => {
  try {
    const user = await userService.findById(id);
    if (!user) {
      return res.status(404).json({
        data: null,
        message: 'User not found',
        responseType: 'error'
      });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
});
```

### Query Parameters

```typescript
router.get('/', async (req, res, next) => {
  try {
    // Extract and validate query params
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const result = await userService.list({
      page: Number(page),
      limit: Number(limit),
      sortBy: String(sortBy),
      order: String(order)
    });

    res.json({
      data: result,
      message: 'Users retrieved successfully',
      responseType: 'success'
    });
  } catch (error) {
    next(error);
  }
});
```

## Async Route Handlers

### Wrapper Function Pattern

```typescript
// src/utils/async-handler.ts
import { Request, Response, NextFunction } from 'express';

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const asyncHandler = (fn: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage
router.get('/', asyncHandler(async (req, res) => {
  const users = await userService.findAll();
  res.json({
    data: users,
    message: 'Users retrieved successfully',
    responseType: 'success'
  });
}));
```

### Class-Based Controller Pattern

```typescript
// src/controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.userService.findAll();
      res.json({
        data: users,
        message: 'Users retrieved successfully',
        responseType: 'success'
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.findById(id);
      res.json({
        data: user,
        message: 'User retrieved successfully',
        responseType: 'success'
      });
    } catch (error) {
      next(error);
    }
  }
}
```

## Route-Level Middleware

### Authentication and Authorization

```typescript
router.get(
  '/admin',
  authMiddleware,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    // Admin-only route
  })
);
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later'
});

router.post('/login', loginLimiter, authController.login);
```

### Request Validation

```typescript
router.post(
  '/',
  validateRequest(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.create(req.body);
    res.status(201).json({
      data: user,
      message: 'User created successfully',
      responseType: 'success'
    });
  })
);
```

## Complete Router Example

```typescript
// src/routes/channels.routes.ts
import { Router } from 'express';
import { ChannelController } from '../controllers/channel.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/async-handler';
import {
  createChannelSchema,
  updateChannelSchema,
  addMemberSchema
} from '../schemas/channel.schema';

const router = Router();
const channelController = new ChannelController();

// All routes require authentication
router.use(authMiddleware);

// List channels
router.get(
  '/',
  asyncHandler(channelController.list.bind(channelController))
);

// Get channel by ID
router.get(
  '/:id',
  asyncHandler(channelController.getById.bind(channelController))
);

// Create channel
router.post(
  '/',
  validateRequest(createChannelSchema),
  asyncHandler(channelController.create.bind(channelController))
);

// Update channel
router.put(
  '/:id',
  validateRequest(updateChannelSchema),
  asyncHandler(channelController.update.bind(channelController))
);

// Delete channel
router.delete(
  '/:id',
  asyncHandler(channelController.delete.bind(channelController))
);

// Add member to channel
router.post(
  '/:id/members',
  validateRequest(addMemberSchema),
  asyncHandler(channelController.addMember.bind(channelController))
);

export default router;
```

## Handbook Integration

### Contract-First Routing

Ensure routes match OpenAPI paths exactly:

```typescript
// From openapi/paths/users.yaml:
// /users/{id}:
//   get:
//     operationId: getUserById

// Router MUST match:
router.get('/:id', userController.getById);
```

### Validation Against Contracts

Use `npm run endpoints:validate` to verify:
- All OpenAPI paths have corresponding routes
- Route parameters match contract definitions
- HTTP methods align with contract specifications

## See Also

- [MIDDLEWARE_PATTERNS.md](./MIDDLEWARE_PATTERNS.md) - Middleware organization
- [VALIDATION_PATTERNS.md](./VALIDATION_PATTERNS.md) - Request validation
- [SWAGGER_JSDOC.md](./SWAGGER_JSDOC.md) - Generating OpenAPI from routes
- [../../core/CONTRACT_FIRST_DEVELOPMENT.md](../../core/CONTRACT_FIRST_DEVELOPMENT.md) - Contract-first methodology
