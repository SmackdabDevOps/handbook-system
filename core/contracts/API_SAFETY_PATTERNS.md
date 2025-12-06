# API Safety Patterns

This document defines mandatory patterns to prevent DoS attacks, resource exhaustion, and other API abuse.

---

## 1. Pagination Limits (Mandatory)

All paginated endpoints must enforce server-side maximum limits. Never trust client-provided limits.

### 1.1 Required Pattern

```typescript
// ✅ REQUIRED - Always cap the limit
const limit = Math.min(requestedLimit || 50, 100);

// ❌ FORBIDDEN - Trusting client limit
const limit = requestedLimit || 50;  // Client could request 10,000,000
```

### 1.2 Standard Limits

| Use Case | Default | Maximum |
|----------|---------|---------|
| List endpoints (messages, users) | 50 | 100 |
| Search results | 25 | 100 |
| Bulk operations | 50 | 100 |
| Export operations | 100 | 1000 |
| Autocomplete/suggestions | 10 | 25 |

### 1.3 DTO Validation

```typescript
import { IsInt, Min, Max, IsOptional } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)  // Enforce at DTO level too
  limit?: number = 50;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
```

### 1.4 OpenAPI Documentation

All paginated endpoints must document limits in the contract:

```yaml
parameters:
  - name: limit
    in: query
    description: Maximum number of items to return
    schema:
      type: integer
      default: 50
      minimum: 1
      maximum: 100
  - name: offset
    in: query
    description: Number of items to skip
    schema:
      type: integer
      default: 0
      minimum: 0
```

---

## 2. Request Size Limits

### 2.1 Body Parser Configuration

```typescript
// main.ts
app.use(json({ limit: '1mb' }));
app.use(urlencoded({ limit: '1mb', extended: true }));
```

### 2.2 File Upload Limits

```typescript
// For file uploads, use appropriate limits
@UseInterceptors(FileInterceptor('file', {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
}))
```

---

## 3. Bulk Operation Limits

### 3.1 Array Size Validation

```typescript
import { ArrayMaxSize } from 'class-validator';

export class BulkDeleteDto {
  @ArrayMaxSize(100)  // Never allow unbounded arrays
  ids: string[];
}
```

### 3.2 Batch Processing Pattern

```typescript
// For large operations, process in batches
async function bulkProcess<T>(items: T[], batchSize = 50): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await processBatch(batch);
  }
}
```

---

## 4. Query Timeout Protection

### 4.1 Database Query Timeouts

```typescript
// Set statement timeout for long-running queries
const results = await sequelize.query(sql, {
  type: QueryTypes.SELECT,
  timeout: 30000, // 30 second timeout
});
```

### 4.2 HTTP Request Timeouts

```typescript
// For external API calls
const response = await axios.get(url, {
  timeout: 10000, // 10 second timeout
});
```

---

## 5. Input Sanitization

### 5.1 String Length Limits

```typescript
import { MaxLength } from 'class-validator';

export class CreateMessageDto {
  @MaxLength(10000)  // Reasonable message length
  content: string;

  @MaxLength(255)    // Channel names are short
  name?: string;
}
```

### 5.2 Prevent Regex DoS

```typescript
// ❌ DANGEROUS - User input in regex
const pattern = new RegExp(userInput);

// ✅ SAFE - Escape user input
import { escapeRegExp } from 'lodash';
const pattern = new RegExp(escapeRegExp(userInput));
```

---

## 6. Enforcement

- **DTO Validation:** All list endpoints must use `PaginationDto` or equivalent
- **Code Review:** Verify `Math.min()` pattern on all limit parameters
- **OpenAPI:** Document `maximum` on all pagination parameters
- **Tests:** Include tests that verify limit enforcement
