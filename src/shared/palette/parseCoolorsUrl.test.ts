import { describe, expect, it } from 'vitest';

import { parseCoolorsUrl, parseHexListPaste, parsePalettegenUrlPaste, parsePalettePaste } from './parseCoolorsUrl';

describe('parseCoolorsUrl', () => {
  it('parses full Coolors palette URL', () => {
    expect(
      parseCoolorsUrl('https://coolors.co/cdb4db-ffc8dd-ffafcc-bde0fe-a2d2ff'),
    ).toEqual(['#cdb4db', '#ffc8dd', '#ffafcc', '#bde0fe', '#a2d2ff']);
  });

  it('parses path-only segments', () => {
    expect(parseCoolorsUrl('cdb4db-ffc8dd-ffafcc')).toEqual(['#cdb4db', '#ffc8dd', '#ffafcc']);
  });

  it('returns null for invalid input', () => {
    expect(parseCoolorsUrl('')).toBeNull();
    expect(parseCoolorsUrl('not-a-palette')).toBeNull();
  });
});

describe('parseHexListPaste', () => {
  it('parses comma-separated hex list', () => {
    expect(parseHexListPaste('#ff0000, #00ff00; 0000ff')).toEqual(['#ff0000', '#00ff00', '#0000ff']);
  });
});

describe('parsePalettegenUrlPaste', () => {
  it('parses palette share URLs', () => {
    expect(parsePalettegenUrlPaste('/palette/?colors=ff44a1,fbbf24,38bdf8')).toEqual([
      '#ff44a1',
      '#fbbf24',
      '#38bdf8',
    ]);
    expect(parsePalettegenUrlPaste('https://labs.example/palette/?colors=cdb4db,ffc8dd')).toEqual([
      '#cdb4db',
      '#ffc8dd',
    ]);
    expect(parsePalettegenUrlPaste('/palettegen/?colors=ff44a1,fbbf24,38bdf8')).toEqual([
      '#ff44a1',
      '#fbbf24',
      '#38bdf8',
    ]);
  });
});

describe('parsePalettePaste', () => {
  it('prefers palette URLs over hex lists', () => {
    expect(parsePalettePaste('/palette/?colors=111111,222222')).toEqual(['#111111', '#222222']);
  });
});
