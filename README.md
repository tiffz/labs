# Labs Monorepo: Micro-Apps Architecture

This project is a monorepo for experimental and portfolio frontend micro-apps, built with React, TypeScript, and Vite. Each micro-app is isolated in its own folder under `src/`, but all share the same dependencies and build system for easy maintenance and deployment.

## Project Structure

```
labs/
  src/
    index.html         # Landing page with links to all micro-apps
    404.html           # Custom 404 page with hot purplish pink styling
    zines/             # Example micro-app: Minizine Magic Maker
      index.html
      ...
    cats/              # Cat Clicker game with advanced interactions
      ...
  public/              # Organized static assets
    styles/            # Shared and page-specific CSS
      shared.css       # Common styles (bubbles, layout)
      index.css        # Home page specific styles
      404.css          # 404 page specific styles
    scripts/           # JavaScript files
      shared.js        # Common functionality (bubble interactions)
      analytics.js     # Analytics tracking
    icons/             # Organized favicon files
      favicon.svg      # Main labs icon
      favicon-cats.svg # Cat app icon
      favicon-zines.svg # Zines app icon
  package.json         # Shared dependencies and scripts
  vite.config.ts       # Vite config for multi-app build
  .github/workflows/   # CI/CD automation
```

## How the Micro-Apps Architecture Works

- **Each micro-app lives in its own subfolder under `src/`** (e.g., `src/zines/`, `src/cats/`).
- **Each app has its own entry point** (`main.tsx`) and root component (`App.tsx`).
- **Each app can have its own CSS and assets** (e.g., `zines.css`).
- **All apps share the same React, TypeScript, and other dependencies** (defined in the root `package.json`).
- **Vite is configured for multiple HTML entry points** (e.g., `/zines/` loads `zines/index.html` and `src/zines/main.tsx`).
- **The root `index.html` is a landing page** that links to all available micro-apps.
- **Custom 404 page** (`src/404.html`) provides helpful navigation for invalid URLs with beautiful styling.
- **Organized static assets** in `public/` with dedicated folders for styles, scripts, and icons.
- **Shared resources** (`shared.css`, `shared.js`) provide common functionality like bubble animations across pages.
- **All apps are built together** and output to the `dist/` directory for deployment (e.g., to GitHub Pages).

## How to Add or Edit a Micro-App

1. **To add a new app:**
   - Create a new folder under `src/` (e.g., `src/myapp/`).
   - Add your `main.tsx`, `App.tsx`, and any other files/assets you need.
   - Create a new HTML entry (e.g., `myapp/index.html`) based on `zines/index.html`.
   - Update `vite.config.cjs` to add your new app as an entry point in the `rollupOptions.input` section.
   - Add a link to your app in the root `index.html` landing page.

2. **To edit an existing app:**
   - Edit the files in the corresponding `src/<app>/` folder.
   - You can use both Tailwind CSS and custom CSS for styling.
   - If your app needs special fonts or assets, add them to its own HTML or CSS files.

3. **To share code or components:**
   - Place shared utilities/components in a common folder (e.g., `src/shared/`) and import them as needed.
   - Keep app-specific code inside each app's folder for isolation.

4. **To update dependencies:**
   - Update the root `package.json` and run `npm install`.
   - All apps will use the same versions of React, TypeScript, etc.

## Development & Build

- **Start the dev server:**

  ```sh
  npm run dev
  ```

  Visit `/zines/` or any other app at `/yourapp/`. The custom 404 page is available at `/404.html`.

- **Run tests:**

  ```sh
  npm test              # Run all tests (139 tests)
  npm run test:watch    # Run tests in watch mode for development
  npm run test:changed  # Only test if TypeScript/JS files changed since last commit
  ```

  Runs the comprehensive test suite (139 tests) across all components.

- **Check code quality:**

  ```sh
  npm run lint
  ```

  Runs ESLint to check code style and quality.

- **Build for production:**

  ```sh
  npm run build
  ```

  Output is in the `dist/` directory. The build process automatically includes the custom 404 page.

- **Deploy to GitHub Pages:**
  ```sh
  npm run deploy
  ```
  Runs tests first - deployment is blocked if tests fail.

## Continuous Integration & Deployment (CI/CD)

