/**
 * Shared piano shortcut semantics for advancing without clicking (session
 * boundary, stuck modal dismiss, etc.). Matches home "Practice now" behavior:
 * same pitch twice with a note-off between taps, within a fixed window.
 */
/** Mic note-off can trail the second strike; keep the pair inside one window. */
export const PIANO_ADVANCE_DOUBLE_MS = 620;

/** Tooltip for primary advance CTAs (Space/Enter once; piano double-tap). */
export const PIANO_ADVANCE_BUTTON_TOOLTIP =
  'Press Space / Enter or tap the same piano key twice (like a double click) to advance without clicking.';

export type PianoDoubleTapArm = { note: number; perfMs: number; released: boolean } | null;

/**
 * One step of the double-tap detector. Call on each MIDI/mic note on/off.
 * - First `on`: arms `{ note, perfMs, released: false }`.
 * - Matching `off`: sets `released: true`.
 * - Second `on` (same note, released, within window): `complete`.
 * - Duplicate `on` before `off`: arm unchanged.
 */
export function applyPianoDoubleTapStep(
  arm: PianoDoubleTapArm,
  kind: 'on' | 'off',
  note: number,
  perfMs: number,
): { complete: boolean; next: PianoDoubleTapArm } {
  if (kind === 'off') {
    if (arm !== null && arm.note === note && !arm.released) {
      // Anchor the double-tap window to release time so a long first hold
      // does not expire the gesture before the second press.
      return { complete: false, next: { ...arm, released: true, perfMs } };
    }
    return { complete: false, next: arm };
  }

  let nextArm = arm;
  if (nextArm !== null && perfMs - nextArm.perfMs > PIANO_ADVANCE_DOUBLE_MS) {
    nextArm = null;
  }

  if (
    nextArm !== null
    && nextArm.note === note
    && nextArm.released
    && perfMs - nextArm.perfMs <= PIANO_ADVANCE_DOUBLE_MS
  ) {
    return { complete: true, next: null };
  }

  if (nextArm !== null && nextArm.note === note && !nextArm.released) {
    return { complete: false, next: nextArm };
  }

  return { complete: false, next: { note, perfMs, released: false } };
}
