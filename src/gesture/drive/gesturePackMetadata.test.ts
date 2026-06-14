import { describe, expect, it } from 'vitest';
import {
  defaultUploadCollectionName,
  filterGestureUploadImageFiles,
  isDefaultCollectionName,
  sanitizePackFolderName,
} from './gesturePackMetadata';

describe('gesturePackMetadata', () => {
  it('sanitizes invalid Drive folder characters', () => {
    expect(sanitizePackFolderName('  Hands / Study  ')).toBe('Hands Study');
  });

  it('uses a dated default when the name is empty', () => {
    expect(sanitizePackFolderName('')).toBe(defaultUploadCollectionName());
    expect(isDefaultCollectionName('Collection Jun 13')).toBe(true);
    expect(isDefaultCollectionName('My hands')).toBe(false);
  });

  it('filters local image files', () => {
    const files = [
      new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['x'], 'b.txt', { type: 'text/plain' }),
    ];
    expect(filterGestureUploadImageFiles(files)).toHaveLength(1);
  });
});
