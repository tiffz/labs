export type {
  PanelLayoutPresetId,
  PanelRect,
  PanelLayoutSpec,
  PanelFillKind,
  PanelFillSpec,
  PanelCompositionId,
  PanelTextKind,
  PanelTextOverlay,
  PanelCharacterId,
  ComicCastMember,
  CharacterArrangementId,
  PanelDialogueBlock,
  PanelCaptionBlock,
  PanelSfxBlock,
  PanelTextBlock,
  SfxLoudness,
  PanelShapeId,
  PanelBleedMode,
  PanelClipPoint,
  PanelBackgroundImage,
  PageMockupSpec,
  ComicBoardDocument,
} from './types';
export { duotoneComponentTables, softPhotoDuotoneTables, softEmojiWashTables } from './duotoneFilter';
export {
  PANEL_COMPOSITION_IDS,
  PANEL_CHARACTER_IDS,
  CHARACTER_ARRANGEMENT_IDS,
  SFX_LOUDNESS_LEVELS,
} from './types';
export {
  CHARACTER_ARRANGEMENTS,
  arrangementsForSpeakerCount,
  defaultArrangementForCount,
  markerPlacementFromArrangement,
  type ArrangementDef,
  type ArrangementSlot,
  type MarkerPlacement,
} from './characterArrangements';
export {
  createDefaultCast,
  newCastMemberId,
  defaultFillForPanel,
  resolvePanelSpeakerIds,
  resolvePanelArrangement,
  normalizeDialogueBlocks,
  castMemberById,
  slotForSpeakerIndex,
  DEFAULT_CAST_EMOJIS,
} from './comicCast';
export {
  normalizeSfxLoudness,
  sfxLoudnessFontScale,
  sfxBaseFontSize,
  sfxRenderStyle,
} from './sfxLoudness';
export {
  adaptBlocksToPanelBudget,
  maxDialogueBlocksForPanel,
  MIN_PANEL_TEXT_WIDTH,
  MIN_PANEL_DIALOGUE_WIDTH,
  MIN_PANEL_CAPTION_WIDTH,
} from './speechBubbleSlotLayout';
export { bubblesTailsOverlap, anyBubbleTailsOverlap } from './speechBubbleTailOverlap';
export {
  PANEL_LAYOUT_PRESETS,
  buildPanelLayout,
  defaultFillsForLayout,
  validateReadingOrder,
} from './layoutPresets';
export {
  generateLayoutsForPanelCount,
  defaultGeneratedLayout,
  type GeneratedPanelLayout,
  type LayoutHeuristicId,
  type LayoutGenerateOptions,
} from './layoutGenerate';
export { getLayoutSafeInsets, getLayoutSafeRegion } from './panelLayoutRegion';
export { readingOrderForPanels } from './panelReadingOrder';
export { resolvePanelClip, panelPixelBounds, panelSvgPointsAttr, panelCircleClipAttrs } from './panelClipPath';
export {
  PANEL_COMPOSITION_LABELS,
  RANDOM_COMPOSITION_POOL,
  randomCompositionId,
  randomCompositionsForPanels,
} from './mockupCompositionCatalog';
export { renderMockupComposition } from './mockupCompositions';
export { resolvePanelComposition, resolvePanelText, resolvePanelTextBlocks, normalizePanelFill } from './panelFillResolve';
export { layoutPanelTextBlocks } from './speechBubbleLayout';
export { validatePanelTextLayout } from './panelTextLayoutInvariants';
export type { LayoutViolation, LayoutViolationCode } from './panelTextLayoutInvariants';
export { STICK_POSE_IDS, stickFigureSvg, silhouetteSvg, type StickPoseId } from './stickFigures';
export { PanelMockupSvg } from './PanelMockupSvg';
export { mockupDimensionsForPrintSpec } from './panelMockupDimensions';
export { MockupFitCanvas, type MockupFitCanvasProps } from './MockupFitCanvas';
