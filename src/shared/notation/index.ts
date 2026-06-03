// Re-export notation utilities
export {
  sixteenthTicksToVexFlowDuration as durationToVexFlow,
  isDottedSixteenthDuration as isDottedDuration,
  isDottedSixteenthDuration,
  sixteenthTicksToVexFlowDuration,
  vexFlowDurationToBeats,
} from './vexFlowDuration';
export {
  setSvgElementColor,
  paintSvgDescendants,
  setVexFlowNoteGroupColor,
  syncKeyedSvgHighlights,
  reapplyActiveKeyHighlight,
} from './playbackSvgHighlight';
export type { KeyedHighlightSyncOptions, SvgColorFillMode } from './playbackSvgHighlight';
export { drawDrumSymbol, getDrumSymbolChar } from './drumSymbols';
export { default as DrumNotationMini } from './DrumNotationMini';
export { NOTATION_STYLES, resolveNotationStyle, computeMiniNotationLayout, estimateMiniNotationRenderWidth, readMiniNotationNoteheadBounds, resolveMiniDrumSymbolDrawY, resolveMiniDrumSymbolScale, resolveMiniDrumSymbolYOffset } from './DrumNotationMini';
export type { NotationStyle, NotationStyleInput } from './DrumNotationMini';
export {
  RhythmTemplateVariationControls,
  type RhythmTemplateVariationControlsProps,
} from './RhythmTemplateVariationControls';
