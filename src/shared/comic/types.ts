export type PanelLayoutPresetId =
  | 'single'
  | 'strip-2'
  | 'strip-3'
  | 'grid-2x2'
  | 'grid-2x3'
  | 'grid-3x2'
  | 'l-shape'
  | 'stack-3'
  | 'diagonal-split';

export type PanelShapeId =
  | 'rect'
  | 'parallelogram'
  | 'trapezoid-top-narrow'
  | 'trapezoid-bottom-narrow'
  | 'triangle-up'
  | 'triangle-down'
  | 'triangle-left'
  | 'triangle-right'
  | 'pentagon'
  | 'diagonal-split-tl'
  | 'diagonal-split-br'
  | 'circle';

export type PanelBleedMode = 'trim' | 'full-bleed';

export interface PanelClipPoint {
  x: number;
  y: number;
}

export interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Default `trim` — panels stay in the safe layout region. */
  bleedMode?: PanelBleedMode;
  /** Procedural shape inside the bounding box. */
  shape?: PanelShapeId;
  /** Slant amount for parallelogram / trapezoid shapes (0–0.35). */
  diagonalBias?: number;
  /** Custom polygon clip (normalized 0–1 inside bbox). Overrides `shape`. */
  clip?: PanelClipPoint[];
}

export interface PanelLayoutSpec {
  /** Stable layout id (preset slug or generated id). */
  id: string;
  /** @deprecated Prefer `id`. Present on static presets. */
  presetId?: PanelLayoutPresetId;
  label?: string;
  heuristic?: string;
  /** 0 = experimental, 1 = most conventional. */
  conventionality?: number;
  panels: PanelRect[];
  readingOrder: number[];
  gutter: number;
}

export type PanelFillKind = 'empty' | 'stick' | 'silhouette' | 'note';

export const PANEL_COMPOSITION_IDS = [
  'empty',
  'big-head',
  'extreme-closeup',
  'profile',
  'back-of-head',
  'full-figure',
  'silhouette-dark',
  'silhouette-light',
  'down-shot',
  'aerial',
  'depth',
  'reflection',
  'side-light',
  'big-object',
  'open-panel',
  'small-figure',
  'city-scene',
  'nature-scene',
  'contrast',
  'ben-day',
  'frame',
  'three-stage',
  'horizon-scene',
] as const;

export type PanelCompositionId = (typeof PANEL_COMPOSITION_IDS)[number];

export type PanelTextKind = 'none' | 'caption' | 'dialogue' | 'sfx';

export const PANEL_CHARACTER_IDS = ['a', 'b', 'c'] as const;
export type PanelCharacterId = (typeof PANEL_CHARACTER_IDS)[number];

export interface PanelTextOverlay {
  kind: PanelTextKind;
  content?: string;
}

export interface PanelDialogueBlock {
  kind: 'dialogue';
  characterId: PanelCharacterId;
  content: string;
}

export interface PanelCaptionBlock {
  kind: 'caption';
  content: string;
  /** @deprecated Ignored — use blocks array order. Kept for legacy saved boards. */
  placement?: 'before' | 'after';
}

export interface PanelSfxBlock {
  kind: 'sfx';
  content: string;
}

export type PanelTextBlock = PanelDialogueBlock | PanelCaptionBlock | PanelSfxBlock;

export interface PanelFillSpec {
  panelIndex: number;
  composition?: PanelCompositionId;
  /** Ordered text blocks — captions, dialogue, and SFX in one panel. */
  blocks?: PanelTextBlock[];
  text?: PanelTextOverlay;
  /** @deprecated Use `composition`. Kept for Lyrefly Thumbs embed. */
  kind?: PanelFillKind;
  poseId?: string;
  noteText?: string;
}

export interface PageMockupSpec {
  layout: PanelLayoutSpec;
  fills: PanelFillSpec[];
  paletteId?: string;
}

export interface ComicBoardDocument {
  id: string;
  title: string;
  mockup: PageMockupSpec;
  paletteJson?: string;
  updatedAt: string;
  createdAt: string;
}
