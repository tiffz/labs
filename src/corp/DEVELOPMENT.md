# Corporate Ladder - Architecture Decision Records

This document records major architectural decisions for the Corporate Ladder micro-app.

## Architecture Overview

### Decision

Decouple rendering from logic: React renders views; game logic lives in hooks/utilities.

### Rationale

- Clear separation of concerns
- Easier to test game logic independently
- React handles UI updates, game logic handles state

### Implementation

- Single `GameState` ref holds all game state
- React re-renders via version tick when state changes
- Game logic in `game/` directory (generation, FOV, types)
- Components: `MapView.tsx` (rendering), `UIPanel.tsx` (UI)

### Benefits

- Predictable updates without complex state synchronization
- Testable game logic independent of React
- Clear component responsibilities

## Performance Optimization

### Decision

Render only visible window; use simple CSS overlays for fog; avoid expensive effects.

### Rationale

Roguelite games can have large maps - rendering everything would be expensive.

### Implementation

- Viewport-based rendering
- Fog-of-war using CSS overlays (not expensive calculations)
- Minimal re-renders on state changes

### Benefits

- Better performance for large maps
- Smooth gameplay experience
- Efficient rendering

## Stability Patterns

### Decision

Guard against null/undefined; cap messages; small per-turn work.

### Rationale

Prevents crashes and ensures smooth gameplay experience.

### Implementation

- Comprehensive null checks
- Message queue with size limits
- Incremental per-turn processing

### Benefits

- Prevents crashes
- Smooth gameplay
- Predictable behavior

## Testing Strategy

### Decision

Co-locate E2E tests with app code; use unit tests for game logic.

### Rationale

Follows monorepo standards and provides comprehensive test coverage.

### Implementation

- Unit tests: Map generation logic, field-of-view calculations, game state management
- E2E tests: Page initialization, player movement, game over conditions, regression prevention
- Test location: `src/corp/e2e/` per monorepo standards

### Benefits

- Comprehensive test coverage
- Easy to find and maintain tests
- Prevents regressions
