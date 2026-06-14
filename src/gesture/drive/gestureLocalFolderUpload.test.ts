import { describe, expect, it } from 'vitest';
import {
  collectLocalFolderUploadImages,
  hasMultipleTopLevelFolders,
  inferLocalFolderName,
  isLocalFolderUpload,
  splitFilesByTopLevelFolder,
} from './gestureLocalFolderUpload';

function fileWithPath(path: string, type = 'image/jpeg'): File {
  const name = path.split('/').pop() ?? path;
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'webkitRelativePath', { value: path, configurable: true });
  return file;
}

describe('gestureLocalFolderUpload', () => {
  it('detects directory uploads', () => {
    expect(isLocalFolderUpload([fileWithPath('Hands/a.jpg')])).toBe(true);
    expect(isLocalFolderUpload([new File(['x'], 'a.jpg', { type: 'image/jpeg' })])).toBe(false);
  });

  it('infers the root folder name', () => {
    expect(inferLocalFolderName([fileWithPath('Life drawing/refs/01.jpg')])).toBe('Life drawing');
  });

  it('collects images from nested paths', () => {
    const files = [
      fileWithPath('Hands/a.jpg'),
      fileWithPath('Hands/notes.txt', 'text/plain'),
      fileWithPath('Hands/nested/b.png', 'image/png'),
    ];
    expect(collectLocalFolderUploadImages(files)).toHaveLength(2);
  });

  it('splits multi-root directory picks into separate batches', () => {
    const files = [
      fileWithPath('Cats/a.jpg'),
      fileWithPath('Dogs/b.jpg'),
    ];
    expect(hasMultipleTopLevelFolders(files)).toBe(true);
    expect(splitFilesByTopLevelFolder(files)).toEqual([
      { files: [files[0]], suggestedFolderName: 'Cats' },
      { files: [files[1]], suggestedFolderName: 'Dogs' },
    ]);
  });
});
