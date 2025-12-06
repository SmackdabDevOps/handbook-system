# Observability, Health, and Metrics

This document defines the baseline observability requirements for all projects: health checks, metrics, and traces.

---

## 1. Health Endpoints

Every HTTP service must expose a lightweight health endpoint, for example:

- `GET /health` or `GET /healthz`

The endpoint must check:

- Process readiness (event loop responsive).  
- Database connectivity (simple query or ORM ping).  
- Cache connectivity (Valkey/Redis ping).  
- Messaging connectivity (Pulsar connection ready) where applicable.

Responses:

- `200 OK` when all checks pass.  
- `5xx` when any critical dependency is unavailable, with a simple JSON body indicating which check failed.

Health endpoints must be cheap and safe to call frequently.

---

## 2. Metrics

All services must expose metrics suitable for your monitoring stack. At minimum:

- Per‑endpoint:
  - Request count.  
  - Error count.  
  - Latency (p95, p99).

- Queue workers:
  - Messages processed.  
  - Errors / retries.  
  - Lag/backlog where supported.

Metrics must be:

- Tagged with service name and environment.  
- Tagged with tenant identifiers (`organizationId`, `workspaceId`) where appropriate.

Implementation specifics (Prometheus, OTLP, etc.) are environment‑dependent, but the shape and tags should be consistent.

---

## 3. Tracing (OpenTelemetry)

Distributed tracing is required for cross‑service debugging:

- Use OpenTelemetry (or equivalent) to:
  - Instrument HTTP servers and clients.  
  - Instrument Pulsar publishers and consumers where feasible.

Traces must:

- Carry the same correlation ID used in logs.  
- Record key spans:
  - Request handling in API services.  
  - DB queries for slow operations.  
  - External service calls (HTTP/queue/third‑party).

Traces must be exported to a central collector using env‑configured endpoints.

---

## 4. Alerting and SLOs

Projects must define basic SLOs:

- Availability (for example 99.9% for core APIs).  
- Latency (for example p95 < X ms for golden paths).

Alerts must fire on:

- Health endpoint failures.  
- Elevated error rates.  
- Latency violations for critical endpoints.  
- Persistent queue lag.

The exact thresholds may vary by project, but the pattern must be consistent.

