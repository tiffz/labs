import { describe, expect, it } from 'vitest';
import { bestVenueFromCatalog } from './venueCatalogMatch';

describe('bestVenueFromCatalog', () => {
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
