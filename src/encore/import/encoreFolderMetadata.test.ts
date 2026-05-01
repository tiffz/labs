import { describe, expect, it } from 'vitest';
import { parseEncoreFolderMetadata } from './encoreFolderMetadata';

describe('parseEncoreFolderMetadata', () => {
  it('returns empty residual when hint is empty', () => {
    expect(parseEncoreFolderMetadata('')).toEqual({
      residualPathHint: '',
    });
  });

  it('parses Venue with case-insensitive key', () => {
    expect(parseEncoreFolderMetadata("Shows / venue - Martuni's / ")).toEqual({
      venue: "Martuni's",
      residualPathHint: 'Shows / ',
    });
  });

  it('parses Artist', () => {
    expect(parseEncoreFolderMetadata('Artist - Sara Bareilles / ')).toEqual({
      artist: 'Sara Bareilles',
      residualPathHint: '',
    });
  });

  it('parses Accompaniment with comma-separated known tags', () => {
    const r = parseEncoreFolderMetadata('Accompaniment - Piano, Self-accompany, UnknownTag / ');
    expect(r.accompaniment).toEqual(['Piano', 'Self-accompany']);
    expect(r.residualPathHint).toBe('');
  });

  it('parses Date when YYYY-MM-DD is valid', () => {
    expect(parseEncoreFolderMetadata('Date - 2025-08-15 / ').date).toBe('2025-08-15');
  });

  it('ignores invalid Date values', () => {
    expect(parseEncoreFolderMetadata('Date - 2025-13-40 / ').date).toBeUndefined();
    expect(parseEncoreFolderMetadata('Date - not-a-date / ').date).toBeUndefined();
  });

  it('parses Key and Tags', () => {
    const r = parseEncoreFolderMetadata('Key - A major / Tags - Pop, Wedding / ');
    expect(r.performanceKey).toBe('A major');
    expect(r.tags).toEqual(['Pop', 'Wedding']);
  });

  it('dedupes Tags case-insensitively', () => {
    const r = parseEncoreFolderMetadata('Tags - pop, Pop, Jazz / ');
    expect(r.tags).toEqual(['pop', 'Jazz']);
  });

  it('deepest folder wins for the same key', () => {
    const r = parseEncoreFolderMetadata('Venue - Old Club / Venue - Martuni / ');
    expect(r.venue).toBe('Martuni');
    expect(r.residualPathHint).toBe('');
  });

  it('passes through plain folder names into residual', () => {
    const r = parseEncoreFolderMetadata("Shows / Martuni's / 2025 / ");
    expect(r.residualPathHint).toBe("Shows / Martuni's / 2025 / ");
  });

  it('mixes metadata and plain segments', () => {
    const r = parseEncoreFolderMetadata("Shows / Venue - Martuni's / Accompaniment - Guitar / ");
    expect(r.venue).toBe("Martuni's");
    expect(r.accompaniment).toEqual(['Guitar']);
    expect(r.residualPathHint).toBe('Shows / ');
  });

  it('does not treat Artist Workshop as metadata (must be Key - value)', () => {
    const r = parseEncoreFolderMetadata('Artist Workshop 2025 / ');
    expect(r.artist).toBeUndefined();
    expect(r.residualPathHint).toBe('Artist Workshop 2025 / ');
  });
});
