/**
 * Sound options for chord playback
 */

export type SoundType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'piano' | 'piano-sampled';

export interface SoundOptions {
  type: SoundType;
}

export const SOUND_OPTIONS: Array<{ value: SoundType; label: string; description: string }> = [
  { value: 'piano-sampled', label: 'Piano (Sampled)', description: 'Realistic piano samples' },
  { value: 'piano', label: 'Piano (Synth)', description: 'Lightweight synthesized piano' },
  { value: 'sine', label: 'Sine Wave', description: 'Smooth, pure tone' },
  { value: 'triangle', label: 'Triangle Wave', description: 'Mellow, soft sound' },
  { value: 'sawtooth', label: 'Sawtooth Wave', description: 'Rich, harmonic sound' },
  { value: 'square', label: 'Square Wave', description: 'Bright, digital sound' },
];

