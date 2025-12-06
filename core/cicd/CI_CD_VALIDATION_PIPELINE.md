# CI/CD Validation Pipeline

This document defines the minimum validation pipeline that every project must implement in CI and, where possible, mirror locally.

---

## 1. Goals

- Ensure that contracts, docs, and code stay in sync.  
- Catch structural and behavioral regressions before merge.  
- Keep pipelines fast enough to be run on every PR.

---

## 2. Standard Pre‑Merge Checks

Every project must run at least the following checks on each merge/pull request:

1. **Linting**
   - Use Nx or local lint scripts (`nx affected --target=lint` or equivalent).

2. **Directory structure validation**
   - Run `npm run validate:dirs` (which calls `ts-node scripts/validate-directory-structure.ts`).

3. **Documentation matrix / UX coverage**
   - Run:
     - Story coverage: `npx ts-node docs/test-plans/scripts/check-story-coverage.ts`  
     - Business rules coverage: `npx ts-node docs/test-plans/scripts/check-business-rules-coverage.ts`  
     - Documentation matrix: `npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts`  
     - UX vs contracts (when present): `npx ts-node docs/test-plans/scripts/validate-ux-specs-against-contracts.ts`

4. **Unit and contract tests**
   - Run Nx test targets:
     - All tests for changed projects (`nx affected --target=test`) or  
     - Full suite (`nx run-many -t test --all --skip-nx-cache`) when required.
   - For backend APIs, ensure contract tests are wired in (per `Best_Practices_API_Testing.md`):
     - Validate responses against OpenAPI.  
     - Cover both happy paths and error cases.

5. **Optional: End‑to‑end UX validation**
   - For projects with UX validators:
     - Run `scripts/validation/run-all-with-logs.sh` (or equivalent) in a controlled environment.  
     - Archive logs as CI artifacts for review.

---

## 3. Command Examples (Nx Workspace)

For an Integrated Nx backend:

- Lint affected:

  ```bash
  npx nx affected --target=lint --base=origin/main --parallel --maxParallel=4 --skip-nx-cache
  ```

- Run all tests (pipeline mode):

  ```bash
  npm run test:pipeline
  # or:
  nx run-many -t test --all --skip-nx-cache --parallel=2
  ```

- Validate directory structure:

  ```bash
  npm run validate:dirs
  ```

- Validate docs and UX matrix:

  ```bash
  npx ts-node docs/test-plans/scripts/check-story-coverage.ts
  npx ts-node docs/test-plans/scripts/check-business-rules-coverage.ts
  npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts
  npx ts-node docs/test-plans/scripts/validate-ux-specs-against-contracts.ts
  ```

Projects that are not Nx‑based must provide equivalent commands and keep them in sync with this intent.

---

## 4. Enforcement Rules

- No new service or module is considered “ready” until:
  - It has tests wired into the CI pipeline.  
  - It passes directory validation.  
  - It passes contract and documentation matrix checks.

- Pipelines must **fail fast**:
  - If linting fails, skip expensive tests.  
  - If contract tests or matrix checks fail, block the merge.

- CI/CD configuration (for example Bitbucket Pipelines, GitHub Actions, etc.) must live in version control and be treated as production code.

---

## 5. TDD Gates (Phase 3 Enforcement)

**Added: 2025-12-06** - Part of TDD Enforcement Master Plan

Every PR must pass the following TDD gates before merge:

### 5.1 Contract Tests (Phase 3.1)

```bash
npm run test:contract
npm run check:contract-coverage
```

**Requirement:** 100% of endpoints in `ENDPOINTS.json` must have contract tests.

**Blocking:** YES - PR cannot merge if contract tests fail.

### 5.2 Unit Tests with Coverage (Phase 3.3)

```bash
npm run test:unit
npm run check:unit-coverage
```

**Requirement:** 90% coverage on ALL metrics (branches, functions, lines, statements).

**Blocking:** YES - PR cannot merge if coverage below 90%.

### 5.3 Integration Tests (Phase 3.4)

```bash
npm run test:integration
npm run check:integration-coverage
```

**Requirement:** All cross-module interactions must have integration tests.

**Blocking:** YES - PR cannot merge if integration tests fail.

### 5.4 Full TDD Cycle

For comprehensive validation, run the full TDD cycle:

```bash
npm run tdd:cycle
```

This runs: `contract → unit → integration → validation:quick` in order.

### GitHub Actions Workflow

The TDD gates are enforced via `.github/workflows/tdd-gates.yml`:

```yaml
# Triggers on PR to src/**, test/**, openapi/**
jobs:
  contract-tests:    # Phase 3.1 - 100% endpoint coverage
  unit-tests:        # Phase 3.3 - 90% coverage threshold
  integration-tests: # Phase 3.4 - Cross-module coverage
  tdd-summary:       # Reports results, blocks merge if failed
```

**PR Comment:** The workflow posts a summary table to every PR showing:
- Contract test status
- Unit test coverage (lines, branches, functions, statements)
- Integration test status
- Overall merge readiness

### Local Pre-Commit Check

Developers can run TDD gates locally before pushing:

```bash
npm run test:gates
```

This runs all three gate checks without the full test suite.

---

## 6. Wave Remediation (Existing Code)

For existing code without full test coverage, use phased remediation:

| Wave | Target | Coverage Goal |
|------|--------|---------------|
| Wave 1 | auth, messages, channels | 90% |
| Wave 2 | workspaces, users, files | 70% → 90% |
| Wave 3 | All remaining modules | 90% |

Track progress with:

```bash
npm run check:remediation-progress
```

