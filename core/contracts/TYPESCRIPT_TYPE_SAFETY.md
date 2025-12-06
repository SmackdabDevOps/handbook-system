# TypeScript Type Safety Standards

This document defines mandatory TypeScript patterns to prevent `any` type proliferation and ensure type safety across the codebase.

---

## 1. The `any` Rule (FORBIDDEN)

**NEVER** use the `any` type in production code.

### 1.1 tsconfig.json Enforcement

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

### 1.2 Replacements for Common `any` Patterns

| Instead of | Use |
|------------|-----|
| `any` | `unknown` (when type is truly unknown) |
| `any[]` | `T[]` or `unknown[]` |
| `Record<string, any>` | `Record<string, unknown>` |
| `Promise<any>` | `Promise<T>` with defined type |
| Function with `any` return | Define return interface |
| Catch block `(error: any)` | `(error: unknown)` then type-narrow |

### 1.3 Type Narrowing Pattern

```typescript
// ✅ CORRECT - Type narrowing
catch (error: unknown) {
  if (error instanceof Error) {
    logger.error(error.message);
  }
  throw error;
}

// ❌ FORBIDDEN
catch (error: any) {
  logger.error(error.message);
}
```

---

## 2. Sequelize/ORM Type Patterns

### 2.1 Where Clauses

```typescript
import { WhereOptions } from 'sequelize';
import { User } from '../models/user.model';

// ✅ CORRECT - Typed where clause
const where: WhereOptions<User> = { email, is_active: true };

// ❌ FORBIDDEN
const where: any = { email };
```

### 2.2 Order Clauses

```typescript
import { Order } from 'sequelize';

// ✅ CORRECT - Typed order
const order: Order = [['created_at', 'DESC']];

// ❌ FORBIDDEN
const order: any = [['created_at', 'DESC']];
```

### 2.3 Query Options

```typescript
import { FindOptions } from 'sequelize';

// ✅ CORRECT
const options: FindOptions<User> = {
  where: { is_active: true },
  order: [['created_at', 'DESC']],
  limit: 50,
};
```

---

## 3. JSONB Field Typing

JSONB columns must have defined interfaces, not `any`.

### 3.1 Define Interfaces for JSONB Data

```typescript
// ✅ CORRECT - Define the shape
interface RichContentBlock {
  type: 'paragraph' | 'heading' | 'list' | 'code' | 'quote';
  content?: string;
  children?: RichContentBlock[];
}

interface RichContent {
  blocks?: RichContentBlock[];
  mentions?: Array<{ userId: string; offset: number }>;
  version?: string;
}

@Column(DataType.JSONB)
rich_content?: RichContent;

// ❌ FORBIDDEN
@Column(DataType.JSONB)
rich_content?: any;
```

### 3.2 Settings/Preferences Pattern

```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
  };
  language: string;
}

@Column(DataType.JSONB)
preferences?: UserPreferences;
```

---

## 4. Third-Party Library Types

When libraries lack types:

1. **Check DefinitelyTyped first:** `@types/package-name`
2. **Create local declarations:** `src/types/package-name.d.ts`
3. **Never use `// @ts-ignore`** without a comment explaining why

### 4.1 Local Type Declaration Pattern

```typescript
// src/types/untyped-library.d.ts
declare module 'untyped-library' {
  export interface Config {
    option1: string;
    option2: number;
  }
  export function initialize(config: Config): void;
}
```

---

## 5. Function Parameter and Return Types

### 5.1 Always Type Parameters

```typescript
// ✅ CORRECT
async function findUsers(filters: UserFilters): Promise<User[]> {
  // ...
}

// ❌ FORBIDDEN
async function findUsers(filters): Promise<any> {
  // ...
}
```

### 5.2 Generic Constraints

```typescript
// ✅ CORRECT - Constrained generic
function merge<T extends Record<string, unknown>>(a: T, b: Partial<T>): T {
  return { ...a, ...b };
}

// ❌ FORBIDDEN - Unconstrained any
function merge(a: any, b: any): any {
  return { ...a, ...b };
}
```

---

## 6. Enforcement

- **CI/CD:** TypeScript compilation must pass with `strict: true`
- **Code Review:** Reject any PR introducing `any` types
- **ESLint:** Enable `@typescript-eslint/no-explicit-any` rule
- **Pre-commit:** Run type checking before allowing commits
