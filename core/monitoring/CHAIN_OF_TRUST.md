# Chain of Trust – Automated Validation Enforcement

> **Core Principle:** Status is computed from evidence, never claimed by agents.

---

## Problem Statement

Traditional development workflows rely on trust:
- Agent says "tests pass" → PM believes it
- Agent says "feature complete" → PM accepts it
- Agent says "validation run" → PM assumes it happened

**This creates failure modes:**
1. Agent forgets to run tests
2. Agent runs wrong tests
3. Agent interprets failures as "not critical"
4. Agent claims completion without evidence

**The Chain of Trust solves this by eliminating trust as a requirement.**

---

## Solution Architecture

### 1. Evidence-Based Status

Instead of asking agents "did you validate?", the system reads evidence:

```typescript
// Traditional (trust-based)
agent.claim("I ran the validators and they passed")
pm.believe(agent.claim)

// Chain of Trust (evidence-based)
const status = validationRegistry.getStatus('channels')
// Returns: { passed: true, lastRun: '2025-11-28T10:00:00Z', gitCommit: 'abc123' }
```

**Key difference:** The PM queries the registry, not the agent.

### 2. Single Source of Truth

**Location:** `scripts/validation/validation-registry.json`

**Updated by:** Validation scripts only (via `reportValidationResult()`)

**Read by:**
- Phase gate checks
- PM dashboard
- CI/CD pipelines
- Claude hooks (indirectly, by checking if validations ran)

**Never edited manually.** Any manual edit is detectable via git history.

### 3. Automated Enforcement

**Claude Hooks:** `.claude/hooks.json`

Before every `git commit`:
```javascript
// Pseudo-code for hook logic
if (command === 'git commit') {
  if (fileChangesInclude('src/', 'scripts/')) {
    if (!validationsRunThisSession()) {
      return 'deny: Run npm run validation:all before committing'
    }
  }
}
```

**Phase Gates:** `scripts/validation/registry.ts`

Before claiming phase complete:
```typescript
const gate = checkPhaseGate('phase4')
if (!gate.passed) {
  console.error(`Phase 4 blocked: ${gate.failures.length} validators not passing`)
  process.exit(1)
}
```

**Result:** Agents cannot proceed without evidence.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Developer/Agent Makes Code Changes                             │
│  - Implements feature in src/modules/channels/                  │
│  - Updates DTOs, controllers, services                          │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────────────────────────┐
│  Run Validation Script                                          │
│  $ npm run validation:channels                                  │
│                                                                  │
│  - Executes UX spec steps against live backend                  │
│  - Logs every request/response                                  │
│  - Asserts expectations match reality                           │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────────────────────────┐
│  Validation Script Calls Registry Library                       │
│  reportValidationResult({                                       │
│    validator: 'channels',                                       │
│    passed: true,                                                │
│    totalTests: 45,                                              │
│    passedTests: 45,                                             │
│    duration: 3200                                               │
│  })                                                             │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────────────────────────┐
│  Registry Library Updates validation-registry.json              │
│  {                                                              │
│    "validators": {                                              │
│      "channels": {                                              │
│        "lastRun": "2025-11-28T10:15:30Z",                       │
│        "passed": true,                                          │
│        "totalTests": 45,                                        │
│        "gitCommit": "abc123",                                   │
│        "runBy": "script"                                        │
│      }                                                          │
│    }                                                            │
│  }                                                              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────────────────────────┐
│  Phase Gate Reads Registry                                      │
│  const gate = checkPhaseGate('phase4')                          │
│  // Checks: Are all required validators present and passing?    │
│  // Returns: { passed: true/false, failures: [...] }            │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────────────────────────┐
│  PM Dashboard Reads Registry                                    │
│  - Shows real-time status for each validator                    │
│  - Shows phase gate status (green/blocked)                      │
│  - Shows last run timestamp, git commit                         │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────────────────────────┐
│  Agent Attempts Commit                                          │
│  $ git commit -m "Implement channels feature"                   │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────────────────────────┐
│  Claude Hook (PreToolUse) Intercepts                            │
│  - Detects: git commit command                                  │
│  - Checks: Were src/ or scripts/ files modified?                │
│  - Checks: Were any validations run this session?               │
│  - Decision: approve/deny                                       │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────────────────────────┐
│  If Approved: Commit Proceeds                                   │
│  If Denied: Error message shows which validations to run        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components Detail

### Validators (`scripts/validation/validate-*-full.ts`)

**Purpose:** Execute UX specs against backend

**Input:** UX spec markdown files (`docs/test-plans/validation-specs/*.md`)

