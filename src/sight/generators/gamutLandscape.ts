import { getLevelConfig } from '../levels';
import { maskCentroid, pointInPolygon } from '../scoring/gamutOverlap';
import type { ColorState, GamutChallenge } from '../types';
import { createRng } from './rng';

function pick(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function sampleInsideMask(
  rng: () => number,
  vertices: Array<{ h: number; c: number }>,
  maxAttempts = 40,
): ColorState {
  const center = maskCentroid(vertices);
  for (let i = 0; i < maxAttempts; i++) {
    const h = (center.h + pick(rng, -28, 28) + 360) % 360;
    const c = Math.max(0.02, Math.min(0.35, center.c + pick(rng, -0.06, 0.06)));
    if (pointInPolygon({ h, c }, vertices)) {
      return { h, c, l: pick(rng, 0.3, 0.72) };
    }
  }
  return { h: center.h, c: center.c, l: pick(rng, 0.4, 0.65) };
}

function maskForProfile(
  profile: 'wide' | 'compressed',
  anchorH: number,
  anchorC: number,
): { vertices: Array<{ h: number; c: number }>; shape: GamutChallenge['maskShape'] } {
  if (profile === 'wide') {
    return {
      shape: 'triangle',
      vertices: [
        { h: anchorH, c: anchorC + 0.1 },
        { h: (anchorH + 48) % 360, c: anchorC + 0.02 },
        { h: (anchorH + 312) % 360, c: anchorC + 0.05 },
      ],
    };
  }
  return {
    shape: 'diamond',
    vertices: [
      { h: anchorH, c: anchorC + 0.04 },
      { h: (anchorH + 22) % 360, c: anchorC + 0.02 },
      { h: (anchorH + 180) % 360, c: anchorC },
      { h: (anchorH + 318) % 360, c: anchorC + 0.02 },
    ],
  };
}

export function generateGamutChallenge(seed: number, level: number): GamutChallenge {
  const rng = createRng(seed);
  const profile = getLevelConfig(level).gamutProfile ?? 'wide';
  const anchorH = pick(rng, 200, 280);
  const maxC = profile === 'wide' ? 0.18 : 0.12;
  const anchorC = pick(rng, 0.05, maxC * 0.7);

  const { vertices, shape } = maskForProfile(profile, anchorH, anchorC);

  const colors = {
    skyA: sampleInsideMask(rng, vertices),
    skyB: sampleInsideMask(rng, vertices),
    bg: sampleInsideMask(rng, vertices),
    mid: sampleInsideMask(rng, vertices),
    fg: sampleInsideMask(rng, vertices),
  };

  return {
    kind: 'gamut',
    seed,
    colors,
    maskVertices: vertices,
    maskShape: shape,
  };
}
