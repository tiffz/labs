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
  drumGain?: number;
  mutedChannels?: string[];
  perBeatVolumes?: number[];
  voiceMode?: VoiceMode;
  subdivisionLevel?: SubdivisionLevel;
  channelVoiceMutes?: SubdivisionChannel[];
  channelClickMutes?: SubdivisionChannel[];
  channelDrumMutes?: SubdivisionChannel[];
  countInMeasures?: number;
  onCountInBeat?: (beatNumber: number, totalBeats: number) => void;
  onCountInComplete?: () => void;
}

export type SubdivisionType =
  | 'accent'
  | 'quarter'
  | 'eighth'
  | 'sixteenth';

export type VoiceMode = 'counting' | 'takadimi';

export type SubdivisionLevel = 1 | 2 | 3 | 4 | 'swing8';

export function isSwingLevel(level: SubdivisionLevel): boolean {
  return level === 'swing8';
}

/**
 * Number of grid slots produced per quarter-note beat (for /4 meters).
 * swing8 uses 3 slots per beat (triplet grid) where the middle slot is
 * silent — this visually shows the "long-short" swing feel.
 */
export function slotsPerBeat(level: SubdivisionLevel): number {
  if (level === 'swing8') return 3;
  return level;
}

/**
 * Minimum subdivision slot duration (seconds) for voicing subdivision
 * syllables. Below this, only beat numbers are voiced to maintain clarity.
 */
export const VOICE_SUBDIV_MIN_DUR = 0.18;

/**
 * Grid slots per eighth note for /8 meters.
 */
export function eighthBaseSlotsPerEighth(level: SubdivisionLevel): number {
  if (level === 'swing8') return 1;
  const n = slotsPerBeat(level);
  return n <= 2 ? 1 : 2;
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
    { level: 'swing8', iconLevel: 'swing8', label: 'Sw♪' },
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
