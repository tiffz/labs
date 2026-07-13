import { clampColorState } from './formatOklch';
import type { ColorState, HarmonySystem } from './types';

const SYSTEM_OFFSETS: Record<HarmonySystem, number[]> = {
  complementary: [0, 180],
  splitComplementary: [0, 150, 210],
  triadic: [0, 120, 240],
  tetradic: [0, 90, 180, 270],
  analogous: [0, 30, 60],
};

export function harmonyOffsets(system: HarmonySystem): number[] {
  return SYSTEM_OFFSETS[system];
}

export function colorsFromHarmony(
  pivot: ColorState,
  system: HarmonySystem,
  count = 5,
): ColorState[] {
  const offsets = SYSTEM_OFFSETS[system];
  const target = Math.max(1, count);
  if (target <= offsets.length) {
    return offsets.slice(0, target).map((offset) =>
      clampColorState({
        h: (pivot.h + offset) % 360,
        c: pivot.c,
        l: pivot.l,
      }),
    );
  }

  const maxOffset = offsets[offsets.length - 1] ?? 0;
  const out: ColorState[] = [];
  for (let i = 0; i < target; i++) {
    const t = target <= 1 ? 0 : i / (target - 1);
    const offset = maxOffset * t;
    const wave = Math.sin(t * Math.PI) * 0.08;
    out.push(
      clampColorState({
        h: (pivot.h + offset) % 360,
        c: pivot.c * (0.94 + wave),
        l: pivot.l + (t - 0.5) * 0.14,
      }),
    );
  }
  return out;
}

export function mutedBridgePalette(pivot: ColorState, steps = 5): ColorState[] {
  const muted = clampColorState({ h: pivot.h, c: pivot.c * 0.35, l: pivot.l });
  const light = clampColorState({ h: pivot.h, c: pivot.c * 0.2, l: Math.min(0.92, pivot.l + 0.28) });
  const dark = clampColorState({ h: pivot.h, c: pivot.c * 0.25, l: Math.max(0.12, pivot.l - 0.28) });
  const out: ColorState[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    out.push(
      clampColorState({
        h: pivot.h,
        c: muted.c + (pivot.c - muted.c) * (t < 0.5 ? t * 2 : (1 - t) * 2),
        l: light.l + (dark.l - light.l) * t,
      }),
    );
  }
  return out;
}
