# Claude Code Integration Guide

> **Audience:** Developers using Claude Code to deliver projects following the System Delivery Playbook.
> **Purpose:** Prescriptive, step-by-step guidance on which AI tools to invoke at each phase. Follow this exactly - no decision-making required.

This guide maps the playbook phases to specific Claude Code tools (skills, agents, and slash commands). When you reach a phase, use the tools listed. Do not improvise.

---

## CRITICAL: Chain of Trust Enforcement

**STOP. Read this before any phase work.**

This project implements automated monitoring. You MUST understand:

| Document | What It Explains |
|----------|-----------------|
| `../monitoring/CHAIN_OF_TRUST.md` | Why you're being monitored |
| `../monitoring/CLAUDE_HOOKS.md` | Why commits get blocked |
| `../monitoring/PHASE_GATES.md` | Why phases can't be claimed done |

**Required before EVERY commit:**

```bash
npm run validation:all
```

**If your commit is blocked:** The Claude hook detected you modified code without running validations. Run the command above and retry.

**If you claim a phase complete:** The PM will check `npm run validation:gates` to verify. The system computes phase status from evidence, not from your claims.

**Core principle:** Status is computed from evidence, never claimed by agents.

---

## Quick Reference: Tools by Category

### Skills (invoke via Skill tool)

| Skill | When to Use |
|-------|-------------|
| `plan-manager` | Execute multi-task implementation plans with agent coordination |
| `plan-validation` | Validate implementation plans against codebase before execution |
| `post-execution-verification` | Verify completed work matches requirements |
| `cost-aware-model-selection` | Optimize agent costs for tasks with objective success criteria |

### Slash Commands (invoke via SlashCommand tool)

| Command | When to Use |
|---------|-------------|
| `/security-pro:security-audit` | After Phase 3 implementation, before Phase 4 |
| `/security-pro:dependency-audit` | Before any production deployment |
| `/testing-suite:generate-tests` | Phase 5 - Generate test suites for new code |
| `/testing-suite:test-coverage` | Phase 5 - Analyze and improve test coverage |
| `/feature-dev:feature-dev` | Phase 3 - Guided feature development |

### Specialized Agents (invoke via Task tool)

| Agent | When to Use |
|-------|-------------|
| `Explore` | Codebase exploration, finding patterns, understanding architecture |
| `Plan` | Complex task planning before implementation |
| `feature-dev:code-architect` | Phase 2-3 - Design feature architecture |
| `feature-dev:code-explorer` | Phase 0-1 - Understand existing codebase |
| `feature-dev:code-reviewer` | After any significant code changes |
| `testing-suite:test-engineer` | Phase 5 - Test automation and quality |
| `security-pro:security-auditor` | Phase 3 completion - Security review |
| `fullstack-starter-pack:api-builder` | Phase 2-3 - API design and implementation |
| `fullstack-starter-pack:database-designer` | Phase 2 - Schema design |

---

## Phase-by-Phase Tool Guide

### Phase 0: Features

**Goal:** Define major capabilities in plain language.

**Required Tools:**

1. **Start with exploration** (if existing codebase):
   ```
   Task tool -> subagent_type: "Explore"
   Prompt: "Explore the codebase to understand existing features,
   architecture patterns, and capabilities. Report findings organized
   by domain (auth, data, API, etc.)"
   ```

2. **No other tools needed** - This phase is conversational with the PM.

**Artifacts to Create:**
- `docs/features.md` - Feature list

**Exit Criteria:**
- Feature list exists and is approved by PM
- No validation scripts required

---

### Phase 1: User Stories & Business Rules

**Goal:** Turn features into testable stories and explicit rules.

**Required Tools:**

1. **Explore existing patterns** (for consistency):
   ```
   Task tool -> subagent_type: "feature-dev:code-explorer"
   Prompt: "Analyze existing user stories and business rules in
   docs/user-stories/ and docs/business-rules/ to understand
   formatting conventions, ID numbering, and cross-referencing patterns."
   ```

2. **After writing stories/rules, validate:**
   ```bash
   npx ts-node docs/test-plans/scripts/check-business-rules-coverage.ts
   ```

**Artifacts to Create:**
- `docs/user-stories/*.md` - Stories with `US-xxx` IDs
- `docs/business-rules/*.md` - Rules with `BR-xxx` IDs
- `docs/test-plans/progress/STORY-RULES-STATUS.md` - Validation output

**Exit Criteria:**
- `check-business-rules-coverage` shows 0 issues
- Every story has linked rules
- No undefined rule references

---

### Phase 2: Endpoint Contracts & Registry

**Goal:** Define API contracts backed by stories and rules.

**Required Tools:**

1. **Design API architecture:**
   ```
   Task tool -> subagent_type: "feature-dev:code-architect"
   Prompt: "Design the API architecture for [feature].
   Read the user stories in docs/user-stories/ and business rules
   in docs/business-rules/. Propose endpoint contracts following
   handbook/contracts/MASTER_API_TEMPLATE_v5_AGENT.yaml patterns.
   Output: OpenAPI path definitions and schema designs."
   ```

