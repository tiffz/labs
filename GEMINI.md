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
