import { getLevelConfig } from '../levels';
import type { ColorState, GamutChallenge } from '../types';
import { createRng } from './rng';

function pick(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function sampleInGamut(
  rng: () => number,
  anchorH: number,
  spanH: number,
  maxC: number,
): ColorState {
  return {
    h: (anchorH + pick(rng, -spanH, spanH) + 360) % 360,
    c: pick(rng, 0.02, maxC),
    l: pick(rng, 0.25, 0.75),
  };
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
        { h: anchorH, c: anchorC + 0.12 },
        { h: (anchorH + 55) % 360, c: anchorC },
        { h: (anchorH + 310) % 360, c: anchorC + 0.06 },
      ],
    };
  }
  return {
    shape: 'diamond',
    vertices: [
      { h: anchorH, c: anchorC + 0.04 },
      { h: (anchorH + 25) % 360, c: anchorC + 0.02 },
      { h: (anchorH + 180) % 360, c: anchorC },
      { h: (anchorH + 335) % 360, c: anchorC + 0.02 },
    ],
  };
}

export function generateGamutChallenge(seed: number, level: number): GamutChallenge {
  const rng = createRng(seed);
  const profile = getLevelConfig(level).gamutProfile ?? 'wide';
  const anchorH = pick(rng, 200, 280);
  const spanH = profile === 'wide' ? 35 : 18;
  const maxC = profile === 'wide' ? 0.2 : 0.1;
  const anchorC = pick(rng, 0.04, maxC * 0.5);

  const { vertices, shape } = maskForProfile(profile, anchorH, anchorC);

  const colors = {
    skyA: sampleInGamut(rng, anchorH, spanH * 0.5, maxC),
    skyB: sampleInGamut(rng, anchorH + 15, spanH * 0.5, maxC),
    bg: sampleInGamut(rng, anchorH + 8, spanH, maxC),
    mid: sampleInGamut(rng, anchorH - 5, spanH, maxC * 0.85),
    fg: sampleInGamut(rng, anchorH, spanH * 0.6, maxC * 0.7),
  };

  return {
    kind: 'gamut',
    seed,
    colors,
    maskVertices: vertices,
    maskShape: shape,
  };
}
