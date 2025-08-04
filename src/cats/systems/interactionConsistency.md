# Interaction Consistency Guidelines

## Problem Statement

Previously, different interaction types (petting, nose clicks, ear clicks, etc.) had inconsistent love calculations and heart spawning logic. This led to bugs where:

1. **Nose clicks** used hardcoded `loveAmount: 5` instead of calculated love amounts
2. **Heart scaling** didn't match the actual love gained from interactions
3. **Visual feedback** was inconsistent across interaction types

## Solution: Unified Love Calculation Pattern

### Core Principle

**All interactions must use the same pattern:**

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

## Testing Requirements

### 1. Love Calculation Tests

Every interaction must test that:

- Love is calculated using `calculateFinalLoveGain`
- The correct base, multipliers, and interaction type are used
- No hardcoded love values exist

### 2. Heart Spawning Tests

Every interaction must test that:

- `heartSpawningService.spawnHearts` is called with calculated love amount
- The `loveAmount` parameter matches the calculated love exactly
- No hardcoded `loveAmount` values are used

### 3. Consistency Tests

- All petting-style interactions use `interactionType: 'petting'`
- All interactions pass the same love amount to both game state and heart spawning
- Heart scaling reflects the actual love gained

## Code Review Checklist

When adding or modifying interactions:

- [ ] Uses `calculateFinalLoveGain` for love calculation
- [ ] Passes calculated love to `onLoveGained`
- [ ] Passes **same calculated love** to `heartSpawningService.spawnHearts`
- [ ] No hardcoded `loveAmount` values
- [ ] Appropriate `energyMultiplier` for interaction type
- [ ] Correct `interactionType` classification
- [ ] Tests verify love calculation and heart spawning consistency

## Benefits

1. **Visual Consistency**: Hearts always scale with actual love gained
2. **Gameplay Balance**: All interactions benefit from upgrades and multipliers
3. **Maintainability**: Single source of truth for love calculations
4. **Bug Prevention**: Impossible to have mismatched love amounts and heart visuals
5. **Player Experience**: Predictable and fair interaction system
