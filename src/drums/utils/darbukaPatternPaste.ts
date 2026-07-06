import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import type { TimeSignature } from '../types';

const DARBUKA_PATTERN = /^[DTK._-]+$/i;

export function normalizePastedDarbukaPattern(text: string): string {
  return text.replace(/[\s\n\r]/g, '').toUpperCase();
}

/** True when clipboard text is valid Darbuka notation for the current meter. */
export function isPasteableDarbukaPattern(text: string, timeSignature: TimeSignature): boolean {
  const cleaned = normalizePastedDarbukaPattern(text);
  if (!cleaned || !DARBUKA_PATTERN.test(cleaned)) return false;
  const parsed = parseRhythm(cleaned, timeSignature);
  return parsed.isValid && parsed.measures.length > 0;
}
