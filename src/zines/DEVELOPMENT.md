# Zine Studio - Architecture Decision Records

This document records major architectural decisions for the Zine Studio micro-app.

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

## Booklet Mode Architecture

### Decision

Added multi-page booklet mode alongside the original 8-page minizine mode.

### Rationale

Users need to create booklets of varying page counts for professional printing (e.g., Mixam) and home printing.

### Implementation

- **Spread Pairing System**: `spreadPairing.ts` handles page organization
- **Multiple Export Formats**: Mixam spreads, home duplex, digital distribution
- **pdf-lib Integration**: Client-side PDF generation

### Key Design Principles

1. **Multiple-of-4 Page Count**: Booklets auto-pad to multiples of 4 for proper folding
2. **Blank Pages as First-Class Citizens**: Padding pages treated identically to missing uploads
3. **Centralized Logic**: `calculateRequiredContentPages()` used consistently across UI and PDF generation

### Benefits

- Professional-quality output for various printing services
- Consistent page count handling prevents user confusion
- Flexible export options for different use cases

## Spread Linking/Unlinking

### Decision

Allow users to combine two adjacent pages into a single spread image, or split a spread back into individual pages.

### Rationale

Some artwork spans two pages (e.g., outer cover wrap). Users need flexibility to manage these.

### Implementation

- Canvas-based image manipulation in `imageManipulation.ts`
- Parser-friendly filenames generated for combined/split images
- Visual feedback via processing state (disables navigation during operations)

### Benefits

- Supports double-page spread artwork
- Non-destructive (can split and recombine)
- Works with both uploaded spreads and dynamically combined pages

## Blank Page Color Support

### Decision

Allow users to set a fill color for blank/padding pages.

### Rationale

Some booklet designs require colored pages (e.g., salmon/pink for aesthetic consistency).

### Implementation

- Global `blankPageColor` state applied to all blank pages
- Color picker in SpreadPreview with "Apply to all" action
- Color applied in BookReader preview and PDF generation
- CSS `!important` required to override PageFlip library styles

### Benefits

- Design flexibility for users
- Consistent appearance across preview and export
- Simple UX (one color applies to all blank pages)
