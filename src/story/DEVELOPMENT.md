# Save the Cat! Story Generator - Architecture Decision Records

This document records major architectural decisions, design patterns, and development guidelines for the Save the Cat! Story Generator micro-app.

## Kimberly System Migration

### Decision

Migrated from flat array-based suggestion engine to the Kimberly System - a composable random content generation framework.

### Rationale

**Old System Problems**:

- Single giant file (`suggestionEngine.ts`) with 812 lines
- Flat arrays with no structure
- Hard to maintain and extend
- No type safety
- Difficult to reason about relationships between elements

**Kimberly System Benefits**:

- Composable, semantically-named functions
- Type-safe with TypeScript
- Modular file structure
- Easy to extend and maintain
- Self-documenting templates

### Implementation

**Core Concept**: Functions are named after canonical examples (e.g., `Kimberly()` generates names like "Emma", "Olivia") rather than abstract terms, making templates self-documenting.

**File Structure**:

- `kimberly/core.ts`: Core generation engine
- `kimberly/genre-elements.ts`: Genre-specific element generators (26 functions)
- `kimberly/beats.ts`: Story beat element generators (18 functions)
- `kimberly/themes.ts`: Theme-based flaw generators
- `kimberly/settings.ts`: Act 1 and Act 2 setting generators

**Migration Results**:

- Replaced 812-line monolithic file with modular system
- All content from old system preserved and extended
- 58 story tests + 612 total tests passing
- Improved maintainability and extensibility

See `src/story/kimberly/README.md` for detailed Kimberly System documentation.

## Content Generation Architecture

### Genre-Aware Generation

**Decision**: Generate story elements that are aware of selected genre and theme.

**Implementation**: Genre-specific generators create elements that match the story type (e.g., "The Detective" for Whydunit, "The Monster" for Monster in the House).

**Benefits**:

- More coherent story generation
- Genre-appropriate elements
- Better story quality

### Theme-Aware Generation

**Decision**: Generate flaws and character traits that align with selected theme.

**Implementation**: Theme-based generators create elements that support the story's thematic message (e.g., Forgiveness, Love, Acceptance).

**Benefits**:

- Thematically consistent stories
- Deeper character development
- Better alignment with Save the Cat! methodology

## Component Architecture

### Reroll System

**Decision**: Allow users to reroll individual story elements without regenerating entire story.

**Implementation**: Each `GeneratedChip` component maintains its own state and can trigger regeneration of that specific element.

**Benefits**:

- Better user control
- Faster iteration
- More engaging user experience

### Beat Chart Display

**Decision**: Display all 15 Save the Cat! beats in a visual chart format.

**Implementation**: `BeatChart` component renders beats with proper grouping (Act 1, Act 2, Act 3) and visual hierarchy.

**Benefits**:

- Clear story structure visualization
- Easy to understand beat progression
- Helps writers understand story structure
