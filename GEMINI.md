# Gemini's Guide to the Labs Monorepo

This document outlines the high-level architecture and organizational principles for the `labs` project. It serves as a central reference for understanding the multi-app structure and development conventions.

## 1. Project Vision

This project is a **monorepo** designed to house multiple, independent "micro-apps" under a single, unified development environment. Each app in the `src` directory is a self-contained experiment or project, but they all share the same build process, dependencies, and deployment pipeline.

## 2. Core Architectural Principles

### `src`-Based Structure

The entire project follows a `src`-based convention.

- **Single Entry Point:** The primary `index.html` for the entire monorepo is located at `src/index.html`. This file serves as the main landing page and provides navigation to the various micro-apps.
- **Centralized Source:** All source code, including HTML, TypeScript, CSS, and assets for every micro-app, must reside within the `src` directory. The project root is reserved for configuration files (`vite.config.ts`, `package.json`, etc.), documentation, and other project-wide concerns.

### Micro-App Architecture

Each subdirectory within `src` (e.g., `src/cats`, `src/zines`) represents a distinct micro-app.

- **Self-Contained:** Each micro-app has its own `index.html` file, which serves as its specific entry point.
- **Independent Logic:** The code within each micro-app should be self-contained and not rely on imports from other micro-apps. Shared logic, if it ever becomes necessary, should be extracted into a shared `utils` or `lib` directory at the `src` level.

### Configuration

- **Vite for Multi-Page:** The project uses Vite's `rollupOptions` to configure a multi-page application. The `vite.config.ts` file in the root is the single source of truth for the build process, and it must contain an entry for each micro-app's `index.html`.
- **Documentation:** Each micro-app is encouraged to have its own `GEMINI.md` file that details its specific architecture, features, and conventions, like the one found in `src/cats/GEMINI.md`.

## 3. Quality Assurance & Testing

### Comprehensive Test Coverage

The project maintains high-quality standards through extensive testing:

- **48 comprehensive tests** across all major components and functionality
- **Co-located test files** alongside source code for easy maintenance
- **Behavior-driven testing** focusing on user-visible functionality rather than implementation details
- **Advanced mocking strategies** for animations, DOM APIs, and complex interactions

### Automated Quality Gates

- **Pre-commit Hooks:** Tests and linting must pass before commits are allowed
- **Continuous Integration:** GitHub Actions runs full test suite on every push and pull request
- **Deployment Protection:** Failed tests block deployment to production
- **Code Quality:** ESLint and TypeScript ensure consistent code style and type safety

### Testing Philosophy

Each micro-app should maintain comprehensive test coverage that:

- Prevents regressions in complex features
- Tests actual user interactions and behavior
- Uses sophisticated mocking for animation and DOM APIs
- Provides fast feedback during development

## 4. Continuous Integration & Deployment (CI/CD)

### Architecture Overview

The project employs a **fully automated CI/CD pipeline** using GitHub Actions, designed for reliability, speed, and developer productivity.

**Pipeline Structure:**

```
Push/PR → GitHub Actions → Test & Build → Deploy (main only)
    ↓
Local Dev ← Pre-commit Hooks ← Quality Gates
```

### 🚀 **Automated Workflow Process**

Every code change triggers a comprehensive validation pipeline:

1. **Environment Setup**
   - Clean Node.js 20 environment
   - Optimized dependency installation with Rollup binary fix
   - Secure credential management for GitHub Pages

2. **Quality Validation**
   - ESLint code style and quality checks
   - TypeScript compilation validation
   - Comprehensive test suite (48 tests) execution

3. **Build & Deployment**
   - Production build generation and validation
   - Automatic deployment to GitHub Pages (main branch only)
   - Artifact management and cleanup

### 🛡️ **Quality Gates & Security**

**Multi-Layer Protection:**

- **Pre-commit Hooks:** Local validation before code reaches repository
- **CI Validation:** Server-side validation in clean environment
- **Test-First Deployment:** Zero-tolerance policy for failing tests
- **Branch Protection:** Pull request validation with required checks

**Security Measures:**

- **Least-Privilege Access:** GitHub Actions use minimal required permissions
- **Secure Deployment:** GitHub Pages integration with proper authentication
- **Environment Isolation:** Clean build environment for each run
- **Credential Protection:** Secure handling of deployment credentials

### 📊 **Reliability & Performance**

**Battle-Tested Configuration:**

- ✅ **Environment Variable Management** - Resolved conflicts that caused initial failures
- ✅ **Dependency Stability** - Fixed npm/Rollup binary compatibility issues in CI
- ✅ **GitHub Pages Integration** - Seamless deployment with proper permissions
- ✅ **Performance Optimization** - Parallel job execution and efficient caching

**Monitoring & Observability:**

- **Build Status Visibility** - Clear feedback on all validation steps
- **Error Reporting** - Detailed logs for debugging failed builds
- **Performance Metrics** - Build time and deployment tracking
- **Health Monitoring** - Automated alerts for pipeline failures

### 🔧 **Technical Implementation Details**

**GitHub Actions Workflow** (`.github/workflows/ci.yml`):

```yaml
# Key Features:
- Node.js 20 environment
- Parallel test and build jobs where possible
- Rollup binary compatibility fixes
- GitHub Pages deployment with proper permissions
- Environment-specific configurations
```

**Critical Technical Decisions:**

1. **Environment Variable Strategy** - Simplified configuration to avoid CI conflicts
2. **Dependency Management** - Robust npm/Rollup handling for Linux CI environment
3. **Deployment Method** - GitHub Pages native actions for better security and reliability
4. **Error Handling** - Comprehensive timeout and retry logic

### 🏗️ **Development Workflow Integration**

**For Developers:**

