# Feature Flags and Experiments

This document defines how to use feature flags and experiments (for example Statsig) in a way that is consistent and safe across projects.

---

## 1. Goals

- Enable gradual rollout of features.  
- Allow per‑tenant or per‑segment toggles.  
- Support experiments (A/B tests) without breaking contracts or tests.

Feature flags must **never** be used to hide broken behavior from tests or to bypass API contracts.

---

## 2. Internal Feature Flags (Per‑Tenant Permissions)

Internal flags represent:

- Whether a feature is enabled for a given organization/workspace.  
- Often stored in:
  - Database tables for org/workspace settings.  
  - Cached via the cache package for fast access.

Evaluation pattern:

- A shared feature middleware (similar to `checkFeatureMiddleware`) must:
  - Load feature states for the current organization/workspace from cache.  
  - Evaluate required flags (with AND/OR combinations).  
  - Throw `HttpException` when features are disabled.

New projects must:

- Use a shared feature/permission middleware rather than sprinkling flag checks.  
- Keep internal feature definitions in a central enum or config module.

---

## 3. External Flags and Experiments (Statsig)

For experiments and remote configuration:

- Use a shared Statsig wrapper (similar to `statsigSetup` and `checkFeatureFlagStatSig`).  
- Configuration via:
  - `STATSIG_SERVER_API_KEY`  
  - `STATSIG_ENVIRONMENT`

Evaluation rules:

- Build a Statsig user context using:
  - User ID and email.  
  - Tenant identifiers (organizationId, workspaceId/legacy branch).  
  - Request metadata (IP, user agent).

- A helper like `checkFeatureFlagStatSig(req, featureName, custom?)`:
  - Returns `true`/`false` indicating gate state.  
  - Defaults to `true` in test/dev if configured to do so, but never in production without explicit logic.

Experiments:

- Are for **how** a feature behaves, not whether it is safe or valid.  
- Must not alter API contracts; they may change internal logic or response content within the documented contract.

---

## 4. Interaction with Contracts and Tests

When a feature is behind a flag:

- Contracts and tests must describe and assert behavior for the **enabled** case.  
- Disabled cases:
  - Should be explicit and tested (for example returning 403 or a clear error message).  
- Tests must not assume flags are always on or always off; they should:
  - Either configure flags explicitly in fixtures, or  
  - Mock the flag evaluation layer.

Flags must not be used to:

- Hide failing endpoints from contract tests.  
- Skip validation or security checks.

---

## 5. Cleanup

Flags are not permanent:

- Every flag should have:
  - An owner.  
  - A documented purpose.  
  - A target removal date or condition.

- After rollout/experiments:
  - Clean up:
    - Code branches guarded by obsolete flags.  
    - Flag definitions in Statsig or internal stores.

New projects must treat flag housekeeping as part of the development lifecycle, not optional cleanup.

