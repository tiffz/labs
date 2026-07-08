import type { DerivedSegment } from './segments';
import type { StanzaPlaybackLoopMode } from './stanzaPlaybackLoop';
import { resolvePlayableWindowAnchors, type SkippedSegmentSet } from './stanzaSkippedSections';
import type { StanzaSelectionSpan } from './stanzaTransportLoop';

/**
 * User-facing playback focus: loop chip + optional pink selection span.
 * Transport, skip buttons, and playhead clamping should derive behavior from this
 * (via {@link resolveEffectiveStanzaLoopMode}) instead of reading `loopMode` alone.
 */
export type StanzaPlaybackFocus = {
  loopMode: StanzaPlaybackLoopMode;
  selectionSpan: StanzaSelectionSpan | null;
};

/** Loop selection requires an active span; otherwise treat as play-through. */
export function resolveEffectiveStanzaLoopMode(focus: StanzaPlaybackFocus): StanzaPlaybackLoopMode {
  if (focus.loopMode === 'loopSelection' && focus.selectionSpan == null) {
    return 'through';
  }
  return focus.loopMode;
}

export type StanzaSkipEdge = 'start' | 'end';

/** Where skip-to-start / skip-to-end should seek for the current focus + skip map. */
export function resolveStanzaSkipTarget(
  edge: StanzaSkipEdge,
  opts: {
    focus: StanzaPlaybackFocus;
    duration: number;
    segments: DerivedSegment[];
    skipped: SkippedSegmentSet;
  },
): number | null {
  const { focus, duration, segments, skipped } = opts;
  const effective = resolveEffectiveStanzaLoopMode(focus);

  if (effective === 'through' || effective === 'loopAll') {
    if (!(duration > 0)) return edge === 'start' ? 0 : null;
    const { start, end } = resolvePlayableWindowAnchors(segments, skipped, 0, duration);
    return edge === 'start' ? start : end;
  }

  if (effective === 'loopSelection' && focus.selectionSpan) {
    const { start, end } = resolvePlayableWindowAnchors(
      segments,
      skipped,
      focus.selectionSpan.start,
      focus.selectionSpan.end,
    );
    return edge === 'start' ? start : end;
  }

  return edge === 'start' ? 0 : null;
}
