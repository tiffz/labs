import { useWorld } from '../context/useWorld';

/**
 * Hook that provides reactive access to furniture entities specifically.
 * Returns furniture entities sorted by z-depth for proper rendering order.
 * PERFORMANCE: Memoized to prevent memory leaks from constant array creation.
 * 
 * Uses the automatically reactive useWorld() hook, so no special "reactive" version needed.
 */
export const useFurniture = (() => {
  let lastRugPos: string | undefined;
  
  return () => {
    const world = useWorld(); // Now automatically reactive!

    // Don't memoize - we need fresh data on every render when transforms change
    // console.log('🔄 useFurniture: Getting fresh furniture data...');
  
  // Sort by world z descending (farther first), so nearer entities render later and appear on top.
  const entities = Array.from(world.renderables.entries())
    .filter(([, renderable]) => renderable.kind !== 'cat') // Exclude cat
    .sort((a, b) => {
      const ta = world.transforms.get(a[0]);
      const tb = world.transforms.get(b[0]);
      const za = ta?.z ?? 0;
      const zb = tb?.z ?? 0;
      return zb - za;
    });

  const furnitureEntities = entities.map(([entityId, renderable]) => {
    const transform = world.transforms.get(entityId);
    
    // Minimal logging for debugging
    if (renderable.kind === 'rug') {
      // Only log rug position changes, not every frame
      const currentPos = `${transform?.x?.toFixed(0)},${transform?.z?.toFixed(0)}`;
      if (!lastRugPos || lastRugPos !== currentPos) {
        lastRugPos = currentPos;
      }
    }
    
    return {
      entityId,
      renderable,
      transform,
    };
  });

    return furnitureEntities;
  };
})();
