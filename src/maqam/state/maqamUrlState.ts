import {
  DEFAULT_MAQAM_ID,
  NEUTRAL_DETUNE_MATRIX,
  deriveDetuneMatrix,
  findMaqamPreset,
  type DetuneMatrix,
} from '../data/maqamPresets';
import {
  DEFAULT_MELODY_ID,
  GENERATED_MELODY_ID,
  findMelodyDefinition,
} from '../melody/maqamMelody';

const DEFAULT_SEED = 1;

export const MAQAM_PARAM = 'maqam';
export const TUNING_PARAM = 'tuning';
export const MELODY_PARAM = 'melody';
export const SEED_PARAM = 'seed';

export interface MaqamUrlState {
  presetId: string;
  matrix: DetuneMatrix;
  /** Which pattern is loaded, or the generated-phrase sentinel. */
  melodyId: string;
  /** Seed for the generated phrase, so a good one survives a reload. */
  melodySeed: number;
}

/**
 * A custom tuning is encoded as twelve characters, one per pitch class:
 * `-` for equal temperament, `d` for a half-flat. Compact enough to stay
 * readable in a shared link, and self-describing enough that a truncated or
 * hand-edited value is rejected rather than half-applied.
 */
const EQUAL = '-';
const HALF_FLAT = 'd';

export function encodeTuning(matrix: DetuneMatrix): string {
  return Array.from({ length: 12 }, (_, i) => (matrix[i] === -50 ? HALF_FLAT : EQUAL)).join('');
}

/**
 * Returns `null` — not a neutral matrix — for anything unparseable. A link with
 * a corrupt tuning must fall back to the named maqam's own tuning, which is a
 * visibly correct state, rather than to twelve equal-tempered keys, which looks
 * like a deliberate "no microtones" choice the user never made.
 */
export function decodeTuning(encoded: string | null | undefined): DetuneMatrix | null {
  if (!encoded || encoded.length !== 12) return null;
  const matrix = new Array<number>(12).fill(0);
  for (let i = 0; i < 12; i += 1) {
    const char = encoded[i];
    if (char === EQUAL) continue;
    if (char === HALF_FLAT) {
      matrix[i] = -50;
      continue;
    }
    return null;
  }
  return matrix;
}

/**
 * Read the opening state from a URL. An unknown maqam id falls back to the
 * default preset, because a broken link should still open a usable playground.
 */
export function readMaqamUrlState(search: string): MaqamUrlState {
  const params = new URLSearchParams(search);
  const preset =
    findMaqamPreset(params.get(MAQAM_PARAM)) ?? findMaqamPreset(DEFAULT_MAQAM_ID);
  const presetId = preset?.id ?? DEFAULT_MAQAM_ID;
  const presetMatrix = preset
    ? deriveDetuneMatrix(preset.scaleDegrees).matrix
    : [...NEUTRAL_DETUNE_MATRIX];
  const requestedMelody = params.get(MELODY_PARAM);
  // An unknown pattern falls back to the scale rather than to an empty staff.
  const melodyId =
    requestedMelody === GENERATED_MELODY_ID || findMelodyDefinition(requestedMelody ?? '')
      ? requestedMelody!
      : DEFAULT_MELODY_ID;

  const rawSeed = Number(params.get(SEED_PARAM));
  const melodySeed =
    Number.isInteger(rawSeed) && rawSeed > 0 ? rawSeed : DEFAULT_SEED;

  return {
    presetId,
    matrix: decodeTuning(params.get(TUNING_PARAM)) ?? presetMatrix,
    melodyId,
    melodySeed,
  };
}

/**
 * Build the query string for the current state. The tuning param is omitted
 * while it still matches the preset, so an unedited link stays short and a
 * `tuning=` in the URL always means "someone changed something".
 */
export function writeMaqamUrlSearch(
  state: MaqamUrlState,
  existingSearch = '',
): string {
  const params = new URLSearchParams(existingSearch);
  params.set(MAQAM_PARAM, state.presetId);

  const preset = findMaqamPreset(state.presetId);
  const presetMatrix = preset ? deriveDetuneMatrix(preset.scaleDegrees).matrix : null;
  const isPresetTuning =
    presetMatrix !== null &&
    presetMatrix.every((cents, i) => cents === (state.matrix[i] ?? 0));

  if (isPresetTuning) params.delete(TUNING_PARAM);
  else params.set(TUNING_PARAM, encodeTuning(state.matrix));

  // Same rule as the tuning: only write what differs from the default, so a
  // plain link stays short and a param in the URL always means a choice.
  if (state.melodyId === DEFAULT_MELODY_ID) params.delete(MELODY_PARAM);
  else params.set(MELODY_PARAM, state.melodyId);

  if (state.melodyId === GENERATED_MELODY_ID) params.set(SEED_PARAM, String(state.melodySeed));
  else params.delete(SEED_PARAM);

  const query = params.toString();
  return query ? `?${query}` : '';
}
