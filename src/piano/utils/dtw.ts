/**
 * Dynamic Time Warping (DTW) with Sakoe-Chiba band constraint.
 *
 * Used for aligning chroma feature sequences from a score and an audio
 * recording.  The band constraint keeps memory and runtime manageable
 * while allowing ±20 % tempo variation.
 */

export interface DTWResult {
  /** Warping path – pairs of [seqAFrame, seqBFrame], from start to end. */
  path: [number, number][];
  /** Total accumulated cost along the optimal path. */
  totalCost: number;
  /** Normalised cost (totalCost / path.length). */
  normalizedCost: number;
}

/**
 * Euclidean distance between two equal-length Float32Arrays.
 */
function euclidean(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Cosine distance (1 − cosine similarity).  More robust than Euclidean
 * for chroma vectors that may have different overall energy levels.
 */
function cosineDistance(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 1;
  return 1 - dot / denom;
}

export type DistanceFunction = 'euclidean' | 'cosine';

/**
 * Run DTW on two sequences of chroma feature vectors.
 *
 * @param seqA  First sequence  (e.g. score chroma), length N
 * @param seqB  Second sequence (e.g. audio chroma), length M
 * @param bandWidthRatio  Sakoe-Chiba band as a fraction of the longer
 *   sequence.  Default 0.25 (25 %).
 * @param distFn  Distance metric to use.  Default 'cosine'.
 * @param yieldEvery  Yield to the main thread every this many rows
 *   (0 = never yield).  Useful to keep the UI responsive.
 */
export async function computeDTW(
  seqA: Float32Array[],
  seqB: Float32Array[],
  bandWidthRatio = 0.25,
  distFn: DistanceFunction = 'cosine',
  yieldEvery = 100,
): Promise<DTWResult> {
  const N = seqA.length;
  const M = seqB.length;

  if (N === 0 || M === 0) {
    return { path: [], totalCost: Infinity, normalizedCost: Infinity };
  }

  const dist = distFn === 'cosine' ? cosineDistance : euclidean;
  const bandWidth = Math.max(50, Math.round(bandWidthRatio * Math.max(N, M)));

  // Full accumulated cost matrix — we need it for backtracking.
  // For typical music alignment (N,M ~ 1800) this is ~13 MB of Float64
  // which is fine in a modern browser.
  const D = new Float64Array(N * M);
  D.fill(Infinity);

  const idx = (i: number, j: number) => i * M + j;

  // Ratio used to map row i to the "diagonal" column
  const ratio = M / N;

  const bandLo = (i: number) => Math.max(0, Math.round(i * ratio) - bandWidth);
  const bandHi = (i: number) => Math.min(M - 1, Math.round(i * ratio) + bandWidth);

  // Fill first cell
  D[idx(0, 0)] = dist(seqA[0], seqB[0]);

  // Fill first row within band
  for (let j = 1; j <= bandHi(0); j++) {
    D[idx(0, j)] = D[idx(0, j - 1)] + dist(seqA[0], seqB[j]);
  }

  // Fill first column within band
  for (let i = 1; i < N; i++) {
    if (bandLo(i) === 0) {
      D[idx(i, 0)] = D[idx(i - 1, 0)] + dist(seqA[i], seqB[0]);
    }
  }

  // Fill the rest
  for (let i = 1; i < N; i++) {
    const lo = bandLo(i);
    const hi = bandHi(i);
    for (let j = Math.max(1, lo); j <= hi; j++) {
      const cost = dist(seqA[i], seqB[j]);
      const d1 = D[idx(i - 1, j)];        // insertion
      const d2 = D[idx(i, j - 1)];        // deletion
      const d3 = D[idx(i - 1, j - 1)];    // match
      D[idx(i, j)] = cost + Math.min(d1, d2, d3);
    }

    if (yieldEvery > 0 && i % yieldEvery === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // Backtrack to find the optimal warping path
  const path: [number, number][] = [];
  let i = N - 1;
  let j = M - 1;
  path.push([i, j]);

  while (i > 0 || j > 0) {
    if (i === 0) {
      j--;
    } else if (j === 0) {
      i--;
    } else {
      const diag = D[idx(i - 1, j - 1)];
      const left = D[idx(i, j - 1)];
      const up = D[idx(i - 1, j)];
      if (diag <= left && diag <= up) {
        i--;
        j--;
      } else if (up <= left) {
        i--;
      } else {
        j--;
      }
    }
    path.push([i, j]);
  }

  path.reverse();

  const totalCost = D[idx(N - 1, M - 1)];
  const normalizedCost = totalCost / path.length;

  return { path, totalCost, normalizedCost };
}
