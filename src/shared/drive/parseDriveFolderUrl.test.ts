import { describe, expect, it } from 'vitest';

import {
  parseDriveFolderIdFromUrlOrId,
  parseDriveFolderIdFromUserInput,
} from './parseDriveFolderUrl';

describe('parseDriveFolderUrl', () => {
  it('parses folder browser URLs', () => {
    expect(parseDriveFolderIdFromUrlOrId('https://drive.google.com/drive/folders/abc123XYZ_-')).toBe(
      'abc123XYZ_-',
    );
  });

  it('parses raw folder ids', () => {
    expect(parseDriveFolderIdFromUserInput('abcdefghijklmnopqrstuvwxyz123456')).toBe(
      'abcdefghijklmnopqrstuvwxyz123456',
    );
  });

  it('returns null for empty input', () => {
    expect(parseDriveFolderIdFromUserInput('')).toBeNull();
  });
});
