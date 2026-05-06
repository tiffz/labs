import { afterEach, describe, expect, it } from 'vitest';
import {
  readStanzaLastSelectedSongId,
  writeStanzaLastSelectedSongId,
} from './stanzaLastSelectedSong';

const KEY = 'stanza_last_selected_song_id';

afterEach(() => {
  window.localStorage.removeItem(KEY);
});

describe('stanzaLastSelectedSong', () => {
  it('round-trips a song id', () => {
    expect(readStanzaLastSelectedSongId()).toBeNull();
    writeStanzaLastSelectedSongId('abc-123');
    expect(readStanzaLastSelectedSongId()).toBe('abc-123');
  });

  it('clearing with null / empty / whitespace removes the entry', () => {
    writeStanzaLastSelectedSongId('abc-123');
    writeStanzaLastSelectedSongId(null);
    expect(readStanzaLastSelectedSongId()).toBeNull();

    writeStanzaLastSelectedSongId('xyz');
    writeStanzaLastSelectedSongId('   ');
    expect(readStanzaLastSelectedSongId()).toBeNull();
  });

  it('trims whitespace on read so a partially-edited storage value still works', () => {
    window.localStorage.setItem(KEY, '  abc-123  ');
    expect(readStanzaLastSelectedSongId()).toBe('abc-123');
  });
});
