import { clampColorState } from './formatOklch';
import { hueDistance } from './lerpOklch';
import type { PaletteGenerationProfile } from './paletteProfile';
import type { ColorState } from './types';

/** Push palettes toward clearer hue separation and stronger chroma. */
export function polishPaletteColors(
  colors: ColorState[],
  profile: PaletteGenerationProfile,
  options?: {
    fidelity?: 'creative' | 'source' | 'seed' | 'seed-varied';
    anchor?: ColorState;
    anchorIndex?: number;
    seedDrift?: { h: number; c: number; l: number };
  },
): ColorState[] {
  if (colors.length === 0) return colors;

  if (options?.fidelity === 'source') {
    return colors.map((color) => clampColorState({
      h: color.h,
      c: Math.min(profile.chromaMax, Math.max(profile.chromaMin, color.c)),
      l: Math.min(profile.lightnessMax, Math.max(profile.lightnessMin, color.l)),
    }));
  }

  const anchorIndex = options?.anchorIndex ?? 0;
  const drift = options?.seedDrift ?? { h: 0, c: 0, l: 0 };

  if ((options?.fidelity === 'seed' || options?.fidelity === 'seed-varied') && options.anchor) {
    const anchor = options.anchor;
    const varied = options.fidelity === 'seed-varied';
    const lightnessSpread = Math.min(
      varied ? 0.34 : 0.26,
      (profile.lightnessMax - profile.lightnessMin) * (varied ? 0.45 : 0.35),
    );
    return colors.map((color, index) => {
      if (index === anchorIndex) {
        return clampColorState({
          h: varied ? (anchor.h + drift.h + 360) % 360 : anchor.h,
          c: Math.min(
            profile.chromaMax,
            Math.max(varied ? anchor.c + drift.c : anchor.c, profile.chromaMin),
          ),
          l: Math.min(
            profile.lightnessMax,
            Math.max(
              profile.lightnessMin,
              varied ? anchor.l + drift.l : anchor.l,
            ),
          ),
        });
      }
      const t = colors.length <= 1 ? 0.5 : index / (colors.length - 1);
      const targetL = anchor.l + drift.l * 0.35 + (t - 0.5) * lightnessSpread * 2;
      const targetC = Math.min(
        profile.chromaMax,
        Math.max(color.c, anchor.c * (varied ? 0.74 : 0.82), profile.chromaMin),
      );
      return clampColorState({
        h: color.h,
        c: targetC,
        l: Math.min(profile.lightnessMax, Math.max(profile.lightnessMin, targetL)),
      });
    });
  }

  const chromaTarget = profile.chromaMin + (profile.chromaMax - profile.chromaMin) * 0.72;
  const polished = colors.map((color, index) => {
    const t = colors.length <= 1 ? 0.5 : index / (colors.length - 1);
    const lightness =
      profile.lightnessMin + (profile.lightnessMax - profile.lightnessMin) * (0.12 + t * 0.76);
    const chroma = Math.min(profile.chromaMax, Math.max(color.c, chromaTarget, profile.chromaMin + 0.03));
    return clampColorState({ h: color.h, c: chroma, l: lightness });
  });

  return spreadSimilarHues(polished, 16);
}

function spreadSimilarHues(colors: ColorState[], minHueDelta: number): ColorState[] {
  const out = colors.map((color) => ({ ...color }));
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1]!;
    const current = out[i]!;
    if (hueDistance(prev.h, current.h) >= minHueDelta) continue;
    out[i] = clampColorState({
      ...current,
      h: (current.h + minHueDelta) % 360,
    });
  }
  return out;
}
