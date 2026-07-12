import { describe, expect, it } from 'vitest';

import { parseAndSortPageFiles } from '../../shared/zine/pageFileParser';
import { displayNameFromParsedPageFile, filterImageFilesForPageUpload } from './artPageUploadUtils';

describe('artPageUploadUtils', () => {
  it('filters to image files by mime or extension', () => {
    const files = [
      new File(['a'], 'page1.png', { type: 'image/png' }),
      new File(['b'], 'notes.txt', { type: 'text/plain' }),
      new File(['c'], 'page2.jpg', { type: '' }),
    ];
    expect(filterImageFilesForPageUpload(files).map((f) => f.name)).toEqual(['page1.png', 'page2.jpg']);
  });

  it('builds display names from Mixam-style parsed files', () => {
    const sorted = parseAndSortPageFiles([new File([], 'page2.png'), new File([], 'front.png')]);
    expect(displayNameFromParsedPageFile(sorted[0]!)).toBe('Front Cover');
    expect(displayNameFromParsedPageFile(sorted[1]!)).toBe('Page 2');
  });

  it('labels spreads from hyphenated filenames', () => {
    const [spread] = parseAndSortPageFiles([new File([], 'page3-4.png')]);
    expect(displayNameFromParsedPageFile(spread!)).toBe('Page 3 - Page 4');
    expect(spread?.isSpread).toBe(true);
  });
});
