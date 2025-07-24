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
