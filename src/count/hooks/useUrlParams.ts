import { useEffect, useRef } from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { SubdivisionVolumes, SubdivisionChannel, SubdivisionLevel, VoiceMode } from '../engine/types';
import { parseHash, serializeHash, getHashValues, type HashPair } from '../../shared/utils/hashState';
import { throttledReplaceState } from '../../shared/utils/urlHistory';

/**
 * Hybrid URL format for metronome state:
 *
 * Human-readable query params (the "what am I practicing" settings):
 *   ?bpm=100&ts=8-8&sub=2&vm=counting&bg=3.3.2
 *
 * Compact hash fragment (the "how loud is everything" mixer settings):
 *   #g100-50-0.v100-74-59-27.cv5
 *
 * Hash keys:
 *   g{voice}-{click}-{drum}      source gains (0-100)
 *   v{accent}-{quarter}-{eighth}-{sixteenth}  subdivision volumes (0-100)
 *   cv{hex}  channel voice mutes bitmask
 *   cc{hex}  channel click mutes bitmask
 *   cd{hex}  channel drum mutes bitmask
 */

const VALID_SUBDIV_LEVELS = new Set<string>(['1', '2', '3', '4', 'swing8']);
const VALID_VOICE_MODES = new Set<string>(['counting', 'takadimi']);

const CHANNEL_BITS: Record<SubdivisionChannel, number> = {
  accent: 8,
  quarter: 4,
  eighth: 2,
  sixteenth: 1,
};

function channelSetToBitmask(s: Set<SubdivisionChannel>): number {
  let mask = 0;
  for (const ch of s) mask |= CHANNEL_BITS[ch] ?? 0;
  return mask;
}

function bitmaskToChannelSet(mask: number): Set<SubdivisionChannel> {
  const s = new Set<SubdivisionChannel>();
  for (const [ch, bit] of Object.entries(CHANNEL_BITS)) {
    if (mask & bit) s.add(ch as SubdivisionChannel);
  }
  return s;
}

function gain100(v: number): string {
  return String(Math.round(v * 100));
}

