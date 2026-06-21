import { describe, it, expect } from 'vitest';
import { syllableForPosition, takadimiLabelForPosition } from './syllableMap';

describe('syllableForPosition', () => {
  it('L=1: just the beat number', () => {
    const e = syllableForPosition(1, 0, 3);
    expect(e.label).toBe('3');
    expect(e.sampleId).toBe('beat-3');
  });

  it('L=2: [N, +]', () => {
    expect(syllableForPosition(2, 0, 1)).toEqual({ label: '1', sampleId: 'beat-1' });
    expect(syllableForPosition(2, 1, 1)).toEqual({ label: '+', sampleId: 'and' });
  });

  it('L=3: [N, +, a]', () => {
    expect(syllableForPosition(3, 0, 2)).toEqual({ label: '2', sampleId: 'beat-2' });
    expect(syllableForPosition(3, 1, 2)).toEqual({ label: '+', sampleId: 'and' });
    expect(syllableForPosition(3, 2, 2)).toEqual({ label: 'a', sampleId: 'uh' });
  });

  it('L=4: [N, e, +, a]', () => {
    expect(syllableForPosition(4, 0, 1)).toEqual({ label: '1', sampleId: 'beat-1' });
    expect(syllableForPosition(4, 1, 1)).toEqual({ label: 'e', sampleId: 'ee' });
    expect(syllableForPosition(4, 2, 1)).toEqual({ label: '+', sampleId: 'and' });
    expect(syllableForPosition(4, 3, 1)).toEqual({ label: 'a', sampleId: 'uh' });
  });

  it('L=6: [N, e, +, e, +, a]', () => {
    expect(syllableForPosition(6, 0, 1)).toEqual({ label: '1', sampleId: 'beat-1' });
    expect(syllableForPosition(6, 1, 1)).toEqual({ label: 'e', sampleId: 'ee' });
    expect(syllableForPosition(6, 2, 1)).toEqual({ label: '+', sampleId: 'and' });
    expect(syllableForPosition(6, 3, 1)).toEqual({ label: 'e', sampleId: 'ee' });
    expect(syllableForPosition(6, 4, 1)).toEqual({ label: '+', sampleId: 'and' });
    expect(syllableForPosition(6, 5, 1)).toEqual({ label: 'a', sampleId: 'uh' });
  });

  it('L=5: numeric fallback [N, 2, 3, 4, 5]', () => {
    expect(syllableForPosition(5, 0, 1)).toEqual({ label: '1', sampleId: 'beat-1' });
    expect(syllableForPosition(5, 1, 1)).toEqual({ label: '2', sampleId: 'beat-2' });
    expect(syllableForPosition(5, 2, 1)).toEqual({ label: '3', sampleId: 'beat-3' });
    expect(syllableForPosition(5, 3, 1)).toEqual({ label: '4', sampleId: 'beat-4' });
    expect(syllableForPosition(5, 4, 1)).toEqual({ label: '5', sampleId: 'beat-5' });
  });

  it('L=7+: numeric fallback', () => {
    expect(syllableForPosition(7, 0, 3)).toEqual({ label: '3', sampleId: 'beat-3' });
    expect(syllableForPosition(7, 1, 3)).toEqual({ label: '2', sampleId: 'beat-2' });
    expect(syllableForPosition(7, 6, 3)).toEqual({ label: '7', sampleId: 'beat-7' });
  });

  it('caps beat number at 12', () => {
    expect(syllableForPosition(1, 0, 15).sampleId).toBe('beat-12');
  });

  it('caps fallback sample IDs at 12', () => {
    expect(syllableForPosition(15, 13, 1).sampleId).toBe('beat-12');
  });
});

describe('takadimiLabelForPosition', () => {
  it('L=1: ta', () => {
    expect(takadimiLabelForPosition(1, 0)).toBe('ta');
  });

  it('L=2: ta, di', () => {
    expect(takadimiLabelForPosition(2, 0)).toBe('ta');
    expect(takadimiLabelForPosition(2, 1)).toBe('di');
  });

  it('L=3: ta, ki, da', () => {
    expect(takadimiLabelForPosition(3, 0)).toBe('ta');
    expect(takadimiLabelForPosition(3, 1)).toBe('ki');
    expect(takadimiLabelForPosition(3, 2)).toBe('da');
  });

  it('L=4: ta, ka, di, mi', () => {
    expect(takadimiLabelForPosition(4, 0)).toBe('ta');
    expect(takadimiLabelForPosition(4, 1)).toBe('ka');
    expect(takadimiLabelForPosition(4, 2)).toBe('di');
    expect(takadimiLabelForPosition(4, 3)).toBe('mi');
  });

  it('L=6: cycles through ta, ka, di, mi, ta, ka', () => {
    expect(takadimiLabelForPosition(6, 0)).toBe('ta');
    expect(takadimiLabelForPosition(6, 1)).toBe('ka');
    expect(takadimiLabelForPosition(6, 2)).toBe('di');
    expect(takadimiLabelForPosition(6, 3)).toBe('mi');
    expect(takadimiLabelForPosition(6, 4)).toBe('ta');
    expect(takadimiLabelForPosition(6, 5)).toBe('ka');
  });

  it('L=5: ta, ka, di, mi, ti (standard quintuplet)', () => {
    expect(takadimiLabelForPosition(5, 0)).toBe('ta');
    expect(takadimiLabelForPosition(5, 1)).toBe('ka');
    expect(takadimiLabelForPosition(5, 2)).toBe('di');
    expect(takadimiLabelForPosition(5, 3)).toBe('mi');
    expect(takadimiLabelForPosition(5, 4)).toBe('ti');
  });
});
