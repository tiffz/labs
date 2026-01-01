/**
 * Sound options for chord playback
 */

export type SoundType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'piano';

export interface SoundOptions {
  type: SoundType;
}

export const SOUND_OPTIONS: Array<{ value: SoundType; label: string; description: string }> = [
  { value: 'sine', label: 'Sine Wave', description: 'Smooth, pure tone' },
  { value: 'square', label: 'Square Wave', description: 'Bright, digital sound' },
  { value: 'sawtooth', label: 'Sawtooth Wave', description: 'Rich, harmonic sound' },
  { value: 'triangle', label: 'Triangle Wave', description: 'Mellow, soft sound' },
  { value: 'piano', label: 'Piano', description: 'Piano sample (coming soon)' },
];

