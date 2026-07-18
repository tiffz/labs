import type { PanelLayoutSpec, PanelRect } from './types';
import { getLayoutSafeRegion, type LayoutSafeRegion } from './panelLayoutRegion';
import type { PanelShapeId } from './types';
import { readingOrderForPanels } from './panelReadingOrder';

export type LayoutHeuristicId =
  | 'uniform-grid'
  | 'horizontal-strip'
  | 'vertical-stack'
  | 'splash-top'
  | 'splash-left'
  | 'splash-right'
  | 'l-shape'
  | 't-shape'
  | 'mosaic-columns'
  | 'diagonal-stagger'
  | 'diagonal-slice'
  | 'slant-row'
  | 'slant-column'
  | 'diagonal-slash'
  | 'angular-stack'
  | 'wedge-pinwheel'
  | 'circle-trio'
  | 'circle-quartet'
  | 'full-bleed-hero'
  | 'open-bleed'
  | 'pinwheel';

export interface GeneratedPanelLayout extends PanelLayoutSpec {
  heuristic: LayoutHeuristicId;
  conventionality: number;
}

export type LayoutGenerateOptions = {
  maxResults?: number;
  printSpec?: import('../zine/labsPrintSpec').LabsPrintSpec;
  /** When true, include layouts with explicit full-bleed panels (never default). */
  allowFullBleed?: boolean;
};

const GUTTER = 0.018;

function panel(
  x: number,
  y: number,
  w: number,
  h: number,
  extra?: Partial<PanelRect>,
): PanelRect {
  return { x, y, width: w, height: h, bleedMode: 'trim', ...extra };
}

function mapToSafe(
  safe: LayoutSafeRegion,
  nx: number,
  ny: number,
  nw: number,
  nh: number,
  extra?: Partial<PanelRect>,
): PanelRect {
  return panel(
    safe.x + nx * safe.width,
    safe.y + ny * safe.height,
    nw * safe.width,
    nh * safe.height,
    extra,
  );
}

function gridFactorPairs(n: number): Array<{ cols: number; rows: number }> {
  const pairs: Array<{ cols: number; rows: number }> = [];
  for (let cols = 1; cols <= n; cols++) {
    if (n % cols !== 0) continue;
    pairs.push({ cols, rows: n / cols });
  }
  return pairs;
}

function buildUniformGrid(safe: LayoutSafeRegion, cols: number, rows: number): PanelRect[] {
  const gw = GUTTER;
  const gh = GUTTER;
  const cellW = (1 - gw * (cols - 1)) / cols;
  const cellH = (1 - gh * (rows - 1)) / rows;
  const rects: PanelRect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push(mapToSafe(safe, c * (cellW + gw), r * (cellH + gh), cellW, cellH));
    }
  }
  return rects;
}

function gridConventionality(cols: number, rows: number, n: number): number {
  const aspect = cols / rows;
  const squareness = 1 - Math.min(1, Math.abs(Math.log(aspect)) / Math.log(Math.max(n, 2)));
  // Extreme 1×N / N×1 strips make unreadably skinny/flat panels — bury them in the gallery.
  let stripPenalty = 0;
  if (rows === 1 && cols > 4) stripPenalty += 0.12 + (cols - 4) * 0.1;
  if (cols === 1 && rows > 4) stripPenalty += 0.18 + (rows - 4) * 0.1;
  if (cols >= 6 || rows >= 6) stripPenalty += 0.2;
  return Math.max(0.08, 0.72 + squareness * 0.22 - stripPenalty);
}

function horizontalStrip(safe: LayoutSafeRegion, n: number): PanelRect[] {
  const gw = GUTTER;
  const cellW = (1 - gw * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => mapToSafe(safe, i * (cellW + gw), 0, cellW, 1));
}

function verticalStack(safe: LayoutSafeRegion, n: number): PanelRect[] {
  const gh = GUTTER;
  const cellH = (1 - gh * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => mapToSafe(safe, 0, i * (cellH + gh), 1, cellH));
}

function splashTop(safe: LayoutSafeRegion, n: number): PanelRect[] | null {
  if (n < 2) return null;
  const heroH = 0.54;
  const rest = n - 1;
  const cols = Math.min(rest, 3);
  const rows = Math.ceil(rest / cols);
  const gh = GUTTER;
  const gw = GUTTER;
  const cellW = (1 - gw * (cols - 1)) / cols;
  const cellH = (1 - heroH - gh - gh * (rows - 1)) / rows;
  const rects: PanelRect[] = [mapToSafe(safe, 0, 0, 1, heroH)];
  let placed = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols && placed < rest; c++) {
      rects.push(mapToSafe(safe, c * (cellW + gw), heroH + gh + r * (cellH + gh), cellW, cellH));
      placed++;
    }
  }
  return rects;
}

