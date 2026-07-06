/** Downbeat ceiling before user gain slider. Shared from Stanza metronome UX. */
export const METRONOME_DOWNBEAT_CEILING = 0.85;
export const METRONOME_OFFBEAT_RATIO = 0.82;
export const METRONOME_DOWNBEAT_PLAYBACK_RATE = 1.05;

export function metronomeClickLevels(
  isDownbeat: boolean,
  userGain: number,
): { volume: number; playbackRate: number } {
  const ceiling = Math.min(1, Math.max(0, METRONOME_DOWNBEAT_CEILING * userGain));
  const volume = isDownbeat ? ceiling : ceiling * METRONOME_OFFBEAT_RATIO;
  const playbackRate = isDownbeat ? METRONOME_DOWNBEAT_PLAYBACK_RATE : 1;
  return { volume, playbackRate };
}
