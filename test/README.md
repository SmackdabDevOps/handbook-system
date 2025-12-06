# Handbook System Testing

This directory contains automated and manual tests for the handbook-system package.

## Test Structure

```
test/
├── integration/          # Automated integration tests
│   └── test-fresh-project.sh    # Fresh project initialization test
├── TESTING_CHECKLIST.md  # Manual test cases and verification steps
└── README.md             # This file
```

## Running Tests

### Automated Integration Tests

Test handbook-init with a fresh project:

```bash
./integration/test-fresh-project.sh
```

This script:
1. Creates a temporary test directory
2. Initializes a minimal package.json
3. Simulates handbook-init by copying core files
4. Verifies all expected files are created
5. Checks configuration is valid
6. Cleans up test artifacts

**Exit Codes:**
- `0` - All checks passed
- `>0` - Number of failed checks

### Manual Test Cases

See `TESTING_CHECKLIST.md` for comprehensive test cases covering:
- Fresh NestJS projects
- Fresh Express projects
- Nx monorepos
- Backward compatibility with existing projects

**Use this checklist when:**
- Making changes to handbook-init
- Adding new stack profiles
- Testing with real project structures
- Verifying integration with Claude Code plugins

## Test Coverage

The test suite covers:
- File structure initialization
- Configuration generation
- Stack profile detection
- Optional module selection
- Validator setup
- Husky hook installation
- Backward compatibility

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```bash
# Run automated integration tests
./test/integration/test-fresh-project.sh

# Verify exit code
if [ $? -eq 0 ]; then
  echo "Tests passed"
else
  echo "Tests failed"
fi
```

## Adding New Tests

When adding new test cases:

1. **For automated tests:** Add new shell scripts to `integration/` directory
2. **For manual tests:** Add test case sections to `TESTING_CHECKLIST.md`
3. **Document:** Include setup, execution, and verification steps
4. **Regression:** List any tests that verify no regressions occurred

## Debugging Failed Tests

If a test fails:

1. **Check the error message** - Identifies which file/directory is missing
2. **Verify file paths** - Ensure handbook-system is in expected location
3. **Manual verification** - Run steps from `TESTING_CHECKLIST.md` manually
4. **Review changes** - Check recent changes to handbook-system package

## References

- [Handbook System Overview](../README.md)
- [Testing Checklist](TESTING_CHECKLIST.md)
- [Integration Tests](integration/)
