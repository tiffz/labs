/** Format seconds as m:ss for timeline transport labels. */
export function formatStanzaTimelineClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const STANZA_TIMELINE_SELECTION_SPAN_WASH = 'rgba(232, 72, 160, 0.16)';

/** Help text for the timeline (i) icon — see docs/USER_COPY_STYLE.md. */
export const STANZA_TIMELINE_BAR_HELP =
  'Drag the bar or playhead to scrub. Click a section to jump there. Shift+click extends the selection across sections. ' +
  'The light pink fill is your selection span: pad and nudge it without touching markers. ' +
  'Loop icons play once, loop the whole song, or loop the selection.';

export const STANZA_TIMELINE_HOVER_CLOSE_MS = 220;
