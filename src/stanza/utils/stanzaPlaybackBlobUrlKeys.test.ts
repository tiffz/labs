import { describe, expect, it } from 'vitest';
import type { StanzaSong, StanzaStemTrack } from '../db/stanzaDb';
import {
  stanzaPrimaryLocalBlobKey,
  stanzaStemBlobIdentityKeySorted,
  stanzaStemUrlKeyFromSong,
} from './stanzaPlaybackBlobUrlKeys';

function stem(id: string, size: number): StanzaStemTrack {
  return { id, label: id, localBlob: new Blob([new Uint8Array(size)], { type: 'audio/wav' }) };
}

describe('stanzaPlaybackBlobUrlKeys', () => {
  it('stanzaStemBlobIdentityKeySorted ignores stem order', () => {
    const a = stem('b', 3);
    const c = stem('a', 2);
    expect(stanzaStemBlobIdentityKeySorted([a, c])).toBe(stanzaStemBlobIdentityKeySorted([c, a]));
    expect(stanzaStemBlobIdentityKeySorted([a, c])).toBe('a:2\u0000b:3');
  });

  it('stanzaStemUrlKeyFromSong is stable across stem reorder', () => {
    const base: Omit<StanzaSong, 'stems'> = {
      id: 'song-1',
      ytId: null,
      title: 'T',
      markers: [],
      stats: {},
      updatedAt: 1,
      localAudioBlob: new Blob([new Uint8Array(9)], { type: 'audio/wav' }),
    };
    const s1: StanzaSong = {
      ...base,
      stems: [stem('stem-z', 4), stem('stem-a', 5)],
    };
    const s2: StanzaSong = {
      ...base,
      stems: [stem('stem-a', 5), stem('stem-z', 4)],
    };
    expect(stanzaStemUrlKeyFromSong(s1)).toBe(stanzaStemUrlKeyFromSong(s2));
  });

  it('stanzaStemUrlKeyFromSong changes when the primary local blob identity changes', () => {
    const base: Omit<StanzaSong, 'stems'> = {
      id: 'song-1',
      ytId: null,
      title: 'T',
      markers: [],
      stats: {},
      updatedAt: 1,
      localAudioBlob: new Blob([new Uint8Array(9)], { type: 'audio/wav' }),
    };
    const stems = [stem('stem-a', 5)];
    const k9 = stanzaStemUrlKeyFromSong({ ...base, stems });
    const k10 = stanzaStemUrlKeyFromSong({
      ...base,
      localAudioBlob: new Blob([new Uint8Array(10)], { type: 'audio/wav' }),
      stems,
    });
    expect(k9).not.toBe(k10);
    expect(k9.startsWith(`${stanzaPrimaryLocalBlobKey({ ...base, stems })}\0`)).toBe(true);
  });

  it('stanzaStemUrlKeyFromSong works for YouTube rows with mix layers', () => {
    const song: StanzaSong = {
      id: 'yt-song',
      ytId: 'abc123',
      title: 'YT',
      markers: [],
      stats: {},
      updatedAt: 1,
      stems: [stem('layer-a', 8)],
    };
    expect(stanzaStemUrlKeyFromSong(song)).toBe('yt-song\u0000layer-a:8');
  });
});
