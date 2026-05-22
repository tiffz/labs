import type { RepRecord, SkillMatrix, SkillVector } from './types';

const VECTORS: SkillVector[] = [
  'valueSensation',
  'chromaIsolation',
  'temperatureIntuition',
  'relationalDecoding',
  'gamutMapping',
  'harmonicAlignment',
];

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function updateSkillMatrix(matrix: SkillMatrix, rep: RepRecord): SkillMatrix {
  const next = { ...matrix };
  const v = rep.skillVector;
  let delta = rep.passed ? 3 : -5;
  if (rep.deltaE !== undefined) {
    if (rep.deltaE <= 2) delta += 2;
    else if (rep.deltaE <= 4) delta += 1;
    else if (rep.deltaE > 8) delta -= 2;
  }
  if (rep.overlapPct !== undefined) {
    if (rep.overlapPct >= 90) delta += 2;
    else if (rep.overlapPct < 70) delta -= 3;
  }
  next[v] = clampScore(next[v] + delta);
  return next;
}

export function weakestSkillVector(matrix: SkillMatrix): SkillVector {
  let min = VECTORS[0]!;
  let minVal = matrix[min];
  for (const v of VECTORS) {
    if (matrix[v] < minVal) {
      min = v;
      minVal = matrix[v];
    }
  }
  return min;
}

export function passRateForTags(reps: RepRecord[], required: string[], forbidden: string[] = []): number | null {
  const filtered = reps.filter((r) => {
    if (!required.every((t) => r.tags.includes(t))) return false;
    if (forbidden.some((t) => r.tags.includes(t))) return false;
    return true;
  });
  if (filtered.length < 3) return null;
  return filtered.filter((r) => r.passed).length / filtered.length;
}
