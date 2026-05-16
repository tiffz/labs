import { describe, expect, it } from 'vitest';
import {
  bestVenueFromCatalog,
  fallbackVenueFromFileName,
  stripLeadingDateNoiseFromFileName,
  stripTrailingDuplicateSuffix,
  suggestPerformanceVenueFromFile,
} from './venueCatalogMatch';

describe('bestVenueFromCatalog', () => {
  it('matches when an ISO date prefix precedes the venue in the file name', () => {
    const catalog = ['The Blue Note', 'Other Club'];
    expect(bestVenueFromCatalog(catalog, { fileName: '2026-05-03-The-Blue-Note-set.mp4' })).toBe('The Blue Note');
  });

  it('returns empty when catalog is empty', () => {
    expect(bestVenueFromCatalog([], { fileName: 'Blue Moon.mp4' })).toBe('');
  });

  it('returns empty when file name has no usable tokens', () => {
    expect(bestVenueFromCatalog(['The Ritz'], { fileName: 'a.mp4' })).toBe('');
  });

  it('matches token overlap between file name and catalog', () => {
    const catalog = ['The Blue Note', 'Other Club'];
    expect(bestVenueFromCatalog(catalog, { fileName: 'Set at Blue Note 2024.mp4' })).toBe('The Blue Note');
  });

  it('uses parent path hint with file name', () => {
    const catalog = ['Cafe Nordo'];
    expect(
      bestVenueFromCatalog(catalog, {
        fileName: 'opening.mp4',
        parentPathHint: 'Shows / Cafe Nordo / 2025',
      }),
    ).toBe('Cafe Nordo');
  });

  it('prefers the longer catalog entry when both match as substrings', () => {
    const catalog = ['Ritz', 'The Ritz Hotel'];
    expect(bestVenueFromCatalog(catalog, { fileName: 'The Ritz Hotel gala.mp4' })).toBe('The Ritz Hotel');
  });
});

describe('stripLeadingDateNoiseFromFileName', () => {
  it('strips leading ISO dates repeatedly', () => {
    expect(stripLeadingDateNoiseFromFileName('2026-05-03-recording.mp4')).toBe('recording');
  });
});

describe('stripTrailingDuplicateSuffix', () => {
  it('removes the OS duplicate-download suffix', () => {
    expect(stripTrailingDuplicateSuffix('My Clip (1)')).toBe('My Clip');
    expect(stripTrailingDuplicateSuffix('12 (1)')).toBe('12');
    expect(stripTrailingDuplicateSuffix('show (12)')).toBe('show');
  });

  it('leaves real parenthetical venue text alone', () => {
    expect(stripTrailingDuplicateSuffix('Bar (Upstairs)')).toBe('Bar (Upstairs)');
    expect(stripTrailingDuplicateSuffix('Cafe (Live Set)')).toBe('Cafe (Live Set)');
  });

  it('only strips a trailing suffix, not an interior one', () => {
    expect(stripTrailingDuplicateSuffix('clip (1) edit')).toBe('clip (1) edit');
  });
});

describe('fallbackVenueFromFileName', () => {
  it('returns empty for filenames that are only digits + duplicate suffix', () => {
    // The reported bug: `"12 (1).mp4"` was returning the venue `"(1)"`.
    expect(fallbackVenueFromFileName('12 (1).mp4')).toBe('');
    expect(fallbackVenueFromFileName('(1).mp4')).toBe('');
    expect(fallbackVenueFromFileName('IMG_2345.mov')).toBe('');
  });

  it('uses the meaningful stem when the duplicate suffix is the only noise', () => {
    expect(fallbackVenueFromFileName('Zanzibar (1).mp4')).toMatch(/Zanzibar/i);
  });
});

describe('suggestPerformanceVenueFromFile', () => {
  it('falls back to a filename token when catalog does not match', () => {
    expect(suggestPerformanceVenueFromFile([], '2026-05-03-night-at-zanzibar.mp4')).toMatch(/Zanzibar/i);
  });

  it('still prefers catalog when both could apply', () => {
    const catalog = ['Zanzibar Room'];
    expect(suggestPerformanceVenueFromFile(catalog, '2026-05-03-zanzibar-room.mp4')).toBe('Zanzibar Room');
  });

  it('returns an empty venue rather than guessing from numeric duplicate-suffix names', () => {
    expect(suggestPerformanceVenueFromFile([], '12 (1).mp4')).toBe('');
    expect(suggestPerformanceVenueFromFile(['Blue Note'], '12 (1).mp4')).toBe('');
  });
});
