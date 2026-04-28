import type { SubdivisionGrid } from '../../shared/audio/singInTimeClock';

export interface LevelDefinition {
  id: string;
  title: string;
  description: string;
  grid: SubdivisionGrid;
  bpm: number;
  measures: number;
  /** One expected MIDI pitch per rhythmic slot. */
  baseMidis: number[];
}

function assertLength(
  grid: SubdivisionGrid,
  measures: number,
  mids: readonly number[],
  expected: number,
): void {
  if (mids.length !== expected) {
    throw new Error(`${grid} × ${measures}: expected ${expected} mids, got ${mids.length}`);
  }
}

const L1_QUARTERS_2M = 8;
const L2_EIGHTHS_2M = 16;
const L3_TRIPLET_1M = 12;
const L4_SIXTEENTH_2M = 32;
const L5_MIXED_1M = 24;

const L1: number[] = (() => {
  const pent = [60, 62, 64, 67, 69];
  const out: number[] = [];
  for (let i = 0; i < L1_QUARTERS_2M; i++) out.push(pent[i % pent.length]);
  assertLength('quarter', 2, out, L1_QUARTERS_2M);
  return out;
})();

const L2: number[] = (() => {
  const ascend = [60, 62, 64, 65, 67, 69, 71, 72];
  const down = [...ascend].slice(0, 8).reverse();
  const out = [...ascend, ...down];
  assertLength('eighth', 2, out, L2_EIGHTHS_2M);
  return out;
})();

const L3: number[] = (() => {
  const chrom = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71];
  assertLength('triplet_eighth', 1, chrom, L3_TRIPLET_1M);
  return chrom;
})();

const L4: number[] = (() => {
  const ascend = [60, 62, 64, 65, 67, 69, 71, 72];
  const oneMeasure = [...ascend, ...[...ascend].reverse()];
  const m1 = [...oneMeasure, ...oneMeasure];
  assertLength('sixteenth', 2, m1, L4_SIXTEENTH_2M);
  return m1;
})();

const L5: number[] = (() => {
  const out: number[] = [];
  const beatPat = [60, 62, 64, 65, 67, 69];
  for (let b = 0; b < 4; b++) {
    for (let p = 0; p < 6; p++) {
      out.push(beatPat[p % beatPat.length] + b);
    }
  }
  assertLength('mixed', 1, out, L5_MIXED_1M);
  return out;
})();

export const SUBDIVISION_LADDER: LevelDefinition[] = [
  {
    id: 'sit-l1',
    title: 'Level 1: Quarter drag',
    description: 'Five-note groups on quarter-note pulse. Stay relaxed and listen for the downbeat.',
    grid: 'quarter',
    bpm: 72,
    measures: 2,
    baseMidis: L1,
  },
  {
    id: 'sit-l2',
    title: 'Level 2: Eighths in major',
    description: 'Major scale fragments in eighth notes.',
    grid: 'eighth',
    bpm: 84,
    measures: 2,
    baseMidis: L2,
  },
  {
    id: 'sit-l3',
    title: 'Level 3: Triplets',
    description: 'Triplet eighth grid for a smooth, even swing feel.',
    grid: 'triplet_eighth',
    bpm: 76,
    measures: 1,
    baseMidis: L3,
  },
  {
    id: 'sit-l4',
    title: 'Level 4: Sixteenth agility',
    description: 'Sixteenth-note stream; keep the ink trace centered.',
    grid: 'sixteenth',
    bpm: 88,
    measures: 2,
    baseMidis: L4,
  },
  {
    id: 'sit-l5',
    title: 'Level 5: Mixed subdivisions',
    description: 'Eighth plus sixteenth groupings changing each beat.',
    grid: 'mixed',
    bpm: 80,
    measures: 1,
    baseMidis: L5,
  },
];

export function getLevelByIndex(index: number): LevelDefinition | undefined {
  return SUBDIVISION_LADDER[index];
}

export const PASS_THRESHOLD = 72;
