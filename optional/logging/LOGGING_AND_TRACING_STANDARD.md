# Logging and Tracing Standard

This document defines how all projects must log, attach correlation IDs, and propagate context so you can trace behavior across services.

---

## 1. Logging Stack

All backends must use a structured logging stack similar to backend v2:

- **Logger**: Winston-based logger (`@packages/logger` pattern).
- **Transports**:
  - Console for local/dev.
  - Rotating file logs for debug and error.
  - Sentry (or equivalent) in production for aggregated errors.
- **Format**:
  - JSON for file/Sentry logs (includes timestamp, level, message, metadata).
  - Readable, colorized format for console logs.

Every project must expose:

- A `logger` instance (for example from `@packages/logger`).  
- A `stream` object compatible with `morgan` (for HTTP access logs).

---

## 2. Required Log Fields

Every log entry that reflects user‑level or tenant‑level work must include, at minimum:

- `service`: name of the app (api, payment, campaign, etc.).  
- `level`: log level (`info`, `warn`, `error`).  
- `timestamp`: ISO or consistent datetime string.  
- `message`: human‑oriented summary of what happened.  
- `correlationId`: ID used to tie together logs across services.  
- `organizationId`: where applicable.  
- `workspaceId`: where applicable.

Additional fields may be included in `metadata` (for example, endpoint, duration, counts).

---

## 3. Correlation IDs and Context

Correlation IDs are required for cross‑service tracing:

- Each incoming HTTP request must have a correlation ID:
  - Prefer:
    - Use existing header (for example `X-Correlation-ID`) if present.  
    - Otherwise generate a new UUIDv4/UUIDv7.
  - Store it in request‑scoped context (for example via AsyncLocalStorage).
  - Include it in:
    - All logs emitted while handling that request.  
    - Downstream Pulsar messages originating from that request.  
    - Any HTTP calls to other services.

- For background workers (Pulsar consumers):
  - If a message includes a correlation ID property, reuse it.  
  - If not, generate a new one at the start of message handling.

Implementation detail can mirror backend v2’s pattern:

- Use a request‑level async context (like `packages/core/src/asyncLocalStorage/async-context.ts`).  
- Store:
  - `branch_id`/`organization_id` (legacy) or `organizationId`/`workspaceId`.  
  - `user_id`.  
  - `correlationId`.

Helpers should expose:

- `setRequestContextValue(key, value)`  
- `getRequestContextValue(key)`  
- `runWithRequestContext(context, fn)`

Models and services can then read context (for audit fields, tenant scoping, etc.) without global variables.

---

## 4. What Must Not Be Logged

Never log:

- Passwords or password hashes.  
- Raw access tokens, session IDs, or refresh tokens.  
- Full PII (address, phone, names) at debug/error level, unless explicitly masked.  
- Credit card numbers or other regulated payment data.

When in doubt:

- Log IDs and summaries, not full payloads.  
- Use dedicated redaction utilities for known sensitive fields.

