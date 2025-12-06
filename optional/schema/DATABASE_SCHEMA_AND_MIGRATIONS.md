# Database Schema and Migrations

This document defines how to manage database schema changes and migrations across projects, based on backend v2 practices.

---

## 1. Source of Truth

The database schema must be:

- Defined by:
  - ORM models (for example Sequelize models), and  
  - Migration files (for example under `packages/sequelize/src/migrations`), and  
  - Optional DBML or documentation diagrams.
- Never “hand‑edited” directly in production without corresponding migrations.

New projects must:

- Keep models and migrations in sync.  
- Use migrations for all schema changes after initial project bootstrapping.

---

## 2. Migration Principles

- **Atomic**: Each migration must leave the DB in a consistent state, even on failure.  
- **Repeatable**: Migrations must be idempotent (safe to run once per environment).  
- **Traceable**: Migrations must be timestamped and descriptive.

Kinds of changes:

- **Backward‑compatible** (additive):
  - Adding nullable columns.  
  - Adding new tables or indexes.

- **Breaking**:
  - Dropping columns/tables.  
  - Changing types in incompatible ways.  

Breaking changes must be coordinated:

- With contract changes (OpenAPI) and DTOs.  
- With UX specs and tests.

---

## 3. Process for Schema Changes

For any change that touches the schema:

1. Update business rules and stories if the change is visible to users.  
2. Update contracts and DTOs (OpenAPI, types).  
3. Design and implement migrations:
   - Create migration files with forward and backward steps.  
4. Update ORM models to match the new schema.  
5. Run migrations in dev/stage.  
6. Update UX specs/tests to match the new behavior.  
7. Deploy and run migrations in production as part of the release.

Migrations must be part of the standard deploy pipeline, not a manual afterthought.

---

## 4. Data Migrations and Backfills

For data corrections or backfills:

- Prefer separate data migrations (scripts) over mixing heavy data manipulation into schema migrations.  
- Scripts must:
  - Be idempotent where possible.  
  - Log what they changed (counts, orgs/workspaces affected).  
  - Be safe to rerun or able to detect that they have already been applied.

Large migrations:

- Should be broken into phases (schema change, backfill, cleanup) to reduce risk.

---

## 5. Index Requirements (Mandatory)

Every migration that adds tables or modifies query patterns must include appropriate indexes.

### 5.1 Mandatory Index Rules

| Column Type | Index Required |
|-------------|----------------|
| Foreign key columns | Always |
| Columns in WHERE clauses | Always (for frequently queried) |
| Columns in ORDER BY | For large tables |
| Composite lookups | Combined index on all columns |
| Unique constraints | Automatically indexed |

### 5.2 Standard Index Patterns

```sql
-- Foreign key indexes (ALWAYS required)
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);

-- Lookup + sort patterns (common queries)
CREATE INDEX idx_messages_channel_created ON messages(channel_id, created_at DESC);

-- Membership lookups (composite for efficiency)
CREATE INDEX idx_channel_members_lookup ON channel_members(channel_id, user_id);
CREATE INDEX idx_workspace_members_lookup ON workspace_members(workspace_id, user_id);

-- Notification queries
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
```

### 5.3 Migration Template

Every migration adding a table must include indexes:

```typescript
// In migration up()
await queryInterface.createTable('messages', {
  id: { type: DataTypes.UUID, primaryKey: true },
  channel_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  content: { type: DataTypes.TEXT },
  created_at: { type: DataTypes.DATE },
});

// MANDATORY: Add indexes after table creation
await queryInterface.addIndex('messages', ['channel_id']);
await queryInterface.addIndex('messages', ['user_id']);
await queryInterface.addIndex('messages', ['channel_id', 'created_at']);
```

### 5.4 Index Naming Convention

- Single column: `idx_{table}_{column}`
- Composite: `idx_{table}_{col1}_{col2}`
- Unique: `uniq_{table}_{column}`

### 5.5 When to Skip Indexes

Only skip indexes when:
- Table will have < 1000 rows AND never grow
- Column is never used in WHERE, JOIN, or ORDER BY
- Write performance is critical and reads are rare

Document the reason in the migration file if skipping.
