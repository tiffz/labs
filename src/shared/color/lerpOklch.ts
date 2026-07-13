import type { ColorState } from './types';

export function lerpOklch(a: ColorState, b: ColorState, t: number): ColorState {
  const dh = ((b.h - a.h + 540) % 360) - 180;
  return {
    h: (a.h + dh * t + 360) % 360,
    c: a.c + (b.c - a.c) * t,
    l: a.l + (b.l - a.l) * t,
  };
}

export function hueDistance(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}
