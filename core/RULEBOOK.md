# Validation Rulebook (Zero Ambiguity)

## Purpose
For every validation script, follow these rules exactly. No deviations, no substitutions, no hidden behavior. If the backend rejects a spec-compliant request, log the failure; do not change the request.

## Rules

1) Specs are law
- Copy every step exactly as written in its spec: same endpoint, HTTP method, payload field names/values, and order. No substitutions or omissions.

2) No deviations for backend quirks
- If a spec payload is rejected, do NOT change it. Log the failure and stop that step. Do not alter payloads to “make it pass.”

3) One script per spec
- Each spec has a single script that runs all its steps in order. Do not combine specs or skip steps.

4) Full logging for every call
- For every request: log timestamp, step name, method, full URL, headers (mask secrets), full request body.
- For every response: log status, headers (mask secrets), full response body.
- Logs must be human-readable (pretty-printed) and saved under `scripts/validation/logs/`, named with spec and timestamp (e.g., `auth-YYYYMMDDTHHMMSS.log`).
- Use a clear separator (`---`) between calls.

5) No hidden behavior
- No retries, no auto-filling missing tokens, no synthetic data to bypass failures. Only the actions described in the spec.

6) Use spec data shapes
- If the spec says `organization_name`, use `organization_name`. If it says `quote_message_id`, use that exact key. Do not rename or re-case fields.

7) Preserve order and branching
- Execute steps in the exact order they appear. Run all branches (success/failure scenarios) exactly as described.

8) Report failures by logging, not by altering steps
- If a step fails, log the full request/response and stop there. Do not alter the payload or sequence to “make it pass.”

9) Environment usage
- Use the base URL from the spec (or `BASE_URL` if provided). Use cookies/headers exactly as the spec states. Do not inject extra headers unless required by the spec.

10) Single source of truth
- The spec file text is the only allowed source for steps, payloads, and expectations. Do not infer, optimize, or shorten.

11) Output location
- All logs go to `scripts/validation/logs/`. Each run produces a new log file; do not overwrite prior logs.

12) Transparency on errors
- If backend behavior differs from the spec, leave the spec-compliant request in place, capture the exact backend response in the log, and stop. Do not “fix” by changing the request.

13) No extra steps
- Do not add steps not present in the spec. Do not combine steps. Do not remove steps.

14) Exact payload values
- Use the sample values/patterns from the spec (including `{{timestamp}}` or other placeholders) exactly as described. Follow templates literally.

15) Consistent formatting
- Log entry format: `[ISO_TIMESTAMP] [REQUEST|RESPONSE] METHOD URL -> STATUS` followed by pretty-printed headers/body and `---` separator. Use this consistently for all scripts.

## Enforcement

**Automated Validation (GATE):**

Rules 3 and 13 are enforced by `scripts/check-spec-script-coverage.ts`:
- Verifies every spec file has a matching validation script.
- Verifies every spec step has a corresponding API call in the script.
- **Phase 5 cannot complete until this gate passes with 100% coverage.**

Run: `npx ts-node scripts/check-spec-script-coverage.ts`

**Manual Enforcement:**

- Any deviation from these rules is a failure. If a backend change is needed, log the spec-compliant failure and raise the backend issue separately.

---

## Plugin System Update Required

> **⚠️ ACTION NEEDED:** The SDD plugin (`sdd:phase-coordinator`, `sdd:validation-runner`, etc.) must be updated to:
> 1. Include `check-spec-script-coverage.ts` in Phase 5 validation checks.
> 2. Add Phase 5c gate status to `/sdd:status` output.
> 3. Update `sdd:validation-orchestrator` to run the new coverage script.
> 4. Block Phase 6 progression until Phase 5c passes.
>
> Until the plugin is updated, manually run: `npx ts-node scripts/check-spec-script-coverage.ts`
