import { describe, expect, it } from 'vitest';
import { isEncoreBulkImportVideoFile } from './driveFolderWalk';

describe('isEncoreBulkImportVideoFile', () => {
  it('accepts video/* mime types', () => {
    expect(isEncoreBulkImportVideoFile({ mimeType: 'video/mp4', name: 'x' })).toBe(true);
    expect(isEncoreBulkImportVideoFile({ mimeType: 'video/quicktime', name: 'x' })).toBe(true);
  });

  it('rejects Drive folders', () => {
    expect(isEncoreBulkImportVideoFile({ mimeType: 'application/vnd.google-apps.folder', name: 'Shows' })).toBe(
      false,
    );
  });

  it('accepts common extensions when mime is empty or generic', () => {
    expect(isEncoreBulkImportVideoFile({ mimeType: '', name: 'Clip.MOV' })).toBe(true);
    expect(isEncoreBulkImportVideoFile({ name: 'show.mp4' })).toBe(true);
    expect(isEncoreBulkImportVideoFile({ name: 'take.m4v' })).toBe(true);
    expect(isEncoreBulkImportVideoFile({ name: 'readme.txt' })).toBe(false);
  });
});