function splashSide(safe: LayoutSafeRegion, n: number, side: 'left' | 'right'): PanelRect[] | null {
  if (n < 2) return null;
  const heroW = 0.56;
  const rest = n - 1;
  const gh = GUTTER;
  const cellH = (1 - gh * (rest - 1)) / rest;
  const heroX = side === 'left' ? 0 : 1 - heroW;
  const stackX = side === 'left' ? heroW + GUTTER : 0;
  const rects: PanelRect[] = [mapToSafe(safe, heroX, 0, heroW, 1)];
  for (let i = 0; i < rest; i++) {
    rects.push(mapToSafe(safe, stackX, i * (cellH + gh), 1 - heroW - GUTTER, cellH));
  }
  return rects;
}

function lShape(safe: LayoutSafeRegion): PanelRect[] {
  return [
    mapToSafe(safe, 0, 0, 0.62, 0.62),
    mapToSafe(safe, 0.64, 0, 0.36, 0.3),
    mapToSafe(safe, 0.64, 0.32, 0.36, 0.3),
    mapToSafe(safe, 0, 0.64, 1, 0.36),
  ];
}

function tShape(safe: LayoutSafeRegion): PanelRect[] {
  return [
    mapToSafe(safe, 0, 0, 0.32, 0.46),
    mapToSafe(safe, 0.34, 0, 0.32, 0.46),
    mapToSafe(safe, 0.68, 0, 0.32, 0.46),
    mapToSafe(safe, 0.2, 0.48, 0.6, 0.22),
    mapToSafe(safe, 0.2, 0.72, 0.6, 0.28),
  ];
}

function mosaicColumns(safe: LayoutSafeRegion, n: number): PanelRect[] | null {
  if (n < 3) return null;
  const cols = 3;
  const colW = (1 - GUTTER * (cols - 1)) / cols;
  const heights = [0.34, 0.28, 0.22, 0.16];
  const colPanels: PanelRect[][] = [[], [], []];
  const colHeights = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const h = heights[colPanels[col]!.length % heights.length]!;
    colPanels[col]!.push(panel(0, 0, colW, h));
    colHeights[col] = (colHeights[col] ?? 0) + h;
  }
  const scale = colHeights.map((total, col) => {
    const available = 1 - GUTTER * Math.max(0, colPanels[col]!.length - 1);
    return total > 0 ? available / total : 1;
  });
  const rects: PanelRect[] = [];
  for (let col = 0; col < cols; col++) {
    let y = 0;
    for (let i = 0; i < colPanels[col]!.length; i++) {
      const raw = colPanels[col]![i]!;
      const h = raw.height * scale[col]!;
      rects.push(mapToSafe(safe, col * (colW + GUTTER), y, colW, h));
      y += h + GUTTER;
    }
  }
  return rects;
}

/** Four panels sliced by crossing diagonals with gutters at the center seam. */
function diagonalSliceGrid(safe: LayoutSafeRegion, n: number): PanelRect[] | null {
  if (n < 4) return null;
  const gw = GUTTER;
  const gh = GUTTER;
  const cellW = (1 - gw) / 2;
  const cellH = (1 - gh) / 2;
  const inset = 0.1;
  const rects: PanelRect[] = [
    mapToSafe(safe, 0, 0, cellW, cellH, {
      clip: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1 - inset, y: 1 - inset },
        { x: 0, y: 1 },
      ],
    }),
    mapToSafe(safe, cellW + gw, 0, cellW, cellH, {
      clip: [
        { x: inset, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 - inset },
      ],
    }),
    mapToSafe(safe, 0, cellH + gh, cellW, cellH, {
      clip: [
        { x: 0, y: inset },
        { x: 1 - inset, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    }),
    mapToSafe(safe, cellW + gw, cellH + gh, cellW, cellH, {
      clip: [
        { x: 0, y: 0 },
        { x: 1, y: inset },
        { x: 1, y: 1 },
        { x: inset, y: 1 },
      ],
    }),
  ];
  if (n === 4) return rects;
  return null;
}

