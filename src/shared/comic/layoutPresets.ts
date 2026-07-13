import type { PanelLayoutPresetId, PanelLayoutSpec, PanelRect } from './types';
import { readingOrderForPanels } from './panelReadingOrder';

const GUTTER = 0.02;

function panel(x: number, y: number, w: number, h: number): PanelRect {
  return { x, y, width: w, height: h };
}

const LAYOUT_BUILDERS: Record<PanelLayoutPresetId, () => PanelRect[]> = {
  single: () => [panel(0, 0, 1, 1)],
  'strip-2': () => [panel(0, 0, 0.49, 1), panel(0.51, 0, 0.49, 1)],
  'strip-3': () => [
    panel(0, 0, 0.32, 1),
    panel(0.34, 0, 0.32, 1),
    panel(0.68, 0, 0.32, 1),
  ],
  'grid-2x2': () => [
    panel(0, 0, 0.49, 0.49),
    panel(0.51, 0, 0.49, 0.49),
    panel(0, 0.51, 0.49, 0.49),
    panel(0.51, 0.51, 0.49, 0.49),
  ],
  'grid-2x3': () => [
    panel(0, 0, 0.49, 0.32),
    panel(0.51, 0, 0.49, 0.32),
    panel(0, 0.34, 0.49, 0.32),
    panel(0.51, 0.34, 0.49, 0.32),
    panel(0, 0.68, 0.49, 0.32),
    panel(0.51, 0.68, 0.49, 0.32),
  ],
  'grid-3x2': () => [
    panel(0, 0, 0.32, 0.49),
    panel(0.34, 0, 0.32, 0.49),
    panel(0.68, 0, 0.32, 0.49),
    panel(0, 0.51, 0.32, 0.49),
    panel(0.34, 0.51, 0.32, 0.49),
    panel(0.68, 0.51, 0.32, 0.49),
  ],
  'l-shape': () => [
    panel(0, 0, 0.62, 0.62),
    panel(0.64, 0, 0.36, 0.3),
    panel(0.64, 0.32, 0.36, 0.3),
    panel(0, 0.64, 1, 0.36),
  ],
  'stack-3': () => [
    panel(0, 0, 1, 0.32),
    panel(0, 0.34, 1, 0.32),
    panel(0, 0.68, 1, 0.32),
  ],
  'diagonal-split': () => [
    panel(0, 0, 0.58, 0.58),
    panel(0.6, 0, 0.4, 0.38),
    panel(0, 0.6, 0.4, 0.4),
    panel(0.42, 0.62, 0.58, 0.38),
  ],
};

export const PANEL_LAYOUT_PRESETS: ReadonlyArray<{
  id: PanelLayoutPresetId;
  label: string;
  panelCount: number;
}> = [
  { id: 'single', label: '1 panel', panelCount: 1 },
  { id: 'strip-2', label: '2 strip', panelCount: 2 },
  { id: 'strip-3', label: '3 strip', panelCount: 3 },
  { id: 'grid-2x2', label: '2×2 grid', panelCount: 4 },
  { id: 'l-shape', label: 'L-shape', panelCount: 4 },
  { id: 'stack-3', label: '3 stack', panelCount: 3 },
  { id: 'diagonal-split', label: 'Diagonal split', panelCount: 4 },
  { id: 'grid-2x3', label: '2×3 grid', panelCount: 6 },
  { id: 'grid-3x2', label: '3×2 grid', panelCount: 6 },
];

export function buildPanelLayout(presetId: PanelLayoutPresetId): PanelLayoutSpec {
  const panels = LAYOUT_BUILDERS[presetId]();
  return {
    id: presetId,
    presetId,
    panels,
    readingOrder: readingOrderForPanels(panels),
    gutter: GUTTER,
  };
}

export function defaultFillsForLayout(layout: PanelLayoutSpec): import('./types').PanelFillSpec[] {
  return layout.panels.map((_, index) => ({
    panelIndex: index,
    composition: 'horizon-scene' as const,
    blocks: [],
    text: { kind: 'none' as const },
  }));
}

export function validateReadingOrder(layout: PanelLayoutSpec): string | null {
  const expected = layout.panels.length;
  if (layout.readingOrder.length !== expected) {
    return `Reading order has ${layout.readingOrder.length} entries; expected ${expected}.`;
  }
  const sorted = [...layout.readingOrder].sort((a, b) => a - b);
  for (let i = 0; i < expected; i++) {
    if (sorted[i] !== i) return 'Reading order must include each panel index once.';
  }
  return null;
}
