import { converter, formatHex, parse } from 'culori';

import { formatOklchCss } from './formatOklch';
import type { ColorState } from './types';

const toOklch = converter('oklch');

export function colorStateToHex(state: ColorState): string {
  const rgb = converter('rgb')({ mode: 'oklch', l: state.l, c: state.c, h: state.h });
  if (!rgb) return '#808080';
  const hex = formatHex(rgb);
  return hex ?? '#808080';
}

export function hexToColorState(hex: string): ColorState | null {
  const parsed = parse(hex.trim());
  if (!parsed) return null;
  const oklch = toOklch(parsed);
  if (!oklch || oklch.h == null) return null;
  return { h: oklch.h, c: oklch.c ?? 0, l: oklch.l ?? 0.5 };
}

export function colorStateToCss(state: ColorState): string {
  return formatOklchCss(state);
}

export function normalizeHex(hex: string): string | null {
  const cleaned = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return `#${cleaned.toLowerCase()}`;
}
