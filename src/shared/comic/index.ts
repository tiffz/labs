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
  PanelDialogueBlock,
  PanelCaptionBlock,
  PanelSfxBlock,
  PanelTextBlock,
  PanelShapeId,
  PanelBleedMode,
  PanelClipPoint,
  PageMockupSpec,
  ComicBoardDocument,
} from './types';
export { PANEL_COMPOSITION_IDS, PANEL_CHARACTER_IDS } from './types';
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
