# PM Dashboard

> **Quick Start:** Run `npm run dashboard` to update and open the dashboard.

The PM Dashboard provides real-time visibility into project progress through the Chain of Trust validation system. It reads from the **validation registry** (single source of truth) and displays current phase gates, blockers, validator status, and next actions.

---

## Dashboard Versions

Two dashboard versions are available:

| Version | URL | Description |
|---------|-----|-------------|
| **Original (v1)** | http://localhost:8811/scripts/dashboard/index.html | Full-featured dashboard with all sections visible |
| **v2 (Recommended)** | http://localhost:8811/scripts/dashboard/index-v2.html | Cleaner UI with collapsible sections and commit guard banner |

### v2 Features

- **Commit Guard Banner** - Shows at-a-glance if you can commit (🟢 Clear / 🔴 Blocked)
- **Project Progress Bar** - Visual % completion through phases
- **Collapsible Sections** - Cleaner interface, expand only what you need
- **Trust Indicators** - Last validated time, evidence file count, regression status
- **Run All Button** - One-click to run all quality checks (~5 min)

---

## Quick Start

```bash
# Update data and open dashboard (recommended)
npm run dashboard

# Or run separately:
npm run dashboard:update   # Refresh dashboard-data.json
npm run dashboard:serve    # Start HTTP server on $DASHBOARD_PORT (default 8811)
```

Then open:
- **v2 Dashboard:** http://localhost:8811/scripts/dashboard/index-v2.html (recommended)
- **Original Dashboard:** http://localhost:8811/scripts/dashboard/index.html

For live validation streaming, also start the runner:

```bash
# In a separate terminal
npm run validation:runner  # Starts API on port 8810
```

---

## Dashboard Sections

### Phase Gates Grid

Shows the status of all phase gates (Phases 1-8 plus coverage gates):

| Status | Color | Meaning |
|--------|-------|---------|
| PASS | Green | Gate requirements met |
| WARN | Yellow | Warnings exist but no blockers |
| FAIL | Red | Blockers exist, phase cannot complete |

**Gates displayed:**
- Phase 1: Stories & Business Rules
- Phase 2: Contracts & Registry
- Phase 3: Backend Implementation
- Phase 4: UX Specs validators
- Phase 4-Coverage: Story + Endpoint + UX-Contracts coverage
- Phase 5: All validators passing
- Phase 5-Coverage: Spec-script coverage
- Phase 6: Frontend Endpoint Maps
- Phase 7: Frontend UI Implementation
- Phase 8: Frontend Feature Validation

Each gate card shows:
- Pass/fail icon
- Gate name
- Status badge
- Blockers (if failing)

---

### Stats Grid

Five key metrics at a glance:

| Metric | Description |
|--------|-------------|
| **Endpoints** | Total endpoints from ENDPOINTS.json, how many complete |
| **User Stories** | Count of `## US-XXX` headers in `docs/user-stories/*.md` |
| **UX Specs** | Specs in `docs/test-plans/validation-specs/*.md` with matching scripts |
| **Validators** | Total validators, how many passing from registry |
| **Frontend Features** | Features from `frontend-poc/FEATURE-CATALOG.md`, how many working |

Colors:
- Green: 100% coverage
- Yellow: 80-99% coverage
- Red: <80% coverage

---

### Blockers Card

Lists what's preventing phase progression:

| Blocker Type | Description |
|--------------|-------------|
| `missing_validator` | Validator has never been run |
| `validator_failed` | Validator ran but failed |
| `stale_results` | Results older than threshold |
| `gate_failure` | Phase gate check failed |

