import type { ChordStylingStrategy } from './chordTypes';
import { CHORD_STYLING_PATTERNS } from './chordStylingPatterns';

export type ChordStyleId = ChordStylingStrategy;

export interface ChordStyleOption {
  id: ChordStyleId;
  label: string;
  description: string;
  timeSignature?: { numerator: number; denominator: number };
}

const STYLE_ORDER: ChordStyleId[] = [
  'simple',
  'one-per-beat',
  'half-notes',
  'eighth-notes',
  'oom-pahs',
  'waltz',
  'pop-rock-ballad',
  'pop-rock-uptempo',
  'tresillo',
  'jazzy',
];

export const CHORD_STYLE_OPTIONS: ChordStyleOption[] = Object.entries(
  CHORD_STYLING_PATTERNS,
)
  .map(([id, config]) => ({
    id: id as ChordStyleId,
    label: config.name,
    description: config.description,
  }))
  .sort((a, b) => {
    const ai = STYLE_ORDER.indexOf(a.id);
    const bi = STYLE_ORDER.indexOf(b.id);
    if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
