# Build and Deploy in Nx Monorepo

**Context:** Nx provides powerful tools for building and deploying only what changed. This guide shows how to leverage Nx affected commands, Docker builds per app, and CI/CD strategies for a monorepo with multiple backend services.

## Nx Affected Commands

### Understanding Affected Detection

Nx tracks dependencies between projects and determines what's affected by changes:

```bash
# Show dependency graph
nx graph

# Show affected projects
nx affected:apps
nx affected:libs

# Show dependency graph of affected projects
nx affected:graph
```

### Building Only Changed Services

```bash
# Build all affected apps
nx affected --target=build --base=main

# Build with parallelization
nx affected --target=build --parallel=3

# Build specific projects
nx run-many --target=build --projects=auth-service,chat-service

# Build all
nx run-many --target=build --all
```

### Testing Affected Code

```bash
# Test only affected projects
nx affected --target=test --base=main --head=HEAD

# Test with coverage
nx affected --target=test --coverage --parallel=3

# Test affected E2E
nx affected --target=e2e
```

### Linting and Type Checking

```bash
# Lint affected projects
nx affected --target=lint

# Type check affected projects
nx affected --target=typecheck

# Run all quality checks
nx affected --target=lint,test,typecheck --parallel=3
```

## Docker Builds per App

### Multi-Stage Dockerfile per Service

**apps/auth-service/Dockerfile**
```dockerfile
# Stage 1: Build dependencies
FROM node:18-alpine AS dependencies

WORKDIR /app

# Copy workspace configuration
COPY package*.json ./
COPY nx.json tsconfig.base.json ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Stage 2: Build application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./

# Copy workspace configuration
COPY nx.json tsconfig.base.json ./

# Copy source code for this app and shared libs
COPY apps/auth-service ./apps/auth-service
COPY libs ./libs
COPY openapi/auth-service ./openapi/auth-service
COPY openapi/shared ./openapi/shared

# Build only this app
RUN npx nx build auth-service --prod

# Stage 3: Production runtime
FROM node:18-alpine AS runtime

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --production --prefer-offline --no-audit

# Copy built application
COPY --from=builder /app/dist/apps/auth-service ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Environment
ENV NODE_ENV=production
ENV PORT=8001

EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "main.js"]
```

### Docker Compose for Local Development

**docker-compose.yml**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD: myapp
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  auth-service:
    build:
      context: .
      dockerfile: apps/auth-service/Dockerfile
    ports:
      - "8001:8001"
    environment:
      PORT: 8001
      DATABASE_URL: postgresql://myapp:myapp@postgres:5432/myapp
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  chat-service:
    build:
      context: .
      dockerfile: apps/chat-service/Dockerfile
    ports:
      - "8002:8002"
    environment:
      PORT: 8002
      DATABASE_URL: postgresql://myapp:myapp@postgres:5432/myapp
      REDIS_URL: redis://redis:6379
      AUTH_SERVICE_URL: http://auth-service:8001
    depends_on:
      - postgres
      - redis
      - auth-service

  api-gateway:
    build:
      context: .
      dockerfile: apps/api-gateway/Dockerfile
    ports:
      - "8000:8000"
    environment:
      PORT: 8000
      AUTH_SERVICE_URL: http://auth-service:8001
      CHAT_SERVICE_URL: http://chat-service:8002
    depends_on:
      - auth-service
      - chat-service

volumes:
  postgres_data:
```

### Build Script with Nx Affected

**scripts/build-affected-images.sh**
```bash
#!/bin/bash

set -e

BASE_BRANCH=${1:-main}

echo "Detecting affected apps since $BASE_BRANCH..."

# Get affected apps
AFFECTED_APPS=$(npx nx affected:apps --base=$BASE_BRANCH --plain)

if [ -z "$AFFECTED_APPS" ]; then
  echo "No affected apps detected"
  exit 0
fi

echo "Affected apps: $AFFECTED_APPS"

# Build Docker images for affected apps
for APP in $AFFECTED_APPS; do
  echo "Building Docker image for $APP..."
  docker build -f apps/$APP/Dockerfile -t myregistry/$APP:latest .
  echo "✅ Built $APP"
done