This project uses **GitHub Actions** for automated testing, building, and deployment with an **intelligent, optimized workflow** that only runs tests when code changes.

### 🚀 **Smart Automated Workflow**

The CI/CD system intelligently responds to different types of changes:

**For Code Changes** (TypeScript, JavaScript, configs):

1. **Environment Setup** - Node.js 20, clean dependency installation with Rollup fix
2. **Code Quality** - ESLint checks for style and quality issues
3. **Testing** - Complete test suite (139 tests) must pass
4. **Build** - Production build generation and validation
5. **Deploy** - Automatic deployment to GitHub Pages (main branch only)

**For Documentation & Assets** (Markdown, SVG, images, CSS):

1. **Environment Setup** - Node.js 20, clean dependency installation
2. **Build** - Production build generation (tests skipped for speed)
3. **Deploy** - Fast deployment to GitHub Pages

### ⚡ **Performance Optimizations**

- **Intelligent Path Detection** - Only runs full test suite when code files change
- **Fast Asset Deployment** - Documentation and visual updates deploy in ~2 minutes vs ~5 minutes
- **Smart Pre-commit Hooks** - Local tests only run when TypeScript/JavaScript files are staged
- **Dual Workflows** - Separate optimized pipelines for code vs. documentation changes

### 🛡️ **Quality Gates**

- **Pre-commit Hooks** - Tests and linting run locally before commits
- **CI Validation** - All checks must pass before deployment
- **Test-First Deployment** - Failed tests block production releases
- **Pull Request Checks** - Code review with automated validation

### 📊 **Current Status**

The CI/CD pipeline has been extensively tested and debugged to ensure reliability:

- ✅ **Stable Configuration** - Resolved initial environment variable conflicts
- ✅ **Dependency Management** - Fixed Rollup binary issues in CI environment
- ✅ **GitHub Pages Integration** - Automated deployment with proper permissions
- ✅ **Comprehensive Testing** - 48 tests covering all critical functionality

### 🔧 **Technical Implementation**

**GitHub Actions Configuration** (`.github/workflows/ci.yml`):

- **Test Job** - Linting, testing, and build validation
- **Deploy Job** - Production deployment with GitHub Pages integration
- **Environment** - Clean Node.js 20 environment with optimized caching
- **Security** - Proper permissions and secure credential handling

**Key Features:**

- **Fast Feedback** - Parallel job execution where possible
- **Reliable Builds** - Addresses known npm/Rollup CI issues
- **Clean Deployments** - Consistent build environment and artifact management
- **Error Recovery** - Proper timeout handling and dependency resolution

## Quality Assurance

This project maintains high standards through automated quality checks:

- **Tests:** 139 comprehensive tests covering all major components and functionality
- **Smart Pre-commit hooks:** Tests only run when code files change, linting runs on all changes
- **Intelligent CI/CD:** GitHub Actions runs full test suite for code changes, fast deployment for docs/assets
- **Deployment protection:** Failed tests block production deployment
- **Performance optimized:** Documentation updates deploy faster without sacrificing code quality

## Debugging & Maintenance

Our CI/CD system has been battle-tested through extensive debugging:

- **Environment Isolation** - Eliminated local environment dependencies
- **Dependency Stability** - Robust handling of npm and Rollup edge cases
- **Permission Management** - Secure GitHub Pages deployment configuration
- **Monitoring** - Clear visibility into build and deployment status

For CI/CD troubleshooting, see `DEVELOPMENT.md` for detailed debugging procedures.

## Notes for Contributors

- **Always keep each micro-app isolated in its own folder under `src/`.**
- **Do not move or merge app code into the root or other app folders.**
- **When adding a new app, always update the Vite config and landing page.**
- **Write tests for new components and features - place test files alongside the code they test.**
- **Ensure all tests pass before committing:** `npm test`
- **Run linting before committing:** `npm run lint`
- **CI/CD will automatically handle deployment** - focus on writing quality code and tests
- **When editing an app, use the app's own CSS and assets unless you are intentionally sharing code.**
- **If you see custom CSS classes (e.g., `.card-bg`, `.font-heading`), do not remove them—they are required for the original look and feel.**
- **If you add new dependencies, make sure they are compatible with all apps.**

---

For any questions or to extend the architecture, follow the above conventions to keep the monorepo organized and maintainable.
