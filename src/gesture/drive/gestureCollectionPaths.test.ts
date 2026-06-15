import { describe, expect, it } from 'vitest';
import {
  basenameFromCollectionPath,
  collectionRelativePath,
  driveUploadBasename,
  subfolderSegments,
  topLevelSubfolderCounts,
} from './gestureCollectionPaths';

function fileWithPath(path: string, type = 'image/jpeg'): File {
  const name = path.split('/').pop() ?? path;
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'webkitRelativePath', { value: path, configurable: true });
  return file;
}

describe('gestureCollectionPaths', () => {
  it('strips the collection root from webkitRelativePath', () => {
    const file = fileWithPath('Hands/nested/a.jpg');
    expect(collectionRelativePath(file, 'Hands')).toBe('nested/a.jpg');
    expect(subfolderSegments('nested/a.jpg')).toEqual(['nested']);
    expect(basenameFromCollectionPath('nested/a.jpg')).toBe('a.jpg');
    expect(driveUploadBasename(file, 'Hands')).toBe('a.jpg');
  });

  it('keeps nested paths when root is unknown', () => {
    const file = fileWithPath('nested/a.jpg');
    expect(collectionRelativePath(file)).toBe('nested/a.jpg');
  });

  it('summarizes top-level subfolders from pack file paths', () => {
    expect(
      topLevelSubfolderCounts(['session 1/a.jpg', 'session 1/b.jpg', 'session 2/c.jpg', 'root.jpg']),
    ).toEqual([
      { name: 'session 1', count: 2 },
      { name: 'session 2', count: 1 },
    ]);
  });
});
