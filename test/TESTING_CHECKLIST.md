# Handbook System Testing Checklist

## Test Case 1: Fresh NestJS Project

### Setup
```bash
mkdir test-nestjs && cd test-nestjs
npm init -y
npm install @nestjs/core @nestjs/common
```

### Run Init
```bash
npx @smackdab/handbook-init
# Select: nestjs-single
# Select: auth, caching (optional modules)
```

### Verify
- [ ] handbook.config.json created with stackProfile: "nestjs-single"
- [ ] handbook/ directory contains SYSTEM_DELIVERY_PLAYBOOK.md
- [ ] handbook/auth/ exists (optional module selected)
- [ ] .claude/hooks.json installed
- [ ] .husky/pre-commit exists
- [ ] package.json has validation:* scripts
- [ ] scripts/validation/validation-registry.json initialized

### Test Commands
- [ ] `npm run validation:quick` runs without error
- [ ] `npx handbook-doctor` shows all green
- [ ] `/sdd:status` works (if SDD plugin installed)

---

## Test Case 2: Fresh Express Project

### Setup
```bash
mkdir test-express && cd test-express
npm init -y
npm install express
```

### Run Init
```bash
npx @smackdab/handbook-init
# Select: express-single
```

### Verify
- [ ] handbook.config.json has correct Express paths
- [ ] stacks/express/ patterns available if selected
- [ ] Validation templates work with Express structure

---

## Test Case 3: Nx Monorepo

### Setup
```bash
npx create-nx-workspace test-nx --preset=apps
cd test-nx
```

### Run Init
```bash
npx @smackdab/handbook-init
# Should auto-detect: express-nx
```

### Verify
- [ ] Config detects Nx structure
- [ ] Multi-app paths configured correctly
- [ ] Shared validation registry location appropriate

---

## Test Case 4: Backward Compatibility (SmackChat)

### Verify
- [ ] SmackChat's existing handbook.config.json is compatible
- [ ] Existing validators continue to work
- [ ] No breaking changes to registry format
- [ ] Claude hooks maintain same behavior

---

## Regression Tests

After any package changes, verify:
- [ ] CLI interactive prompts work
- [ ] Stack auto-detection works
- [ ] All three stacks initialize correctly
- [ ] Doctor command catches issues
- [ ] Husky hooks install properly