2. **For database changes:**
   ```
   Task tool -> subagent_type: "fullstack-starter-pack:database-designer"
   Prompt: "Design database schema changes for [feature].
   Follow existing patterns in src/database/models/.
   Output: Model definitions and migration plan."
   ```

3. **After writing contracts, validate:**
   ```bash
   npm run openapi:bundle
   npm run endpoints:validate
   npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts
   ```

**Artifacts to Create:**
- `openapi/paths/*.yaml` - Endpoint definitions
- `openapi/schemas/*.yaml` - Schema definitions
- `architecture/ENDPOINTS.json` - Generated registry
- `docs/test-plans/progress/ENDPOINT-MATRIX-STATUS.md` - Validation output

**Exit Criteria:**
- `validate-documentation-matrix` shows 0 undefined endpoints
- All endpoints linked to stories and rules
- OpenAPI bundle succeeds

---

### Phase 3: Backend Implementation

**Goal:** Implement endpoints to match contracts.

**Required Tools:**

1. **Use guided feature development:**
   ```
   SlashCommand tool -> command: "/feature-dev:feature-dev [feature description]"
   ```
   This launches an interactive guided flow that:
   - Explores the codebase for patterns
   - Designs architecture aligned with existing conventions
   - Implements with proper structure

2. **For complex features, use plan-validation first:**
   ```
   Skill tool -> skill: "plan-validation"
   ```
   This validates your implementation plan against:
   - Existing codebase patterns
   - API specs in ENDPOINTS.md
   - Database conventions
   - Field naming standards

3. **After implementation, run security audit:**
   ```
   SlashCommand tool -> command: "/security-pro:security-audit"
   ```

4. **Mandatory code review:**
   ```
   Task tool -> subagent_type: "feature-dev:code-reviewer"
   Prompt: "Review the code changes for [feature].
   Check for: bugs, security vulnerabilities, adherence to
   project conventions, alignment with OpenAPI contracts,
   and testing standards compliance (handbook/testing/TESTING_STANDARDS.md):
   - Test data created via factories
   - Database tests use transaction rollback
   - No shared mutable state between tests"
   ```

5. **Validate implementation:**
   ```bash
   npm run endpoints:validate
   npm run lint
   npm run typecheck
   npm test
   ```

**Artifacts to Create:**
- `src/modules/*/controllers/*.ts` - Controllers
- `src/modules/*/services/*.ts` - Services
- `src/modules/*/dto/*.ts` - DTOs
- `src/database/migrations/*.ts` - Migrations (if needed)
- `docs/test-plans/progress/ENDPOINT-REVIEW-STATUS.md` - Validation output

**Exit Criteria:**
- `endpoints:validate` shows no missing endpoints
- Security audit passes (no critical/high issues)
- Code review completed
- All tests pass

---

### Phase 4: UX Validation Specs

**Goal:** Define multi-user journeys that exercise APIs.

**Required Tools:**

1. **Explore existing specs for patterns:**
   ```
   Task tool -> subagent_type: "Explore"
   Prompt: "Analyze existing UX validation specs in
   docs/test-plans/validation-specs/ to understand:
   - Format and structure conventions
   - How stories are referenced
   - How endpoints are documented
   - Expectation patterns"
   ```

2. **After writing specs, validate coverage:**
   ```bash
   npx ts-node scripts/check-story-coverage.ts
   npx ts-node docs/test-plans/scripts/validate-ux-specs-against-contracts.ts
   ```

**Artifacts to Create:**
- `docs/test-plans/validation-specs/*.md` - UX specs with `## Covered Stories`
- `docs/test-plans/progress/UX-SPEC-COVERAGE.md` - Coverage output

**Exit Criteria:**
- `check-story-coverage` shows 0 missing stories
- `validate-ux-specs-against-contracts` shows 0 unknown endpoints/fields

---

### Phase 5: UX Validation Scripts & Logs

**Goal:** Execute specs against real backend and log results.

**Required Tools:**

1. **Generate test scaffolding:**
   ```
   SlashCommand tool -> command: "/testing-suite:generate-tests [spec-file]"
   ```

2. **For test automation setup:**
   ```
   Task tool -> subagent_type: "testing-suite:test-engineer"
   Prompt: "Implement validation scripts for [spec].
   Follow the patterns in scripts/validation/.
   Requirements:
   - Execute spec steps exactly as written
   - Log every request and response
   - Output to scripts/validation/logs/
   - Follow handbook/RULEBOOK.md rules
   - Follow handbook/testing/TESTING_STANDARDS.md:
     - Use test data factories (never inline data)
     - Use transaction rollback for database isolation"
   ```

3. **Analyze test coverage:**
   ```
   SlashCommand tool -> command: "/testing-suite:test-coverage"
   ```