**Output:**
- Console output (pass/fail per test)
- Log file (`scripts/validation/logs/*.log`)
- Registry update (via `reportValidationResult()`)

**Contract:**
```typescript
// Every validator must:
1. Import and call reportValidationResult() at the end
2. Report accurate test counts (total, passed, failed)
3. Exit with code 0 on pass, 1 on fail
4. Log every request/response (per RULEBOOK.md)
```

### Registry (`validation-registry.json`)

**Schema:** See `VALIDATION_REGISTRY.md`

**Updated by:** `reportValidationResult()` function only

**Read by:**
- `checkPhaseGate()`
- `getValidationStatus()`
- PM dashboard scripts
- CI/CD pipelines

**Key fields per validator:**
- `lastRun`: ISO timestamp when validator last ran
- `passed`: Boolean, did all tests pass?
- `totalTests`, `passedTests`, `failedTests`: Test counts
- `gitCommit`: Git hash when validator ran
- `runBy`: 'script' | 'manual' | 'ci'

### Phase Gates

**Location:** `phaseGates` section of `validation-registry.json`

**Purpose:** Define which validators must pass for each phase

**Example:**
```json
{
  "phaseGates": {
    "phase4": {
      "requiredValidators": ["auth", "onboarding", "channels", "chat-core"],
      "requiredPassRate": 1.0,
      "description": "All UX validation scripts must pass"
    }
  }
}
```

**Checking:**
```typescript
const gate = checkPhaseGate('phase4')
if (!gate.passed) {
  console.error('Phase 4 blocked')
  console.error('Missing validators:', gate.missingValidators)
  console.error('Failed validators:', gate.failedValidators)
  console.error('Stale validators:', gate.staleValidators)
}
```

### Claude Hooks (`.claude/hooks.json`)

**Hook Type:** PreToolUse (runs before every tool invocation)

**Trigger:** Bash tool with command containing `git commit`

**Logic:**
```
1. Check: Is this a git commit command?
2. Check: Were src/ or scripts/ files modified? (via Write/Edit tools in session)
3. Check: Were any validation commands run? (npm run validation:*, npx ts-node scripts/validation/*)
4. If (git commit) AND (files modified) AND (no validations run):
   -> deny with message "Run npm run validation:all before committing"
5. Else:
   -> approve
```

**Result:** Agents cannot commit without running validations.

### Dashboard (`docs/pm-dashboard/`)

**Purpose:** PM visibility into validation status

**Data Source:** `validation-registry.json`

**Shows:**
- All validators and their status (pass/fail/never run)
- Last run timestamp for each
- Git commit when validator ran
- Phase gates and whether they're blocked
- Overall project health

**Updates:** Automated via:
- `npm run validation:all` → regenerates dashboard data at end
- `npm run validation:gates` → regenerates dashboard data at end
- PostToolUse hook → instructs agent to run `npm run dashboard:update` after validation

**Data Pipeline:**
```
validation-registry.json → dashboard:update → dashboard-data.json → index.html
```

**The dashboard never goes stale because validation commands trigger regeneration.**

---

## Data Flow: Step by Step

### Scenario: Agent implements channels feature

**Step 1: Agent makes code changes**
```
Files changed:
- src/modules/channels/controllers/channels.controller.ts
- src/modules/channels/services/channels.service.ts
- src/modules/channels/dto/create-channel.dto.ts
```

**Step 2: Agent runs validation**
```bash
$ npm run validation:channels
```

**Step 3: Validator executes**
```
- Reads docs/test-plans/validation-specs/03-channel-operations.md
- Executes each step against backend
- Logs requests/responses to scripts/validation/logs/
- Asserts expectations
- Result: 45 tests, 45 passed, 0 failed
```

**Step 4: Validator reports to registry**
```typescript
await reportValidationResult({
  validator: 'channels',
  passed: true,
  totalTests: 45,
  passedTests: 45,
  failedTests: 0,
  skippedTests: 0,
  duration: 3200
})
```

**Step 5: Registry updates**
```json
{
  "validators": {
    "channels": {
      "lastRun": "2025-11-28T10:15:30Z",
      "passed": true,
      "totalTests": 45,
      "passedTests": 45,
      "failedTests": 0,
      "duration": 3200,
      "gitCommit": "abc123",
      "runBy": "script"
    }
  }
}
```

**Step 6: Agent checks phase gate**
```bash
$ npm run validation:gates
```

Output:
```
Phase 4 gate: BLOCKED
- Required validators: [auth, onboarding, channels, chat-core, ...]
- Passing: [auth, onboarding, channels]
- Missing: [chat-core, files, collaboration, ...]
```

