/**
 * Shared props for compact inline drum editing (playback settings panels, sidebars).
 * Spread onto {@link DrumAccompaniment} so randomize controls, symbol scale, and
 * notation height stay consistent everywhere we embed the inline drum UX.
 */
export const INLINE_DRUM_PANEL_UX = {
  showRandomizeButtons: true,
  hidePatternInput: true,
  audioEnabled: false,
  hideDarbukaLink: true,
  notationHeight: 72,
  drumSymbolScale: 0.68,
} as const;
