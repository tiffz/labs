import { describe, expect, it } from 'vitest';
import {
  gestureDriveUploadFileName,
  gestureDriveUploadFileNameFromRelativePath,
  gestureDriveUploadFileNameWithSuffix,
} from './gestureDriveUploadFileName';

function fileWithPath(path: string): File {
  const name = path.split('/').pop() ?? path;
  const file = new File(['x'], name, { type: 'image/jpeg' });
  Object.defineProperty(file, 'webkitRelativePath', { value: path, configurable: true });
  return file;
}

describe('gestureDriveUploadFileName', () => {
  it('uses basename for loose files', () => {
    const file = new File(['x'], 'cat.jpg', { type: 'image/jpeg' });
    expect(gestureDriveUploadFileName(file)).toBe('cat.jpg');
  });

  it('flattens folder paths so same basename in different folders stays unique', () => {
    expect(gestureDriveUploadFileName(fileWithPath('Cats/a.jpg'))).toBe('Cats__a.jpg');
    expect(gestureDriveUploadFileName(fileWithPath('Dogs/a.jpg'))).toBe('Dogs__a.jpg');
    expect(gestureDriveUploadFileName(fileWithPath('Cats/a.jpg'))).not.toBe(
      gestureDriveUploadFileName(fileWithPath('Dogs/a.jpg')),
    );
  });

  it('builds from manifest relative paths', () => {
    expect(gestureDriveUploadFileNameFromRelativePath('Folder/sub/x.png', 'x.png')).toBe('Folder__sub__x.png');
  });

  it('adds numeric suffixes for within-batch collisions', () => {
    expect(gestureDriveUploadFileNameWithSuffix('photo.jpg', 1)).toBe('photo.jpg');
    expect(gestureDriveUploadFileNameWithSuffix('photo.jpg', 2)).toBe('photo_2.jpg');
  });
});
