/**
 * Single source of truth for app routes used by smoke e2e, visual regression, and docs.
 * Update REGRESSION_WORKFLOW.md when changing coverage notes — run check:agent-docs.
 */
export type RouteSpec = {
  route: string;
  title: RegExp;
  visibleSelector: string;
  /** Included in e2e/smoke app-shells.spec.ts */
  smoke: boolean;
  /** Included in e2e/visual/apps.visual.spec.ts */
  visual: boolean;
  notes?: string;
};

export const APP_ROUTE_REGISTRY: RouteSpec[] = [
  { route: '/', title: /Tiff Zhang Labs/i, visibleSelector: '.container', smoke: true, visual: true },
  { route: '/cats/', title: /Cat Clicker/i, visibleSelector: '#root', smoke: true, visual: true },
  { route: '/chords/', title: /Chord Progression Generator/i, visibleSelector: '#root', smoke: true, visual: true },
  { route: '/corp/', title: /Corporate Ladder/i, visibleSelector: '#root', smoke: true, visual: true },
  { route: '/count/', title: /Count Me In/i, visibleSelector: '#root', smoke: true, visual: true },
  { route: '/drums/', title: /Darbuka Rhythm Trainer/i, visibleSelector: '#root', smoke: true, visual: true },
  { route: '/encore/', title: /Encore - Tiff Zhang Labs/i, visibleSelector: '#root', smoke: true, visual: true },
  { route: '/forms/', title: /Form Intersections/i, visibleSelector: '#root', smoke: true, visual: true },
  { route: '/melodia/', title: /Melodia Online/i, visibleSelector: '#root', smoke: true, visual: false, notes: 'smoke only' },
  { route: '/piano/', title: /Piano Practice/i, visibleSelector: '#root', smoke: true, visual: true },
  { route: '/pitch/', title: /Find Your Pitch|Tiff Zhang Labs/i, visibleSelector: '#root', smoke: true, visual: true },
  { route: '/scales/', title: /Learn Your Scales/i, visibleSelector: '#root', smoke: true, visual: true },
  { route: '/stanza/', title: /Stanza · Tiff Zhang Labs/i, visibleSelector: '#root', smoke: true, visual: false, notes: 'layout e2e separate' },
  { route: '/story/', title: /Save the Cat/i, visibleSelector: '#root', smoke: true, visual: true },
  { route: '/sight/', title: /Color Sight Trainer/i, visibleSelector: '#root', smoke: true, visual: false, notes: 'smoke only' },
  { route: '/agility/', title: /Vocal Agility Trainer/i, visibleSelector: '#root', smoke: true, visual: false, notes: 'smoke only' },
  { route: '/ui/', title: /UI Catalog/i, visibleSelector: '#root', smoke: true, visual: true },
  { route: '/words/', title: /Words in Rhythm/i, visibleSelector: '#root', smoke: true, visual: true },
  { route: '/zines/', title: /Zine Studio/i, visibleSelector: '#root', smoke: true, visual: true },
  {
    route: '/drums/universal_tom/',
    title: /Universal Tom Importer/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
  },
];

export const SMOKE_ROUTE_SPECS = APP_ROUTE_REGISTRY.filter((r) => r.smoke);
export const VISUAL_ROUTE_SPECS = APP_ROUTE_REGISTRY.filter((r) => r.visual);
