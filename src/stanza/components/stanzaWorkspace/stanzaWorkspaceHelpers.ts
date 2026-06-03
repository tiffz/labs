import type { Theme } from '@mui/material/styles';
import type { StanzaSong, StanzaStemTrack } from '../../db/stanzaDb';

/** Drag-reorder stem rows (not OS file drops). */
export const STANZA_STEM_REORDER_MIME = 'text/x-stanza-stem-reorder';

/** Only seek stems when drift exceeds this (avoids micro-seeks that sound like jitter). */
export const STANZA_STEM_ALIGN_DRIFT_SEC = 0.32;

/** Mix rail: narrow drag / spacer so label + mute stay compact and sliders get flex space. */
export const STANZA_MIX_DRAG_COL_PX = 22;

/** Main row trailing spacer. balances stem “remove” IconButton column for slider alignment. */
export const STANZA_MIX_TRAIL_BALANCE_PX = 32;

/** Cap layer name width so the Slider can grow on dense practice rails. */
export const STANZA_MIX_LABEL_MAX_WIDTH = '6.75rem';

export function reorderStemsById(stems: StanzaStemTrack[], fromId: string, toId: string): StanzaStemTrack[] {
  const list = [...stems];
  const from = list.findIndex((s) => s.id === fromId);
  const to = list.findIndex((s) => s.id === toId);
  if (from < 0 || to < 0 || from === to) return stems;
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);
  return list;
}

export function stanzaMixTrackLabelSurfaceSx(theme: Theme) {
  return {
    fontFamily: theme.typography.fontFamily,
    fontSize: '0.6875rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '0.01em',
    color: theme.palette.text.primary,
  };
}

export function songHasPractice(s: StanzaSong): boolean {
  return (s.markers?.length ?? 0) > 0 || Object.keys(s.stats ?? {}).length > 0;
}

export function describeYoutubePlayerError(code: number): string {
  if (code === 101 || code === 150) {
    return 'This video cannot be played inside Stanza because the publisher has disabled embedding on other sites.';
  }
  if (code === 100) {
    return 'This video is unavailable (removed, private, or not found).';
  }
  if (code === 5) {
    return 'YouTube reported a playback error in the embedded player.';
  }
  if (code === 2) {
    return 'YouTube reported invalid playback parameters.';
  }
  return `YouTube reported playback error ${code}.`;
}
