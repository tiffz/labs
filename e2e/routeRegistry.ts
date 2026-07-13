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
  /** Baseline snapshot id (e.g. `cats-desktop.png` → `cats`) */
  visualId?: string;
  /** Wait selector for visual regression; defaults to `visibleSelector` */
  visualReadySelector?: string;
  /** Title matcher for visual tests when smoke title is too strict */
  visualTitle?: RegExp;
  /** Optional visibility timeout for smoke shell boot (default Playwright 5s). */
  smokeVisibleTimeoutMs?: number;
  /** Optional visibility timeout for visual regression (default Playwright 5s). */
  visualVisibleTimeoutMs?: number;
  notes?: string;
};

export const APP_ROUTE_REGISTRY: RouteSpec[] = [
  {
    route: '/',
    title: /Tiff Zhang Labs/i,
    visibleSelector: '.container',
    smoke: true,
    visual: true,
    visualId: 'home',
  },
  {
    route: '/cats/',
    title: /Cat Clicker/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'cats',
    visualReadySelector: '.world-viewport-container',
  },
  {
    route: '/chords/',
    title: /Chord Progression Generator/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'chords',
  },
  {
    route: '/corp/',
    title: /Corporate Ladder/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'corp',
    visualReadySelector: '#map-container',
  },
  {
    route: '/count/',
    title: /Count Me In/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'count',
  },
  {
    route: '/drums/',
    title: /Darbuka Rhythm Trainer/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'drums',
  },
  {
    route: '/encore/',
    title: /Encore - Tiff Zhang Labs/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'encore',
    visualTitle: /Encore|Tiff Zhang Labs/i,
  },
  {
    route: '/forms/',
    title: /Form Intersections/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'forms',
  },
  {
    route: '/melodia/',
    title: /Melodia Online/i,
    visibleSelector: '#root',
    smoke: true,
    visual: false,
    notes: 'smoke only',
  },
  {
    route: '/midi/',
    title: /Midi Scratchpad/i,
    visibleSelector: '#main',
    smoke: true,
    visual: false,
    notes: 'smoke only',
  },
  {
    route: '/piano/',
    title: /Piano Practice/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'piano',
  },
  {
    route: '/pitch/',
    title: /Find Your Pitch|Tiff Zhang Labs/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'pitch',
  },
  {
    route: '/scales/',
    title: /Learn Your Scales/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'scales',
  },
  {
    route: '/stanza/',
    title: /Stanza · Tiff Zhang Labs/i,
    visibleSelector: '#root',
    smoke: true,
    visual: false,
    notes: 'layout e2e separate',
  },
  {
    route: '/story/',
    title: /Save the Cat/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'story',
  },
  {
    route: '/sight/',
    title: /Color Sight Trainer/i,
    visibleSelector: '#root',
    smoke: true,
    visual: false,
    notes: 'smoke only',
  },
  {
    route: '/agility/',
    title: /Vocal Agility Trainer/i,
    visibleSelector: '#root',
    smoke: true,
    visual: false,
    notes: 'smoke only',
  },
  {
    route: '/gesture/',
    title: /The Gesture Room/i,
    visibleSelector: '#root',
    smoke: true,
    visual: false,
    notes: 'smoke only',
  },
  {
    route: '/zinebox/',
    title: /Zine Box/i,
    visibleSelector: 'button:has-text("Upload zines")',
    smoke: true,
    visual: false,
    notes: 'smoke only',
  },
  {
    route: '/lyrefly/',
    title: /Lyrefly/i,
    visibleSelector: '[data-testid="lyrefly-showcase"]',
    smoke: true,
    visual: false,
    notes: 'smoke shell',
  },
  {
    route: '/palette/',
    title: /Palette Generator/i,
    visibleSelector: '[data-testid="palettegen-app"]',
    smoke: true,
    visual: false,
    notes: 'palette from images and links',
  },
  {
    route: '/scrapboard/',
    title: /Scrapboard/i,
    visibleSelector: '[data-testid="scrapboard-app"]',
    smoke: true,
    visual: false,
    notes: 'comic panel mockups',
  },
  {
    route: '/lyrefly/?e2eSeed=1',
    title: /Lyrefly/i,
    visibleSelector: '[data-testid="lyrefly-showcase"]',
    smoke: false,
    visual: true,
    visualId: 'lyrefly-gallery',
    notes: 'Gallery shelf with e2e seed',
  },
  {
    route: '/lyrefly/?e2eSeed=1#/project/e2e00000-0000-4000-8000-00000e2e0001/profile',
    title: /Lyrefly/i,
    visibleSelector: '[data-testid="lyrefly-comic-profile"]',
    smoke: false,
    visual: true,
    visualId: 'lyrefly-profile',
    visualReadySelector: '[data-testid="lyrefly-comic-profile"]',
    visualVisibleTimeoutMs: 15_000,
    notes: 'Comic profile with seeded pages and version',
  },
  {
    route: '/lyrefly/?e2eSeed=1#/project/e2e00000-0000-4000-8000-00000e2e0001/art',
    title: /Lyrefly/i,
    visibleSelector: '[data-testid="lyrefly-art-stage"]',
    smoke: false,
    visual: true,
    visualId: 'lyrefly-draw',
    visualReadySelector: '[data-testid="lyrefly-art-page-grid"]',
    visualVisibleTimeoutMs: 15_000,
    notes: 'Draw stage with version strip and page grid',
  },
  {
    route: '/muscle/',
    title: /Muscle Memory/i,
    visibleSelector: '[data-testid="muscle-app"]',
    smokeVisibleTimeoutMs: 20_000,
    smoke: true,
    visual: false,
    notes: 'WIP — shell + study journey + orbit perf smokes',
  },
  {
    route: '/ui/',
    title: /UI Catalog/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'ui',
  },
  {
    route: '/words/',
    title: /Words in Rhythm/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'words',
  },
  {
    route: '/zines/',
    title: /Zine Studio/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'zines',
  },
  {
    route: '/drums/universal_tom/',
    title: /Universal Tom Importer/i,
    visibleSelector: '#root',
    smoke: true,
    visual: true,
    visualId: 'universal-tom',
  },
];

export const SMOKE_ROUTE_SPECS = APP_ROUTE_REGISTRY.filter((r) => r.smoke);

/** Shape consumed by e2e/visual/apps.visual.spec.ts */
export type VisualRouteFromRegistry = {
  id: string;
  route: string;
  title: RegExp;
  readySelector: string;
  visibleTimeoutMs?: number;
};

export const VISUAL_ROUTE_SPECS: VisualRouteFromRegistry[] = APP_ROUTE_REGISTRY.filter(
  (r) => r.visual,
).map((r) => ({
  id: r.visualId ?? (r.route.replace(/\//g, '-').replace(/^-|-$/g, '') || 'home'),
  route: r.route,
  title: r.visualTitle ?? r.title,
  readySelector: r.visualReadySelector ?? r.visibleSelector,
  visibleTimeoutMs: r.visualVisibleTimeoutMs,
}));
