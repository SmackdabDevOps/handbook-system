# Testing Standards

This document defines mandatory testing patterns to ensure tests are maintainable, isolated, and reliable. All new tests must follow these standards.

---

## 1. Test Data Factories (Mandatory)

Test data must be created through factories, never inline.

**Why:** Inline test data is brittle. When a model changes, you update data creation in dozens of places. Factories centralize this, making tests maintainable.

### 1.1 Factory Location

```
test/
  factories/
    user.factory.ts
    workspace.factory.ts
    channel.factory.ts
    message.factory.ts
    ...
```

### 1.2 Factory Pattern

Every factory must:

- Return a valid, complete object by default.
- Accept an `overrides` parameter for customization.
- Use realistic default values (not placeholders like "test" or "foo").

```typescript
// test/factories/user.factory.ts
import { User } from '../../src/database/models/user.model';
import { UuidUtil } from '../../src/common/utils/uuid.util';

export class UserFactory {
  static create(overrides?: Partial<User>): Partial<User> {
    const id = UuidUtil.generate();
    return {
      id,
      email: `user-${id.slice(0, 8)}@example.com`,
      name: 'Test User',
      password_hash: '$2b$10$hashedpassword',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<User>): Partial<User>[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
```

### 1.3 Usage in Tests

```typescript
// Correct - using factory
const user = UserFactory.create();
const adminUser = UserFactory.create({ role: 'admin' });
const users = UserFactory.createMany(5);

// FORBIDDEN - inline data creation
const user = {
  id: '123',
  email: 'test@example.com',
  // ... repeating this in every test
};
```

### 1.4 Factory Requirements

Every model used in tests must have a corresponding factory:

| Model | Factory File |
|-------|--------------|
| User | `test/factories/user.factory.ts` |
| Workspace | `test/factories/workspace.factory.ts` |
| Channel | `test/factories/channel.factory.ts` |
| Message | `test/factories/message.factory.ts` |
| ChannelMember | `test/factories/channel-member.factory.ts` |

Add new factories as models are created.

---

## 2. Database Transaction Rollback (Mandatory)

Every test that touches the database must use transaction rollback for isolation.

**Why:** Without rollback, tests pollute each other. Test A inserts data, Test B sees it. Tests become order-dependent and flaky.

### 2.1 The Problem (Do Not Do This)

```typescript
// FORBIDDEN - tests pollute each other
describe('UserService', () => {
  it('should create a user', async () => {
    await userService.create({ email: 'test@example.com' });
    // User is now permanently in the database
  });

  it('should find all users', async () => {
    const users = await userService.findAll();
    // This test finds the user from the previous test!
    // Tests are NOT isolated
  });
});
```

### 2.2 The Solution (Transaction Rollback)

```typescript
// CORRECT - each test is isolated
describe('UserService', () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it('should create a user', async () => {
    await User.create(
      { email: 'test@example.com' },
      { transaction }
    );
    const users = await User.findAll({ transaction });
    expect(users).toHaveLength(1);
    // After test ends, transaction rolls back
    // User is never committed to database
  });

  it('should find all users', async () => {
    const users = await User.findAll({ transaction });
    // Database is clean - previous test's data is gone
    expect(users).toHaveLength(0);
  });
});
```

### 2.3 NestJS Integration Pattern

For service tests that need dependency injection:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';

