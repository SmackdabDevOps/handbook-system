# Tenant Model – Organization and Workspace

This document expands on section **2.15** of `SYSTEM_DELIVERY_PLAYBOOK.md` and defines the multi‑tenant model that all new projects must follow.

---

## 1. Canonical Entities

- **Organization**
  - Top‑level tenant representing a customer account or company.
  - Owns users, workspaces, and billing.

- **Workspace**
  - Unit of work within an organization (team, location, functional area).
  - Scope for channels, conversations, and most user activity.
  - A user may belong to multiple workspaces in the same organization.

Auth session data (`SessionData`) must always include:

- `organizationId` – the current organization.  
- `workspaceId` – the primary workspace context for the current session (when applicable).

---

## 2. Legacy Branch vs Workspace (Backend v2 Reality)

In backend v2:

- `Organization` is already the tenant root.  
- `Branch` (see `packages/sequelize/src/models/branch.model.ts`) currently plays the role that **Workspace** will play going forward:
  - Scoped by `organization_id`.  
  - Holds location/team‑like attributes and user assignments.

For **new projects**:

- Do **not** introduce new “branch” concepts or tables.
- Model this layer explicitly as **Workspace** (tables/fields named `workspaces`, `workspace_id`, etc.).
- When integrating with backend v2:
  - Treat `Branch` as the legacy equivalent of `Workspace`.  
  - Keep mapping logic explicit; do not mix workspace and branch names in new APIs.

---

## 3. Propagating Tenant Context

Every new project must propagate tenant context consistently across layers.

### 3.1 HTTP

- Session‑based flows:
  - Use `/auth/me` to resolve `organizationId` and `workspaceId` from the session.  
  - Controllers should not accept arbitrary tenant IDs without verifying session ownership.

- Stateless endpoints (rare):
  - Must receive both `organizationId` and `workspaceId` explicitly (headers or body).  
  - Must validate that the authenticated user is allowed to act within those IDs.

### 3.2 Messaging (Pulsar)

- Message bodies must be shaped like:
  ```json
  {
    "ACTION": "some_action_name",
    "DATA": {
      "...": "domain-specific fields",
      "organizationId": "uuid",
      "workspaceId": "uuid"
    }
  }
  ```
- Consumers are resolved by `ACTION` and receive `DATA`.  
- Tenant context (`organizationId`, `workspaceId`) must always be present for tenant‑scoped work.

Where supported, tenant IDs may also be duplicated into message properties for easier filtering/observability.

### 3.3 Logging and Metrics

For any user‑level or tenant‑level operation:

- Logs must include `organizationId` and `workspaceId` (or a clearly marked legacy branch identifier when dealing with backend v2).  
- Metrics (requests, errors, queue processing) should be tagged with these IDs so you can reason about behavior per tenant.

---

## 4. No Alternate Tenant Shapes Without Approval

New projects must not invent alternate tenant shapes (for example “account + team + cluster”) without:

- Updating this document and the main playbook, **and**
- Updating shared libraries and validation scripts so that tenant context is still enforced consistently.

