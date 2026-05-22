import { converter, type Oklab } from 'culori';
import type { ColorState } from '../types';

const toOklab = converter('oklab') as (color: {
  mode: 'oklch';
  l: number;
  c: number;
  h: number;
}) => Oklab | undefined;

export function colorStateToOklab(state: ColorState): { l: number; a: number; b: number } {
  const lab = toOklab({ mode: 'oklch', l: state.l, c: state.c, h: state.h });
  return {
    l: lab?.l ?? state.l,
    a: lab?.a ?? 0,
    b: lab?.b ?? 0,
  };
}
