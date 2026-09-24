import { describe, expect, it } from 'vitest';
import { parseChartMetadataHeader } from './chartMetadataHeader';

describe('parseChartMetadataHeader', () => {
  it('reads the reported case and removes it from the body', () => {
    const result = parseChartMetadataHeader('Key: C\nBPM: 84\n\n[Verse 1]\nC\nWords');
    expect(result.key).toBe('C');
    expect(result.bpm).toBe(84);
    expect(result.body).toBe('[Verse 1]\nC\nWords');
    expect(result.recognized).toEqual(['key', 'bpm']);
  });

  it.each([
    ['Key: Cm', { key: 'Cm' }],
    ['key: f#', { key: 'f#' }],
    ['Tempo: 120', { bpm: 120 }],
    ['{key: C}', { key: 'C' }],
    ['{tempo: 96}', { bpm: 96 }],
    ['Capo: 2', { capo: 2 }],
    ['Time: 6/8', { timeSignature: '6/8' }],
    ['Time signature: 3 / 4', { timeSignature: '3/4' }],
  ])('parses %j', (line, expected) => {
    expect(parseChartMetadataHeader(line)).toMatchObject(expected);
  });

  it('leaves a chart with no metadata completely untouched', () => {
    const chart = '[Verse 1]\nC       F\nWords here';
    const result = parseChartMetadataHeader(chart);
    expect(result.body).toBe(chart);
    expect(result.recognized).toEqual([]);
    expect(result.key).toBeUndefined();
  });

  /**
   * The line that matters most. Hijacking a lyric further down the song would silently delete a
   * line of someone's writing, which is worse than failing to read a tempo.
   */
  it('does not touch a metadata-looking line after the song has started', () => {
    const chart = '[Verse 1]\nC\nKey: C is where I live\n\n[Chorus]\nTempo: 84 beats a minute';
    const result = parseChartMetadataHeader(chart);
    expect(result.body).toBe(chart);
    expect(result.recognized).toEqual([]);
  });

  it('ignores values that are not plausible', () => {
    expect(parseChartMetadataHeader('Key: banana').recognized).toEqual([]);
    expect(parseChartMetadataHeader('BPM: 4').recognized).toEqual([]);
    expect(parseChartMetadataHeader('BPM: 9000').recognized).toEqual([]);
    expect(parseChartMetadataHeader('Mood: wistful').recognized).toEqual([]);
  });

  it('stops at the first line that is not metadata', () => {
    const result = parseChartMetadataHeader('Key: G\nSome title line\nBPM: 90\n[Verse 1]');
    expect(result.key).toBe('G');
    expect(result.bpm).toBeUndefined();
    expect(result.body).toBe('Some title line\nBPM: 90\n[Verse 1]');
  });

  it('keeps the first value when a field repeats, and consumes the duplicate', () => {
    const result = parseChartMetadataHeader('Key: C\nKey: D\n[Verse 1]');
    expect(result.key).toBe('C');
    expect(result.body).toBe('[Verse 1]');
  });
});
