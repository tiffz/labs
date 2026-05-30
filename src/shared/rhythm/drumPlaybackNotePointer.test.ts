import { describe, expect, it } from 'vitest';
import { parseRhythm } from './rhythmParser';
import { resolveDrumPlaybackNotePointer } from './drumPlaybackNotePointer';

describe('resolveDrumPlaybackNotePointer', () => {
  const timeSignature = { numerator: 4, denominator: 4 };
  const baladi = parseRhythm('D-D-__T-D---T---', timeSignature);

  it('returns null when playback time is invalid', () => {
    expect(resolveDrumPlaybackNotePointer(baladi, timeSignature, 80, -1)).toBeNull();
  });

  it('tracks Baladi note indices across a 4/4 measure', () => {
    const bpm = 80;
    expect(resolveDrumPlaybackNotePointer(baladi, timeSignature, bpm, 0)?.noteIndex).toBe(0);
    expect(resolveDrumPlaybackNotePointer(baladi, timeSignature, bpm, 0.5)?.noteIndex).toBe(1);
    expect(resolveDrumPlaybackNotePointer(baladi, timeSignature, bpm, 0.75)?.noteIndex).toBe(2);
    expect(resolveDrumPlaybackNotePointer(baladi, timeSignature, bpm, 1.5)?.noteIndex).toBe(4);
  });
});
