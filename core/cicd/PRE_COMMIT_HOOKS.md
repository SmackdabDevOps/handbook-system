# Pre-Commit Hooks

This document defines the standard pre-commit hook configuration that every project must implement. Pre-commit hooks run automatically before every `git commit` and enforce code quality and TDD compliance locally.

---

## 1. Goals

- **Catch issues early** - Before code enters version control
- **Fast feedback** - Hooks must complete in ~30 seconds
- **Consistent formatting** - No style debates in code review
- **Test coverage ratchet** - Staged files must have 90% coverage (prevents regression)
- **TDD enforcement** - Ensure validators are current before committing

---

## 2. Required Tools

Every project must install these development dependencies:

```bash
npm install --save-dev husky lint-staged eslint prettier \
  @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-config-prettier eslint-plugin-prettier
```

**Tool purposes:**

| Tool | Purpose |
|------|---------|
| `husky` | Git hooks management |
| `lint-staged` | Run linters only on staged files (fast!) |
| `eslint` | Static code analysis, catches bugs |
| `prettier` | Code formatting |
| `@typescript-eslint/*` | TypeScript-specific linting rules |
| `eslint-config-prettier` | Disables ESLint rules that conflict with Prettier |
| `eslint-plugin-prettier` | Runs Prettier as an ESLint rule |

---

## 3. Configuration Files

### 3.1 Husky Setup

Initialize husky in your project:

```bash
npx husky init
```

This creates `.husky/` directory and adds `"prepare": "husky"` to package.json.

### 3.2 Pre-Commit Hook

Create `.husky/pre-commit`:

```sh
#!/bin/sh
# =============================================================================
# Pre-Commit Hook - Code Quality, Test Coverage & TDD Enforcement
# =============================================================================
# This hook runs BEFORE every commit to ensure:
#   1. Code quality (lint + format)
#   2. Test coverage for staged files (90% threshold)
#   3. TDD validator freshness
#
# To bypass (emergency only): git commit --no-verify
#
# See handbook/cicd/PRE_COMMIT_HOOKS.md for full documentation.
# =============================================================================

echo "🔍 Running pre-commit checks..."
echo ""

# -----------------------------------------------------------------------------
# Step 1: Lint & Format Staged Files
# -----------------------------------------------------------------------------
echo "📝 Step 1/3: Linting & formatting staged files..."

npx lint-staged

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ COMMIT BLOCKED - Lint/format errors"
  echo ""
  echo "ESLint found issues that couldn't be auto-fixed."
  echo "Fix the errors above, then try again."
  echo ""
  echo "To bypass (emergency): git commit --no-verify"
  exit 1
fi

echo "✅ Lint & format passed"
echo ""

# -----------------------------------------------------------------------------
# Step 2: Test Coverage for Staged Files
# -----------------------------------------------------------------------------
echo "🧪 Step 2/3: Checking test coverage for staged files..."

npx ts-node scripts/validation/check-staged-coverage.ts

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ COMMIT BLOCKED - Staged files below 90% coverage"
  echo ""
  echo "Add tests for the files you're changing before committing."
  echo ""
  echo "To bypass (emergency): git commit --no-verify"
  exit 1
fi

echo "✅ Staged file coverage passed"
echo ""

# -----------------------------------------------------------------------------
# Step 3: TDD Validator Check
# -----------------------------------------------------------------------------
echo "📋 Step 3/3: Checking TDD validator status..."

npx ts-node scripts/validation/commit-guard.ts

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ COMMIT BLOCKED - TDD validation failed"
  echo ""
  echo "Run the relevant validators before committing:"
  echo "  npm run validation:quick   (fast check)"
  echo "  npm run validation:all     (full validation)"
  echo ""
  echo "To bypass (emergency): git commit --no-verify"
  exit 1
fi

echo ""
echo "✅ All pre-commit checks passed - committing..."
```

### 3.3 lint-staged Configuration

Create `.lintstagedrc.json`:

```json
{
  "*.ts": [
    "eslint --fix --max-warnings=0",
    "prettier --write"
  ],
  "*.{json,md,yaml,yml}": [
    "prettier --write"
  ]
}
```

**Key design decisions:**

