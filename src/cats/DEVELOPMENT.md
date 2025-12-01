# Cat Clicker - Architecture Decision Records

This document records major architectural decisions for the Cat Clicker micro-app.

## Entity-Component-System (ECS) Architecture

### Decision

Migrate from React-only state management to Entity-Component-System architecture for world state, physics, and animations.

### Rationale

**Problems with React-Only Approach**:

- Complex state synchronization between multiple systems
- Performance issues with frequent re-renders
- Difficult to manage physics and animation timing

**ECS Benefits**:

- Clear separation: React renders views, ECS owns world state
- Better performance: React subscribes to ECS updates, doesn't poll
- Easier to reason about: Systems handle specific concerns

### Implementation

**Core Components**: `Transform3`, `Velocity3`, `Renderable`, `ShadowProps`, `CatBehavior`, `CatIntent`, `CatAnim`

**Systems**: `MovementSystem`, `JumpImpulseSystem`, `ShadowSystem`, `CatStateSystem`

**React Integration**: `world-tick` CustomEvent dispatched each frame; React subscribes to reflect ECS updates without polling

### Benefits

- Smile/ear/tail animations now ECS-driven
- Happy jump and pounce hop are ECS-driven
- World loop uses fixed sub-steps (10ms) for smooth physics
- Cat X clamps to world width, preventing edge teleports

## 2D World Coordinate System

### Decision

Implement fixed-size 2D world with horizontal camera panning and perspective scaling.

### Rationale

Creates immersive environment similar to "Night in the Woods" with proper depth perception.

### Implementation

- `WorldCoordinateSystem.ts`: Central service managing 3D world coordinates and screen position mapping
- Single-source projection: All projection goes through `worldToScreen()` and `getShadowPosition()`
- Responsive floor: Dynamically calculates floor dimensions (40% of viewport height)

### Benefits

- Consistent world proportions across screen sizes
- Proper 3D depth perception
- Camera-aware rendering

## Furniture Placement System

### Decision

Implement sophisticated furniture placement system with layered collision detection.

### Rationale

Creates realistic, non-overlapping furniture layouts in the 2D world environment.

### Implementation

**Layered Collision Detection**:

- Rug Layer: Floor decorations that other furniture can sit on
- Upright Layer: Standing furniture with shadow-based collision
- Wall Layer: Wall-mounted furniture with 2D collision on wall plane

**Placement Algorithms**: Partition-based for wall furniture, grid-based for floor furniture with shadow collision (70% shadow factor)

### Benefits

- Realistic furniture layouts
- No visual overlaps
- Perspective-aware placement
- Comprehensive test coverage (100% success rate for wall furniture, 80%+ for floor)

## Interaction Consistency

### Decision

Unified love calculation pattern for all interaction types.

### Rationale

Different interaction types had inconsistent love calculations and heart spawning logic, leading to bugs.

### Implementation

**Core Pattern**: Calculate love → Update game state → Spawn hearts using same calculated amount

**Key Principle**: Never use hardcoded `loveAmount` values; always use calculated love for both state and visual effects

### Benefits

- Consistent behavior across all interactions
- Visual feedback matches actual love gained
- Prevents bugs from hardcoded values

## Achievement System Stability

### Decision

Use processing ref pattern to prevent race conditions in achievement awarding.

### Rationale

Race condition bug where achievements could be awarded multiple times due to asynchronous React state updates.

### Implementation

**Processing Ref Pattern**: Check if currently being processed FIRST, before state checks. Mark as processing immediately, allow 50ms for React state to propagate before cleanup.

### Benefits

- Prevents duplicate achievement awards
- Handles rapid successive calls correctly
- Comprehensive regression tests prevent future issues

## Unified Mouse Tracking System

### Decision

Use refs instead of React state for mouse tracking to prevent render loops.

### Rationale

Mouse movement was triggering excessive React re-renders (60+ renders/second), causing performance issues.

### Implementation

- Single `document.addEventListener('mousemove')` serves entire application
- Mouse position stored in refs, never triggers React re-renders
- Components register callbacks via `onMouseMove()` for position updates

### Benefits

- Zero render loops during mouse movement
- Conditional state updates only when UI actually needs to change
- Direct DOM manipulation for performance-critical animations
- Unified event handling eliminates redundant mouse listeners

## Visual Effects System

### Decision

Unified coordinate system approach for all cat-related visual effects (hearts, Z's).

### Rationale

Ensures consistent positioning across all scenarios including camera panning, cat movement, and initialization states.

### Implementation

- Hearts: Use direct screen coordinates (`event.clientX/clientY`)
- Sleep Z's: Use direct DOM queries (`getBoundingClientRect()`)
- No manual camera compensation - CSS transforms handled automatically

### Benefits

- Works correctly in all game scenarios
- No complex position tracking systems needed
- Consistent positioning across all effects
- Test-friendly with mockable `getBoundingClientRect()`
