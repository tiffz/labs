import { FULL_STRUCTURAL_BLUEPRINT, INSTRUMENTAL_STRUCTURAL_BLUEPRINT } from './originalsStructurePresets';
import type { EncoreOriginalSong } from './types';

/**
 * Turn "Instrumental (no lyrics)" on or off.
 *
 * Swaps the chart's outline only while it is the untouched default for the other kind: a new song's
 * Verse/Chorus scaffold becomes Intro/Theme/Solo/Outro, and back. A chart with any writing in it is
 * never changed, so toggling can't cost the user work.
 */
export function instrumentalTogglePatch(
  song: Pick<EncoreOriginalSong, 'instrumental' | 'lyricsAndChords'>,
): Partial<EncoreOriginalSong> {
  const next = !song.instrumental;
  const chart = song.lyricsAndChords.trim();
  const from = (next ? FULL_STRUCTURAL_BLUEPRINT : INSTRUMENTAL_STRUCTURAL_BLUEPRINT).trim();
  const to = next ? INSTRUMENTAL_STRUCTURAL_BLUEPRINT : FULL_STRUCTURAL_BLUEPRINT;
  const patch: Partial<EncoreOriginalSong> = { instrumental: next };
  if (!chart || chart === from) patch.lyricsAndChords = to;
  return patch;
}
