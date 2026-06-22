import { formatOklchChannels } from './formatOklch';
import type { ColorState, CompareAxis, ContextualLocks, IsolatedAxis } from './types';

export type OklchFocusAxis = 'l' | 'c' | 'h';

export function compareFocusAxis(axis: CompareAxis): OklchFocusAxis {
  return axis === 'lighter' || axis === 'darker' ? 'l' : 'c';
}

export function isolatedFocusAxis(axis: IsolatedAxis): OklchFocusAxis {
  if (axis === 'lighter' || axis === 'darker') return 'l';
  if (axis === 'moreSaturated' || axis === 'lessSaturated') return 'c';
  return 'h';
}

/** Axes the user could adjust for this contextual match level. */
export function matchFocusAxes(locked: ContextualLocks): OklchFocusAxis[] {
  const axes: OklchFocusAxis[] = [];
  if (!locked.lightness) axes.push('l');
  if (!locked.chroma) axes.push('c');
  if (!locked.hue) axes.push('h');
  return axes;
}

export function focusAxisShortLabel(focus: OklchFocusAxis): string {
  if (focus === 'l') return 'L';
  if (focus === 'c') return 'C';
  return 'H';
}

export function focusAxisName(focus: OklchFocusAxis): string {
  if (focus === 'l') return 'Lightness';
  if (focus === 'c') return 'Chroma';
  return 'Hue';
}

export function formatFocusAxisValue(state: ColorState, focus: OklchFocusAxis): string {
  const ch = formatOklchChannels(state);
  if (focus === 'l') return ch.l;
  if (focus === 'c') return ch.c;
  return ch.h;
}
