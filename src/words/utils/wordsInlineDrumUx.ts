import { getInlineDrumUxProps } from '../../shared/components/music/inlineDrumUxDefaults';
import type { NotationStyle } from '../../shared/notation/DrumNotationMini';

/** Words hosts the rhythm template text field; DrumAccompaniment supplies presets + preview. */
export const WORDS_HOST_INPUT_DRUM_UX = getInlineDrumUxProps('settings-panel', {
  hidePatternInput: true,
  hideDarbukaLink: true,
  drumSymbolScale: 0.52,
});

export const WORDS_INLINE_DRUM_NOTATION_STYLE = {
  inkColor: '#1e293b',
  highlightColor: '#0f766e',
} as const satisfies NotationStyle;

export const WORDS_INLINE_DRUM_TEMPLATE_BUTTON_CLASS = 'words-button words-button-template';
export const WORDS_INLINE_DRUM_RANDOMIZE_BUTTON_CLASS =
  'words-button words-button-template words-button-template-icon';
