import { describe, expect, it } from 'vitest';
import {
  chordProLyricSnippet,
  extractChordSymbolsFromText,
  isChordProSectionHeaderLine,
  parseChordProLine,
  parseChordProSectionHeader,
  parseChordProSections,
  semitonesBetweenKeys,
  transposeChordProDocument,
} from './chordProText';

describe('chordProText', () => {
  it('parses inline chords', () => {
    expect(parseChordProLine("[Fm]I'm not like [Bb]you")).toEqual([
      { kind: 'chord', value: 'Fm' },
      { kind: 'text', value: "I'm not like " },
      { kind: 'chord', value: 'Bb' },
      { kind: 'text', value: 'you' },
    ]);
  });

  it('strips chords for snippet', () => {
    expect(chordProLyricSnippet('[Ab]Just meet me on the moon')).toBe('Just meet me on the moon');
  });

  it('parses sections', () => {
    const doc = `[Verse 1]
[F]Line one
[Chorus]
[G]Hook`;
    const sections = parseChordProSections(doc);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.header).toBe('Verse 1');
    expect(sections[1]?.typeKey).toBe('Chorus');
  });

  it('transposes chords', () => {
    expect(transposeChordProDocument('[C]hello [Am]world', 2)).toBe('[D]hello [Bm]world');
  });

  it('extracts symbols', () => {
    expect(extractChordSymbolsFromText('[C][G][Am]')).toEqual(['C', 'G', 'Am']);
  });

  it('computes semitones between keys', () => {
    expect(semitonesBetweenKeys('C', 'D')).toBe(2);
  });

  it('detects section headers', () => {
    expect(isChordProSectionHeaderLine('[Verse 1]')).toBe(true);
    expect(isChordProSectionHeaderLine('[Verse 1] - Starts on G3')).toBe(true);
    expect(isChordProSectionHeaderLine('plain line')).toBe(false);
    expect(isChordProSectionHeaderLine('[Dm]')).toBe(false);
    expect(isChordProSectionHeaderLine('[Cmaj7]')).toBe(false);
    expect(parseChordProSectionHeader('[Dm]')).toBeNull();
    expect(parseChordProSectionHeader('[Verse 1] - Starts on G3')).toBe('Verse 1');
  });

  it('does not split on standalone chord-only lines after a section header', () => {
    const doc = `[Chorus]
[Dm]
Let it crash, let it pour.`;
    const sections = parseChordProSections(doc);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.header).toBe('Chorus');
    expect(sections[0]?.lines).toEqual(['[Dm]', 'Let it crash, let it pour.']);
  });
});