/** Classic inverted-triangle of equal circles. */
function circleTrio(safe: LayoutSafeRegion): PanelRect[] {
  const d = 0.4;
  return [
    mapToSafe(safe, 0.5 - d / 2, 0.04, d, d, { shape: 'circle' }),
    mapToSafe(safe, 0.06, 0.5, d, d, { shape: 'circle' }),
    mapToSafe(safe, 0.94 - d, 0.5, d, d, { shape: 'circle' }),
  ];
}

/** Large hero circle + two smaller satellites (asymmetric sizes). */
function circleTrioAsymmetric(safe: LayoutSafeRegion): PanelRect[] {
  const big = 0.52;
  const small = 0.3;
  return [
    mapToSafe(safe, 0.04, 0.08, big, big, { shape: 'circle' }),
    mapToSafe(safe, 0.62, 0.08, small, small, { shape: 'circle' }),
    mapToSafe(safe, 0.58, 0.52, small + 0.06, small + 0.06, { shape: 'circle' }),
  ];
}

/** Vertical stack of unequal circles. */
function circleTrioStack(safe: LayoutSafeRegion): PanelRect[] {
  return [
    mapToSafe(safe, 0.22, 0.02, 0.56, 0.32, { shape: 'circle' }),
    mapToSafe(safe, 0.12, 0.34, 0.76, 0.34, { shape: 'circle' }),
    mapToSafe(safe, 0.28, 0.68, 0.44, 0.3, { shape: 'circle' }),
  ];
}

function circleQuartet(safe: LayoutSafeRegion): PanelRect[] {
  const d = 0.36;
  return [
    mapToSafe(safe, 0.5 - d / 2, 0.05, d, d, { shape: 'circle' }),
    mapToSafe(safe, 0.04, 0.36, d, d, { shape: 'circle' }),
    mapToSafe(safe, 0.96 - d, 0.36, d, d, { shape: 'circle' }),
    mapToSafe(safe, 0.5 - d / 2, 0.64, d, d, { shape: 'circle' }),
  ];
}

/** 2×2 of mixed circle sizes (experimental). */
function circleQuartetMixed(safe: LayoutSafeRegion): PanelRect[] {
  return [
    mapToSafe(safe, 0.02, 0.02, 0.48, 0.48, { shape: 'circle' }),
    mapToSafe(safe, 0.58, 0.06, 0.36, 0.36, { shape: 'circle' }),
    mapToSafe(safe, 0.08, 0.56, 0.34, 0.34, { shape: 'circle' }),
    mapToSafe(safe, 0.48, 0.48, 0.5, 0.5, { shape: 'circle' }),
  ];
}

function slantRow(safe: LayoutSafeRegion, n: number): PanelRect[] | null {
  if (n < 3) return null;
  // Extra gutter so inset parallelograms keep a clear ink gap between panels.
  const gw = Math.max(GUTTER, 0.028);
  const cellW = (1 - gw * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) =>
    mapToSafe(safe, i * (cellW + gw), 0, cellW, 1, {
      shape: 'parallelogram',
      diagonalBias: i % 2 === 0 ? 0.14 : -0.14,
    }),
  );
}

function slantColumn(safe: LayoutSafeRegion, n: number): PanelRect[] | null {
  if (n < 3) return null;
  const gh = Math.max(GUTTER, 0.028);
  const cellH = (1 - gh * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) =>
    mapToSafe(safe, 0, i * (cellH + gh), 1, cellH, {
      shape: 'parallelogram',
      diagonalBias: i % 2 === 0 ? 0.12 : -0.12,
    }),
  );
}

function diagonalSlash(safe: LayoutSafeRegion, n: number): PanelRect[] | null {
  if (n !== 2) return null;
  return [
    mapToSafe(safe, 0, 0, 1, 1, { shape: 'diagonal-split-tl' }),
    mapToSafe(safe, 0, 0, 1, 1, { shape: 'diagonal-split-br' }),
  ];
}

function angularStack(safe: LayoutSafeRegion, n: number): PanelRect[] | null {
  if (n < 3) return null;
  const gh = GUTTER;
  const cellH = (1 - gh * (n - 1)) / n;
  const shapes: PanelShapeId[] = ['trapezoid-top-narrow', 'rect', 'trapezoid-bottom-narrow'];
  return Array.from({ length: n }, (_, i) =>
    mapToSafe(safe, 0, i * (cellH + gh), 1, cellH, {
      shape: shapes[i % shapes.length],
      diagonalBias: 0.12,
    }),
  );
}

