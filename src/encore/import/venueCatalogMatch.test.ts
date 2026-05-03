import { describe, expect, it } from 'vitest';
import {
  bestVenueFromCatalog,
  stripLeadingDateNoiseFromFileName,
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

describe('suggestPerformanceVenueFromFile', () => {
  it('falls back to a filename token when catalog does not match', () => {
    expect(suggestPerformanceVenueFromFile([], '2026-05-03-night-at-zanzibar.mp4')).toMatch(/Zanzibar/i);
  });

  it('still prefers catalog when both could apply', () => {
    const catalog = ['Zanzibar Room'];
    expect(suggestPerformanceVenueFromFile(catalog, '2026-05-03-zanzibar-room.mp4')).toBe('Zanzibar Room');
  });
});
