/**
 * Splits chord-progression paste/input on common separators while preserving
 * slash bass inside symbols (`Gm/D`, `Bbmaj7/D`).
 */

/** Multi-character separators checked before single-character splits. */
const MULTI_CHAR_SEPARATORS = ['->', '=>', '--'] as const;

/**
 * Single-character separators between chords or roman numerals.
 * Slash `/` is intentionally omitted — use spaced slash (`C / G`) instead.
 */
const SINGLE_CHAR_SEPARATOR_CLASS = '–—−,;|¦‖→⇒➜➔►»·•∙:';

const SPLIT_PATTERN = new RegExp(
  [
    '\\s*(?:',
    MULTI_CHAR_SEPARATORS.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    '|\\r?\\n',
    '|\\s+/\\s+',
    `|[${SINGLE_CHAR_SEPARATOR_CLASS}]`,
    '|\\s+-\\s+',
    '|-',
    ')\\s*',
  ].join(''),
  'g',
);

/** Split a progression string into chord or roman tokens. */
export function splitProgressionInput(input: string): string[] {
  return input
    .trim()
    .split(SPLIT_PATTERN)
    .map((token) => token.trim())
    .filter(Boolean);
}

/** Canonicalize separators to en-dash for display/export. */
export function joinProgressionTokens(tokens: readonly string[]): string {
  return tokens.join('–');
}

/** Normalize arbitrary separators to en-dash (for preset lookup / fuzzy match). */
export function normalizeProgressionSeparators(input: string): string {
  const tokens = splitProgressionInput(input);
  return tokens.length > 0 ? joinProgressionTokens(tokens) : input.trim();
}

/** Human-readable separator examples for placeholders and errors. */
export const CHORD_PROGRESSION_SEPARATOR_EXAMPLES =
  '– — - , ; | → -> => or spaced /';
