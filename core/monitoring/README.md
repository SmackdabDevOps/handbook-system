# Monitoring & Enforcement System – Overview

> **Critical for AI Agents:** This project enforces the System Delivery Playbook through automated monitoring. You are being watched. Status is computed from evidence, never claimed.

---

## Philosophy: "Done is not what an agent claims, done is what evidence proves"

In traditional development workflows, agents report status based on what they think they've accomplished:

- "I implemented the feature"
- "Tests are passing"
- "Phase 3 is complete"

**This project does not trust claims. It computes status from evidence.**

Every action leaves a trace:

- Validation scripts produce timestamped results
- Results are stored in a central registry
- Phase gates check the registry, not agent claims
- Claude hooks block commits when evidence is missing

**You cannot claim "done" by saying you're done. The system must prove you're done.**

---

## Chain of Trust Architecture

```
┌─────────────────────────────────────────────────────┐
│  1. Agent runs validation script                    │
│     npm run validation:channels                     │
└──────────────┬──────────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────────┐
│  2. Script updates validation registry              │
│     scripts/validation/validation-registry.json     │
│     - Timestamp, pass/fail, test counts             │
│     - Git commit hash, duration                     │
└──────────────┬──────────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────────┐
│  3. Phase gate checks registry                      │
│     checkPhaseGate('phase4')                        │
│     - Are all required validators present?          │
│     - Did they all pass?                            │
│     - Are results fresh (not stale)?                │
└──────────────┬──────────────────────────────────────┘
               │
               v
┌─────────────────────────────────────────────────────┐
│  4. Claude hook enforces before commit              │
│     .claude/hooks.json checks:                      │
│     - Were validations run this session?            │
│     - Were src/ or scripts/ files modified?         │
│     - Block commit if validation missing            │
└─────────────────────────────────────────────────────┘
```

**Key Insight:** Every component reads from the same registry. There is no "skipping" validation by claiming you ran it.

---

## Quick Reference: Validation Commands

Before ANY commit that touches `src/` or `scripts/`:

```bash
# Run all validators (required before commits)
npm run validation:all

# Start live runner (streams logs to dashboard)
npm run validation:runner

# Quick gate check (shows if phases are blocked)
npm run validation:quick

# Check specific phase gate status
npm run validation:gates
```

**When your commit is blocked:**

1. Read the error message (it tells you which validations are missing)
2. Run the missing validators
3. Fix any failures
4. Retry the commit

---

## Components

| Component           | Purpose                                       | Documentation                           |
| ------------------- | --------------------------------------------- | --------------------------------------- |
| **Validators**      | Execute UX specs against backend              | `scripts/validation/validate-*-full.ts` |
| **Registry**        | Single source of truth for validation status  | `VALIDATION_REGISTRY.md`                |
| **Phase Gates**     | Block phase progression until validators pass | `PHASE_GATES.md`                        |
| **Claude Hooks**    | Enforce validation before commits             | `CLAUDE_HOOKS.md`                       |
| **Dashboard**       | PM visibility into validation status          | `PM_DASHBOARD.md`                       |
| **TDD Enforcement** | Test-first development gates                  | `TDD_ENFORCEMENT_SETUP.md`              |

---

## Setting Up in a New Project

If you're setting up this enforcement system in a new project, see **[TDD_ENFORCEMENT_SETUP.md](TDD_ENFORCEMENT_SETUP.md)** for complete step-by-step instructions including:

- Creating the validation registry library
- Setting up TDD gate scripts (unit, contract, integration coverage)
- Configuring Claude hooks for tool-level enforcement
- Initializing the registry
- Creating the PM dashboard

---

## Data Flow

1. **Validation scripts** execute UX specs:
   - Make real HTTP calls to backend
   - Log request/response for every step
   - Report pass/fail with test counts

2. **Registry library** (`scripts/validation/registry.ts`) updates the registry:
   - Writes timestamped results to `validation-registry.json`
   - Records git commit, duration, who ran it

3. **Phase gates** read the registry:
   - Check if required validators are present
   - Check if they passed
   - Check if results are fresh (not from old commits)

4. **Claude hooks** check if validations were run:
   - Before every `git commit`
   - If src/ or scripts/ were modified
   - Blocks commit if validations missing

5. **Dashboard** reads the registry:
   - Shows pass/fail status for each validator
   - Shows phase gate status (green/blocked)
   - Updates in real-time as validations run

---

## What Agents Must Do

**Before ANY code change:**

1. Understand which validators cover the code you're changing
2. Plan to run those validators after your changes

**After ANY code change:**

1. Run the relevant validators: `npm run validation:channels` (or specific validator)
2. Check the output for failures
3. Fix failures before proceeding

**Before ANY commit:**

1. Run `npm run validation:all` (or at minimum, the validators for changed modules)
2. Ensure all validators pass
3. Only then attempt `git commit`

**Before claiming a phase complete:**

1. Run `npm run validation:gates`
2. Check the output for blocked phases
3. Fix missing/failing validators
4. Re-check gates until green

---

## What NOT to Do

**Never:**

- Claim a validator "passed" without running it
- Edit the registry file manually to fake results
- Skip validation because "it's just a small change"
- Bypass Claude hooks by using `--no-verify`
- Edit `.claude/hooks.json` to weaken enforcement

**If you do any of these, the PM will know. The dashboard shows:**

- Last run timestamp for each validator
- Git commit hash when validator ran
- Whether results are stale

**Attempting to fake validation results is detectable and forbidden.**

---

## Next Steps

1. Read `CLAUDE_HOOKS.md` to understand what happens when you try to commit
2. Read `PHASE_GATES.md` to understand when phases are blocked
3. Read `VALIDATION_REGISTRY.md` to understand the registry schema
4. Read `CHAIN_OF_TRUST.md` for the full architecture and philosophy
5. Read `LIVE_VALIDATION_RUNNER.md` for the real-time runner and dashboard integration
6. Read `TDD_ENFORCEMENT_SETUP.md` to set up this system in a new project

**When in doubt: Run validations, read the output, fix failures, repeat.**
