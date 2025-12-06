# Modular Authentication System – Standalone and SSO

This document expands on section **2.14** of `SYSTEM_DELIVERY_PLAYBOOK.md` and defines the shared authentication architecture all new projects must use.

---

## 1. Core Components

Every backend must implement these building blocks:

- **Auth Provider Interface (`IAuthProvider`)**
  - Methods:
    - `register(data: RegisterData): Promise<AuthResult>`
    - `login(data: LoginData): Promise<AuthResult>`
    - `logout(sessionId: string): Promise<void>`
    - `validateSession(sessionId: string): Promise<SessionData | null>`
    - `getUserBySession(sessionId: string): Promise<{ user; organization?; session } | null>`
    - `refreshSession(sessionId: string): Promise<SessionData | null>`
    - `cleanupExpiredSessions(): Promise<void>`
  - Data shapes:
    - `RegisterData`: `{ email, password, name, organization_name }`
    - `LoginData`: `{ email, password }`
    - `SessionData`: `{ userId, email, organizationId, workspaceId?, createdAt, expiresAt }`
    - `AuthResult`: `{ session_id, user, organization? }`

- **StandaloneAuthProvider**
  - Default implementation for new projects:
    - Owns its own `User`, `Organization`, `Workspace`, and membership tables.
    - Stores `SessionData` in Redis (or equivalent cache) at keys `session:{sessionId}` with TTL.
    - Returns `session_id` used for HTTP and WebSocket authentication.

- **AuthProviderFactory**
  - Reads `AUTH_MODE` from environment:
    - `AUTH_MODE=standalone` → returns `StandaloneAuthProvider`.
    - `AUTH_MODE={PROJECT_MODE}` (future) → returns `{PROJECT_NAME}AuthProvider` (delegated SSO).
  - Exposes:
    - `getProvider(): IAuthProvider`
    - `isStandalone(): boolean`
    - `isProjectMode(): boolean`

- **Future {PROJECT_NAME}AuthProvider**
  - To be implemented when central SSO is ready.
  - Delegates register/login/session validation to the central auth service.
  - Maps responses into `AuthResult` and `SessionData` so application code does not need to change when switching modes.

---

## 2. Standard Auth Endpoints

All backends must expose the same auth endpoints and shapes:

- **POST `/auth/register`**
  - Body:
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePass123!",
      "name": "User Name",
      "organization_name": "Org Name"
    }
    ```
  - Response:
    ```json
    {
      "session_id": "uuid",
      "user": { "id": "…", "email": "…", "name": "…" },
      "organization": { "id": "…", "name": "…" }
    }
    ```

- **POST `/auth/login`**
  - Body:
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePass123!"
    }
    ```
  - Response: same `AuthResult` structure as register.

- **GET `/auth/me`**
  - Auth:
    - `Authorization: Bearer {session_id}` header, or
    - Project‑standard cookie, if documented.
  - Response:
    ```json
    {
      "user": { "id": "…", "email": "…", "name": "…" },
      "organization": { "id": "…", "name": "…" },
      "session": {
        "userId": "…",
        "email": "…",
        "organizationId": "…",
        "workspaceId": "…",
        "createdAt": "…",
        "expiresAt": "…"
      }
    }
    ```

- **POST `/auth/logout`**
  - The request (body or header) carries the `session_id`.
  - The provider deletes/invalidates the session in the store.

All OpenAPI specs must define these endpoints exactly so tests and UX validators can rely on them across projects.

---

## 3. Environment and Configuration

Required environment variables:

- `AUTH_MODE`
  - `standalone` – default; use local DB + Redis session store.
  - `{PROJECT_MODE}` – future; delegate to central SSO.

- Session and Redis configuration (standalone mode):
  - `SESSION_TTL` – session lifetime in seconds (for example `86400` for 24 hours).
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` – session store connection.

Code must read these values from `.env` (or a central config service), not hard‑code them.

---

## 4. Integration Guidance

- **Controllers / route handlers**
  - Depend only on `AuthProviderFactory` + `IAuthProvider`.
  - Do not talk directly to Redis or DB for auth; always go through the provider.

- **Guards / middleware**
  - HTTP:
    - Extract `session_id` from headers/cookies.
    - Call `validateSession`, attach user/session to `request` on success.
  - WebSockets:
    - Extract `sessionId` from handshake.
    - Call `validateSession`, disconnect client if invalid.

- **Other services / microservices**
  - Must either:
    - Reuse a shared auth module implementing this interface, or
    - Copy this pattern exactly (interface + providers + factory).
  - Must not invent different auth endpoints; they must consume or implement the standard `/auth/*` contract so central SSO can slot in later.

---

## 5. Cookie Security Requirements

All session and authentication cookies must use secure settings to prevent CSRF and XSS attacks.

### 5.1 Mandatory Cookie Options

```typescript
const cookieOptions: CookieOptions = {
  httpOnly: true,      // XSS protection - JavaScript cannot read cookie
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict',  // CSRF protection - never sent cross-origin
  maxAge: SESSION_TTL * 1000, // Convert seconds to milliseconds
  path: '/',           // Available to all routes
};
```

### 5.2 Why `sameSite: 'strict'`?

| Setting | Behavior | Security Risk |
|---------|----------|---------------|
| `none` | Cookie sent on ALL requests including cross-origin | HIGH - Full CSRF vulnerability |
| `lax` | Cookie sent on navigation from external sites | MEDIUM - CSRF via link clicks |
| `strict` | Cookie ONLY sent on same-site requests | LOW - Best protection |

**Rule:** Always use `sameSite: 'strict'` for authentication cookies.

The `lax` setting may seem convenient, but it allows cookies to be sent when a user clicks a link from an external site (e.g., email, social media). This can be exploited for CSRF attacks where an attacker tricks a user into clicking a malicious link.

### 5.3 Implementation Pattern

```typescript
// ✅ CORRECT - Secure cookie settings
res.cookie('session_id', sessionId, {
  httpOnly: true,
  secure: this.configService.get('NODE_ENV') === 'production',
  sameSite: 'strict',
  maxAge: this.configService.get<number>('SESSION_TTL', 86400) * 1000,
});

// ❌ FORBIDDEN - Insecure settings
res.cookie('session_id', sessionId, {
  sameSite: 'lax',  // CSRF vulnerable
});

// ❌ FORBIDDEN - Missing httpOnly
res.cookie('session_id', sessionId, {
  httpOnly: false,  // XSS vulnerable - JS can steal cookie
});
```

### 5.4 Cookie Clearing on Logout

```typescript
// Clear cookie with same options (except maxAge)
res.clearCookie('session_id', {
  httpOnly: true,
  secure: this.configService.get('NODE_ENV') === 'production',
  sameSite: 'strict',
  path: '/',
});
```

### 5.5 Enforcement

- Code review must verify all `res.cookie()` calls use secure options
- Auth module should export a helper function with correct defaults
- Tests should verify cookie attributes on auth endpoints
