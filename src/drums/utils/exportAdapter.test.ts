import { describe, expect, it, vi } from 'vitest';
import { createDrumsExportAdapter } from './exportAdapter';
import type { ParsedRhythm, TimeSignature } from '../types';
import { DEFAULT_SETTINGS } from '../types/settings';

vi.mock('./scoreExport', () => ({
  exportDrumsScoreSheet: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
}));

const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
const rhythm: ParsedRhythm = {
  isValid: true,
  measures: [
    {
      notes: [{ sound: 'dum', duration: 'sixteenth', durationInSixteenths: 16, isDotted: false }],
      totalDuration: 16,
    },
  ],
  timeSignature,
  repeats: [],
  measureMapping: [{ sourceMeasureIndex: 0, sourceStringIndex: 0 }],
};

describe('createDrumsExportAdapter', () => {
  it('supports score sheet export formats', async () => {
    const adapter = createDrumsExportAdapter({
      rhythm,
      bpm: 100,
      playbackSettings: DEFAULT_SETTINGS,
      metronomeEnabled: false,
      notation: 'D---T---K---T---',
      timeSignature,
    });

    expect(adapter.supportsFormat('png')).toBe(true);
    expect(adapter.supportsFormat('pdf')).toBe(true);
    expect(adapter.defaultScoreTitle).toBe('Custom Rhythm');
    expect(adapter.renderScoreSheet).toBeDefined();

    const blob = await adapter.renderScoreSheet?.({ format: 'png', title: 'Ayoub' });
    expect(blob?.type).toBe('image/png');
  });
});
