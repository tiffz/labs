# Cat Clicker Game - Design Principles

## Currency Display Standards

### Whole Numbers Only for Treats and Love

**Principle**: All treats and love values in the game should be displayed as whole numbers (natural numbers) to maintain a simple, casual gaming experience.

**Implementation**:

- Use `Math.floor()` for all treat and love display values
- This applies to:
  - Currency displays in the main UI
  - Tooltips and breakdowns
  - Dev panel statistics
  - Job earnings
  - Upgrade costs and effects

**Rationale**:

- Simpler mental math for players
- Maintains the casual, approachable feel of the game
- Avoids confusion with fractional currency
- Consistent with incremental game conventions

**Examples**:

```typescript
// ✅ Correct
<span>{Math.floor(treats)} treats</span>
<span>{Math.floor(love)} love</span>

// ❌ Incorrect
<span>{treats.toFixed(1)} treats</span>
<span>{love.toFixed(2)} love</span>
```

### Internal Calculations

While displays should always show whole numbers, internal calculations can use decimals for precision, but should be floored before display.

```typescript
// Internal calculation can have decimals
const lovePerSecond = treatsPerSecond * 2.5;

// But display as whole number
const displayValue = Math.floor(lovePerSecond);
```

## UI/UX Design Standards

### Consistent Cost Display

**Principle**: All costs should be displayed using shared components to ensure visual consistency across the game.

**Implementation**:

- Use the `CostDisplay` component for all upgrade and job costs
- Support both inline (for jobs) and block (for upgrades) display modes
- Show red background for unaffordable costs, no special styling for affordable costs

### Material Design Icons Over Emojis

**Principle**: Use SVG icons consistently instead of emojis for a cohesive visual experience.

**Implementation**:

- Use existing `HeartIcon` and `FishIcon` components
- Combine icons to show relationships (e.g., Fish → Heart for conversion)
- Style icons with consistent sizing and subtle colors

### Tooltip Design Standards

**Principle**: Tooltips should be informative, stable, and non-intrusive.

**Implementation**:

- **Exclusive visibility**: Only one tooltip visible at a time using `TooltipManager`
- **Proper z-index**: Tooltips appear above all other UI elements (`z-index: 10000+`)
- **Stable hover**: Tooltips remain visible when hovering over them
- **Information hierarchy**: Primary totals first, then breakdown details
- **Cat personality**: Include cute flavor text that reflects the cat's mood

## Game Progression Standards

### Infinite Upgrade Systems

**Principle**: All upgrade paths should continue indefinitely to support long-term progression.

**Implementation**:

- Define initial levels with custom data
- Use `infiniteScaling` parameters for levels beyond predefined data
- Apply exponential cost scaling and logarithmic effect scaling
- Utility functions: `getInfiniteUpgradeCost()`, `getInfiniteUpgradeEffect()`, `getInfiniteUpgradeName()`

### Economic Balance

**Principle**: The treat-to-love conversion system should be the core economic engine.

**Implementation**:

- Treats earned from jobs (time-based income)
- Treats converted to love (primary progression currency)
- Love used for both job promotions and upgrades
- Balance conversion rate and multiplier upgrades
