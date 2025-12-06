# Express Testing Patterns

Patterns for testing Express applications following handbook TDD methodology.

## Overview

Testing Express applications requires integration tests (API endpoints), unit tests (services/utilities), and contract tests (OpenAPI compliance). This document covers patterns using Jest and supertest.

## Installation

```bash
npm install -D jest @types/jest ts-jest supertest @types/supertest
npm install -D @jest/globals  # For TypeScript ESM support
```

## Jest Configuration

### TypeScript Setup

```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};

export default config;
```

### Test Setup File

```typescript
// test/setup.ts
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(10000);

// Suppress console logs in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};
```

## Integration Tests with supertest

### Basic API Test

```typescript
// test/integration/users.test.ts
import request from 'supertest';
import app from '../../src/app';
import { sequelize } from '../../src/database/connection';

describe('Users API', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User'
        })
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.body).toMatchObject({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        },
        message: 'User created successfully',
        responseType: 'success'
      });

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Test User'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        data: null,
        message: 'Validation failed',
        responseType: 'error'
      });

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'email',
          message: expect.stringContaining('email')
        })
      );
    });

    it('should return 400 for duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/users')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          name: 'First User'
        })
        .expect(201);

      // Attempt to create duplicate
      const response = await request(app)
        .post('/users')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          name: 'Second User'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        data: null,
        message: expect.stringContaining('already'),
        responseType: 'error'
      });
    });
  });

  describe('GET /users/:id', () => {
    let userId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/users')
        .send({
          email: 'getuser@example.com',
          password: 'Password123!',
          name: 'Get User'
        });
      userId = response.body.data.id;
    });

    it('should get user by ID', async () => {
      const response = await request(app)
        .get(`/users/${userId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        data: {
          id: userId,
          email: 'getuser@example.com',
          name: 'Get User'
        },
        message: 'User retrieved successfully',
        responseType: 'success'
      });
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/018c3f9e-7b2a-7890-abcd-ef1234567890')
        .expect(404);

      expect(response.body).toMatchObject({
        data: null,
        message: expect.stringContaining('not found'),
        responseType: 'error'
      });
    });
  });
});
```

### Authenticated Requests

```typescript
// test/helpers/auth.helper.ts
import request from 'supertest';
import app from '../../src/app';

export async function createAuthenticatedUser() {
  // Create user
  const userResponse = await request(app)
    .post('/users')
    .send({
      email: `test-${Date.now()}@example.com`,
      password: 'Password123!',
      name: 'Test User'
    });

  const userId = userResponse.body.data.id;

  // Login to get session
  const loginResponse = await request(app)
    .post('/auth/login')
    .send({
      email: userResponse.body.data.email,
      password: 'Password123!'
    });

  const sessionId = loginResponse.headers['set-cookie']
    ?.find((cookie: string) => cookie.startsWith('sessionId='))
    ?.split(';')[0]
    ?.split('=')[1];

  return { userId, sessionId };
}

// Usage in tests
describe('Protected Routes', () => {
  let sessionId: string;

  beforeEach(async () => {
    const auth = await createAuthenticatedUser();
    sessionId = auth.sessionId;
  });

  it('should access protected route with session', async () => {
    const response = await request(app)
      .get('/users/me')
      .set('Cookie', [`sessionId=${sessionId}`])
      .expect(200);

    expect(response.body.data).toHaveProperty('email');
  });

  it('should reject request without session', async () => {
    await request(app)
      .get('/users/me')
      .expect(401);
  });
});
```

## Unit Tests

### Service Layer Testing

```typescript
// test/unit/services/user.service.test.ts
import { UserService } from '../../../src/services/user.service';
import { User } from '../../../src/models/user.model';

jest.mock('../../../src/models/user.model');

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: '018c3f9e-7b2a-7890-abcd-ef1234567890',
        email: 'test@example.com',
        name: 'Test User'
      };

      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(User.findByPk).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return null when user not found', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await userService.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      const dbError = new Error('Database connection failed');
      (User.findByPk as jest.Mock).mockRejectedValue(dbError);

      await expect(
        userService.findById('some-id')
      ).rejects.toThrow('Database connection failed');
    });
  });
});
```

### Middleware Testing

```typescript
// test/unit/middleware/auth.middleware.test.ts
import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../../src/middleware/auth.middleware';
import { sessionService } from '../../../src/services/session.service';

jest.mock('../../../src/services/session.service');

describe('authMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      cookies: {},
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should call next() with valid session', async () => {
    req.cookies = { sessionId: 'valid-session-id' };
    const mockSession = { userId: 'user-123' };

    (sessionService.validate as jest.Mock).mockResolvedValue(mockSession);

    await authMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 without session ID', async () => {
    await authMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: null,
        message: 'Authentication required',
        responseType: 'error'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 with invalid session', async () => {
    req.cookies = { sessionId: 'invalid-session' };

    (sessionService.validate as jest.Mock).mockResolvedValue(null);

    await authMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
```

## Database Testing Strategies

### Test Database Setup

```typescript
// test/helpers/database.helper.ts
import { Sequelize } from 'sequelize';

export async function setupTestDatabase() {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.TEST_DB_HOST,
    port: Number(process.env.TEST_DB_PORT),
    database: process.env.TEST_DB_NAME,
    username: process.env.TEST_DB_USER,
    password: process.env.TEST_DB_PASSWORD,
    logging: false
  });

  await sequelize.sync({ force: true });
  return sequelize;
}

export async function teardownTestDatabase(sequelize: Sequelize) {
  await sequelize.drop();
  await sequelize.close();
}
```

### Transaction Rollback Pattern

```typescript
// test/integration/users-transaction.test.ts
import { sequelize } from '../../src/database/connection';

describe('Users API with transactions', () => {
  let transaction: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it('should create user in transaction', async () => {
    // Test logic using transaction
    // Changes will be rolled back after test
  });
});
```

## Contract Tests

### OpenAPI Compliance Testing

```typescript
// test/contract/openapi.test.ts
import request from 'supertest';
import app from '../../src/app';
import OpenAPIValidator from 'express-openapi-validator';
import YAML from 'yaml';
import fs from 'fs';

const spec = YAML.parse(fs.readFileSync('./openapi/openapi.yaml', 'utf8'));

describe('OpenAPI Contract Tests', () => {
  it('should validate response against OpenAPI spec', async () => {
    const response = await request(app)
      .get('/users')
      .expect(200);

    // Validate response matches schema
    const userSchema = spec.components.schemas.User;
    expect(response.body.data).toMatchObject({
      users: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String),
          name: expect.any(String)
        })
      ])
    });
  });
});
```

## Coverage Configuration

### package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=test/integration",
    "test:unit": "jest --testPathPattern=test/unit",
    "test:contract": "jest --testPathPattern=test/contract"
  }
}
```

### Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage

# View report
open coverage/lcov-report/index.html
```

## See Also

- [ROUTER_PATTERNS.md](./ROUTER_PATTERNS.md) - Router organization
- [MIDDLEWARE_PATTERNS.md](./MIDDLEWARE_PATTERNS.md) - Middleware patterns
- [../../core/TESTING.md](../../core/TESTING.md) - Handbook testing standards
