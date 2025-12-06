---
description: Show plugin version and git commit info
---

# SDD Plugin Version

Report the current version of the SDD plugin.

## Instructions

Run these commands to get version info:

```bash
cd /Users/brooksswift/.claude/plugins/marketplaces/smackdab-plugins
git log --oneline -1
git log -1 --format="Commit: %H%nDate: %ci%nAuthor: %an"
```

## Output Format

Report:

```markdown
## SDD Plugin Version

**Commit:** [short SHA]
**Full SHA:** [full SHA]
**Date:** [commit date]
**Message:** [commit message]

---

**Source repo:** SmackdabDevOps/smackdab-driven-dev
**Installed at:** ~/.claude/plugins/marketplaces/smackdab-plugins/plugins/sdd
```

## Check for Updates

Also check if updates are available:

```bash
cd /Users/brooksswift/.claude/plugins/marketplaces/smackdab-plugins
git fetch origin main
git log HEAD..origin/main --oneline
```

If output shows commits, updates are available. Report:
- "✅ Up to date" if no commits shown
- "⚠️ Updates available: [count] commits behind" if commits shown
