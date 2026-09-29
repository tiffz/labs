/**
 * The shorthand every family file writes its scales in, and the two source
 * roots every musical claim cites.
 *
 * Split out when the catalogue became one file per family: these were defined
 * beside the data, and nine copies of `const n = ...` is nine chances for one
 * of them to drift.
 */
import type { MaqamScaleDegree } from './maqamPresets';

/** Reference for every musical claim about a jins in this file. */
export const MAQAM_WORLD_JINS = 'https://www.maqamworld.com/en/jins/';
export const MAQAM_WORLD_MAQAM = 'https://www.maqamworld.com/en/maqam/';

export const n = (letter: MaqamScaleDegree['letter'], octaveOffset = 0): MaqamScaleDegree => ({
  letter,
  accidental: 'n',
  octaveOffset,
});
export const halfFlat = (
  letter: MaqamScaleDegree['letter'],
  octaveOffset = 0,
): MaqamScaleDegree => ({ letter, accidental: 'd', octaveOffset });
export const flat = (letter: MaqamScaleDegree['letter'], octaveOffset = 0): MaqamScaleDegree => ({
  letter,
  accidental: 'b',
  octaveOffset,
});
export const sharp = (letter: MaqamScaleDegree['letter'], octaveOffset = 0): MaqamScaleDegree => ({
  letter,
  accidental: '#',
  octaveOffset,
});
