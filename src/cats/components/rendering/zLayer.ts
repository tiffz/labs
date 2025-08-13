// Shared z-index computation so entities are stacked by world z consistently.
// Convention: higher z means farther from the camera (render behind).

export function layerForZ(z: number, kind: 'entity' | 'shadow' = 'entity'): number {
  // In our world, larger z means nearer to the camera. Higher z-index should be on top.
  const base = Math.round(z);
  return kind === 'shadow' ? base - 1 : base;
}


