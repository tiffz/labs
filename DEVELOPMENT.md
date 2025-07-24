# Development Guide

## Quality Assurance

This project uses automated quality checks to ensure code quality and prevent regressions.

### Pre-commit Checks (Local)

Before each commit, the following checks run automatically:

1. **Tests** - All unit tests must pass (`npm test`)
2. **Linting** - Code style and quality checks on changed files (`lint-staged`)

If any check fails, the commit will be blocked until issues are resolved.

### Continuous Integration (GitHub Actions)

On every push and pull request to `main`, GitHub Actions will:

1. **Install dependencies** (`npm ci`)
2. **Run linter** (`npm run lint`)
3. **Run tests** (`npm test`)
4. **Build project** (`npm run build`)

### Deployment

Deployment to GitHub Pages happens automatically when:

- Code is pushed to the `main` branch
- All CI checks pass
- The build completes successfully

You can also deploy manually:

```bash
npm run deploy
```

This command will run tests first - if tests fail, deployment is blocked.

### Available Commands

```bash
npm test          # Run all tests
npm run lint      # Check code style and quality
npm run build     # Build for production
npm run deploy    # Test + Build + Deploy to GitHub Pages
npm run dev       # Start development server
```

### Bypassing Checks (Emergency Only)

In rare cases where you need to bypass pre-commit hooks:

```bash
git commit --no-verify -m "Emergency fix"
```

**Note:** GitHub Actions will still run and may block deployment if checks fail.

## Testing

### Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode during development
npm run test:watch  # or npm run test -- --watch
```

### Writing Tests

- Place test files alongside the code they test (e.g., `Cat.test.tsx` next to `Cat.tsx`)
- Use the `.test.tsx` or `.test.ts` extension
- Import test utilities from `@testing-library/react` and `vitest`

### Test Coverage

Our tests focus on:

- Component rendering and state management
- User interactions and event handling
- Integration between components
- Edge cases and error conditions

The eye-tracking tests specifically cover:

- Pupil positioning and movement
- Mouse event handling
- Heart tracking priority
- Component setup and cleanup
