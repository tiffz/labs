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

Our comprehensive test suite includes **48 tests** covering:

#### **Component Testing**

- **Cat Component (13 tests):** Complete eye state management, eye-tracking system, animation setup
- **WandToy Component (19 tests):** Mouse tracking, wiggle animations, lifecycle management, shaking states
- **App Component (16 tests):** Wand mode functionality, component integration, state transitions, system robustness

#### **Key Testing Areas**

- Component rendering and state management
- User interactions and event handling (clicks, mouse movement, mode switching)
- Integration between components (App ↔ Cat ↔ WandToy)
- Complex animation systems and DOM manipulation
- Error handling and edge cases
- State cleanup and memory management

#### **Advanced Testing Techniques**

- **Portal Mocking:** `ReactDOM.createPortal` for heart rendering
- **Animation Mocking:** `requestAnimationFrame`, `DOMMatrix`, `getComputedStyle`
- **Timer Control:** Fake timers for precise time-based testing
- **DOM Environment:** Proper setup and cleanup of required DOM elements

#### **Regression Prevention**

- **Eye-tracking bug prevention:** Comprehensive tests ensure the cat's eyes follow hearts correctly
- **Wand toy system protection:** Complex pouncing mechanics with proximity, velocity, and novelty detection
- **State management validation:** Proper cleanup and transitions under all conditions