| Decision | Why |
|----------|-----|
| `--fix` | Auto-fix what can be fixed |
| `--max-warnings=0` | Treat warnings as errors (enforces clean code) |
| Only staged files | Fast! Full codebase lint is for CI |
| JSON/MD/YAML formatting | Consistent config/doc formatting |

### 3.4 ESLint Configuration

Create `.eslintrc.js`:

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    '.eslintrc.js',
    'dist/',
    'node_modules/',
    'coverage/',
    '*.js',
    '!.eslintrc.js',
  ],
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // Code quality
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',

    // Prettier handles formatting
    'prettier/prettier': ['error', {}, { usePrettierrc: true }],
  },
};
```

### 3.5 Prettier Configuration

Create `.prettierrc`:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

---

## 4. npm Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint \"{src,test,scripts}/**/*.ts\" --fix",
    "lint:check": "eslint \"{src,test,scripts}/**/*.ts\"",
    "format": "prettier --write \"{src,test,scripts}/**/*.ts\"",
    "format:check": "prettier --check \"{src,test,scripts}/**/*.ts\"",
    "check:staged-coverage": "npx ts-node scripts/validation/check-staged-coverage.ts",
    "prepare": "husky"
  }
}
```

**Script purposes:**

| Script | When to Use |
|--------|-------------|
| `npm run lint` | Fix all linting issues in codebase |
| `npm run lint:check` | Check for issues without fixing (CI) |
| `npm run format` | Format all files |
| `npm run format:check` | Check formatting without fixing (CI) |
| `npm run check:staged-coverage` | Check coverage for staged files only (90% threshold) |
| `npm run prepare` | Auto-runs on `npm install` to set up husky |

---

## 5. Staged Coverage Check (Test Ratchet)

The staged coverage check (`scripts/validation/check-staged-coverage.ts`) ensures any files you commit have adequate test coverage.

### 5.1 How It Works

