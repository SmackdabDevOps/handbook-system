# Smackdab Driven Development Plugin

An agent-driven development system based on the Smackdab System Delivery Playbook. This plugin provides AI agents that guide developers through the 7-phase API-First TDD lifecycle.

## Overview

This plugin converts the handbook into an executable system where agents:
- Always know the current project phase
- Know what to do next
- Know how to resolve issues
- Handle mid-project feature additions
- Keep themselves synchronized with handbook updates

## Installation

### Option 1: Add as Local Marketplace (Recommended for Development)

```bash
# In Claude Code, add the plugin directory as a marketplace
/plugin marketplace add /Users/brooksswift/Coding/Smackdab/dev/sdd

# Install the plugin
/plugin install sdd@smackdab-local

# Verify installation
/plugin list
```

### Option 2: Copy to Project

Copy the plugin folder to your project's `.claude/plugins/` directory:

```bash
mkdir -p .claude/plugins
cp -r /path/to/sdd .claude/plugins/
```

### After Installation

Verify the plugin is loaded by running:
```
/sdd:status
```

Or use the short form if no conflicts:
```
/status
```

## Quick Start

### Check Project Status
```
/sdd:status
```

### Run Phase Validations
```
/sdd:validate 1    # Validate Phase 1
/sdd:validate all  # Validate all phases
```

### Get Next Step
```
/sdd:next
```

### Check Cross-Reference Matrix
```
/sdd:matrix
```

### Add New Feature
```
/sdd:add-feature "User can export messages to PDF"
```

### Add/Document Endpoint
```
/sdd:add-endpoint POST /exports/pdf
/sdd:add-endpoint GET /presence/me --document
```

### Sync with Handbook
```
/sdd:sync-handbook
```

## Components

### Skills

| Skill | Description |
|-------|-------------|
| **phase-navigator** | Determines current phase, shows progress, guides next steps |
| **validation-orchestrator** | Runs validation scripts, captures output, updates progress files |
| **artifact-generator** | Creates stories, rules, contracts, specs from templates |
| **failure-recovery** | Guides through fixing validation failures |
| **feature-injection** | Safely adds features mid-project |
| **endpoint-evolution** | Adds, modifies, or documents endpoints |
| **handbook-sync** | Keeps plugin aligned with handbook updates |

### Commands

| Command | Description |
|---------|-------------|
| `/sdd:status` | Show current phase status |
| `/sdd:validate [phase]` | Run phase validations |
| `/sdd:next` | Show next required action |
| `/sdd:matrix` | Check cross-reference integrity |
| `/sdd:add-feature` | Inject a new feature |
| `/sdd:add-endpoint` | Add or document an endpoint |
| `/sdd:sync-handbook` | Audit and sync with handbook |
| `/sdd:phase [N]` | Work on specific phase |

### Agents

| Agent | Description |
|-------|-------------|
| **phase-coordinator** | Orchestrates work across phases |
| **spec-author** | Writes UX specs following SPEC_RULEBOOK |
| **contract-designer** | Designs OpenAPI contracts |
| **story-rule-linker** | Ensures US↔BR cross-references |
| **validation-runner** | Executes and reports validations |
| **retroactive-documenter** | Documents unclassified endpoints (Phase 3.5) |
| **handbook-auditor** | Audits plugin against handbook |

## The 7 Phases

| Phase | Name | Key Artifacts |
|-------|------|---------------|
| 0 | Features | `docs/features.md` |
| 1 | Stories & Rules | `docs/user-stories/*.md`, `docs/business-rules/*.md` |
| 2 | Contracts | `openapi/paths/*.yaml`, `architecture/ENDPOINTS.json` |
| 3 | Backend | `src/modules/*/controllers/*.ts` |
| 3.5 | Retroactive Docs | OpenAPI + Story for unclassified endpoints |
| 4 | UX Specs | `docs/test-plans/validation-specs/*.md` |
| 5 | Validators | `scripts/validation/validate-*.ts` |
| 6 | Frontend Maps | `docs/frontend/endpoint-maps/*.md` |
| 7 | Frontend UI | Frontend implementation |

## Validation Scripts

| Phase | Script | What It Checks |
|-------|--------|----------------|
| 1 | `check-business-rules-coverage.ts` | US↔BR links |
| 2 | `validate-documentation-matrix.ts` | Endpoint↔Story↔Rule links |
| 2 | `endpoints:validate` | Endpoint↔Code alignment |
| 4 | `check-story-coverage.ts` | Story↔Spec coverage |
| 4 | `validate-ux-specs-against-contracts.ts` | Spec↔Contract alignment |
| 5 | `run-all-with-logs.sh` | Full validation suite |

## Workflow Example

### Starting a New Feature

1. **Check current status:**
   ```
   /sdd:status
   ```

2. **If in Phase 3+, use feature injection:**
   ```
   /sdd:add-feature "Users can schedule messages"
   ```

3. **The system will guide through:**
   - Creating stories (US-xxx)
   - Creating rules (BR-xxx)
   - Creating contracts (OpenAPI)
   - Implementing backend
   - Writing specs
   - Running validators

4. **Verify integration:**
   ```
   /sdd:matrix
   ```

### Handling Validation Failures

1. **When validation fails, the system will:**
   - Identify the failure type
   - Trace to root cause
   - Suggest specific fix

2. **Apply fix and re-validate:**
   ```
   /sdd:validate [phase]
   ```

### Keeping Plugin Updated

When the handbook changes:

```
/sdd:sync-handbook
```

This will:
- Scan handbook for changes
- Generate discrepancy report
- Suggest or apply updates

## Configuration

The plugin reads configuration from `.claude-plugin/plugin.json`:

```json
{
  "config": {
    "handbook_path": "handbook/",
    "docs_path": "docs/",
    "openapi_path": "openapi/",
    "architecture_path": "architecture/",
    "scripts_path": "scripts/"
  }
}
```

## Handbook Integration

This plugin is hardcoded to the Smackdab System Delivery Playbook:

- `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` - Main phases and rules
- `handbook/SPEC_RULEBOOK.md` - Spec authoring rules
- `handbook/RULEBOOK.md` - Validator behavior rules
- `handbook/contracts/MASTER_API_TEMPLATE_v5_AGENT.yaml` - Contract patterns

## Contributing

When updating this plugin:

1. **Make changes to plugin files**
2. **Run handbook audit:**
   ```
   /sdd:sync-handbook
   ```
3. **Update version in plugin.json**
4. **Test with a real project**

## License

PROPRIETARY - Smackdab Team Internal Use Only

### Hooks (Automation)

The plugin includes automation hooks that trigger validation when files change:

| Hook | Triggers On | Action |
|------|-------------|--------|
| **validate-ux-specs-on-edit** | UX spec modified | Runs `validate-ux-specs-against-contracts.ts` |
| **validate-contracts-on-edit** | OpenAPI file modified | Bundles specs and runs `endpoints:validate` |
| **validate-story-rule-coverage** | Story/rule file modified | Runs `check-business-rules-coverage.ts` |
| **validate-endpoints-on-controller** | Controller modified | Runs `endpoints:validate` |
| **suggest-phase-progression** | Progress file updated | Checks if ready for next phase |

**How it works:**
- Hooks automatically run after you edit relevant files
- Provides immediate validation feedback
- Catches issues early before they compound
- No manual validation commands needed

**Example flow:**
1. Edit `docs/test-plans/validation-specs/04-chat-core-messaging.md`
2. Hook automatically triggers: "Running spec validation..."
3. Get immediate feedback about any contract mismatches
4. Fix issues immediately while context is fresh

