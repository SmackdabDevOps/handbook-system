# NestJS Controller Patterns for Contract Compliance

> **Purpose:** This guide documents how the endpoint validation script detects
> NestJS controller routes, and the patterns that must be followed for proper detection.

---

## How Endpoint Detection Works

The `npm run endpoints:validate` script parses controller files to discover implemented
endpoints. It uses regex pattern matching on TypeScript source files to find:

1. `@Controller()` decorators to determine base paths
2. HTTP method decorators (`@Get`, `@Post`, etc.) to find routes
3. Combines controller base path + route path to build full endpoint paths

---

## Supported Controller Decorator Patterns

### With Base Path ✅
```typescript
@Controller('channels')
export class ChannelsController {
  @Get()                    // → GET /channels
  @Get(':id')               // → GET /channels/:id
  @Post()                   // → POST /channels
}
```

### Empty Base Path ✅
```typescript
@Controller()
export class PresenceController {
  @Get('presence/me')           // → GET /presence/me
  @Get('channels/:id/presence') // → GET /channels/:id/presence
  @Patch('presence/me')         // → PATCH /presence/me
}
```

### With Quoted Path (Single or Double) ✅
```typescript
@Controller('auth')     // ✅ Single quotes
@Controller("auth")     // ✅ Double quotes
```

---

## Supported Route Decorator Patterns

### Basic Routes ✅
```typescript
@Get()                      // No additional path
@Get('messages')            // Relative path
@Get(':channelId/messages') // With path parameter
@Post('messages/:id/react') // Nested with parameter
```

### All HTTP Methods ✅
```typescript
@Get()      // GET request
@Post()     // POST request
@Put()      // PUT request (full replacement)
@Patch()    // PATCH request (partial update)
@Delete()   // DELETE request
```

---

## Path Parameter Normalization

The validation script normalizes all path parameters to `:param` for matching:

| Source | Original | Normalized |
|--------|----------|------------|
| Controller | `@Get(':channelId/messages')` | `/channels/:param/messages` |
| OpenAPI | `/channels/{channelId}/messages` | `/channels/:param/messages` |
| User Story | `` `GET /channels/:channelId/messages` `` | `GET /channels/:param/messages` |

**All three sources must normalize to the same path for the endpoint to be matched.**

---

## Common Detection Issues

### Issue: Controller Not Detected

**Symptom:** No endpoints from a controller appear in validation.

**Possible Causes:**
1. Missing `@Controller()` decorator
2. Controller not registered in module's `controllers` array
3. Controller file not in expected path (`src/modules/*/controllers/*.ts`)

**Fix:**
```typescript
// Ensure decorator exists
@Controller('mymodule')
export class MyController { ... }

// Ensure module registration
@Module({
  controllers: [MyController],  // ← Must be listed here
})
export class MyModule {}
```

### Issue: Route Not Detected

**Symptom:** Controller is detected but specific route is missing.

**Possible Causes:**
1. Missing HTTP method decorator
2. Decorator on wrong line (must be directly above method)
3. Typo in decorator name

**Fix:**
```typescript
// Decorator must be directly above method
@Get('messages')  // ✅ Correct placement
async getMessages() { ... }

// Not this:
@Get('messages')

// ❌ Blank line breaks detection
async getMessages() { ... }
```

### Issue: Path Mismatch

**Symptom:** Endpoint shows as both "planned" (OpenAPI) and "unclassified" (controller).

**Cause:** Different paths that don't normalize to the same value.

**Example Problem:**
```
OpenAPI:     /channels/{channelId}/messages
Controller:  /channel/:channelId/messages   ← Missing 's' in 'channels'
```

**Fix:** Ensure exact path match (except parameter names).

---

## Full Path Construction

The full endpoint path is built as:

```
Full Path = "/" + Controller Base + "/" + Route Path
           (normalized to remove double slashes)
```

**Examples:**

| Controller | Route | Full Path |
|------------|-------|-----------|
| `@Controller('channels')` | `@Get()` | `/channels` |
| `@Controller('channels')` | `@Get(':id')` | `/channels/:id` |
| `@Controller()` | `@Get('presence/me')` | `/presence/me` |
| `@Controller('auth')` | `@Post('login')` | `/auth/login` |

---

## Validation Script Behavior

When `npm run endpoints:validate` runs:

1. **Scans** all `src/modules/*/controllers/*.ts` files
2. **Parses** each file for `@Controller` and HTTP method decorators
3. **Builds** full paths by combining controller base + route path
4. **Normalizes** path parameters to `:param`
5. **Matches** against:
   - OpenAPI specs (contract definitions)
   - User stories (documentation references)
   - Existing registry entries
6. **Classifies** each endpoint as:
   - **Complete**: Implemented + Documented (OpenAPI + Story) + Tested
   - **Partial**: Implemented + Documented, missing tests
   - **Planned**: Documented but not implemented
   - **Missing**: In registry but not in controller
   - **Unclassified**: Implemented but not documented

---

## Best Practices

1. **Use consistent base paths** - All endpoints for a feature should share a controller
2. **Keep paths simple** - Avoid deeply nested routes when possible
3. **Match OpenAPI exactly** - Path segments must be identical (only param names differ)
4. **Document as you implement** - Add user story reference immediately after implementing
5. **Run validation frequently** - `npm run endpoints:validate` after each new endpoint
