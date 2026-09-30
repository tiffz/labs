import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * ONE COLOUR, ONE MEANING.
 *
 * `--maqam-jins-2` shipped as `#b4400c`, which is also `--m3-primary`,
 * `--maqam-tonic` and `--maqam-staff-lit`. So pointing at the second cell of a
 * maqam painted its degrees in the exact ink that means "this note is home",
 * and the reader had no way to tell "in this jins" from "the tonic". It was
 * reported as the jins highlighting overlapping the tonic highlighting, and it
 * was not a near miss: the two were the same colour.
 *
 * Nothing caught it because nothing was comparing the app's colours to each
 * other. Every existing colour guard measures a foreground against its own
 * background — contrast, legibility — which is a different question from "do
 * two things that mean different things look different".
 *
 * Distances are CIE76 dE in CIELAB, which is a perceptual space: dE under ~10
 * is a shade, ~25 is a noticeably different colour, and 50+ is unmistakable.
 * The floor here is deliberately well above "technically distinguishable",
 * because these are small marks — a numeral inside a chip, a bracket a few
 * pixels thick — seen at a glance and never side by side.
 */

const css = readFileSync(
  fileURLToPath(new URL('./maqam.css', import.meta.url)),
  'utf8',
);

/** Read a literal hex custom property out of the stylesheet. */
function token(name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!match) {
    throw new Error(
      `${name} is not defined as a literal hex in maqam.css. If it became a ` +
        'var() reference, resolve it here rather than deleting the assertion.',
    );
  }
  return match[1];
}

function toLab(hex: string): [number, number, number] {
  const channel = (value: number) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * Colours that already carry a meaning a cell tone must never be mistaken for.
 *
 * `--maqam-tonic` is a `var()` alias of `--m3-primary`, so the primary is read
 * directly — an alias would not match the hex pattern, and silently skipping
 * the one colour this test exists to check is exactly how the bug shipped.
 */
const RESERVED = {
  'the tonic': '--m3-primary',
  'a sounding note': '--maqam-staff-lit',
  'an octave echo': '--maqam-echo',
  'a thrown lever': '--m3-tertiary',
} as const;

const CELL_TONES = ['--maqam-jins-1', '--maqam-jins-2', '--maqam-jins-3'] as const;

/** Far enough apart that a glance settles it, not a side-by-side comparison. */
const MIN_AGAINST_RESERVED = 45;
const MIN_BETWEEN_CELLS = 35;

describe('one colour, one meaning', () => {
  it('reads every colour role out of the stylesheet', () => {
    // A regex that matched nothing would make every assertion below vacuous.
    for (const name of [...CELL_TONES, ...Object.values(RESERVED)]) {
      expect(token(name), name).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it.each(CELL_TONES)('%s is not mistakable for a colour that already means something', (cell) => {
    const tone = token(cell);
    for (const [meaning, reserved] of Object.entries(RESERVED)) {
      const distance = deltaE(tone, token(reserved));
      expect(
        distance,
        `${cell} (${tone}) is only dE ${distance.toFixed(1)} from ${reserved} (${token(reserved)}), ` +
          `which already means "${meaning}". Pointing at that cell would paint its degrees in ` +
          'an ink the reader has been taught to read as something else.',
      ).toBeGreaterThanOrEqual(MIN_AGAINST_RESERVED);
    }
  });

  it('keeps the cells apart from each other', () => {
    for (let i = 0; i < CELL_TONES.length; i += 1) {
      for (let j = i + 1; j < CELL_TONES.length; j += 1) {
        const [a, b] = [token(CELL_TONES[i]), token(CELL_TONES[j])];
        const distance = deltaE(a, b);
        expect(
          distance,
          `${CELL_TONES[i]} (${a}) and ${CELL_TONES[j]} (${b}) are only dE ${distance.toFixed(1)} ` +
            'apart, so two cells of one maqam would read as the same cell',
        ).toBeGreaterThanOrEqual(MIN_BETWEEN_CELLS);
      }
    }
  });
});
