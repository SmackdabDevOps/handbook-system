# Testing @smackdab/handbook-system

## Prerequisites

- Node.js 18+
- npm or pnpm
- Git

## Test Procedure

### 1. Build the Package

```bash
cd /path/to/handbook-system
npm install
npm run build
```

### 2. Test CLI Locally (without publishing)

```bash
# Create a test directory
mkdir /tmp/test-handbook-project
cd /tmp/test-handbook-project
npm init -y
git init

# Link the local package
npm link /path/to/handbook-system

# Run the init command
npx handbook-init
```

### 3. Verify Structure Created

After running handbook-init, verify:

```bash
# Check config file
cat handbook.config.json

# Check handbook directory
ls -la handbook/

# Check validation scripts
ls -la scripts/validation/

# Check hooks
ls -la .claude/
ls -la .husky/
```

### 4. Run Doctor Command

```bash
npx handbook-doctor
```

Expected output: All checks should pass (green).

### 5. Test Validation Scripts

```bash
# Quick gate check
npm run validation:quick

# Full validation (will fail on empty project - expected)
npm run validation:gates
```

## Test Matrix

| Stack Profile | Test Status | Notes |
|--------------|-------------|-------|
| nestjs-single | ☐ Pending | Test with new NestJS project |
| express-single | ☐ Pending | Test with new Express project |
| express-nx | ☐ Pending | Test with new Nx workspace |
| generic | ☐ Pending | Test with plain TypeScript project |

## Smoke Test Checklist

- [ ] handbook-init runs without errors
- [ ] handbook.config.json is created with correct stack profile
- [ ] Handbook files are copied to handbook/ directory
- [ ] Validation templates are copied to scripts/validation/
- [ ] Claude hooks are installed to .claude/hooks.json
- [ ] Husky hooks are installed to .husky/
- [ ] npm scripts are added to package.json
- [ ] handbook-doctor reports all checks passing

## Integration Test with Real Project

To test with a real NestJS project:

```bash
# Clone the NestJS starter
git clone https://github.com/nestjs/typescript-starter test-nestjs
cd test-nestjs

# Initialize handbook
npx @smackdab/handbook-init

# Select: nestjs-single profile
# Accept default paths

# Run doctor
npx handbook-doctor

# Verify integration
npm run validation:quick
```

## Known Limitations

1. Interactive prompts require TTY - CI testing needs --yes flag
2. Husky requires git repository to be initialized
3. TypeScript compilation needed before first run
