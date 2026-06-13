/** Which Encore surface owns the current file drag (for routing + highlight gating). */
export type EncoreDropSurface = 'media-hub' | 'performance' | 'performance-modal' | null;

let activeSurface: EncoreDropSurface = null;

export function getEncoreDropSurface(): EncoreDropSurface {
  return activeSurface;
}

export function setEncoreDropSurface(surface: EncoreDropSurface): void {
  activeSurface = surface;
}

/** Media-hub document highlights are suppressed while performance surfaces own the drag. */
export function shouldEncoreMediaHubHighlightDrag(): boolean {
  const surface = activeSurface;
  return surface !== 'performance-modal' && surface !== 'performance';
}
