# Permissions and Authorization Model

This document defines how authorization and feature gating must be implemented across projects, based on backend v2 patterns.

---

## 1. Roles, Ownership, and Tenant Scope

Authorization always sits on top of the tenant model:

- **Organization‑level roles**:
  - Owners/admins vs standard members.
- **Workspace‑level roles**:
  - Roles within a workspace (admin, member, viewer, etc.).

New projects must:

- Represent roles and ownership in a central permissions module (for example under `packages/services` or `packages/core`).  
- Use tenant context (`organizationId`, `workspaceId`) from the session/request context when evaluating permissions.

---

## 2. Authorization Layer Placement

Authorization must **not** be scattered throughout controllers. Instead:

- Use:
  - **Guards/middleware** for endpoint‑level access checks.  
  - **Service‑level checks** for deeper domain invariants (for example “a user cannot access records outside their workspace”).

Patterns:

- Token/context middleware attaches `tokenData` and tenant context to the request (and, where needed, to async context for models/hooks).  
- Permission guards read `tokenData` + tenant IDs and enforce access decisions before controller logic executes.

---

## 3. Feature Flags and Permissions (Statsig + Internal Flags)

Feature availability is a form of authorization:

- Internal feature flags (per‑org/per‑workspace permissions) must be stored in:
  - Persistent storage (for example organization settings or feature tables).  
  - A cache layer (for fast evaluation).

- External experiment flags (Statsig) are used for:
  - Gradual rollout of features.  
  - AB testing and experimentation.

Middleware pattern (as in backend v2):

- `checkFeatureMiddleware(features, operator, statSigFeatures, statsigOperator)`:
  - Checks internal feature flags from cache (`getFeatureFromCache`).  
  - Optionally checks Statsig gates (`checkFeatureFlagStatSig`).  
  - Throws `HttpException` when required features are disabled for the current org/tenant.

Rules for new projects:

- Use a shared feature/permission middleware, not custom flag checks per controller.  
- Never use feature flags to silently bypass failing tests or broken contracts:
  - If a feature is behind a flag, contracts/tests must still be correct for **enabled** cases.  
  - Disabled cases must be explicit and tested.

---

## 4. API Design for Protected Resources

Protected endpoints must:

- Require a valid auth token/session.  
- Infer `organizationId` and `workspaceId` from the session or explicit parameters.  
- Enforce:
  - Ownership (for example, record belongs to the user or their workspace).  
  - Role/permission requirements (for example, “only workspace admins can modify X”).

API responses must signal authorization failures consistently:

- 401 for unauthenticated requests.  
- 403 for authenticated but unauthorized requests.

Both must use the standard response envelope and include messages suitable for user display where appropriate.

