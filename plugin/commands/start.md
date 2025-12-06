---
description: Launch the phase-coordinator to orchestrate playbook work
argument-hint: "[goal]"
---

# Start Playbook Orchestration

Launch the **phase-coordinator agent** - the unified orchestrator for all SDD work.

## Instructions

### Step 1: Load Configuration

First, ensure configuration is loaded and passed to the agent:

```bash
CONFIG_FILE=$(find . -maxdepth 2 -name "handbook.config.json" -type f | head -1)
if [ -z "$CONFIG_FILE" ]; then
  echo "❌ No handbook.config.json found. Run: npx @smackdab/handbook-init"
  exit 1
fi
```

### Step 2: Dispatch Phase Coordinator

Dispatch the phase-coordinator agent with config context:

```
Task tool:
  subagent_type: "sdd:phase-coordinator"
  prompt: |
    Configuration loaded from: $CONFIG_FILE

    Orchestrate work for: $ARGUMENTS

    If no goal specified, assess current state and report status.
```

The phase-coordinator will automatically:
1. Load config from `handbook.config.json`
2. Run `${config.commands['validate:gates']}`
3. Read dashboard + TDD stats from `${config.paths.validators}`
4. Determine work type (remediation, feature injection, or status)
5. Dispatch specialized agents as needed
6. Enforce TDD for implementation work per `config.tdd.thresholds`
7. Validate results

## Work Types

| Goal | What Happens |
|------|--------------|
| (empty) | Status report with TDD stats |
| "fix..." | Remediation - lowest phase first |
| "add feature...", "implement..." | Feature injection with mini-phases |
| "complete phase N" | Work toward specific phase completion |

## Examples

```bash
/sdd:start                                    # Status report
/sdd:start "fix validation failures"          # Remediation flow
/sdd:start "add user bookmarks feature"       # Feature injection flow
/sdd:start "complete phase 4"                 # Targeted work
```

## What Gets Dispatched

| Phase Issue | Agent |
|-------------|-------|
| Phase 1 (Stories/Rules) | `sdd:story-rule-linker` |
| Phase 2 (Contracts) | `sdd:contract-designer` |
| Phase 3.5 (Unclassified) | `sdd:retroactive-documenter` |
| Phase 4 (Specs) | `sdd:spec-author` |
| Phase 5 (Validators) | `sdd:validation-runner` |

## TDD Enforcement

For implementation work, phase-coordinator enforces (if `config.tdd.hooks.enforceRedPhase` is true):
- RED phase check before implementation dispatch
- GREEN phase check after implementation complete
- Thresholds from `config.tdd.thresholds`

**Reference:** `${config.paths.handbook}monitoring/TDD_ENFORCEMENT_SETUP.md`
