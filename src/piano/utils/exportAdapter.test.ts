import { describe, expect, it, vi } from 'vitest';
import { createPianoExportAdapter } from './exportAdapter';
import type { PianoScore } from '../types';

vi.mock('../../shared/music/midiAudioRender', () => ({
  renderMidiEventsToAudioBuffer: vi.fn(async () => ({ fake: 'buffer' } as unknown as AudioBuffer)),
}));

const TEST_SCORE: PianoScore = {
  id: 'test-score',
  title: 'Test Score',
  key: 'C',
  timeSignature: { numerator: 4, denominator: 4 },
  tempo: 100,
  parts: [
    {
      id: 'right',
      name: 'Right Hand',
      clef: 'treble',
      hand: 'right',
      measures: [{ notes: [{ id: 'n1', pitches: [60, 64, 67], duration: 'quarter' }] }],
    },
    {
      id: 'left',
      name: 'Left Hand',
      clef: 'bass',
      hand: 'left',
      measures: [{ notes: [{ id: 'n2', pitches: [48], duration: 'quarter' }] }],
    },
  ],
};

describe('createPianoExportAdapter', () => {
  it('supports MIDI and audio export formats', () => {
    const adapter = createPianoExportAdapter(TEST_SCORE);
    expect(adapter.supportsFormat('midi')).toBe(true);
    expect(adapter.supportsFormat('wav')).toBe(true);
    expect(adapter.supportsFormat('mp3')).toBe(true);
    expect(adapter.supportsFormat('ogg')).toBe(true);
    expect(adapter.supportsFormat('flac')).toBe(true);
  });

  it('renders MIDI bytes and stem-aware audio payload', async () => {
    const adapter = createPianoExportAdapter(TEST_SCORE);
    const midi = await adapter.renderMidi?.({ loopCount: 1, selectedStemIds: ['right'] });
    expect(midi).toBeInstanceOf(Uint8Array);
    expect((midi as Uint8Array).length).toBeGreaterThan(20);

    const audio = await adapter.renderAudio?.({
      loopCount: 1,
      selectedStemIds: ['right', 'left'],
      quality: { mp3BitrateKbps: 160 },
    });
    expect(audio?.mix).toBeDefined();
    expect(audio?.stems?.right).toBeDefined();
    expect(audio?.stems?.left).toBeDefined();
  });
});