- **Local Development** - Pre-commit hooks ensure quality before push
- **Pull Requests** - Automatic validation and status checks
- **Main Branch** - Automatic deployment after successful validation
- **Debugging** - Clear error messages and build logs for troubleshooting

**For Maintainers:**

- **Pipeline Monitoring** - GitHub Actions dashboard for build oversight
- **Configuration Management** - Centralized CI/CD configuration in `.github/workflows/`
- **Debugging Tools** - Comprehensive logging and artifact collection
- **Performance Tuning** - Optimized build times and resource usage

### 🔄 **Continuous Improvement**

The CI/CD system has been refined through extensive debugging and optimization:

- **Learned from Failures** - Initial environment variable conflicts resolved
- **Performance Optimized** - Build times minimized through parallel execution
- **Security Hardened** - Proper permission management and credential handling
- **Reliability Enhanced** - Robust error handling and recovery mechanisms

This architecture ensures that every code change is validated, tested, and deployed safely, maintaining high quality while enabling rapid development and deployment.

## 5. Micro-App Development Guidelines

### Technology Stack Standards

**Core Technologies:**

- **React 18**: Functional components with modern hooks pattern
- **TypeScript**: Strict mode enabled for all new micro-apps
- **Vite**: Build tool for fast development and optimized production builds
- **Vitest + React Testing Library**: Testing framework for comprehensive coverage

**CSS Framework Standards:**

- **Tailwind CSS v3.4.x**: Use stable v3 branch only (v4 has breaking changes)
- **PostCSS Integration**: Always use `tailwindcss` plugin, not `@tailwindcss/postcss`
- **Configuration**: Use `module.exports` syntax in `tailwind.config.js` for Node.js compatibility

### Dependency Management Best Practices

**Version Compatibility Guidelines:**

```json
// package.json - Recommended ranges
{
  "tailwindcss": "^3.4.0", // ✅ Stable v3
  "postcss": "^8.4.0", // ✅ Latest stable
  "autoprefixer": "^10.4.0", // ✅ Current major
  "vitest": "^3.0.0", // ✅ Latest stable
  "typescript": "^5.0.0" // ✅ Current stable
}
```

**Critical Version Notes:**

- **Tailwind CSS v4**: Experimental with breaking changes. Use v3.4.x for production
- **React 18**: Required for modern hooks and concurrent features
- **Node.js 20**: CI/CD environment standard

### Configuration Patterns

**ESLint Configuration:**

```javascript
// eslint.config.js - Node.js files pattern
{
  files: ['*.config.js', 'tailwind.config.js', 'postcss.config.js'],
  languageOptions: {
    globals: { ...globals.node }
  }
}
```

**PostCSS Setup:**

```javascript
// postcss.config.js - Standard pattern
export default {
  plugins: {
    tailwindcss: {}, // ✅ Correct for v3
    autoprefixer: {},
  },
};
```

**Tailwind Config Pattern:**

```javascript
// tailwind.config.js - Use CommonJS for Node.js compatibility
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

### Testing Standards

**Test Organization:**

```
src/app-name/
├── App.test.tsx           # Main component tests
├── components/
│   ├── Component.tsx
│   └── Component.test.tsx # Co-located component tests
└── test/
    └── setupTests.ts      # Shared test utilities
```

**Required Test Coverage:**

- **Component Rendering**: All major components must render without errors
- **User Interactions**: Click handlers, form inputs, navigation
- **State Management**: State changes and side effects
- **External Dependencies**: Proper mocking of third-party libraries

**Mock Patterns:**

```typescript
// External library mocking
global.window.ExternalLib = {
  method: vi.fn().mockImplementation(() => ({
    /* mock */
  })),
};

// Canvas API mocking for image processing
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({
    /* canvas methods */
  }),
});
```

### Performance Optimization Patterns

**Font Loading (FOUC Prevention):**

```html
<!-- Standard pattern for all micro-apps -->
<style>
  @import url('fonts-url');
  body {
    visibility: hidden;
  }
  body.fonts-loaded {
    visibility: visible;
  }
</style>
<script>
  document.fonts.ready.then(() => {
    document.body.classList.add('fonts-loaded');
  });
</script>
```

**Analytics Integration:**

```javascript
// Environment-aware analytics loading
if (window.location.hostname !== 'localhost') {
  const script = document.createElement('script');
  script.src = '/analytics.js';
  document.head.appendChild(script);
}
```

### Architecture Guidelines

**Component Structure:**

- **Modular Components**: Extract reusable components into separate files
- **Type Safety**: Define interfaces in `types/index.ts`
- **Constants**: Centralize configuration in `constants/index.ts`
- **Styles**: External CSS files with Tailwind integration

**State Management:**

- **Local State**: Use `useState` for component-specific state
- **Shared State**: Prop drilling or context for cross-component state
- **Side Effects**: Proper cleanup in `useEffect` hooks
- **Performance**: `useCallback` and `useMemo` for expensive operations

### Common Pitfalls & Solutions

**Tailwind CSS Version Issues:**

- ❌ **Problem**: Installing Tailwind v4 breaks existing configurations
- ✅ **Solution**: Always specify v3.x range in package.json

**React 18 API Changes:**

- ❌ **Problem**: Using deprecated `ReactDOM.render()`
- ✅ **Solution**: Use `createRoot()` for all React 18 applications

**ESLint Configuration:**

- ❌ **Problem**: `module` not defined in config files
- ✅ **Solution**: Add config files to Node.js globals in ESLint config

**Testing External Libraries:**

- ❌ **Problem**: Third-party libraries break in test environment
- ✅ **Solution**: Comprehensive mocking strategies in test setup

This standardization ensures consistency across all micro-apps while incorporating lessons learned from production deployments and refactoring experiences.