function wedgePinwheel(safe: LayoutSafeRegion): PanelRect[] {
  return [
    mapToSafe(safe, 0.18, 0.18, 0.64, 0.64, { shape: 'pentagon' }),
    mapToSafe(safe, 0, 0, 0.42, 0.42, { shape: 'triangle-left' }),
    mapToSafe(safe, 0.58, 0, 0.42, 0.42, { shape: 'triangle-up' }),
    mapToSafe(safe, 0.58, 0.58, 0.42, 0.42, { shape: 'triangle-right' }),
    mapToSafe(safe, 0, 0.58, 0.42, 0.42, { shape: 'triangle-down' }),
  ];
}

function pinwheel(safe: LayoutSafeRegion): PanelRect[] {
  return [
    mapToSafe(safe, 0, 0, 0.52, 0.52),
    mapToSafe(safe, 0.54, 0, 0.46, 0.34),
    mapToSafe(safe, 0.54, 0.36, 0.46, 0.3),
    mapToSafe(safe, 0, 0.54, 0.34, 0.46),
    mapToSafe(safe, 0.36, 0.54, 0.64, 0.46),
  ];
}

/** Explicit full-bleed hero — only when allowFullBleed is set. */
function fullBleedHero(safe: LayoutSafeRegion, n: number): PanelRect[] | null {
  if (n < 2) return null;
  const heroH = 0.52;
  const rest = n - 1;
  const cols = Math.min(rest, 3);
  const gw = GUTTER;
  const gh = GUTTER;
  const rows = Math.ceil(rest / cols);
  const cellW = (1 - gw * (cols - 1)) / cols;
  const cellH = (1 - heroH - gh - gh * (rows - 1)) / rows;
  const rects: PanelRect[] = [
    panel(0, 0, 1, safe.y + heroH * safe.height, { bleedMode: 'full-bleed' }),
  ];
  let placed = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols && placed < rest; c++) {
      rects.push(
        mapToSafe(safe, c * (cellW + gw), heroH + gh + r * (cellH + gh), cellW, cellH),
      );
      placed++;
    }
  }
  return rects;
}

function openBleed(safe: LayoutSafeRegion, n: number): PanelRect[] | null {
  if (n < 2) return null;
  const insetRects = buildUniformGrid(safe, Math.min(n - 1, 2), Math.ceil((n - 1) / 2)).map((r) =>
    panel(
      safe.x + r.x * 0.64 + safe.width * 0.34,
      safe.y + r.y * 0.58,
      r.width * 0.64,
      r.height * 0.58,
    ),
  );
  return [panel(0, 0, safe.x + safe.width * 0.38, 1, { bleedMode: 'full-bleed' }), ...insetRects.slice(0, n - 1)];
}

function finalize(
  id: string,
  label: string,
  heuristic: LayoutHeuristicId,
  conventionality: number,
  panels: PanelRect[],
): GeneratedPanelLayout {
  return {
    id,
    label,
    heuristic,
    conventionality,
    panels,
    readingOrder: readingOrderForPanels(panels),
    gutter: GUTTER,
  };
}

