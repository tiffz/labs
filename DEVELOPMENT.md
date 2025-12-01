# Development Guide

## Code Style

This project follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) for consistent code formatting and patterns.

## Quality Assurance

This project uses automated quality checks to ensure code quality and prevent regressions.

### Pre-commit Checks (Local)

Before each commit, the following checks run automatically:

1. **Tests** - All unit tests must pass (`npm test`)
2. **Linting** - Code style and quality checks on changed files (`lint-staged`)

If any check fails, the commit will be blocked until issues are resolved.

### Continuous Integration (GitHub Actions)

On every push and pull request to `main`, GitHub Actions will:

1. **Install dependencies** (`npm ci`) with Rollup binary fixes
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

## CI/CD Troubleshooting & Debugging

### 🏥 **Current System Health**

Our CI/CD pipeline has been extensively debugged and optimized:

- ✅ **Stable Configuration** - Environment variable conflicts resolved
- ✅ **Dependency Management** - npm/Rollup binary issues fixed
- ✅ **GitHub Pages Integration** - Deployment permissions properly configured
- ✅ **Comprehensive Testing** - Full test suite ensuring system reliability

### 🔍 **Debugging Procedures**

When CI/CD issues occur, follow this systematic approach:

#### **1. Identify the Failure Point**

Check the [GitHub Actions page](https://github.com/tiffz/labs/actions) for:

- Which job failed (test, build, or deploy)
- Error messages and logs
- Comparison with recent successful runs

#### **2. Common Issue Categories**

**Environment/Dependency Issues:**

```bash
# Symptoms: "Cannot find module @rollup/rollup-linux-x64-gnu"
# Solution: Applied in our CI config
- Clean npm cache and reinstall dependencies
- Fix npm/Rollup binary compatibility for Linux CI environment
```

**GitHub Pages Deployment Issues:**

```bash
# Symptoms: "Permission denied" or 403 errors
# Solution: Applied in our CI config
- Proper GitHub Pages permissions configured
- Updated to native GitHub Pages deployment actions
```

**Environment Variable Conflicts:**

```bash
# Symptoms: Tests pass locally but fail in CI
# Solution: Applied in our CI config
- Simplified environment variable configuration
- Removed problematic CI, NODE_ENV, HUSKY variables
```

#### **3. Debugging Workflow**

**Step 1: Local Reproduction**

```bash
# Try to reproduce the issue locally
npm ci                    # Clean install like CI
npm run lint             # Check linting
npm test                 # Run tests
npm run build           # Test build process
```

**Step 2: Environment Comparison**

- Compare Node.js versions (CI uses Node.js 20)
- Check for local vs CI environment differences
- Verify dependency versions match `package-lock.json`

**Step 3: Incremental Testing**
If creating test workflows:

1. Start with minimal configuration
2. Add complexity gradually
3. Test each addition independently
4. Clean up test workflows after debugging

### 🛠️ **Debugging Tools & Techniques**

#### **GitHub Actions Debugging**

**Log Analysis:**

- Expand failed step logs in GitHub Actions UI
- Look for specific error messages, not just exit codes
- Check both stdout and stderr output

**Workflow Debugging:**

```yaml
# Add debugging steps to workflows (temporary)
- name: Debug Environment
  run: |
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    ls -la
    cat package.json
```

**Artifact Collection:**

```yaml
# Collect build artifacts on failure
- name: Upload artifacts on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: debug-artifacts
    path: |
      npm-debug.log*
      node_modules/.package-lock.json
      dist/
```

#### **Local CI Simulation**

**Replicate CI Environment:**

```bash
# Use same Node.js version as CI
nvm use 20

# Clean install (like CI)
rm -rf node_modules package-lock.json
npm install
npm ci

# Run CI steps locally
npm run lint
npm test
npm run build
```

### 📚 **Lessons Learned from Our Debugging Journey**

#### **What We Fixed:**

1. **Environment Variable Conflicts**
   - **Problem:** `CI=true`, `NODE_ENV=test`, `HUSKY=0` caused test failures
   - **Solution:** Simplified configuration, removed problematic variables
   - **Lesson:** Keep CI environment as close to local dev as possible

2. **npm/Rollup Binary Issues**
   - **Problem:** `@rollup/rollup-linux-x64-gnu` module not found in CI
   - **Solution:** Added clean install process with binary fix
   - **Lesson:** Platform-specific binaries need special handling in CI

3. **GitHub Pages Deployment**
   - **Problem:** Permission denied errors and 403 responses
   - **Solution:** Updated to native GitHub Pages actions with proper permissions
   - **Lesson:** Use officially supported deployment methods when available

4. **Testing Strategy**
   - **Problem:** Complex debugging with multiple changing variables
   - **Solution:** Systematic isolation testing with minimal workflows
   - **Lesson:** Debug incrementally, test one change at a time

#### **Debugging Principles That Worked:**

- **Systematic Isolation:** Created minimal test workflows to isolate issues
- **Incremental Complexity:** Added features one at a time
- **Environment Parity:** Made CI environment match local development
- **Comprehensive Logging:** Used detailed logging to understand failures
- **Clean Slate Testing:** Started fresh to eliminate contamination

### 🚨 **Emergency Procedures**

#### **If CI/CD Completely Breaks:**

1. **Immediate Response:**
   - Check GitHub Status page for service outages
   - Review recent commits for configuration changes
   - Revert to last known working commit if necessary

2. **Quick Fixes:**

   ```bash
   # Bypass pre-commit hooks if needed
   git commit --no-verify -m "Emergency fix"

   # Manual deployment if CI fails
   npm run build
   npm run deploy
   ```

3. **Recovery Steps:**
   - Create minimal test workflow to isolate issues
   - Test changes incrementally
   - Update this documentation with new findings

#### **Escalation Path:**

1. Check [GitHub Actions status](https://www.githubstatus.com/)
2. Review [GitHub Actions documentation](https://docs.github.com/en/actions)
3. Search [GitHub Community forums](https://github.community/c/code-to-cloud/github-actions/41)
4. Create isolated reproduction case
5. Open GitHub Support ticket if platform issue

### 📈 **Performance Monitoring**

**Key Metrics to Watch:**

- Build time trends
- Test execution time
- Deployment success rate
- Time to deployment after push

**Optimization Opportunities:**

- Dependency caching effectiveness
- Parallel job execution
- Build artifact size
- Test suite performance

This debugging guide represents real-world experience fixing complex CI/CD issues. Keep it updated as new challenges arise.

## Optimized Testing Workflow

To improve development efficiency, testing and builds are now optimized to only run when relevant files change:

### What Triggers Full Tests & Builds:

**TypeScript/JavaScript files:**

- `*.ts`, `*.tsx`, `*.js`, `*.jsx`
- `*.json`, `package*.json`
- Config files: `vite.config.*`, `vitest.config.*`, `tsconfig*.json`, `eslint.config.*`
- Workflow files: `.github/workflows/**`

### What Skips Tests (Assets & Docs Only):

**Documentation & Assets:**

- `*.md`, `*.svg`, `*.png`, `*.jpg`, `*.gif`
- `*.css`, `*.html`
- `public/**`, `CNAME`, `LICENSE`

### Available Scripts:

```bash
# Run all tests (always)
npm test

# Run tests in watch mode for development
npm run test:watch

# Run tests only if TypeScript/JS files changed since last commit
npm run test:changed

# Standard development
npm run dev

# Build (always runs)
npm run build
```

### Git Hooks:

- **Pre-commit**: Only runs tests if TypeScript/JavaScript files are staged
- **lint-staged**: Always runs (already optimized to only process changed files)

### GitHub Actions:

- **CI/CD Pipeline**: Only triggers on TypeScript/JavaScript changes
- **Deploy Docs & Assets**: Only triggers on documentation/asset changes
- Both deploy to GitHub Pages, but docs deployment skips tests

This means:

- ✅ Favicon SVG changes → Quick deploy (no tests)
- ✅ Markdown updates → Quick deploy (no tests)
- ✅ TypeScript changes → Full test suite + deploy
- ✅ Config changes → Full test suite + deploy

## Development Workflow

1. **For code changes**: Normal workflow, tests will run
2. **For docs/assets**: Commit directly, tests will be skipped
3. **Mixed changes**: Tests will run (safety first)

The system errs on the side of running tests when in doubt to maintain code quality.

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

## Analytics Integration

The Labs site includes modern Google Analytics 4 (GA4) tracking across all micro-apps with smart service worker compatibility.

### Analytics Features

- **Unified GA4 tracking** across all apps (landing page, Cat Clicker, Zine Maker)
- **Service worker compatible** using beacon transport
- **Micro-app detection** automatically tracks which app users visit
- **Custom event tracking** for user interactions
- **Modern GA4 events** with enhanced measurement

### Configuration

Analytics configuration is centralized in `/public/analytics.js`:

```javascript
const ANALYTICS_CONFIG = {
  ga4Id: 'G-25C3B5B84M', // Your GA4 Measurement ID
};
```

### Usage Examples

**Basic Event Tracking:**

```javascript
// Track any custom event
window.labsAnalytics?.trackEvent('button_click', {
  category: 'User Interaction',
  label: 'header_cta',
  value: 1,
});
```

**Micro-app Specific Tracking:**

```javascript
// Automatically detects app context
window.labsAnalytics?.trackMicroApp('cat-clicker', 'game_start', {
  difficulty: 'normal',
  love_level: 0,
});
```

**Cat Clicker Examples (already implemented):**

- Cat petting interactions with love gained and energy level
- Wand mode toggles with current game state
- Upgrade purchases with cost and new levels

**GA4 Event Structure:**
All events follow GA4's enhanced measurement format with automatic parameters like `page_location`, `page_title`, and custom parameters you provide.

### Service Worker Compatibility

The analytics system automatically:

- Uses `beacon` transport for reliability
- Detects service worker presence
- Continues tracking even with offline functionality
- Handles network interruptions gracefully

### App Detection

Analytics automatically detects which micro-app the user is on:

- `/cats/` → `cat-clicker`
- `/zines/` → `zine-maker`
- Root → `landing`

Each app visit is automatically tracked with referrer information.

### TypeScript Support

Type declarations are included in `src/vite-env.d.ts` for full IntelliSense support:

```typescript
interface LabsAnalytics {
  trackEvent(eventName: string, parameters?: AnalyticsEventParameters): void;
  trackMicroApp(
    appName: string,
    action: string,
    details?: AnalyticsEventParameters
  ): void;
}
```

### GA4 Benefits

- **Enhanced measurement** automatically tracks scrolls, outbound clicks, site search, video engagement
- **Cross-platform tracking** with unified user journey insights
- **Privacy-focused** with built-in data controls and consent mode
- **Machine learning insights** for better understanding user behavior
- **Future-proof** as the current Google Analytics standard

### Privacy Considerations

- Analytics only tracks usage patterns and interactions
- No personal information is collected
- Uses Google Analytics 4 privacy controls and consent mode
- Respects Do Not Track browser settings
- GDPR and privacy regulation compliant
