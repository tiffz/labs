# Unified Rendering System Migration Guide

## Overview

This guide documents the migration from inconsistent furniture rendering to a unified, consistent system that eliminates positioning bugs and visual inconsistencies during viewport changes.

## Problems Solved

### Before (Inconsistent System)

- **Mixed Scaling**: Different furniture used different scaling approaches
  - Rug: `floor.worldScale` only
  - ScratchingPost: `ground.scale` (perspective + world)
  - Couch: `ground.scale * 1.15` (arbitrary multiplier)
  - Painting: `wallScreen.scale` (different coordinate system)

- **Inconsistent Positioning**: Various centering and alignment approaches
- **Shadow Inconsistencies**: Different shadow logic per furniture type
- **Coordinate System Confusion**: Mixed usage of `catToScreen` vs `wallToScreen`
- **Responsive Issues**: Some components subscribed to coordinate changes, others didn't

### After (Unified System)

- **Single Scaling Approach**: All furniture uses consistent coordinate system scaling
- **Standardized Positioning**: Centered horizontally, bottom-aligned vertically
- **Unified Shadow System**: Consistent shadow rendering for all furniture
- **Proper Coordinate Systems**: Floor furniture uses `catToScreen`, wall uses `wallToScreen`
- **Consistent Responsiveness**: All furniture subscribes to coordinate system changes

## Core Components

### UnifiedFurnitureRenderer

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

## Migration Steps

### 1. Create Furniture Configuration

```tsx
const config = createFurnitureConfig({
  kind: 'couch',
  ...FurniturePositioning.floor(x, z), // or .wall(x, y, z)
  viewBoxWidth: VB_W,
  viewBoxHeight: VB_H,
  massWidth: actualMassWidth, // optional
});
```

### 2. Wrap SVG Content

```tsx
return (
  <UnifiedFurnitureRenderer {...config} ariaLabel="couch">
    {/* Move existing SVG content here */}
    {/* Remove all positioning and scaling logic */}
    {/* Keep only the visual SVG elements */}
  </UnifiedFurnitureRenderer>
);
```

### 3. Remove Old Logic

- Remove manual coordinate system calls (`catCoordinateSystem.catToScreen`)
- Remove manual scaling calculations
- Remove manual positioning logic
- Remove manual shadow rendering
- Remove manual coordinate system subscriptions

### 4. Update Dimensions

- Review and standardize viewBox dimensions
- Remove arbitrary scaling multipliers
- Ensure consistent base sizes across similar furniture

## Examples

### Before (ScratchingPost)

```tsx
const ground = catCoordinateSystem.catToScreen({ x, y: 0, z });
const w = Math.round(BASE_W * ground.scale);
const h = Math.round(BASE_H * ground.scale);
const left = ground.x - w / 2;
const bottom = Math.round(ground.y);

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  left: '0px',
  transform: `translate3d(${left}px, 0, 0)`,
  bottom: `${bottom}px`,
  width: `${w}px`,
  height: `${h}px`,
  zIndex: layerForZ(z, 'entity'),
};
```

### After (ScratchingPost)

```tsx
const config = createFurnitureConfig({
  kind: 'furniture',
  ...FurniturePositioning.floor(x, z),
  viewBoxWidth: BASE_W,
  viewBoxHeight: BASE_H,
  massWidth: 44,
});

return (
  <UnifiedFurnitureRenderer {...config}>
    {/* Just SVG content */}
  </UnifiedFurnitureRenderer>
);
```

## Benefits

### 1. Consistency

- All furniture renders with identical scaling and positioning logic
- No more arbitrary multipliers or special cases
- Unified shadow system

### 2. Maintainability

- Single source of truth for rendering logic
- Easy to update scaling behavior globally
- Consistent debugging and overlay system

### 3. Responsiveness

- All furniture automatically responds to viewport changes
- Consistent behavior during window resizing
- No more positioning bugs during scaling

### 4. Performance

- Reduced code duplication
- Consistent coordinate system subscription
- Better React optimization opportunities

## Migration Checklist

For each furniture component:

- [ ] Create unified version using `UnifiedFurnitureRenderer`
- [ ] Remove manual positioning logic
- [ ] Remove arbitrary scaling multipliers
- [ ] Standardize viewBox dimensions
- [ ] Test responsive behavior
- [ ] Update WorldRenderer to use unified component
- [ ] Verify shadows render correctly
- [ ] Test debug overlays
- [ ] Remove old component file

## Testing

### Responsive Testing

1. Resize browser window while game is running
2. Verify all furniture scales consistently
3. Check that positioning remains stable
4. Test both horizontal and vertical resizing

### Coordinate System Testing

1. Enable debug overlays
2. Verify mass boxes align correctly
3. Check baseline alignment
4. Test shadow positioning

### Cross-Furniture Testing

1. Place multiple furniture types together
2. Verify consistent scaling relationships
3. Check z-index ordering
4. Test shadow interactions

## Future Improvements

### 1. Animation System

- Unified animation framework for furniture
- Consistent hover and interaction effects
- Standardized transition timing

### 2. Configuration System

- External furniture configuration files
- Runtime furniture customization
- Theme-based furniture variants

### 3. Performance Optimization

- Furniture instance pooling
- Optimized coordinate system updates
- Reduced re-render frequency

## Troubleshooting

### Common Issues

**Furniture appears too small/large:**

- Check viewBox dimensions are reasonable
- Verify no arbitrary scaling multipliers remain
- Ensure coordinate system is working correctly

**Positioning is incorrect:**

- Verify using correct coordinate system (floor vs wall)
- Check that transform coordinates are valid
- Ensure coordinate system subscription is working

**Shadows don't appear:**

- Check furniture config has `occupiesFloor: true`
- Verify shadow system is enabled
- Check massWidth configuration

**Debug overlays misaligned:**

- Verify mass box calculations
- Check viewBox to screen coordinate mapping
- Ensure baseline alignment is correct