function parseGain100(raw: string): number | undefined {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n / 100 : undefined;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export interface MetronomeUrlState {
  bpm?: number;
  timeSignature?: TimeSignature;
  subdivisionLevel?: SubdivisionLevel;
  voiceMode?: VoiceMode;
  voiceGain?: number;
  clickGain?: number;
  drumGain?: number;
  beatGrouping?: string;
  volumes?: SubdivisionVolumes;
  channelVoiceMutes?: Set<SubdivisionChannel>;
  channelClickMutes?: Set<SubdivisionChannel>;
  channelDrumMutes?: Set<SubdivisionChannel>;
}

export function readUrlParams(): MetronomeUrlState {
  const params = new URLSearchParams(window.location.search);
  const state: MetronomeUrlState = {};

  const bpmRaw = params.get('bpm');
  if (bpmRaw !== null) {
    const n = Number(bpmRaw);
    if (Number.isFinite(n) && n >= 20 && n <= 300) state.bpm = Math.round(n);
  }

  const tsRaw = params.get('ts');
  if (tsRaw !== null) {
    const match = tsRaw.match(/^(\d{1,2})-(\d{1,2})$/);
    if (match) {
      const num = Number(match[1]);
      const den = Number(match[2]);
      if (num >= 1 && num <= 32 && (den === 4 || den === 8)) {
        state.timeSignature = { numerator: num, denominator: den as 4 | 8 };
      }
    }
  }

  const subRaw = params.get('sub');
  if (subRaw !== null && VALID_SUBDIV_LEVELS.has(subRaw)) {
    state.subdivisionLevel = subRaw === 'swing8' ? 'swing8' : (Number(subRaw) as 1 | 2 | 3 | 4);
  }

  const vmRaw = params.get('vm');
  if (vmRaw !== null && VALID_VOICE_MODES.has(vmRaw)) {
    state.voiceMode = vmRaw as VoiceMode;
  }

  const bgRaw = params.get('bg');
  if (bgRaw !== null && /^[\d.]+$/.test(bgRaw)) {
    state.beatGrouping = bgRaw.replace(/\./g, '+');
  }

  // --- hash fragment (mixer state) ---
  const hashRaw = window.location.hash.replace(/^#/, '');
  if (hashRaw) {
    const pairs = parseHash(hashRaw);

    const gains = getHashValues(pairs, 'g');
    if (gains && gains.length === 3) {
      state.voiceGain = parseGain100(gains[0]);
      state.clickGain = parseGain100(gains[1]);
      state.drumGain = parseGain100(gains[2]);
    }

    const vols = getHashValues(pairs, 'v');
    if (vols && vols.length === 4) {
      const a = parseGain100(vols[0]);
      const q = parseGain100(vols[1]);
      const e = parseGain100(vols[2]);
      const s = parseGain100(vols[3]);
      if (a !== undefined || q !== undefined || e !== undefined || s !== undefined) {
        state.volumes = {
          accent: a ?? 1.0,
          quarter: q ?? 0.8,
          eighth: e ?? 0.6,
          sixteenth: s ?? 0.0,
        };
      }
    }

    const cvRaw = getHashValues(pairs, 'cv');
    if (cvRaw?.[0]) {
      const mask = parseInt(cvRaw[0], 16);
      if (!isNaN(mask)) state.channelVoiceMutes = bitmaskToChannelSet(mask);
    }

    const ccRaw = getHashValues(pairs, 'cc');
    if (ccRaw?.[0]) {
      const mask = parseInt(ccRaw[0], 16);
      if (!isNaN(mask)) state.channelClickMutes = bitmaskToChannelSet(mask);
    }

    const cdRaw = getHashValues(pairs, 'cd');
    if (cdRaw?.[0]) {
      const mask = parseInt(cdRaw[0], 16);
      if (!isNaN(mask)) state.channelDrumMutes = bitmaskToChannelSet(mask);
    }
  }

  return state;
}

export function hasUrlParams(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has('bpm') || params.has('ts') || params.has('sub');
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export interface MetronomeFullState {
  bpm: number;
  timeSignature: TimeSignature;
  subdivisionLevel: SubdivisionLevel;
  voiceMode: VoiceMode;
  voiceGain: number;
  clickGain: number;
  drumGain: number;
  beatGrouping: string | undefined;
  volumes: SubdivisionVolumes;
  channelVoiceMutes: Set<SubdivisionChannel>;
  channelClickMutes: Set<SubdivisionChannel>;
  channelDrumMutes: Set<SubdivisionChannel>;
}

const DEFAULT_GAINS = { voice: 1.0, click: 0.5, drum: 0 };
const DEFAULT_VOLS = { accent: 1.0, quarter: 0.8, eighth: 0.6, sixteenth: 0 };

function isDefaultMixer(state: MetronomeFullState): boolean {
  return (
    state.voiceGain === DEFAULT_GAINS.voice &&
    state.clickGain === DEFAULT_GAINS.click &&
    state.drumGain === DEFAULT_GAINS.drum &&
    state.volumes.accent === DEFAULT_VOLS.accent &&
    state.volumes.quarter === DEFAULT_VOLS.quarter &&
    state.volumes.eighth === DEFAULT_VOLS.eighth &&
    state.volumes.sixteenth === DEFAULT_VOLS.sixteenth &&
    state.channelVoiceMutes.size === 0 &&
    state.channelClickMutes.size === 0 &&
    state.channelDrumMutes.size === 0
  );
}

function writeUrlParams(state: MetronomeFullState) {
  const params = new URLSearchParams();

  params.set('bpm', String(state.bpm));
  params.set('ts', `${state.timeSignature.numerator}-${state.timeSignature.denominator}`);
  params.set('sub', String(state.subdivisionLevel));
  params.set('vm', state.voiceMode);

  if (state.beatGrouping) {
    params.set('bg', state.beatGrouping.replace(/\+/g, '.'));
  }

  // Build hash for mixer state (only when non-default)
  let hash = '';
  if (!isDefaultMixer(state)) {
    const pairs: HashPair[] = [];

    pairs.push({
      key: 'g',
      values: [gain100(state.voiceGain), gain100(state.clickGain), gain100(state.drumGain)],
    });

    pairs.push({
      key: 'v',
      values: [
        gain100(state.volumes.accent),
        gain100(state.volumes.quarter),
        gain100(state.volumes.eighth),
        gain100(state.volumes.sixteenth),
      ],
    });

    const cvMask = channelSetToBitmask(state.channelVoiceMutes);
    if (cvMask) pairs.push({ key: 'cv', values: [cvMask.toString(16)] });

    const ccMask = channelSetToBitmask(state.channelClickMutes);
    if (ccMask) pairs.push({ key: 'cc', values: [ccMask.toString(16)] });

    const cdMask = channelSetToBitmask(state.channelDrumMutes);
    if (cdMask) pairs.push({ key: 'cd', values: [cdMask.toString(16)] });

    hash = serializeHash(pairs);
  }

  const qs = params.toString();
  const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${hash ? `#${hash}` : ''}`;
  throttledReplaceState(newUrl);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUrlSync(state: MetronomeFullState) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (!hasUrlParams()) {
        writeUrlParams(state);
      }
      return;
    }
    writeUrlParams(state);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- individual fields listed intentionally to avoid re-running on every object reference change
  }, [
    state.bpm,
    state.timeSignature,
    state.subdivisionLevel,
    state.voiceMode,
    state.voiceGain,
    state.clickGain,
    state.drumGain,
    state.beatGrouping,
    state.volumes,
    state.channelVoiceMutes,
    state.channelClickMutes,
    state.channelDrumMutes,
  ]);
}
