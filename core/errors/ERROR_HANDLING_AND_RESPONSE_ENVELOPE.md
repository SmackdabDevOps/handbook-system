# Error Handling and Response Envelope

This document defines the standard error handling pattern and HTTP response envelope for all projects, based on the `generalResponse` and `HttpException` utilities.

---

## 1. Response Envelope – `generalResponse`

All HTTP responses must use a consistent envelope:

```json
{
  "data": { /* payload or null */ },
  "message": "Human or machine-readable message",
  "toast": false,
  "responseType": "success"
}
```

Implementations should use a helper similar to `generalResponse`:

```ts
generalResponse(res, data, message, responseType, toast, statusCode);
```

Where:

- `data`: JSON‑serializable payload, or `null`.  
- `message`: string or structured error detail.  
- `responseType`: `'success'` or `'error'` (or project‑documented variants).  
- `toast`: boolean indicating whether the frontend should display a toast.  
- `statusCode`: HTTP status code (200, 201, 400, 401, 403, 404, 422, 500, etc.).

**Rules:**

- Success: `responseType = 'success'`, 2xx status code.  
- Client errors: `responseType = 'error'`, 4xx.  
- Server errors: `responseType = 'error'`, 5xx.

This envelope must be reflected in OpenAPI response schemas so contract tests and UX validators can assert on it.

---

## 2. HttpException Pattern

Projects should define a custom `HttpException` type that carries:

- `status`: HTTP status code.  
- `message`: error message.  
- `toast`: whether the error should show a toast.  
- `data`: optional structured data (error codes, fields, etc.).

Example:

```ts
throw new HttpException({
  status: 400,
  message: 'Invalid input',
  toast: false,
  data: { field: 'email' },
});
```

Error middleware must:

- Catch `HttpException` instances.  
- Map them into the response envelope via `generalResponse`.  
- Log the error (with correlation ID and tenant context) at `error` level.

---

## 3. Validation Errors

Request validation (for example via Joi or class‑validator) must:

- Aggregate field errors into a deterministic structure.  
- Return:
  - 422 Unprocessable Entity (or documented alternative) for validation failures.  
  - An error envelope with:
    - `message`: generic message (“Something went wrong!”) or specific;  
    - `data`: either a joined string or a keyed object describing field issues.

Example:

```json
{
  "data": null,
  "message": "Validation failed",
  "toast": false,
  "responseType": "error"
}
```

or, if exposing field details:

```json
{
  "data": {
    "email": "Email is invalid",
    "name": "Name is required"
  },
  "message": "Validation failed",
  "toast": false,
  "responseType": "error"
}
```

---

## 4. Network and Upstream Errors

When calling external services:

- Detect network‑like errors (connection refused, DNS failures, timeouts).  
- Map them to:
  - A generic user‑facing message (for example “Service is temporarily unavailable”).  
  - 503 or 502 status code.  
- Do not expose low‑level error strings from upstream as user‑facing messages.

Internally, log the full error (with correlation ID) for debugging; externally, keep messages safe and generic.

---

## 5. OpenAPI and Testing Requirements

OpenAPI specs must:

- Define the envelope for both success and error responses.  
- Use shared schemas for `ErrorResponse` (code/message/details, wrapped in the envelope).

Contract tests must:

- Validate that every documented endpoint returns the envelope shape.  
- Cover:
  - Happy path (2xx).  
  - Auth errors (401/403).  
  - Validation errors (422).  
  - Generic server errors (5xx).

