import type { TimeSignature } from '../types';

export interface DrumsUrlState {
  notation: string;
  timeSignature: TimeSignature;
  bpm: number;
  beatGrouping?: number[];
  metronomeEnabled?: boolean;
}

const URL_PARAM_RHYTHM = 'rhythm';
const URL_PARAM_RHYTHM_B64 = 'r64';

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${normalized}${'='.repeat((4 - (normalized.length % 4)) % 4)}`;
    return atob(padded);
  } catch {
    return null;
  }
}

export const DEFAULT_DRUMS_URL_STATE: DrumsUrlState = {
  notation: 'D-T-__T-D---T---', // Maqsum
  timeSignature: { numerator: 4, denominator: 4 },
  bpm: 120,
  beatGrouping: undefined,
  metronomeEnabled: false,
};

/**
 * Parse Drums query params into app state. Preserves unrelated search params when building URLs.
 */
export function parseDrumsUrlParams(search?: string): DrumsUrlState {
  const params = new URLSearchParams(
    search ?? (typeof window !== 'undefined' ? window.location.search : ''),
  );

  const notationFromB64 = params.get(URL_PARAM_RHYTHM_B64);
  const decodedNotation = notationFromB64 ? decodeBase64Url(notationFromB64) : null;
  const notation =
    decodedNotation || params.get(URL_PARAM_RHYTHM) || DEFAULT_DRUMS_URL_STATE.notation;
  const bpm = parseInt(params.get('bpm') || '', 10) || DEFAULT_DRUMS_URL_STATE.bpm;

  const timeSigParam = params.get('time');
  let timeSignature = DEFAULT_DRUMS_URL_STATE.timeSignature;

  if (timeSigParam) {
    const parts = timeSigParam.split('/');
    if (parts.length === 2) {
      const numerator = parseInt(parts[0], 10);
      const denominator = parseInt(parts[1], 10);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator > 0) {
        timeSignature = { numerator, denominator };
      }
    }
  }

  const groupsParam = params.get('groups');
  let beatGrouping: number[] | undefined = undefined;

  if (groupsParam) {
    const parts = groupsParam.split('+').map((s) => parseInt(s.trim(), 10));
    if (parts.every((n) => !isNaN(n) && n > 0)) {
      beatGrouping = parts;
    }
  }

  const metronomeParam = params.get('metronome');
  const metronomeEnabled = metronomeParam === 'true' || metronomeParam === '1';

  return { notation, timeSignature, bpm, beatGrouping, metronomeEnabled };
}

export function buildDrumsAppUrl(
  state: DrumsUrlState,
  options?: { pathname?: string; baseSearch?: string },
): string {
  const pathname =
    options?.pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/drums/');
  const params = new URLSearchParams(
    options?.baseSearch ??
      (typeof window !== 'undefined' ? window.location.search : ''),
  );

  params.delete(URL_PARAM_RHYTHM);
  params.delete(URL_PARAM_RHYTHM_B64);
  params.delete('bpm');
  params.delete('time');
  params.delete('groups');
  params.delete('metronome');

  if (state.notation !== DEFAULT_DRUMS_URL_STATE.notation) {
    params.set(URL_PARAM_RHYTHM, state.notation);
  }

  if (state.bpm !== DEFAULT_DRUMS_URL_STATE.bpm) {
    params.set('bpm', state.bpm.toString());
  }

  const timeSigString = `${state.timeSignature.numerator}/${state.timeSignature.denominator}`;
  const defaultTimeSigString = `${DEFAULT_DRUMS_URL_STATE.timeSignature.numerator}/${DEFAULT_DRUMS_URL_STATE.timeSignature.denominator}`;
  if (timeSigString !== defaultTimeSigString) {
    params.set('time', timeSigString);
  }

  if (state.beatGrouping && state.beatGrouping.length > 0) {
    params.set('groups', state.beatGrouping.join('+'));
  }

  if (state.metronomeEnabled) {
    params.set('metronome', 'true');
  }

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

/** Shareable href for a rhythm variation while preserving tempo, grouping, and metronome. */
export function drumsRhythmHref(
  notation: string,
  timeSignature: TimeSignature,
  base?: Partial<DrumsUrlState>,
): string {
  const current = base ? { ...parseDrumsUrlParams(), ...base } : parseDrumsUrlParams();
  return buildDrumsAppUrl({ ...current, notation, timeSignature });
}
