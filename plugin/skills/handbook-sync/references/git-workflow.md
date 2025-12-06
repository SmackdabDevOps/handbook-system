# Plugin Git Workflow

## Repository Locations

| Location | Purpose |
|----------|---------|
| **Source repo** | `/Users/brooksswift/Coding/Smackdab/dev/smackdab-driven-dev` |
| **GitHub remote** | `https://github.com/SmackdabDevOps/smackdab-driven-dev.git` |
| **Installed copy** | `/Users/brooksswift/.claude/plugins/marketplaces/smackdab-plugins/` |

## Making Changes

### Step 1: Work in Source Repo

Always make changes in the **source repo**, not the installed copy:

```bash
cd /Users/brooksswift/Coding/Smackdab/dev/smackdab-driven-dev
```

### Step 2: Check Status

```bash
git status
git diff
```

### Step 3: Commit Changes

Use conventional commit format:

```bash
git add -A
git commit -m "type(scope): description

Details here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Commit types:**
- `feat` - New feature or capability
- `fix` - Bug fix
- `docs` - Documentation only
- `refactor` - Code restructure without behavior change
- `chore` - Maintenance tasks

**Scope examples:**
- `skills` - Changes to skills
- `commands` - Changes to commands
- `agents` - Changes to agents
- `hooks` - Changes to hooks

### Step 4: Push to GitHub

```bash
git push origin main
```

**Note:** Direct push to main is allowed for this repository.

## After Pushing Changes

### For Users to Get Updates

Users need to update their installed copy:

```bash
# Option 1: Update command
/plugin update sdd@smackdab-plugins

# Option 2: If update doesn't work, reinstall
/plugin uninstall sdd@smackdab-plugins
/plugin marketplace remove smackdab-plugins
rm -rf ~/.claude/plugins/marketplaces/smackdab-plugins
/plugin marketplace add SmackdabDevOps/smackdab-driven-dev
/plugin install sdd@smackdab-plugins
```

Then **restart Claude Code** to load changes.

### For Immediate Local Testing

To test changes immediately without pushing:

```bash
# Copy changes to installed location
cp -r /Users/brooksswift/Coding/Smackdab/dev/smackdab-driven-dev/plugins/sdd/* \
      /Users/brooksswift/.claude/plugins/marketplaces/smackdab-plugins/plugins/sdd/
```

Then restart Claude Code.

## Version Management

**Current approach:** No explicit version bumping required.

The plugin uses auto-discovery (no plugin.json with version), so changes take effect immediately after updating.

If version tracking is needed in the future:
- Add version to README.md header
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Bump patch for fixes, minor for features, major for breaking changes

## Validation Before Commit

### Check Plugin Structure

```bash
cd /Users/brooksswift/Coding/Smackdab/dev/smackdab-driven-dev/plugins/sdd

# Verify directories exist
ls -la commands/ agents/ skills/ hooks/

# Check command files have description in frontmatter
head -5 commands/*.md

# Verify skills have SKILL.md
ls skills/*/SKILL.md
```

### Test Locally

1. Copy to installed location (see above)
2. Restart Claude Code
3. Test commands: `/sdd:status`, `/sdd:start`
4. Verify skills load when triggered

## Troubleshooting

### Changes Not Appearing After Update

1. **Cache issue** - Remove and re-add marketplace:
   ```bash
   rm -rf ~/.claude/plugins/marketplaces/smackdab-plugins
   /plugin marketplace add SmackdabDevOps/smackdab-driven-dev
   ```

2. **installPath wrong** - Check `~/.claude/plugins/installed_plugins.json`
   - Should point to `.../smackdab-plugins/plugins/sdd`
   - NOT `.../smackdab-plugins/`

3. **Git not pushed** - Verify remote has changes:
   ```bash
   cd /Users/brooksswift/Coding/Smackdab/dev/smackdab-driven-dev
   git log origin/main --oneline -3
   ```

### Plugin Not Found After Rename

If plugin was renamed, must uninstall old name and install new name. Update command won't work across renames.
