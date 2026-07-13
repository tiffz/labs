import type { PanelCompositionId } from './types';
import { PANEL_COMPOSITION_IDS } from './types';

export const PANEL_COMPOSITION_LABELS: Record<PanelCompositionId, string> = {
  empty: 'Empty',
  'big-head': 'Big head',
  'extreme-closeup': 'Extreme closeup',
  profile: 'Profile',
  'back-of-head': 'Back of head',
  'full-figure': 'Full figure',
  'silhouette-dark': 'Dark silhouette',
  'silhouette-light': 'Light silhouette',
  'down-shot': 'Down shot',
  aerial: 'Aerial',
  depth: 'Depth',
  reflection: 'Reflection',
  'side-light': 'Side light',
  'big-object': 'Big object',
  'open-panel': 'Open panel',
  'small-figure': 'Small figure',
  'city-scene': 'City scene',
  'nature-scene': 'Nature scene',
  contrast: 'High contrast',
  'ben-day': 'Ben-Day dots',
  frame: 'Frame',
  'three-stage': 'Three stage',
  'horizon-scene': 'Horizon scene',
};

export const RANDOM_COMPOSITION_POOL: PanelCompositionId[] = PANEL_COMPOSITION_IDS.filter(
  (id) => id !== 'empty',
);

export function randomCompositionId(seed: number): PanelCompositionId {
  const pool = RANDOM_COMPOSITION_POOL;
  const index = Math.abs(seed) % pool.length;
  return pool[index]!;
}

export function randomCompositionsForPanels(
  panelCount: number,
  seed = Date.now(),
): PanelCompositionId[] {
  let s = seed;
  return Array.from({ length: panelCount }, (_, i) => {
    s = (s * 1103515245 + 12345 + i) | 0;
    return randomCompositionId(s);
  });
}
