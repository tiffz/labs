// Shared z-index computation so entities are stacked by world z consistently.
// Uses Math.floor for stable z-index assignment: the value only changes when
// crossing an integer boundary, preventing flicker near half-integer z values.

export function layerForZ(z: number, kind: 'entity' | 'shadow' = 'entity'): number {
  const base = Math.floor(z);
  return kind === 'shadow' ? base - 1 : base;
}


