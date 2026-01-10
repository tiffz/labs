/**
 * Tests for Sample Loader utility functions
 */

import { describe, it, expect } from 'vitest';
import { noteToMidi, findBestSample, type LoadedSample, type VelocityLayer } from './sampleLoader';

describe('noteToMidi', () => {
  it('converts C4 (middle C) to MIDI note 60', () => {
    expect(noteToMidi('C4')).toBe(60);
  });

  it('converts A4 (concert pitch) to MIDI note 69', () => {
    expect(noteToMidi('A4')).toBe(69);
  });

  it('converts A0 (lowest piano key) to MIDI note 21', () => {
    expect(noteToMidi('A0')).toBe(21);
  });

  it('converts C8 (highest piano key) to MIDI note 108', () => {
    expect(noteToMidi('C8')).toBe(108);
  });

  it('handles sharps correctly', () => {
    expect(noteToMidi('C#4')).toBe(61);
    expect(noteToMidi('F#3')).toBe(54);
  });

  it('handles flats correctly', () => {
    expect(noteToMidi('Db4')).toBe(61);
    expect(noteToMidi('Bb3')).toBe(58);
  });

  it('throws error for invalid note names', () => {
    expect(() => noteToMidi('X4')).toThrow('Invalid note name');
    expect(() => noteToMidi('C')).toThrow('Invalid note name');
    expect(() => noteToMidi('')).toThrow('Invalid note name');
  });
});

describe('findBestSample', () => {
  const mockVelocityLayers: VelocityLayer[] = [
    { name: 'soft', velocityMin: 0, velocityMax: 0.5, suffix: 'v1' },
    { name: 'loud', velocityMin: 0.5, velocityMax: 1.0, suffix: 'v2' },
  ];

  const mockSamples: LoadedSample[] = [
    { note: 'C4', midiNote: 60, buffer: {} as AudioBuffer, velocityLayer: 'soft' },
    { note: 'C4', midiNote: 60, buffer: {} as AudioBuffer, velocityLayer: 'loud' },
    { note: 'F4', midiNote: 65, buffer: {} as AudioBuffer, velocityLayer: 'soft' },
    { note: 'F4', midiNote: 65, buffer: {} as AudioBuffer, velocityLayer: 'loud' },
  ];

  it('returns null for empty samples array', () => {
    const result = findBestSample(60, 0.5, [], mockVelocityLayers);
    expect(result).toBeNull();
  });

  it('finds exact match when available', () => {
    const result = findBestSample(60, 0.3, mockSamples, mockVelocityLayers);
    expect(result).not.toBeNull();
    expect(result!.sample.midiNote).toBe(60);
    expect(result!.pitchShift).toBe(0);
  });

  it('selects correct velocity layer for soft velocity', () => {
    const result = findBestSample(60, 0.3, mockSamples, mockVelocityLayers);
    expect(result!.sample.velocityLayer).toBe('soft');
  });

  it('selects correct velocity layer for loud velocity', () => {
    const result = findBestSample(60, 0.8, mockSamples, mockVelocityLayers);
    expect(result!.sample.velocityLayer).toBe('loud');
  });

  it('calculates correct pitch shift for notes between samples', () => {
    // D4 (MIDI 62) should use C4 (MIDI 60) with +2 semitone shift
    const result = findBestSample(62, 0.3, mockSamples, mockVelocityLayers);
    expect(result).not.toBeNull();
    expect(result!.sample.midiNote).toBe(60);
    expect(result!.pitchShift).toBe(2);
  });

  it('finds closest sample when exact match not available', () => {
    // E4 (MIDI 64) is closer to F4 (MIDI 65) than C4 (MIDI 60)
    const result = findBestSample(64, 0.3, mockSamples, mockVelocityLayers);
    expect(result).not.toBeNull();
    expect(result!.sample.midiNote).toBe(65);
    expect(result!.pitchShift).toBe(-1);
  });

  it('falls back to any sample if velocity layer has no samples', () => {
    const samplesOnlyLoud: LoadedSample[] = [
      { note: 'C4', midiNote: 60, buffer: {} as AudioBuffer, velocityLayer: 'loud' },
    ];
    // Request soft velocity but only loud samples exist
    const result = findBestSample(60, 0.2, samplesOnlyLoud, mockVelocityLayers);
    expect(result).not.toBeNull();
    expect(result!.sample.velocityLayer).toBe('loud');
  });
});
