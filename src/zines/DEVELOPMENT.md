# Minizine Maker - Architecture Decision Records

This document records major architectural decisions for the Minizine Maker micro-app.

## Migration from Monolith to React

### Decision

Migrated from single HTML file with embedded React/Babel to modern React TypeScript architecture.

### Rationale

**Original Architecture Problems**:

- Single HTML file with inline CSS and embedded React components
- CDN-loaded dependencies (React, Babel, Tailwind)
- No type safety or testing framework
- Difficult to maintain and debug
- Font loading performance issues

**Modern Architecture Benefits**:

- TypeScript for type safety
- Proper build tooling with Vite
- Comprehensive testing framework
- Better code organization
- Optimized font loading

### Implementation

Modular file structure: `index.html`, `main.tsx`, `App.tsx`, `components/`, `types/`, `constants/`, `styles/`

### Benefits

- Reduced complexity and improved maintainability
- Added comprehensive test suite (14 tests)
- Fixed font loading performance issues
- Improved developer experience

## Tailwind CSS Version Compatibility

### Decision

Use stable Tailwind CSS v3.4.x branch, not experimental v4.

### Rationale

Tailwind v4 has breaking changes (no `@tailwind` directives, different PostCSS plugin system, incompatible configuration syntax).

### Implementation

Downgraded to stable Tailwind CSS v3.4.0 with proper PostCSS configuration using `tailwindcss` plugin (not `@tailwindcss/postcss`).

### Benefits

- Stable, production-ready CSS framework
- No breaking changes
- Consistent with monorepo standards

## React 18 Migration

### Decision

Updated StPageFlip integration from deprecated `ReactDOM.render()` to React 18's `createRoot` API.

### Rationale

`ReactDOM.render()` and `ReactDOM.unmountComponentAtNode()` are deprecated in React 18.

### Implementation

Replaced `ReactDOM.render(component, container)` with `createRoot(container).render(component)`.

### Benefits

- Future-proof React API usage
- Better performance with concurrent features
- Proper cleanup and memory management

## Font Loading Optimization

### Decision

Implement multi-layered font loading strategy to prevent Flash of Unstyled Content (FOUC).

### Rationale

Text would appear unstyled before fonts loaded, creating jarring visual flash.

### Implementation

- Inline font CSS with `@import` and `display=block`
- Visibility control: Body hidden until fonts ready, JavaScript font detection reveals content
- FontFace API with graceful fallbacks

### Benefits

- No visual flashing during font load
- Stable layout without shifts
- Better Core Web Vitals scores

## StPageFlip Library Integration

### Decision

Use StPageFlip library for realistic page-turning animations in book preview mode.

### Rationale

Provides engaging preview mode that helps users understand final zine layout.

### Implementation Challenges

- CDN loading (not npm package) - required global type definitions
- React integration - proper cleanup and memory management
- React 18 compatibility - updated from deprecated APIs

### Benefits

- Realistic page-turning experience
- Better user understanding of final zine layout
- Engaging preview mode
