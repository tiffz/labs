import type { MarkerPlacement } from './characterArrangements';

/** Sync scope so bubble placers see arrangement slots without threading every call site. */
let activePlacement: MarkerPlacement | undefined;

export function withMarkerPlacement<T>(placement: MarkerPlacement | undefined, fn: () => T): T {
  const previous = activePlacement;
  activePlacement = placement;
  try {
    return fn();
  } finally {
    activePlacement = previous;
  }
}

export function activeMarkerPlacement(): MarkerPlacement | undefined {
  return activePlacement;
}
