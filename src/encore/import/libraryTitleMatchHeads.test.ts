import { describe, expect, it } from 'vitest';
import { libraryTitleMatchHeads } from './libraryTitleMatchHeads';

describe('libraryTitleMatchHeads', () => {
  it('adds primary head before soundtrack - From "…" suffix', () => {
    const h = libraryTitleMatchHeads('Let It Go - From "Frozen"/Soundtrack Version');
    expect(h).toEqual(['Let It Go - From "Frozen"/Soundtrack Version', 'Let It Go']);
  });

  it('handles curly open quote after From', () => {
    const h = libraryTitleMatchHeads('Let It Go - From \u201cFrozen\u201d/Soundtrack');
    expect(h).toContain('Let It Go');
  });

  it('extracts head from (From "…") form', () => {
    const h = libraryTitleMatchHeads('Wish My Life Away (From "Finding Paradise")');
    expect(h).toEqual(['Wish My Life Away (From "Finding Paradise")', 'Wish My Life Away']);
  });

  it('does not split when From is not a soundtrack tag', () => {
    const t = 'Walking - From Memphis';
    expect(libraryTitleMatchHeads(t)).toEqual([t]);
  });

  it('returns single entry for plain titles', () => {
    expect(libraryTitleMatchHeads('Memory')).toEqual(['Memory']);
  });
});
