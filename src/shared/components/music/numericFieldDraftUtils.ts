/**
 * Parse what the user typed into a numeric field. Blank or unparseable is an ABSENCE, never a value.
 *
 * `Number('')` is `0`, not `NaN`, so the obvious `Number.isFinite(Number(draft))` guard accepts an
 * empty box and commits zero — which then clamps to the field minimum. Clearing the Encore/Stanza
 * BPM box and tabbing away silently set the tempo to 20 BPM, and the only way to change 100 to 200
 * was to overwrite the first digit in place rather than select-all-and-retype.
 *
 * Callers restore their current value on `null`.
 */
export function parseNumericFieldDraft(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
