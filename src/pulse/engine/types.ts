import type { TimeSignature } from '../../shared/rhythm/types';

export interface SubdivisionVolumes {
  accent: number;
  quarter: number;
  eighth: number;
  sixteenth: number;
}

export type SubdivisionChannel = keyof SubdivisionVolumes;

export interface QuietCountConfig {
  playBars: number;
  silentBars: number;
}

export interface MetronomeConfig {
  bpm: number;
  timeSignature: TimeSignature;
  volumes: SubdivisionVolumes;
  beatGrouping?: string;
  quietCount?: QuietCountConfig;
  voiceGain?: number;
  clickGain?: number;
  mutedChannels?: string[];
  perBeatVolumes?: number[];
  voiceMode?: VoiceMode;
  subdivisionLevel?: SubdivisionLevel;
}

export type SubdivisionType =
  | 'accent'
  | 'quarter'
  | 'eighth'
  | 'sixteenth';

export type VoiceMode = 'counting' | 'takadimi';

export type SubdivisionLevel = 1 | 2 | 3 | 4;

/**
 * Returns the number of grid slots per eighth note for asymmetric /8 meters.
 *
 * - Level 2: 1 slot per eighth (the natural eighth-note pulse)
 * - Level 3/4: 2 slots per eighth (sixteenth-note resolution)
 *
 * Level 3 and 4 produce the same grid density for /8 meters, but differ
 * in voice mode: level 3 uses triplet-style syllables while level 4
 * uses standard sixteenth syllables.
 */
export function eighthBaseSlotsPerEighth(level: SubdivisionLevel): number {
  return level <= 2 ? 1 : 2;
}

export interface SubdivOption {
  level: SubdivisionLevel;
  iconLevel: SubdivisionLevel;
  label: string;
}

export function getSubdivisionOptions(ts: TimeSignature): SubdivOption[] {
  if (ts.denominator === 8) {
    return [
      { level: 2, iconLevel: 2, label: '♪' },
      { level: 4, iconLevel: 4, label: '÷2' },
    ];
  }
  return [
    { level: 1, iconLevel: 1, label: '♩' },
    { level: 2, iconLevel: 2, label: '÷2' },
    { level: 3, iconLevel: 3, label: '÷3' },
    { level: 4, iconLevel: 4, label: '÷4' },
  ];
}

export function getDefaultSubdivisionLevel(ts: TimeSignature): SubdivisionLevel {
  if (ts.denominator === 8) return 2;
  return 2;
}

export interface BeatInfo {
  subdivision: SubdivisionType;
  sampleId: string;
  gain: number;
  isGroupStart: boolean;
  groupIndex: number;
  beatIndex: number;
  measureBeat: number;
}

export interface BeatEvent {
  beatIndex: number;
  measureBeat: number;
  measure: number;
  subdivision: SubdivisionType;
  isGroupStart: boolean;
  groupIndex: number;
  audioTime: number;
  isSilent: boolean;
}

export type BeatCallback = (event: BeatEvent) => void;

export interface VoiceManifest {
  version: number;
  voice: string;
  sampleRate: number;
  samples: Array<{
    id: string;
    text: string;
    category: string;
    file: string;
    duration: number;
  }>;
}
