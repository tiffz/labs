# Google TypeScript Style Guide Compliance

This project follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) for consistent code formatting and patterns.

## Current Compliance Status

### ✅ Compliant Areas

1. **Relative Imports**: Codebase primarily uses relative imports (`./foo`, `../bar`) for files within the same project
2. **Namespace Imports**: Used appropriately when importing many symbols from large APIs (e.g., `import * as names from './names'` in kimberly system)
3. **Named Imports**: Used for frequently used symbols and utilities
4. **File Structure**: Files generally follow the recommended structure (imports, then implementation)
5. **Type Imports**: Using `import type` for type-only imports

### 🔄 Areas Needing Migration

1. **Default Exports**: Currently 62+ files use default exports. The style guide recommends named exports for better maintainability.

   **Current Pattern:**

   ```typescript
   // Component file
   export default MyComponent;

   // Import file
   import MyComponent from './MyComponent';
   ```

   **Recommended Pattern:**

   ```typescript
   // Component file
   export { MyComponent };

   // Import file
   import { MyComponent } from './MyComponent';
   ```

2. **@fileoverview JSDoc**: Complex files should include `@fileoverview` JSDoc comments at the top

## Style Guide Principles

### Named Exports

**Why**: Named exports provide canonical names, making imports consistent and easier to maintain. Default exports allow arbitrary import names, which can lead to confusion.

**Example:**

```typescript
// ✅ Good: Named export
export { MyComponent };

// ❌ Avoid: Default export
export default MyComponent;
```

### Import Patterns

- **Named Imports**: Use for frequently used symbols

  ```typescript
  import { useState, useEffect } from 'react';
  ```

- **Namespace Imports**: Use when importing many symbols from large APIs

  ```typescript
  import * as names from './names';
  ```

- **Relative Imports**: Prefer relative imports for files within the same project
  ```typescript
  import { MyComponent } from './MyComponent';
  ```

### File Structure

Files should follow this order:

1. Copyright information (if present)
2. `@fileoverview` JSDoc (if present)
3. Imports
4. Implementation

**Example:**

```typescript
/**
 * @fileoverview Description of file purpose and usage.
 */

import { useState } from 'react';
import { MyComponent } from './MyComponent';

// Implementation...
```

### JSDoc Comments

Comments should add information, not just restate parameter names and types.

```typescript
// ✅ Good: Adds context
/**
 * Calculates the final love gain with all multipliers applied.
 * @param baseLove Base love amount before multipliers
 * @param energyMultiplier Cat's energy multiplier (1.0 to 2.0)
 */
function calculateFinalLoveGain(baseLove: number, energyMultiplier: number) {}

// ❌ Avoid: Just restates the parameter name
/**
 * @param baseLove The base love
 */
```

## Migration Strategy

### For New Code

- ✅ Always use named exports
- ✅ Use named imports for new components
- ✅ Add `@fileoverview` JSDoc for complex files
- ✅ Follow file structure guidelines

### For Existing Code

When refactoring or updating existing files:

1. Convert default exports to named exports
2. Update all imports to use named imports
3. Add `@fileoverview` JSDoc if the file is complex
4. Ensure JSDoc comments add value

### Gradual Migration

We're not requiring immediate conversion of all default exports, but:

- New files must use named exports
- Files being refactored should be converted
- Imports should be updated when files are touched

## ESLint Configuration

The ESLint configuration is set up to support style guide compliance. Additional rules can be added as needed to enforce specific patterns.

## References

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- See `GEMINI.md` for project-wide style standards
- See `DEVELOPMENT.md` for development guidelines

## Shared UX and Design System Rules

These rules are required for new UI work across apps in this monorepo:

1. **Prefer shared components for common design problems**
   - Before creating new UI primitives (tooltip, icon button, toggle, dropdown behaviors), check `src/shared/components` and reuse/extend existing components first.
   - If a new primitive is truly needed, add it in shared so other apps can adopt it.

2. **Use Material patterns as the default interaction model**
   - Default UX behavior should align with Material Design conventions (control sizing, spacing rhythm, focus/hover states, and accessibility patterns).
   - App-specific branding is applied through styling/theme tokens, not by reinventing interaction mechanics.
   - For React apps, default to MUI primitives (`@mui/material`) for interactive controls before building custom HTML/CSS controls.

3. **Tooltip standard**
   - Use `src/shared/components/AppTooltip.tsx` for standard black hover/focus tooltips.
   - Do **not** introduce custom `data-tooltip` CSS pseudo-tooltips or bespoke one-off tooltip portals for standard tooltip use cases.
   - Only use custom help overlays when content is materially richer than a tooltip (multi-section panels, dense linked help, etc.).

4. **Icon standard**
   - Use Material Design icon sets (Material Symbols and/or MDI) by default.
   - Deviations require a clear product/design reason.

5. **Accessibility and complex widget standard**
   - For composite controls (dialogs, dropdown menus, popovers, combobox/autocomplete, and advanced selects), default to MUI primitives instead of app-local HTML/CSS implementations.
   - New or refactored controls must support keyboard access, focus visibility, and semantic labeling (`aria-label`, `aria-labelledby`, and associated labels where applicable).
   - If a custom widget is required, document why MUI is insufficient and match MUI-equivalent behavior for focus management, escape handling, and click-away behavior.
   - Treat `jsx-a11y` lint warnings in touched files as action items before merge.
