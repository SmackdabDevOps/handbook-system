# Swagger JSDoc Patterns

Patterns for generating OpenAPI documentation from Express code using swagger-jsdoc.

## Overview

swagger-jsdoc enables code-first OpenAPI documentation through JSDoc annotations. However, handbook methodology prefers contract-first development where OpenAPI specs are the source of truth.

Use swagger-jsdoc for:
- Rapid prototyping
- Smaller projects without formal contracts
- Generating initial contracts from existing code

For production systems, prefer maintaining separate OpenAPI YAML files.

## Installation

```bash
npm install swagger-jsdoc swagger-ui-express
npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

## Basic Setup

### TypeScript Configuration

```typescript
// src/config/swagger.config.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SmackChat API',
      version: '1.0.0',
      description: 'Real-time messaging platform API',
      contact: {
        name: 'API Support',
        email: 'support@smackchat.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:8005',
        description: 'Development server'
      },
      {
        url: 'https://api.smackchat.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'sessionId'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [
    './src/routes/*.ts',
    './src/models/*.ts',
    './src/schemas/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
```

### Express Integration

```typescript
// src/app.ts
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config';

const app = express();

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Serve OpenAPI JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

export default app;
```

## Schema Definitions

### Component Schemas

```typescript
/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: User's unique identifier
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         name:
 *           type: string
 *           description: User's full name
 *         avatar:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL to user's avatar image
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of user creation
 *       example:
 *         id: 018c3f9e-7b2a-7890-abcd-ef1234567890
 *         email: user@example.com
 *         name: John Doe
 *         avatar: https://example.com/avatar.jpg
 *         createdAt: 2024-01-15T10:30:00Z
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateUserRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *         name:
 *           type: string
 *           minLength: 1
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     ApiResponse:
 *       type: object
 *       properties:
 *         data:
 *           description: Response payload
 *         message:
 *           type: string
 *           description: Human-readable message
 *         responseType:
 *           type: string
 *           enum: [success, error]
 *         toast:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [success, error, info, warning]
 *             message:
 *               type: string
 */
```

## Path Documentation

### GET Endpoint

```typescript
/**
 * @openapi
 * /users:
 *   get:
 *     summary: List all users
 *     description: Retrieve a paginated list of users
 *     tags:
 *       - Users
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved users
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/User'
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/', authMiddleware, userController.list);
```

### POST Endpoint

```typescript
/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a new user
 *     description: Register a new user account
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/', validateSchema(createUserSchema), userController.create);
```

### Path Parameters

```typescript
/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a single user by their unique identifier
 *     tags:
 *       - Users
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User's unique identifier
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/:id', authMiddleware, userController.getById);
```

## Generating OpenAPI from Code

### Export to YAML

```typescript
// scripts/generate-openapi.ts
import fs from 'fs';
import YAML from 'yaml';
import { swaggerSpec } from '../src/config/swagger.config';

const yamlSpec = YAML.stringify(swaggerSpec);
fs.writeFileSync('./openapi.yaml', yamlSpec);

console.log('OpenAPI spec generated: openapi.yaml');
```

```bash
# Add to package.json
"scripts": {
  "openapi:generate": "ts-node scripts/generate-openapi.ts"
}
```

## Integration with Handbook Contracts

### Hybrid Approach

```typescript
// src/config/swagger.config.ts
import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';
import YAML from 'yaml';

// Load existing handbook contracts
const existingSpec = YAML.parse(
  fs.readFileSync('./openapi/openapi.yaml', 'utf8')
);

const options: swaggerJsdoc.Options = {
  definition: {
    ...existingSpec,
    // Merge with code-generated docs
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
```

### Validation Against Contracts

```typescript
// scripts/validate-implementation.ts
import { swaggerSpec } from '../src/config/swagger.config';
import fs from 'fs';
import YAML from 'yaml';

const contractSpec = YAML.parse(
  fs.readFileSync('./openapi/openapi.yaml', 'utf8')
);

const implementedPaths = Object.keys(swaggerSpec.paths || {});
const contractPaths = Object.keys(contractSpec.paths || {});

const missing = contractPaths.filter(path => !implementedPaths.includes(path));
const extra = implementedPaths.filter(path => !contractPaths.includes(path));

if (missing.length > 0) {
  console.error('Missing implementations:', missing);
  process.exit(1);
}

if (extra.length > 0) {
  console.warn('Extra implementations:', extra);
}

console.log('Implementation matches contract');
```

## Best Practices

### Keep Documentation Close to Code

```typescript
// Good: Documentation right above route
/**
 * @openapi
 * /users:
 *   get:
 *     summary: List users
 */
router.get('/', userController.list);

// Bad: Documentation in separate file
router.get('/', userController.list);
```

### Use Schema References

```typescript
// Good: Reuse schema definitions
/**
 * @openapi
 * /users:
 *   post:
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 */

// Bad: Inline schema duplication
/**
 * @openapi
 * /users:
 *   post:
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: ...
 */
```

### Include Examples

```typescript
/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *       example:
 *         id: 018c3f9e-7b2a-7890-abcd-ef1234567890
 *         email: user@example.com
 */
```

## Handbook Alignment

When using swagger-jsdoc, ensure:
- Response envelopes match handbook pattern
- Security schemes align with handbook auth
- Error responses follow handbook standards
- Pagination follows handbook conventions

## See Also

- [ROUTER_PATTERNS.md](./ROUTER_PATTERNS.md) - Router organization
- [VALIDATION_PATTERNS.md](./VALIDATION_PATTERNS.md) - Request validation
- [../../core/CONTRACT_FIRST_DEVELOPMENT.md](../../core/CONTRACT_FIRST_DEVELOPMENT.md) - Contract-first methodology
