# Save the Cat! Story Generator - Architecture Decision Records

This document records major architectural decisions for the Save the Cat! Story Generator micro-app.

## Kimberly System Migration

### Decision

Migrated from flat array-based suggestion engine to the Kimberly System - a composable random content generation framework.

### Rationale

**Old System Problems**:

- Single giant file (`suggestionEngine.ts`) with 812 lines
- Flat arrays with no structure
- Hard to maintain and extend
- No type safety

**Kimberly System Benefits**:

- Composable, semantically-named functions
- Type-safe with TypeScript
- Modular file structure
- Easy to extend and maintain
- Self-documenting templates

### Implementation

**Core Concept**: Functions are named after canonical examples (e.g., `Kimberly()` generates names like "Emma", "Olivia") rather than abstract terms.

**File Structure**: `kimberly/core.ts`, `kimberly/genre-elements.ts`, `kimberly/beats.ts`, `kimberly/themes.ts`, `kimberly/settings.ts`

**Migration Results**: Replaced 812-line monolithic file with modular system, all content preserved and extended.

### Benefits

- Improved maintainability and extensibility
- Type-safe generation
- Self-documenting code
- Better testability

## Content Generation Architecture

### Genre-Aware Generation

**Decision**: Generate story elements that are aware of selected genre and theme.

**Rationale**: Creates more coherent story generation with genre-appropriate elements.

**Implementation**: Genre-specific generators create elements that match the story type (e.g., "The Detective" for Whydunit).

**Benefits**: More coherent stories, genre-appropriate elements, better story quality.

### Theme-Aware Generation

**Decision**: Generate flaws and character traits that align with selected theme.

**Rationale**: Creates thematically consistent stories with deeper character development.

**Implementation**: Theme-based generators create elements that support the story's thematic message.

**Benefits**: Thematically consistent stories, deeper character development, better alignment with Save the Cat! methodology.

## Component Architecture

### Reroll System

**Decision**: Allow users to reroll individual story elements without regenerating entire story.

**Rationale**: Provides better user control and faster iteration.

**Implementation**: Each `GeneratedChip` component maintains its own state and can trigger regeneration of that specific element.

**Benefits**: Better user control, faster iteration, more engaging user experience.

### Beat Chart Display

**Decision**: Display all 15 Save the Cat! beats in a visual chart format.

**Rationale**: Helps writers understand story structure and beat progression.

**Implementation**: `BeatChart` component renders beats with proper grouping (Act 1, Act 2, Act 3) and visual hierarchy.

**Benefits**: Clear story structure visualization, easy to understand beat progression.
