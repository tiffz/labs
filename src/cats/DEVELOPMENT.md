# Cat Clicker - Architecture Decision Records

This document records major architectural decisions, design patterns, and development guidelines for the Cat Clicker micro-app.

## Interaction Consistency

### Problem Statement

Different interaction types (petting, nose clicks, ear clicks, etc.) previously had inconsistent love calculations and heart spawning logic, leading to bugs where:

- Nose clicks used hardcoded `loveAmount: 5` instead of calculated love amounts
- Heart scaling didn't match the actual love gained from interactions
- Visual feedback was inconsistent across interaction types

### Solution: Unified Love Calculation Pattern

**Core Principle**: All interactions must use the same pattern:

```typescript
// 1. Calculate love using the centralized system
const calculatedLove = calculateFinalLoveGain(
  baseLovePerInteraction,
  interactionType, // 'petting', 'pouncing', or 'playing_during_wand'
  energyMultiplier, // varies by interaction type
  meritMultipliers
);

// 2. Update game state
onLoveGained(calculatedLove);

// 3. Spawn hearts using the SAME calculated amount
heartSpawningService.spawnHearts({
  position: { x: event.clientX, y: event.clientY },
  loveAmount: calculatedLove, // ← NEVER use hardcoded values here
  interactionType: interactionType,
});
```

### Energy Multiplier Guidelines

| Interaction Type | Energy Multiplier     | Reasoning                              |
| ---------------- | --------------------- | -------------------------------------- |
| Regular petting  | `1 + catEnergy / 100` | Full energy bonus                      |
| Ear clicks       | `1 + catEnergy / 100` | Full energy bonus                      |
| Cheek clicks     | `1 + catEnergy / 100` | Full energy bonus (via handleCatClick) |
| Nose clicks      | `1`                   | No energy bonus (special interaction)  |
| Pouncing         | `1 + catEnergy / 100` | Full energy bonus                      |
| Playing          | `1 + catEnergy / 100` | Full energy bonus                      |

### Interaction Type Guidelines

| Interaction  | `interactionType`       | Notes                   |
| ------------ | ----------------------- | ----------------------- |
| Cat clicks   | `'petting'`             | Default interaction     |
| Ear clicks   | `'petting'`             | Same as regular petting |
| Nose clicks  | `'petting'`             | Same as regular petting |
| Cheek clicks | `'petting'`             | Same as regular petting |
| Pouncing     | `'pouncing'`            | 2x multiplier applied   |
| Playing      | `'playing_during_wand'` | 1x multiplier applied   |

### Code Review Checklist

When adding or modifying interactions:

- [ ] Uses `calculateFinalLoveGain` for love calculation
- [ ] Passes calculated love to `onLoveGained`
- [ ] Passes **same calculated love** to `heartSpawningService.spawnHearts`
- [ ] No hardcoded `loveAmount` values
- [ ] Appropriate `energyMultiplier` for interaction type
- [ ] Correct `interactionType` classification
- [ ] Tests verify love calculation and heart spawning consistency

## Unified Rendering System

### Overview

The unified rendering system provides consistent furniture rendering that eliminates positioning bugs and visual inconsistencies during viewport changes.

### Core Component: UnifiedFurnitureRenderer

The main component that provides consistent rendering for all furniture:

```tsx
<UnifiedFurnitureRenderer
  kind="couch"
  x={100}
  z={600}
  viewBoxWidth={320}
  viewBoxHeight={180}
  placement="floor"
>
  {/* SVG content */}
</UnifiedFurnitureRenderer>
```

### Key Features

1. **Consistent Scaling**: Uses coordinate system scale without arbitrary multipliers
2. **Standardized Positioning**: Always centered and bottom-aligned
3. **Unified Shadows**: Automatic shadow rendering based on furniture config
4. **Responsive**: Automatically subscribes to coordinate system changes
5. **Debug Support**: Built-in overlay support for debugging

### Benefits

- **Consistency**: All furniture renders with identical scaling and positioning logic
- **Maintainability**: Single source of truth for rendering logic
- **Responsiveness**: All furniture automatically responds to viewport changes
- **Performance**: Reduced code duplication and consistent coordinate system subscription

### Migration Pattern

1. Create furniture configuration using `createFurnitureConfig`
2. Wrap SVG content in `UnifiedFurnitureRenderer`
3. Remove manual coordinate system calls, scaling calculations, positioning logic, and shadow rendering
4. Update dimensions and standardize viewBox dimensions

See `src/cats/components/rendering/UNIFIED_RENDERING_GUIDE.md` for detailed migration guide.