describe('UserService', () => {
  let module: TestingModule;
  let service: UserService;
  let sequelize: Sequelize;
  let transaction: Transaction;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<UserService>(UserService);
    sequelize = module.get<Sequelize>(Sequelize);
  });

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should create user within transaction', async () => {
    // Pass transaction to service methods that support it
    // Or use CLS (Continuation Local Storage) for automatic propagation
  });
});
```

### 2.4 E2E Tests with Rollback

For E2E tests hitting real endpoints:

```typescript
describe('Users API (e2e)', () => {
  let app: INestApplication;
  let sequelize: Sequelize;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    sequelize = moduleFixture.get<Sequelize>(Sequelize);
    await app.init();
  });

  beforeEach(async () => {
    // Truncate tables or use transaction
    await sequelize.truncate({ cascade: true });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### 2.5 When Truncate vs Rollback

| Approach | Use When |
|----------|----------|
| Transaction rollback | Unit tests, service tests, fast isolation needed |
| Table truncation | E2E tests where transactions can't span HTTP requests |
| Seeder reset | Full integration tests that need baseline data |

---

## 3. Test Isolation Rules

Tests must be completely independent:

- **No shared mutable state** between tests.
- **No test order dependency** - tests must pass in any order.
- **No external service dependency** without mocks (except database).
- **No time-dependent assertions** without mocking time.

### 3.1 Forbidden Patterns

```typescript
// FORBIDDEN - shared state
let userId: string;

it('creates user', async () => {
  const user = await createUser();
  userId = user.id; // Leaking state to other tests
});

it('finds user', async () => {
  const user = await findUser(userId); // Depends on previous test
});
```

```typescript
// CORRECT - each test creates its own data
it('creates user', async () => {
  const user = await createUser();
  expect(user.id).toBeDefined();
});

it('finds user', async () => {
  const created = await createUser(); // Creates its own user
  const found = await findUser(created.id);
  expect(found.id).toBe(created.id);
});
```

---

## 4. Test File Organization

```
test/
  factories/           # Data factories (mandatory)
    user.factory.ts
    workspace.factory.ts
    ...
  fixtures/            # Static test data (JSON, files)
  helpers/             # Test utilities, setup functions
    transaction.helper.ts
    auth.helper.ts
  contracts/           # OpenAPI contract tests
    *.contract.spec.ts
  e2e/                 # End-to-end API tests
    *.e2e-spec.ts
  unit/                # Unit tests (if not co-located)
    *.spec.ts
```

### 4.1 Co-located vs Centralized Tests

| Test Type | Location |
|-----------|----------|
| Unit tests | Co-located: `src/modules/*/services/__tests__/*.spec.ts` |
| Contract tests | Centralized: `test/contracts/*.contract.spec.ts` |
| E2E tests | Centralized: `test/e2e/*.e2e-spec.ts` |
| Factories | Centralized: `test/factories/*.factory.ts` |

---

## 5. Required Test Helpers

Every project must have these test helpers:

### 5.1 Transaction Helper

```typescript
// test/helpers/transaction.helper.ts
import { Sequelize, Transaction } from 'sequelize';

export class TransactionHelper {
  private transaction: Transaction | null = null;

  constructor(private sequelize: Sequelize) {}

  async start(): Promise<Transaction> {
    this.transaction = await this.sequelize.transaction();
    return this.transaction;
  }

  async rollback(): Promise<void> {
    if (this.transaction) {
      await this.transaction.rollback();
      this.transaction = null;
    }
  }

  get current(): Transaction | null {
    return this.transaction;
  }
}
```

### 5.2 Auth Helper

```typescript
// test/helpers/auth.helper.ts
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { UserFactory } from '../factories/user.factory';

export class AuthHelper {
  constructor(private app: INestApplication) {}

  async createAuthenticatedUser(overrides?: Partial<User>): Promise<{
    user: User;
    sessionCookie: string;
  }> {
    const userData = UserFactory.create(overrides);

    const registerRes = await request(this.app.getHttpServer())
      .post('/auth/register')
      .send({
        email: userData.email,
        password: 'Password123!',
        name: userData.name,
      });

    return {
      user: registerRes.body.data.user,
      sessionCookie: registerRes.headers['set-cookie'][0],
    };
  }
}
```

---

## 6. Enforcement

These standards are enforced by:

1. **Code review** - Reviewers must reject tests without factories or isolation.
2. **CI checks** - Test suite must pass with randomized test order.
3. **Linting** - ESLint rules can flag inline object literals in test files.

### 6.1 CI Configuration

```yaml
# Run tests in random order to catch isolation issues
test:
  script: jest --runInBand --randomize
```

### 6.2 Pre-merge Checklist

Before merging any test changes:

- [ ] All test data created via factories
- [ ] Database operations wrapped in transactions or truncated
- [ ] No shared mutable state between tests
- [ ] Tests pass in randomized order
