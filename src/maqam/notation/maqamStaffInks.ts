/**
 * The colours the notation draws in.
 *
 * Its own module because both passes need it — the layout, which paints
 * each note in its resting colour, and the highlight, which lights one.
 * Neither has to import the other to reach them.
 */

const DEFAULT_HIGHLIGHT = '#1d5b82';
const INK = '#241d16';
export const BRACKET_INK = '#6f4450';

/**
 * The score's three inks, read from the app's own CSS custom properties.
 *
 * VexFlow paints with JavaScript colour strings, so a stylesheet cannot reach
 * it and every renderer in this repo has ended up with a hex literal that the
 * theme around it does not know about. Reading the tokens here means a look
 * applied to `.maqam` reaches the notation too, and there is exactly one place
 * each colour is defined.
 *
 * The literals above remain as fallbacks for a container that resolves nothing
 * — a detached node under test, or a draw that races the stylesheet.
 */
export interface StaffInks {
  ink: string;
  lit: string;
  bracket: string;
  fadedInk: string;
  jins: (tone: number) => string;
}

export function staffInks(container: HTMLElement): StaffInks {
  const read = (name: string, fallback: string) => {
    if (typeof getComputedStyle !== 'function') return fallback;
    const value = getComputedStyle(container).getPropertyValue(name).trim();
    return value || fallback;
  };
  return {
    ink: read('--maqam-staff-ink', INK),
    lit: read('--maqam-staff-lit', DEFAULT_HIGHLIGHT),
    bracket: read('--maqam-bracket-ink', BRACKET_INK),
    /* Notes outside the cell being pointed at. Quiet enough to recede, dark
       enough to still read as notation rather than as a rendering fault. */
    fadedInk: read('--m3-outline', '#8e9384'),
    /* One colour per cell, so a jins is the same colour in its chip, its
       bracket and its notes. Falls back to the bracket ink, which is the
       colour every bracket had before they were told apart. */
    jins: (tone: number) =>
      read(`--maqam-jins-${tone}`, read('--maqam-bracket-ink', BRACKET_INK)),
  };
}
