/** Downbeat ceiling before the Mix slider (`metronomeGain`). */
export const STANZA_METRONOME_DOWNBEAT_CEILING = 0.85;

/** Off-beat level as a fraction of the downbeat ceiling (same sample, no pitch shift). */
export const STANZA_METRONOME_OFFBEAT_RATIO = 0.82;

/** Subtle pitch lift on beat 1 only — kept small so volume stays the main cue. */
export const STANZA_METRONOME_DOWNBEAT_PLAYBACK_RATE = 1.05;

export function stanzaMetronomeClickLevels(
  isDownbeat: boolean,
  userGain: number,
): { volume: number; playbackRate: number } {
  const ceiling = Math.min(1, Math.max(0, STANZA_METRONOME_DOWNBEAT_CEILING * userGain));
  const volume = isDownbeat ? ceiling : ceiling * STANZA_METRONOME_OFFBEAT_RATIO;
  const playbackRate = isDownbeat ? STANZA_METRONOME_DOWNBEAT_PLAYBACK_RATE : 1;
  return { volume, playbackRate };
}