4. **Run validators:**
   ```bash
   ./scripts/validation/run-all-with-logs.sh
   ```

5. **Post-execution verification:**
   ```
   Skill tool -> skill: "post-execution-verification"
   ```

**Artifacts to Create:**
- `scripts/validation/validate-*.ts` - Validation scripts
- `scripts/validation/logs/*.log` - Execution logs
- `docs/test-plans/progress/UX-VALIDATION-STATUS.md` - Results summary

**Exit Criteria:**
- All validators pass (or failures documented as FUTURE)
- Logs show full request/response for every step
- Post-execution verification confirms completion

---

### Phase 6: Frontend Endpoint Maps

**Goal:** Plan frontend by mapping screens to endpoints.

**Required Tools:**

1. **Design UI architecture:**
   ```
   Task tool -> subagent_type: "fullstack-starter-pack:ui-ux-expert"
   Prompt: "Design the frontend endpoint map for [journey].
   Using the UX specs in docs/test-plans/validation-specs/ and
   contracts in architecture/ENDPOINTS.json, create a screen-by-screen
   map of which endpoints each view calls."
   ```

2. **Validate all endpoints exist:**
   ```bash
   npx ts-node docs/test-plans/scripts/validate-documentation-matrix.ts
   ```

**Artifacts to Create:**
- `docs/frontend/endpoint-maps/*.md` - Screen-to-endpoint mappings

**Exit Criteria:**
- Every endpoint in maps exists in registry
- Every endpoint is covered by UX specs

---

### Phase 7: Frontend UI Implementation

**Goal:** Build the UI using validated endpoint maps.

**Required Tools:**

1. **For React components:**
   ```
   Task tool -> subagent_type: "fullstack-starter-pack:react-specialist"
   Prompt: "Implement the [component] following the endpoint map
   in docs/frontend/endpoint-maps/. Use existing patterns from
   the codebase. Do not add endpoints not in the map."
   ```

2. **Code review:**
   ```
   Task tool -> subagent_type: "feature-dev:code-reviewer"
   Prompt: "Review frontend implementation for [feature].
   Verify it only uses endpoints from the approved endpoint map."
   ```

**Exit Criteria:**
- UI uses only mapped endpoints
- Code review passes
- No new endpoints added without going back through Phases 2-5

---

## Multi-Task Orchestration

For large features spanning multiple phases, use the plan-manager skill:

```
Skill tool -> skill: "plan-manager"
```

This skill:
1. Validates your plan specification (Phase 0 check)
2. Dispatches specialized agents for each task
3. Verifies every requirement is met
4. Rejects partial work until all sections are complete

**When to use:** Any feature requiring 5+ distinct implementation tasks.

---

## Cost Optimization

For tasks with objective success criteria (tests pass, linter clean), use:

```
Skill tool -> skill: "cost-aware-model-selection"
```

This skill:
1. Trials the task with a faster/cheaper model first
2. Validates output quality
3. Only escalates to more capable models if needed

**When to use:** Repetitive implementation tasks, test generation, boilerplate code.

---

## Failure Recovery

When a phase validation fails:

1. **Do NOT skip the validation** - Fix the underlying issue
2. **Do NOT modify specs to match broken code** - Fix the code
3. **If stuck, explore the codebase:**
   ```
   Task tool -> subagent_type: "Explore"
   Prompt: "Help debug why [validation] is failing.
   The error is: [error]. Search for similar patterns
   that work correctly."
   ```

4. **For complex debugging:**
   ```
   Task tool -> subagent_type: "security-pro:incident-responder"
   Prompt: "Debug and fix [issue]. Context: [what you were doing].
   Error: [exact error message]"
   ```

---

## Checklist: Tools to Invoke at Each Phase

| Phase | Required Tools | Validation Commands |
|-------|----------------|---------------------|
| 0 | Explore agent | None |
| 1 | code-explorer agent | `check-business-rules-coverage` |
| 2 | code-architect, database-designer agents | `openapi:bundle`, `endpoints:validate`, `validate-documentation-matrix` |
| 3 | /feature-dev:feature-dev, plan-validation skill, code-reviewer agent, /security-pro:security-audit | `endpoints:validate`, `lint`, `typecheck`, `test` |
| 4 | Explore agent | `check-story-coverage`, `validate-ux-specs-against-contracts` |
| 5 | /testing-suite:generate-tests, test-engineer agent, /testing-suite:test-coverage, post-execution-verification skill | `run-all-with-logs.sh` |
| 6 | ui-ux-expert agent | `validate-documentation-matrix` |
| 7 | react-specialist agent, code-reviewer agent | Lint, typecheck, test |

---

## Remember

- **Follow this guide exactly** - The tools are prescribed, not suggested
- **Run validations before moving phases** - No exceptions
- **When in doubt, explore first** - Use the Explore agent to understand before changing
- **Escalate contradictions** - If tools disagree with specs, ask the PM