Each blocker shows:
- Title (what's blocking)
- Description (why it matters)
- Action (command to run to fix)

---

### Next Actions Card

Priority-ordered prompts for AI agents or developers. Click to copy.

Example prompts:
- "Run npm run validation:all to update all validators and fix blockers"
- "Fix Phase 4 blockers: auth, channels, chat-core"

---

### Commit Guard

Shows whether a `git commit` would be blocked:

| Status | Meaning |
|--------|---------|
| **Clear** (green) | All mapped validators passing on current commit |
| **Blocked** (red) | One or more validators failing or not run |

The commit guard checks:
1. Were validations run this session?
2. Were `src/` or `scripts/` files modified?
3. Did all required validators pass?

If blocked, the card shows which validators need attention.

---

### Live Validation Runner

Interactive panel for running validators in real-time:

**Features:**
- "Run All (live)" button triggers `npm run validation:all`
- Individual validator "Run" buttons for targeted runs
- Real-time SSE streaming of validator output
- Status dots showing idle/running/pass/fail
- "Logs" button to view full log file for each validator

**Requirements:**
- Runner service must be running: `npm run validation:runner`
- Runner starts on port defined in `.env` as `VALIDATION_RUNNER_PORT` (default 8810)
- Dashboard polls runner status every 10 seconds

**Status indicators:**
- ⚪ Idle - Not running
- 🟡 Running - Currently executing
- 🟢 Pass - Completed successfully
- 🔴 Fail - Completed with failures

---

### Validator Health

Shows detailed status for each validator:

| Field | Description |
|-------|-------------|
| **Name** | Validator identifier |
| **Status** | pass/fail/not_run |
| **Age** | Hours since last run |
| **Commit** | Git commit when validator ran |
| **Stale** | Whether results are outdated |
| **Failure Notes** | Failed test names (if any) |

**Staleness rules:**
- Results older than 4 hours = stale
- Results from different commit = stale
- Never run = flagged as "never run"

---

### Spec/Script Gaps

Coverage analysis between specs and scripts:

| Gap Type | Meaning | Action |
|----------|---------|--------|
| **Specs without scripts** | UX spec exists but no validator | Create `validate-{name}-full.ts` |
| **Scripts without specs** | Validator exists but no spec | Create spec in `validation-specs/` |

This ensures every spec has a corresponding validator and vice versa.

---

### Regression Alert Banner

**RED BANNER** appears when:
- A validator that previously passed is now failing
- Must be fixed before pushing

Shows:
- Number of regressions
- Validator names
- Commit where regression occurred

---

### Evidence Files

Lists progress tracking files and their status:

| File | Phase | Purpose |
|------|-------|---------|
| `STORY-RULES-STATUS.md` | 1 | User stories and business rules |
| `ENDPOINT-MATRIX-STATUS.md` | 2 | Contract documentation |
| `AC-COVERAGE-STATUS.md` | 2 | Acceptance criteria coverage |
| `NAMING-VALIDATION-STATUS.md` | 2 | Naming conventions |
| `ENDPOINT-REVIEW-STATUS.md` | 3 | Backend implementation review |
| `UX-SPEC-COVERAGE.md` | 4 | UX spec coverage |
| `ENDPOINT-COVERAGE-STATUS.md` | 4 | Endpoint coverage |
| `UX-CONTRACT-ALIGNMENT.md` | 5 | UX-contract alignment |
| `UX-VALIDATION-STATUS.md` | 5 | Validation results |
| `SPEC-SCRIPT-COVERAGE.md` | 5 | Spec-script coverage |
| `FRONTEND-FEATURE-STATUS.md` | 8 | Frontend feature validation status |
| `FRONTEND-ENDPOINT-COVERAGE.md` | 8 | Frontend endpoint coverage |

Each file shows:
- Exists/missing status
- Last modified timestamp
- Associated phase

---

### Recent Commits

Shows last 8 git commits with:
- Commit hash (clickable)
- Commit message
- Relative timestamp

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dashboard` | Update data and open dashboard |
| `npm run dashboard:update` | Refresh `dashboard-data.json` |
| `npm run dashboard:serve` | Start HTTP server on $DASHBOARD_PORT (8811) |
| `npm run validation:runner` | Start live runner on port 8810 |
| `npm run validation:all` | Run all validators |
| `npm run validation:gates` | Check all phase gates |
| `npm run validation:quick` | Quick gate status check |

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Validator scripts update validation-registry.json       │
│     npx ts-node scripts/validation/validate-*-full.ts       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       v
┌─────────────────────────────────────────────────────────────┐
│  2. Data collector reads registry and computes stats        │
│     npm run dashboard:update                                │
│     -> Writes dashboard-data.json                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       v
┌─────────────────────────────────────────────────────────────┐
│  3. Dashboard HTML loads JSON and renders UI                │
│     scripts/dashboard/index.html                            │
│     -> Auto-refreshes every 30 seconds                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       v
┌─────────────────────────────────────────────────────────────┐
│  4. Live runner provides real-time SSE streaming            │
│     npm run validation:runner                               │
│     -> Dashboard connects to /api/validate/events           │
└─────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Dashboard shows stale data
```bash
npm run dashboard:update  # Force refresh
```

### Live runner not connecting
1. Ensure runner is started: `npm run validation:runner`
2. Check port matches `.env` VALIDATION_RUNNER_PORT
3. Check browser console for SSE errors

### Validators stuck in "running" state
- Dashboard auto-syncs with runner every 10 seconds
- Click "Refresh" to force update
- Check runner terminal for errors

### Phase gates showing wrong status
```bash
npm run validation:gates  # Re-check all gates
npm run dashboard:update  # Refresh dashboard data
```

---

## See Also

- [LIVE_VALIDATION_RUNNER.md](LIVE_VALIDATION_RUNNER.md) - Runner service details
- [VALIDATION_REGISTRY.md](VALIDATION_REGISTRY.md) - Registry schema
- [PHASE_GATES.md](PHASE_GATES.md) - Gate requirements
- [CLAUDE_HOOKS.md](CLAUDE_HOOKS.md) - Commit hooks
- [CHAIN_OF_TRUST.md](CHAIN_OF_TRUST.md) - Full architecture
