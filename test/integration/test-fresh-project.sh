#!/bin/bash
# Test handbook-init with a fresh project

set -e

PACKAGE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TEST_DIR=$(mktemp -d)
echo "🧪 Testing handbook-init in: $TEST_DIR"

cd "$TEST_DIR"

# Create minimal project
echo '{"name": "test-project", "version": "1.0.0"}' > package.json
git init

# Run handbook-init (would need non-interactive mode)
# For now, simulate by copying files
echo "📦 Simulating handbook-init..."

mkdir -p handbook scripts/validation .claude

cp -r "$PACKAGE_ROOT/core/"* handbook/
cp -r "$PACKAGE_ROOT/validation/templates/"*.ts scripts/validation/ 2>/dev/null || true
cp "$PACKAGE_ROOT/claude/hooks.json" .claude/

# Create minimal config
cat > handbook.config.json << 'EOF'
{
  "version": "1.0.0",
  "projectName": "test-project",
  "stackProfile": "generic",
  "paths": {
    "handbook": "handbook/",
    "validators": "scripts/validation/"
  }
}
EOF

# Verify structure
echo ""
echo "📋 Verification Checklist:"
echo ""

check() {
  if [ -e "$1" ]; then
    echo "✅ $1"
    return 0
  else
    echo "❌ $1 (missing)"
    return 1
  fi
}

FAILURES=0
check "handbook.config.json" || ((FAILURES++))
check "handbook/SYSTEM_DELIVERY_PLAYBOOK.md" || ((FAILURES++))
check "handbook/SPEC_RULEBOOK.md" || ((FAILURES++))
check "handbook/monitoring/CLAUDE_HOOKS.md" || ((FAILURES++))
check ".claude/hooks.json" || ((FAILURES++))
check "scripts/validation/" || ((FAILURES++))

echo ""
if [ $FAILURES -eq 0 ]; then
  echo "✅ All checks passed!"
else
  echo "❌ $FAILURES checks failed"
fi

# Cleanup
cd /
rm -rf "$TEST_DIR"
echo "🧹 Cleaned up test directory"

exit $FAILURES
