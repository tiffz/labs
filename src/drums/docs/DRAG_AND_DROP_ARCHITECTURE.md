# Drag and Drop Architecture

This document describes the architecture of the drag-and-drop system for the Darbuka Rhythm Trainer, with clear separation of concerns to ensure stability and testability.

## Architecture Overview

The drag-and-drop system is divided into three distinct layers:

1. **Drop Target Identification** (`dropTargetFinder.ts`)
2. **Replacement/Insertion Computation** (`dragAndDrop.ts`)
3. **Preview Rendering** (`previewRenderer.ts`)

Each layer is independent, testable, and has a single responsibility.

## Layer 1: Drop Target Identification

**File:** `src/drums/utils/dropTargetFinder.ts`

**Responsibility:** Given a cursor position and available notes, identify which note or gap is the drop target.

**Key Function:**

- `findDropTarget(cursorX, cursorY, notePositions)` - Returns the note that should be the target for drag-and-drop operations

**Characteristics:**

- Pure function (no side effects)
- Takes cursor coordinates and note positions as input
- Returns drop target information
- Handles line-aware note finding (prioritizes notes on the same visual line)
- Testable in isolation

**Tests:** `dropTargetFinder.test.ts`

## Layer 2: Replacement/Insertion Computation

**File:** `src/drums/utils/dragAndDrop.ts`

**Responsibility:** Given a pattern and a drop position, compute:

- Whether replacement is possible
- What character range would be replaced
- What the resulting notation would be

**Key Functions:**

- `replacePatternAtPosition()` - Computes replacement operation
- `insertPatternAtPosition()` - Computes insertion operation
- `canReplacePatternAtPosition()` - Validates if replacement is possible
- `findDropPosition()` - Finds valid drop positions (with beat boundary snapping)

**Characteristics:**

- Pure functions (no side effects)
- Operate on notation strings
- Respect measure boundaries
- Handle partial note replacements ("cut" logic)
- Testable in isolation

**Tests:** Existing tests in `dragAndDrop.test.ts`

## Layer 3: Preview Rendering

**File:** `src/drums/utils/previewRenderer.ts`

**Responsibility:** Given replacement/insertion information, calculate where visual preview elements should be rendered.

**Key Functions:**

- `calculateReplacementHighlights()` - Calculates highlight bounds for notes that would be replaced
- `calculateInsertionLinePosition()` - Calculates insertion line position and bounds

**Characteristics:**

- Pure functions (no side effects)
- Take note positions and replacement ranges as input
- Return geometric bounds (x, y, width, height)
- Handle stave boundary clamping
- Account for drum symbol positioning
- Testable in isolation

**Tests:** `previewRenderer.test.ts`

## Component Integration

**File:** `src/drums/components/VexFlowRenderer.tsx`

The `VexFlowRenderer` component orchestrates these layers:

1. **On drag over:**
   - Uses `findDropTarget()` to identify the target note
   - Uses `replacePatternAtPosition()` or `insertPatternAtPosition()` to compute the operation
   - Uses `calculateReplacementHighlights()` or `calculateInsertionLinePosition()` to get preview bounds
   - Renders the preview using the calculated bounds

2. **On drop:**
   - Uses `findDropTarget()` to identify the target note
   - Uses `replacePatternAtPosition()` or `insertPatternAtPosition()` to perform the operation
   - Updates the notation state

## Benefits of This Architecture

1. **Separation of Concerns:** Each layer has a single, well-defined responsibility
2. **Testability:** Each layer can be tested independently with unit tests
3. **Stability:** Changes to rendering logic don't affect computation logic, and vice versa
4. **Maintainability:** Bugs are easier to isolate and fix
5. **Reusability:** Functions can be reused in different contexts

## Testing Strategy

- **Unit Tests:** Each utility module has comprehensive unit tests
- **Integration:** The component uses these utilities but doesn't duplicate their logic
- **Regression Prevention:** Tests ensure that fixes don't break existing functionality

## Future Improvements

- Consider extracting note position tracking into a separate utility
- Add more edge case tests for preview rendering
- Consider adding visual regression tests for preview rendering
