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

/** Page-level cast member (emoji character). Growable beyond three. */
export interface ComicCastMember {
  id: string;
  emoji: string;
  label?: string;
}

/**
 * Character arrangement ids — filtered by speaker count (1–3).
 * Scrapboard uses these instead of procedural scenery compositions.
 */
export const CHARACTER_ARRANGEMENT_IDS = [
  'closeup',
  'medium',
  'full-center',
  'full-left',
  'small-distant',
  'facing',
  'side-by-side',
  'over-shoulder',
  'staggered',
  'trio-row',
  'triangle',
  'two-plus-one',
] as const;

export type CharacterArrangementId = (typeof CHARACTER_ARRANGEMENT_IDS)[number];

export interface PanelTextOverlay {
  kind: PanelTextKind;
  content?: string;
}

export interface PanelDialogueBlock {
  kind: 'dialogue';
  /** Placement slot within the panel (index into speakerIds → a/b/c). */
  characterId: PanelCharacterId;
  /** Page cast member this line belongs to (preferred over slot alone). */
  castMemberId?: string;
  content: string;
}

export interface PanelCaptionBlock {
  kind: 'caption';
  content: string;
  /** @deprecated Ignored — use blocks array order. Kept for legacy saved boards. */
  placement?: 'before' | 'after';
}

export const SFX_LOUDNESS_LEVELS = ['quiet', 'normal', 'loud'] as const;
export type SfxLoudness = (typeof SFX_LOUDNESS_LEVELS)[number];

export interface PanelSfxBlock {
  kind: 'sfx';
  content: string;
  /** Visual “volume” — scales type and fun FX. Default `normal`. */
  loudness?: SfxLoudness;
}

export type PanelTextBlock = PanelDialogueBlock | PanelCaptionBlock | PanelSfxBlock;

/** A user-picked photo (e.g. Wikimedia Commons) used as a panel or page background wash. */
export interface PanelBackgroundImage {
  url: string;
  /** Optional preview URL (e.g. Wikimedia thumb) for compact field triggers. */
  thumbUrl?: string;
  title?: string;
  license?: string;
}

export interface PanelFillSpec {
  panelIndex: number;
  composition?: PanelCompositionId;
  /** Ordered cast members present in this panel (1–3). Scrapboard character-first. */
  speakerIds?: string[];
  /** Character arrangement for speakerIds.length; preferred over scenery composition. */
  arrangement?: CharacterArrangementId;
  /** Ordered text blocks — captions, dialogue, and SFX in one panel. */
  blocks?: PanelTextBlock[];
  text?: PanelTextOverlay;
  /** @deprecated Use `composition`. Kept for Lyrefly Thumbs embed. */
  kind?: PanelFillKind;
  poseId?: string;
  noteText?: string;
  /** Photo fill for this panel, palette-tinted (duotone) rather than composited literally. */
  backgroundImage?: PanelBackgroundImage;
  /** Story-generation continuity: panels sharing a sceneId reuse one photo when possible. */
  sceneId?: string;
  /** Preferred Wikimedia query for this panel’s background (keyword bias, not vision match). */
  photoQuery?: string;
}

export interface PageMockupSpec {
  layout: PanelLayoutSpec;
  fills: PanelFillSpec[];
  /** Growable page cast (emoji characters). */
  cast?: ComicCastMember[];
  paletteId?: string;
  /** Photo shown through panel gutters/page background, palette-tinted. */
  pageBackgroundImage?: PanelBackgroundImage;
}

export interface ComicBoardDocument {
  id: string;
  title: string;
  mockup: PageMockupSpec;
  paletteJson?: string;
  updatedAt: string;
  createdAt: string;
}