**Step 7: Agent attempts commit**
```bash
$ git add .
$ git commit -m "Implement channels feature"
```

**Step 8: Claude hook intercepts**
```
PreToolUse hook triggered:
- Command: git commit
- Files modified: src/modules/channels/* (yes)
- Validations run this session: npm run validation:channels (yes)
- Decision: APPROVE
```

**Step 9: Commit proceeds**
```
[main abc123] Implement channels feature
 3 files changed, 120 insertions(+)
```

**Step 10: PM checks dashboard**
```
Dashboard shows:
- Channels validator: PASS (10:15:30, commit abc123)
- Phase 4 gate: BLOCKED (7/11 validators passing)
```

---

## What Agents Must Understand

### 1. Status is Evidence, Not Claims

**Wrong approach:**
```
Agent: "I implemented the feature and ran the tests, they all passed."
PM: "Great, thanks!"
```

**Right approach:**
```
Agent: "I implemented the feature. Running validations..."
[validation runs, registry updates]
PM: [checks dashboard] "I see channels validator passed at 10:15:30. Good."
```

**Key:** PM trusts the registry, not the agent's words.

### 2. Validations Are Not Optional

**Traditional workflow:**
```
1. Write code
2. Test manually
3. Commit
4. (Maybe run CI later)
```

**Chain of Trust workflow:**
```
1. Write code
2. Run validators (REQUIRED)
3. Fix failures
4. Validators update registry
5. Commit (blocked if validations not run)
```

**Key:** Step 2 is enforced, not suggested.

### 3. You Cannot Fake Evidence

**Attempts that will fail:**
```
❌ Manually edit validation-registry.json
   → Detectable in git history, PM will see

❌ Claim "I ran it" without actually running
   → Registry won't update, dashboard will show

❌ Skip validations and use --no-verify
   → Explicitly forbidden, detectable in git log

❌ Run only some validators, claim all passed
   → Phase gates check ALL required validators
```

**The only way to pass: Actually run validations and fix failures.**

### 4. Phase Gates Are Hard Blocks

**You cannot:**
- Claim "Phase 4 complete" when phase gate is blocked
- Skip failed validators and call it "good enough"
- Mark validators as "future work" to bypass gates

**Phase completion requires:**
```
1. All required validators must have run
2. All required validators must have passed
3. Results must be fresh (from recent commits)
```

**The system computes this. You cannot override it.**

---

## Benefits of This System

### For PMs
- **No guessing:** Dashboard shows real status
- **No trust required:** Evidence is in the registry
- **Early detection:** Failures are visible immediately
- **Audit trail:** Git commits show when validations ran

### For Developers
- **Clear requirements:** Phase gates show exactly what must pass
- **Fast feedback:** Run validations locally before commit
- **No surprises:** Claude hooks prevent forgetting validations
- **Quality gates:** Cannot commit broken code by accident

### For AI Agents
- **Unambiguous success criteria:** Pass the validators or fail
- **Automated enforcement:** Cannot skip steps
- **Clear error messages:** Hook tells you exactly what to run
- **No judgment calls:** System decides if phase is complete

---

## Common Failure Modes (Prevented)

### Failure Mode 1: "I forgot to test"
**Traditional:** Agent commits untested code, breaks production

**Chain of Trust:** Claude hook blocks commit, shows error:
```
❌ Commit denied: Run npm run validation:all before committing
```

### Failure Mode 2: "Tests passed on my machine"
**Traditional:** Agent's local tests pass, CI fails later

**Chain of Trust:** Validators run against same backend as CI, registry shows results

### Failure Mode 3: "Phase mostly complete"
**Traditional:** Agent claims 90% done, PM doesn't know what's missing

**Chain of Trust:** Phase gate shows exactly which validators are missing:
```
Phase 4 gate: BLOCKED
Missing validators: [files, collaboration, admin]
```

### Failure Mode 4: "I'll test it later"
**Traditional:** Agent defers testing, never does it

**Chain of Trust:** Cannot commit without testing, cannot claim phase done without passing gates

---

## Summary

**Chain of Trust eliminates trust as a dependency.**

Instead of trusting agents to:
- Run validations
- Report results honestly
- Follow the process
- Not skip steps

The system:
- Enforces validation runs (hooks)
- Records evidence (registry)
- Computes status (phase gates)
- Shows truth (dashboard)

**Result:** PM knows the real status at all times. Agents cannot proceed without evidence.

**This is not optional. This is how the project works.**
