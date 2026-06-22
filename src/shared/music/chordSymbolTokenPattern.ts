/**
 * Shared chord-symbol token pattern for pasted charts, ChordPro inline tokens, and export.
 * Longest quality suffixes first (sus2 before sus, maj7 before maj).
 */
const CHORD_SYMBOL_QUALITY =
  'maj7|min7|m7|maj|min|dim|aug|sus2|sus4|sus7|sus|add2|add9|9|11|13|6|\\+|7|m|M';

const CHORD_SYMBOL_BODY = `[A-G](?:#|b)?(?:${CHORD_SYMBOL_QUALITY})?(?:\\([^)]+\\))?(?:\\/[A-G](?:#|b)?)?`;

/** Anchored — validates a single chord token. */
export const CHORD_SYMBOL_TOKEN_RE = new RegExp(`^${CHORD_SYMBOL_BODY}$`);

/** Global — finds chord tokens in a chord-only line. */
export const CHORD_SYMBOL_TOKEN_GLOBAL_RE = new RegExp(CHORD_SYMBOL_BODY, 'g');

/** Case-insensitive anchored variant (two-column export). */
export const CHORD_SYMBOL_TOKEN_RE_I = new RegExp(`^${CHORD_SYMBOL_BODY}$`, 'i');
