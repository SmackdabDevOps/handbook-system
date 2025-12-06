# Configuration and Environment Model

This document extends the `.env is law` principle from the main playbook and defines how configuration must be modeled across projects.

---

## 1. Principles

- All runtime configuration comes from:
  - Environment variables (`process.env`), or  
  - A central configuration service that is logically equivalent.  
- No hard‑coded hostnames, ports, or secrets in code.  
- Configuration must be validated at boot time; services should fail fast when required settings are missing or malformed.

---

## 2. Naming Conventions

Environment variable names must follow clear patterns:

- Service endpoints:
  - `<SERVICE>_HOST`, `<SERVICE>_PORT`, `<SERVICE>_URL`  
    - Example: `POSTGRES_HOST`, `POSTGRES_PORT`, `REDIS_HOST`, `REDIS_PORT`, `PULSAR_SERVICE_URL`.

- Authentication and security:
  - `AUTH_MODE`, `JWT_SECRET`, `SESSION_TTL`, etc.

- Feature flags / Statsig:
  - `STATSIG_SERVER_API_KEY`, `STATSIG_ENVIRONMENT`.

- Observability:
  - `OTEL_EXPORTER_OTLP_ENDPOINT` (or equivalent), `SENTRY_DSN`.

New projects must not invent arbitrary naming schemes; they must either:

- Reuse existing names, or  
- Extend with consistent prefixes and patterns, then document them here.

---

## 3. Boot‑Time Validation

Every service must perform boot‑time config validation:

- Define a schema (for example using `envalid`, Joi, or Zod) that:
  - Declares required env vars.  
  - Validates types (string, number, boolean, URL).  
  - Provides defaults only where safe.

- On startup:
  - Load env variables.  
  - Validate against the schema.  
  - If validation fails:
    - Log a clear error.  
    - Exit with non‑zero status (fail fast).

This prevents services from running in partially configured states.

---

## 4. Per‑Service vs Shared Configuration

In an Integrated Nx workspace:

- Shared configuration logic (parsing, validation) should live in a shared package (for example `@packages/core` or `config/` helpers).  
- App‑specific settings:
  - Defined in app‑local config modules under `apps/<app>/src/config/`.  
  - Built on top of the shared parsing/validation layer.

Single‑service projects should follow the same pattern, but with a single config module.

---

## 5. Secrets Management

Secrets (API keys, passwords, tokens) must:

- Be injected via:
  - Environment variables configured at deploy time, or  
  - A secrets manager (AWS Secrets Manager, Vault, etc.) exposed as env vars.  
- Never be:
  - Committed to source.  
  - Written to logs or error messages.

CI/CD must include checks (for example secret scanners) to catch accidental inclusion of secrets in code or config files.

---

## 6. NestJS-Specific Configuration Access

In NestJS applications, configuration must be accessed through `ConfigService`, not `process.env` directly.

### 6.1 Required Pattern

```typescript
// ✅ CORRECT - Inject ConfigService
@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  getPort(): number {
    return this.configService.get<number>('PORT', 3000);
  }
}

// ❌ FORBIDDEN - Direct process.env in services/controllers
const port = parseInt(process.env.PORT || '3000');
```

### 6.2 Exceptions

Direct `process.env` is ONLY allowed in:
- `main.ts` bootstrap (before DI container is available)
- Configuration files using `registerAs()` pattern
- Test setup files

### 6.3 Database Module Pattern

```typescript
SequelizeModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    host: configService.get<string>('POSTGRES_HOST'),
    port: configService.get<number>('POSTGRES_PORT'),
    // ...
  }),
}),
```

### 6.4 Enforcement

- tsconfig paths should not allow importing `process` directly in service files
- Code review must reject `process.env` in services/controllers
- Lint rules should flag `process.env` outside allowed files
