import { describe, expect, it } from 'vitest';

import {
  ENCORE_APP_FOLDER_NAME,
  ENCORE_ORIGINALS_FOLDER_NAME,
  ENCORE_ORIGINALS_MANIFEST_NAME,
  parseEncoreOriginalSong,
} from '../../../shared/federation/encoreOriginalsReader';
import {
  ENCORE_ORIGINALS_FOLDER,
  ENCORE_ORIGINALS_MANIFEST_FILE,
  ENCORE_ROOT_FOLDER,
} from '../../drive/constants';
import { createBlankOriginalSong } from '../types';

/**
 * ADR 0032: other apps read Encore's originals through the shared reader. This fails the day Encore
 * renames a folder, the manifest, or a song field the reader depends on.
 */
describe('Encore originals, as other apps read them', () => {
  it('the reader looks where Encore writes', () => {
    expect(ENCORE_APP_FOLDER_NAME).toBe(ENCORE_ROOT_FOLDER);
    expect(ENCORE_ORIGINALS_FOLDER_NAME).toBe(ENCORE_ORIGINALS_FOLDER);
    expect(ENCORE_ORIGINALS_MANIFEST_NAME).toBe(ENCORE_ORIGINALS_MANIFEST_FILE);
  });

  it('a song as Encore writes it (JSON of the row) parses with its title, lyrics and clock', () => {
    const song = { ...createBlankOriginalSong(), title: 'Moon', lyricsAndChords: '[C]Hello' };
    expect(parseEncoreOriginalSong(JSON.stringify(song))).toEqual({
      id: song.id,
      title: 'Moon',
      lyricsAndChords: '[C]Hello',
      instrumental: false,
      startedAt: song.startedAt,
      updatedAt: song.updatedAt,
    });
  });
});