export function generateLayoutsForPanelCount(
  panelCount: number,
  options?: LayoutGenerateOptions,
): GeneratedPanelLayout[] {
  const n = Math.max(1, Math.min(12, Math.round(panelCount)));
  const maxResults = options?.maxResults ?? 24;
  const allowFullBleed = options?.allowFullBleed ?? false;
  const safe = getLayoutSafeRegion(options?.printSpec);
  const candidates: GeneratedPanelLayout[] = [];

  for (const { cols, rows } of gridFactorPairs(n)) {
    const panels = buildUniformGrid(safe, cols, rows);
    candidates.push(
      finalize(
        `grid-${cols}x${rows}-${n}`,
        cols === 1 ? `${n} stack` : rows === 1 ? `${n} strip` : `${cols}×${rows} grid`,
        'uniform-grid',
        gridConventionality(cols, rows, n),
        panels,
      ),
    );
  }

  if (n > 1) {
    candidates.push(
      finalize(
        `strip-h-${n}`,
        `${n} horizontal strip`,
        'horizontal-strip',
        n <= 4 ? 0.68 : Math.max(0.1, 0.52 - (n - 4) * 0.08),
        horizontalStrip(safe, n),
      ),
    );
    candidates.push(
      finalize(
        `strip-v-${n}`,
        `${n} vertical stack`,
        'vertical-stack',
        n <= 4 ? 0.48 : Math.max(0.1, 0.4 - (n - 4) * 0.06),
        verticalStack(safe, n),
      ),
    );
  }

  const top = splashTop(safe, n);
  if (top) {
    candidates.push(finalize(`splash-top-${n}`, 'Splash top', 'splash-top', 0.58, top));
  }
  const left = splashSide(safe, n, 'left');
  if (left) {
    candidates.push(finalize(`splash-left-${n}`, 'Splash left', 'splash-left', 0.55, left));
  }
  const right = splashSide(safe, n, 'right');
  if (right) {
    candidates.push(finalize(`splash-right-${n}`, 'Splash right', 'splash-right', 0.53, right));
  }

  if (n === 4) {
    candidates.push(finalize('l-shape-4', 'L-shape', 'l-shape', 0.62, lShape(safe)));
  }
  if (n === 5) {
    candidates.push(finalize('t-shape-5', 'T-shape', 't-shape', 0.5, tShape(safe)));
    candidates.push(finalize('pinwheel-5', 'Pinwheel', 'pinwheel', 0.28, pinwheel(safe)));
    candidates.push(finalize('wedge-pinwheel-5', 'Wedge pinwheel', 'wedge-pinwheel', 0.22, wedgePinwheel(safe)));
  }

  const mosaic = mosaicColumns(safe, n);
  if (mosaic) {
    candidates.push(finalize(`mosaic-${n}`, 'Mosaic columns', 'mosaic-columns', 0.38, mosaic));
  }

  const stagger = n === 4 ? diagonalSliceGrid(safe, n) : null;
  if (stagger) {
    candidates.push(
      finalize(`slice-${n}`, 'Diagonal slice', 'diagonal-slice', 0.26, stagger),
    );
  }

  if (n === 3) {
    candidates.push(finalize('circle-trio-3', 'Circle trio', 'circle-trio', 0.2, circleTrio(safe)));
    candidates.push(
      finalize('circle-trio-asym-3', 'Circle trio mix', 'circle-trio', 0.17, circleTrioAsymmetric(safe)),
    );
    candidates.push(
      finalize('circle-trio-stack-3', 'Circle stack', 'circle-trio', 0.16, circleTrioStack(safe)),
    );
  }
  if (n === 4) {
    candidates.push(finalize('circle-quartet-4', 'Circle quartet', 'circle-quartet', 0.18, circleQuartet(safe)));
    candidates.push(
      finalize('circle-quartet-mix-4', 'Circle mix', 'circle-quartet', 0.15, circleQuartetMixed(safe)),
    );
  }

  const slant = slantRow(safe, n);
  if (slant) {
    candidates.push(finalize(`slant-${n}`, 'Slant row', 'slant-row', 0.2, slant));
  }
  const slantCol = slantColumn(safe, n);
  if (slantCol) {
    candidates.push(finalize(`slant-col-${n}`, 'Slant column', 'slant-column', 0.18, slantCol));
  }

  const slash = diagonalSlash(safe, n);
  if (slash) {
    candidates.push(finalize(`slash-${n}`, 'Diagonal slash', 'diagonal-slash', 0.18, slash));
  }

  const angular = angularStack(safe, n);
  if (angular) {
    candidates.push(finalize(`angular-${n}`, 'Angular stack', 'angular-stack', 0.16, angular));
  }

  if (allowFullBleed) {
    const bleedHero = fullBleedHero(safe, n);
    if (bleedHero) {
      candidates.push(
        finalize(`full-bleed-hero-${n}`, 'Full bleed hero', 'full-bleed-hero', 0.14, bleedHero),
      );
    }
    const bleed = openBleed(safe, n);
    if (bleed) {
      candidates.push(finalize(`open-bleed-${n}`, 'Open bleed', 'open-bleed', 0.12, bleed));
    }
  }

  const unique = new Map<string, GeneratedPanelLayout>();
  for (const layout of candidates) {
    const key = layout.panels
      .map((p) =>
        [
          p.x.toFixed(3),
          p.y.toFixed(3),
          p.width.toFixed(3),
          p.height.toFixed(3),
          p.shape ?? 'rect',
          p.bleedMode ?? 'trim',
          p.clip?.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(';') ?? '',
        ].join(','),
      )
      .join('|');
    if (!unique.has(key)) unique.set(key, layout);
  }

  return [...unique.values()]
    .sort((a, b) => b.conventionality - a.conventionality)
    .slice(0, maxResults);
}

export function defaultGeneratedLayout(
  panelCount: number,
  options?: LayoutGenerateOptions,
): GeneratedPanelLayout {
  return generateLayoutsForPanelCount(panelCount, options)[0]!;
}