1. **Gets staged files** - Uses `git diff --cached --name-only`
2. **Filters to src/*.ts** - Only checks source files (excludes dto, model, module, spec, index)
3. **Runs related tests** - Uses Jest `--findRelatedTests` for those files
4. **Checks per-file coverage** - Each staged file must have 90% coverage

### 5.2 Why "Ratchet" Approach?

**Problem:** Legacy code has low coverage (~23%). Requiring 90% globally would block all commits.

**Solution:** Only check coverage for files being changed. This:
- Prevents coverage from getting WORSE
- Allows gradual improvement
- Doesn't block unrelated work
- Ensures new code meets standards

### 5.3 What Gets Excluded

Files matching these patterns skip coverage requirements:

```typescript
const EXCLUDED_PATTERNS = [
  /\.dto\.ts$/,      // DTOs tested in contract tests
  /\.model\.ts$/,    // Models are data definitions
  /\.module\.ts$/,   // NestJS module wiring
  /\.spec\.ts$/,     // Test files themselves
  /\.test\.ts$/,     // Test files
  /index\.ts$/,      // Barrel exports
  /main\.ts$/,       // Entry point
];
```

### 5.4 How to Fix Coverage Failures

```bash
# See which files failed
npm run check:staged-coverage

# Run coverage report to see uncovered lines
npm test -- --coverage --collectCoverageFrom='src/path/to/file.ts'

# Add tests in:
# src/modules/{module}/services/__tests__/{service}.spec.ts
# src/modules/{module}/controllers/__tests__/{controller}.spec.ts
```

---

## 6. Commit Guard (TDD Enforcement)

The commit guard (`scripts/validation/commit-guard.ts`) enforces TDD compliance:

### 6.1 What It Checks

1. **Detects changed files** - What's being committed
2. **Maps to validators** - Which validators cover those files
3. **Checks validator freshness** - Were validators run on current commit?

### 6.2 When It Blocks

The commit guard blocks if:
- Code files changed (`src/`, `scripts/`, `openapi/`)
- Required validators are stale (not run on current commit)

### 6.3 How to Unblock

```bash
# Quick check (most common)
npm run validation:quick

# Full validation
npm run validation:all

# Specific validator
npm run validation:<name>
```

### 6.4 Bypass (Emergency Only)

```bash
git commit --no-verify
```

**Use sparingly!** This bypasses ALL pre-commit checks. Document why in commit message.

---

## 7. Hook Execution Flow

```
git commit
    │
    ▼
┌─────────────────────────────────────┐
│  Step 1: lint-staged (~3s)          │
│  - ESLint on staged *.ts files      │
│  - Prettier on staged files         │
│  - Auto-fixes when possible         │
└──────────────┬──────────────────────┘
               │
               ▼ (if passes)
┌─────────────────────────────────────┐
│  Step 2: staged-coverage (~20s)     │
│  - Run tests for staged files       │
│  - Check 90% coverage per file      │
│  - Skip dto/model/module/spec/index │
└──────────────┬──────────────────────┘
               │
               ▼ (if passes)
┌─────────────────────────────────────┐
│  Step 3: commit-guard (~2s)         │
│  - Check validator freshness        │
│  - Block if validators stale        │
└──────────────┬──────────────────────┘
               │
               ▼ (if passes)
┌─────────────────────────────────────┐
│  Commit created                     │
└─────────────────────────────────────┘
```

**Expected runtime:** ~25-30 seconds total

---

## 8. Troubleshooting

### 8.1 ESLint Errors That Can't Auto-Fix

```bash
# View all errors
npm run lint:check

# Fix manually, then retry commit
```

### 8.2 Prettier Conflicts with ESLint

Ensure `eslint-config-prettier` is installed and extended LAST in `.eslintrc.js`:

```javascript
extends: [
  'plugin:@typescript-eslint/recommended',
  'plugin:prettier/recommended',  // Must be last!
],
```

### 8.3 Commit Guard Blocking on Non-Code Changes

If you're only changing docs/config and commit-guard still blocks:

```bash
# Check what files trigger code detection
npx ts-node scripts/validation/commit-guard.ts
```

The guard only requires validators for files in: `src/`, `scripts/`, `openapi/`

### 8.4 Hook Not Running

```bash
# Verify husky is installed
ls -la .husky/

# Reinstall husky
npm run prepare
```

---

## 9. CI/CD Integration

Pre-commit hooks are LOCAL enforcement. CI/CD should also run:

```yaml
# In GitHub Actions / CI pipeline
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint:check
      - run: npm run format:check
```

This catches issues from `--no-verify` commits.

---

## 10. New Project Checklist

When setting up a new project, complete these steps:

- [ ] Install dependencies: `npm install --save-dev husky lint-staged eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier eslint-plugin-prettier`
- [ ] Initialize husky: `npx husky init`
- [ ] Create `.husky/pre-commit` (copy from Section 3.2)
- [ ] Create `.lintstagedrc.json` (copy from Section 3.3)
- [ ] Create `.eslintrc.js` (copy from Section 3.4)
- [ ] Create `.prettierrc` (copy from Section 3.5)
- [ ] Add npm scripts to `package.json` (copy from Section 4)
- [ ] Create `scripts/validation/check-staged-coverage.ts` (copy from reference implementation)
- [ ] Create `scripts/validation/commit-guard.ts` (project-specific)
- [ ] Test: make a small change to a src/*.ts file and run `git commit`
- [ ] Verify: commit should show all 3 steps (lint-staged, staged-coverage, commit-guard)

---

## 11. Best Practices

| Do | Don't |
|----|-------|
| Keep hooks under 30 seconds | Run full test suite in pre-commit |
| Check only staged files | Run global coverage checks |
| Auto-fix what can be fixed | Make developers manually fix formatting |
| Block on lint errors | Allow warnings to accumulate |
| Document bypass reasons | Use `--no-verify` routinely |
| Add lint/coverage to CI as backup | Rely only on pre-commit |

---

## Related Documentation

- [CI_CD_VALIDATION_PIPELINE.md](CI_CD_VALIDATION_PIPELINE.md) - Full CI/CD configuration
- [../monitoring/PHASE_GATES.md](../monitoring/PHASE_GATES.md) - TDD phase gate requirements
- [../SYSTEM_DELIVERY_PLAYBOOK.md](../SYSTEM_DELIVERY_PLAYBOOK.md) - Overall development methodology
