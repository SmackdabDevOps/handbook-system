# @smackdab/handbook-system

A portable, API-First Test-Driven Development (TDD) methodology with full orchestration and validation infrastructure. Build and scale modern applications using contract-first development patterns with comprehensive tooling support.

## Overview

The Handbook System provides a complete framework for implementing API-first TDD across projects of any size. It includes:

- **Contract-first development** - Design APIs before implementation
- **Full orchestration** - Automated workflows for spec validation, code generation, and testing
- **Validation infrastructure** - Ensure compliance with TDD principles and API contracts
- **Stack-specific support** - Pre-configured templates for NestJS, Express, and NX monorepos
- **Claude integration** - IDE-ready workflows and git hooks for seamless development

## Quick Start

Initialize a new project with the Handbook System:

```bash
npx @smackdab/handbook-init
```

This will:
1. Set up the core project structure
2. Configure OpenAPI contract framework
3. Install development tools and git hooks
4. Generate initial TDD scaffolding
5. Set up validation rules and pipelines

## Project Structure

```
handbook-system/
├── core/              # Essential methodology components
├── optional/          # Opt-in tooling and integrations
├── stacks/            # Framework-specific implementations
│   ├── nestjs/        # NestJS backend stack
│   ├── express/       # Express.js backend stack
│   └── nx-monorepo/   # NX monorepo stack
├── validation/        # Contract validation and testing
├── claude/            # Claude IDE integration
├── husky/             # Git hooks and pre-commit rules
├── plugin/            # Plugin infrastructure
└── scaffolds/         # Project templates
```

## Core vs Optional Modules

### Core Modules
Essential components that every project uses:
- OpenAPI contract framework
- TDD enforcement gates
- Response envelope patterns
- Common validation rules
- Database schema patterns

### Optional Modules
Tools and integrations you opt into:
- Visual schema builders
- API documentation generators
- Load testing infrastructure
- Performance monitoring
- Multi-tenancy frameworks

## Stack-Specific Implementations

Choose a stack-specific template for your technology:

### NestJS Single Service
```bash
npx @smackdab/handbook-init --stack nestjs-single
```

### Express Single Service
```bash
npx @smackdab/handbook-init --stack express-single
```

### Express with NX Monorepo
```bash
npx @smackdab/handbook-init --stack express-nx
```

### Generic (Framework-agnostic)
```bash
npx @smackdab/handbook-init --stack generic
```

## Documentation

For complete documentation, visit:
- [System Delivery Playbook](./handbook/SYSTEM_DELIVERY_PLAYBOOK.md)
- [Spec Rulebook](./handbook/SPEC_RULEBOOK.md)
- [Validation Rules](./handbook/RULEBOOK.md)
- [API Patterns](./handbook/patterns/)

## Development

Build the package:
```bash
npm run build
```

Run tests:
```bash
npm test
```

## License

MIT

## About Smackdab

Built by the Smackdab team to standardize modern API-first development practices across organizations.
