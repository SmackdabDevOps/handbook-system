# Phase 5 Remediation: Validator Script Execution

**Validation Script:** `scripts/validation/validate-ux-specs-against-contracts.ts`

This phase executes UX validation specs against the running backend.

---

## Failure: "Validator script failed"

**Error Pattern:**
```
[ERROR] Step 5 failed
Expected: 201 Created
Actual: 400 Bad Request
Response: {"message": "Validation failed", "errors": [...]}
```

**Root Cause:** Spec execution failed due to actual runtime issue

**Fix Steps:**

1. **Read the log file:**
   ```bash
   tail -100 scripts/validation/logs/channels-*.log
   ```

2. **Compare:**
   - Spec step → What we expected
   - Request sent → What we actually sent
   - Response → What backend returned

3. **Classify failure:**

   | Symptom | Root Cause | Fix |
   |---------|------------|-----|
   | 400 with validation errors | Spec body wrong | Fix spec fields |
   | 404 | Endpoint doesn't exist | Implement or fix path |
   | 401/403 | Auth issue | Check session/token handling |
   | 500 | Backend bug | Fix backend code |
   | Unexpected response shape | Contract mismatch | Align code with contract |

4. **Apply fix based on classification:**

   **If spec body wrong:**
   - Read the DTO to get correct field names
   - Update spec to match DTO exactly
   - Re-run validator

   **If endpoint doesn't exist:**
   - Implement the endpoint in controller
   - Follow OpenAPI contract exactly
   - Re-run `npm run endpoints:validate` first
   - Then re-run Phase 5 validator

   **If auth issue:**
   - Check if endpoint requires authentication
   - Verify session/token is being sent
   - Check backend auth middleware logs

   **If backend bug:**
   - Fix the backend implementation
   - Ensure it matches OpenAPI contract
   - Run backend unit tests
   - Re-run validator

   **If contract mismatch:**
   - Determine which is correct (OpenAPI or code)
   - Fix the one that's wrong
   - Re-run `npm run endpoints:validate`
   - Then re-run Phase 5 validator

5. **NEVER modify spec just to pass** - Fix the underlying issue

---

## Debugging Tips

**Enable verbose logging:**
```bash
DEBUG=validation:* npx ts-node scripts/validation/validate-ux-specs-against-contracts.ts
```

**Check backend logs:**
```bash
tail -f /tmp/smackchat_dev.log
```

**Verify endpoint exists:**
```bash
npm run show:endpoint -- 'POST /channels'
```

**Test endpoint manually:**
```bash
curl -X POST http://localhost:8005/chat/channels \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=..." \
  -d '{"name":"test","description":"test"}'
```

---

## Key Principle

**Phase 5 validates REAL behavior.** If it fails, something is actually broken in the code, spec, or environment. Never ignore or work around Phase 5 failures.
