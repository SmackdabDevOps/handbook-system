# Caching and State Management

This document defines how caching and derived state must be handled across projects, based on the cache architecture used in backend v2.

---

## 1. Cache Architecture

All new projects must follow the three‑layer cache model:

- **L1 – In‑memory LRU cache**  
  - Per‑process cache for ultra‑fast reads.  
  - Small, with eviction based on size/age.

- **L2 – Valkey/Redis distributed cache**  
  - Shared across instances.  
  - Primary place for cross‑instance caching and session storage.

- **L3 – Database**  
  - Source of truth.  
  - Cache must never diverge long‑term from DB; cache is an optimization, not a new truth.

The cache package exposes a “cache manager” that orchestrates these layers (`cacheGet`, `cacheSet`, `cacheDelete`, etc.).

---

## 2. Cache Keys and Config

All cache keys must be centrally defined:

- Enum of keys (for example `CACHE_KEYS`) with names like:
  - `USER_SESSION`, `CRM_USER_SESSION`, `BRANCH_SETTING`, etc.
- Per‑key configuration (`CACHE_CONFIGS`) that declares:
  - Cluster type (session vs general).  
  - TTLs for L1 and L2.  
  - Any special strategies (write‑through, write‑behind).

New caching needs must:

- Add entries to the central keys/configs.  
- Not invent ad‑hoc key naming in modules.

Key building must:

- Use helpers (for example `key-builder.util.ts`).  
- Encode tenant context (organizationId/workspaceId) and record IDs in a consistent pattern.

---

## 3. Core Cache Operations

The cache manager must provide:

- `cacheGet({ basekey, key, fetchFunction? })`
  - Check L1, then L2.  
  - If `fetchFunction` is provided and cache miss occurs:
    - Call `fetchFunction` once (protected by single‑flight).  
    - Store result back in cache.  
    - Return the result.

- `cacheSet({ basekey, key, value, useLock?, lockTTL? })`
  - Write to L2 and update L1.  
  - Optionally use distributed locks (Redlock) for critical updates.

- `cacheDelete({ basekey, key })`
  - Remove entries from both layers.

- `cacheDeleteByKeySearch({ basekey, keyPattern })`
  - Invalidate groups of entries by pattern (for example all caches for a given entity).

Modules must use these helpers rather than talking to Redis directly.

---

## 4. When to Cache (and When Not To)

Cache only when:

- Reads are frequent and tolerate slightly stale data, **and**  
- The data is expensive to compute or fetch from DB, **and**  
- There is a clear invalidation strategy.

Do **not** cache:

- Highly volatile data that changes on almost every request.  
- Data where stale values would violate correctness or compliance (for example, permissions without short TTL).

Session data (auth) is always stored in L2 (Valkey/Redis) with TTL and may also be briefly cached in L1 per process.

---

## 5. Invalidation and Consistency

Every cache‑backed path must answer:

- On **create**: when and how does cache get populated?  
- On **update/delete**: which keys must be invalidated?

Patterns:

- For entity caches keyed by `organizationId + workspaceId + entityId`:
  - Invalidate on any write to that entity.  
  - Optionally use `cacheDeleteByKeySearch` to invalidate all views of the entity.

- During migrations or bulk updates:
  - Prefer bulk invalidation (for example, by key prefix) rather than trusting TTLs.

Projects must not rely solely on long TTLs to eventually repair stale cache; invalidation is part of the design.