echo "✅ All affected images built successfully"
```

## CI/CD with Nx Cloud

### GitHub Actions Workflow

**.github/workflows/ci.yml**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  main:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Set up Nx Cloud
        run: npx nx-cloud start-ci-run

      - name: Lint affected
        run: npx nx affected --target=lint --base=origin/main

      - name: Test affected
        run: npx nx affected --target=test --base=origin/main --coverage

      - name: Build affected
        run: npx nx affected --target=build --base=origin/main --prod

      - name: E2E affected
        run: npx nx affected --target=e2e --base=origin/main

      - name: Contract validation
        run: npx nx affected --target=contract-validate --base=origin/main

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/**/lcov.info

  build-images:
    runs-on: ubuntu-latest
    needs: main
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: myregistry.com
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build and push affected images
        run: |
          AFFECTED_APPS=$(npx nx affected:apps --base=origin/main~1 --plain)
          for APP in $AFFECTED_APPS; do
            echo "Building $APP..."
            docker buildx build \
              --platform linux/amd64,linux/arm64 \
              --file apps/$APP/Dockerfile \
              --tag myregistry.com/$APP:${{ github.sha }} \
              --tag myregistry.com/$APP:latest \
              --push \
              .
          done
```

### Nx Cloud Configuration

**nx.json**
```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-cloud",
      "options": {
        "cacheableOperations": ["build", "test", "lint"],
        "accessToken": "YOUR_NX_CLOUD_TOKEN"
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "cache": true
    },
    "lint": {
      "cache": true
    }
  }
}
```

## Deployment Strategies

### Kubernetes Deployment per Service

**apps/auth-service/k8s/deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  labels:
    app: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
        version: "1.0"
    spec:
      containers:
      - name: auth-service
        image: myregistry.com/auth-service:latest
        ports:
        - containerPort: 8001
          name: http
        env:
        - name: PORT
          value: "8001"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8001
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  selector:
    app: auth-service
  ports:
  - protocol: TCP
    port: 8001
    targetPort: 8001
  type: ClusterIP
```

### Deploy Script for Affected Services

**scripts/deploy-affected.sh**
```bash
#!/bin/bash

set -e

BASE_BRANCH=${1:-main}
ENVIRONMENT=${2:-staging}

echo "Deploying affected apps to $ENVIRONMENT..."

# Get affected apps
AFFECTED_APPS=$(npx nx affected:apps --base=$BASE_BRANCH --plain)

if [ -z "$AFFECTED_APPS" ]; then
  echo "No affected apps to deploy"
  exit 0
fi

echo "Affected apps: $AFFECTED_APPS"

for APP in $AFFECTED_APPS; do
  echo "Deploying $APP to $ENVIRONMENT..."

  # Update image tag in Kubernetes
  kubectl set image deployment/$APP \
    $APP=myregistry.com/$APP:$GITHUB_SHA \
    -n $ENVIRONMENT

  # Wait for rollout
  kubectl rollout status deployment/$APP -n $ENVIRONMENT

  echo "✅ Deployed $APP"
done

echo "✅ All affected apps deployed successfully"
```

## Performance Optimization

### Build Caching

**nx.json**
```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-cloud",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "contract-validate"],
        "parallel": 3,
        "runtimeCacheInputs": ["node -v"]
      }
    }
  }
}
```

### Remote Caching with Nx Cloud

```bash
# Enable remote caching
npx nx-cloud start-ci-run

# Run affected with remote cache
nx affected --target=build --base=main
```

## Best Practices

1. **Affected Commands:** Always use affected commands in CI/CD
2. **Parallelization:** Run tasks in parallel (`--parallel=3`)
3. **Caching:** Enable Nx Cloud for remote caching
4. **Docker Layers:** Optimize Docker layers for faster builds
5. **Independent Deploys:** Deploy only affected services
6. **Health Checks:** Always include health checks in containers
7. **Resource Limits:** Set appropriate CPU/memory limits

## Anti-Patterns to Avoid

1. Building all apps on every commit
2. Not using Nx affected commands
3. Deploying entire monorepo as single unit
4. Skipping cache optimization
5. Not parallelizing tasks
6. Ignoring build dependencies

## Related Handbook Sections

- `stacks/nx-monorepo/MULTI_APP_COORDINATION.md` - Service coordination
- `stacks/nx-monorepo/VALIDATION_COORDINATION.md` - Validation in CI/CD
- `handbook/SYSTEM_DELIVERY_PLAYBOOK.md` - Delivery workflow
