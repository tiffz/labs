import { describe, expect, it, vi } from 'vitest';
import { createWordsExportAdapter } from './exportAdapter';
import type { ParsedRhythm } from '../../drums/types';

vi.mock('../../shared/music/midiAudioRender', () => ({
  renderMidiEventsToAudioBuffer: vi.fn(async () => ({ fake: 'buffer' } as unknown as AudioBuffer)),
}));

const TEST_RHYTHM: ParsedRhythm = {
  isValid: true,
  measures: [
    {
      notes: [
        { sound: 'dum', duration: 'quarter', durationInSixteenths: 4, isDotted: false },
        { sound: 'tak', duration: 'quarter', durationInSixteenths: 4, isDotted: false },
      ],
      totalDuration: 8,
    },
  ],
  timeSignature: { numerator: 4, denominator: 4 },
  measureMapping: [{ sourceMeasureIndex: 0, sourceStringIndex: 0 }],
};

describe('createWordsExportAdapter', () => {
  it('supports MIDI and audio export formats', () => {
    const adapter = createWordsExportAdapter({
      parsedRhythm: TEST_RHYTHM,
      bpm: 100,
      songKey: 'C',
      timeSignature: { numerator: 4, denominator: 4 },
      chordLabelsByMeasure: new Map([[0, 'C']]),
      chordStyleByMeasure: new Map([[0, 'simple']]),
    });
    expect(adapter.supportsFormat('midi')).toBe(true);
    expect(adapter.supportsFormat('wav')).toBe(true);
    expect(adapter.supportsFormat('mp3')).toBe(true);
    expect(adapter.supportsFormat('ogg')).toBe(true);
    expect(adapter.supportsFormat('flac')).toBe(true);
  });

  it('renders midi and audio for selected stems', async () => {
    const adapter = createWordsExportAdapter({
      parsedRhythm: TEST_RHYTHM,
      bpm: 100,
      songKey: 'C',
      timeSignature: { numerator: 4, denominator: 4 },
      chordLabelsByMeasure: new Map([[0, 'C']]),
      chordStyleByMeasure: new Map([[0, 'simple']]),
    });

    const midi = await adapter.renderMidi?.({ loopCount: 1, selectedStemIds: [] });
    expect(midi).toBeInstanceOf(Uint8Array);
    expect((midi as Uint8Array).length).toBeGreaterThan(20);

    const audio = await adapter.renderAudio?.({
      loopCount: 1,
      selectedStemIds: ['drums'],
      quality: { mp3BitrateKbps: 160 },
    });
    expect(audio?.mix).toBeDefined();
    expect(audio?.stems?.drums).toBeDefined();
  });
});
