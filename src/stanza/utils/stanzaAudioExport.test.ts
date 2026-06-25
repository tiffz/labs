import { describe, expect, it } from 'vitest';
import type { StanzaSong } from '../db/stanzaDb';
import {
  buildStanzaAudioExportFileStem,
  buildStanzaExportTracksFromSong,
  stanzaOriginalDownloadExtension,
  stanzaPlaybackTransformIsEdited,
} from './stanzaAudioExport';
import { createStanzaExportAdapter } from './stanzaExportAdapter';

describe('stanzaAudioExport', () => {
  it('maps common blob types to download extensions', () => {
    expect(stanzaOriginalDownloadExtension(new Blob([], { type: 'audio/mpeg' }), 'Song')).toBe('mp3');
    expect(stanzaOriginalDownloadExtension(new Blob([], { type: 'audio/wav' }), 'Song')).toBe('wav');
    expect(stanzaOriginalDownloadExtension(new Blob([], { type: '' }), 'Take.flac')).toBe('flac');
  });

  it('builds export tracks for main and mix layers', () => {
    const song: StanzaSong = {
      id: '1',
      ytId: null,
      title: 'Etude',
      markers: [],
      stats: {},
      updatedAt: 0,
      localAudioBlob: new Blob([], { type: 'audio/mpeg' }),
      stems: [
        {
          id: 'stem-1',
          label: 'Backing',
          localBlob: new Blob([], { type: 'audio/wav' }),
          muted: true,
        },
      ],
    };
    const tracks = buildStanzaExportTracksFromSong(song);
    expect(tracks).toHaveLength(2);
    expect(tracks[0]?.id).toBe('main');
    expect(tracks[1]?.gain).toBe(0);
  });

  it('detects edited playback transforms', () => {
    expect(stanzaPlaybackTransformIsEdited({ playbackRate: 1, transposeSemitones: 0 })).toBe(false);
    expect(stanzaPlaybackTransformIsEdited({ playbackRate: 0.9, transposeSemitones: 0 })).toBe(true);
    expect(stanzaPlaybackTransformIsEdited({ playbackRate: 1, transposeSemitones: -2 })).toBe(true);
  });

  it('builds readable export file stems', () => {
    expect(buildStanzaAudioExportFileStem('My Song')).toBe('My Song - Audio');
    expect(buildStanzaAudioExportFileStem('My Song', 'Edited')).toBe('My Song - Audio - Edited');
  });
});

describe('createStanzaExportAdapter', () => {
  it('supports common audio formats and exposes main + layers as stems', () => {
    const song: StanzaSong = {
      id: '1',
      ytId: null,
      title: 'Local',
      markers: [],
      stats: {},
      updatedAt: 0,
      localAudioBlob: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' }),
    };
    const adapter = createStanzaExportAdapter({
      song,
      transform: { playbackRate: 1, transposeSemitones: 0 },
      usePlaybackTransforms: false,
      durationSec: 120,
    });
    expect(adapter.supportsFormat('wav')).toBe(true);
    expect(adapter.supportsFormat('midi')).toBe(false);
    expect(adapter.stems).toHaveLength(1);
    expect(adapter.estimateDurationSeconds(1, ['main'])).toBe(120);
  });

  it('scales preview duration when edited playback speed is applied', () => {
    const song: StanzaSong = {
      id: '1',
      ytId: null,
      title: 'Local',
      markers: [],
      stats: {},
      updatedAt: 0,
      localAudioBlob: new Blob([], { type: 'audio/mpeg' }),
    };
    const adapter = createStanzaExportAdapter({
      song,
      transform: { playbackRate: 2, transposeSemitones: 0 },
      usePlaybackTransforms: true,
      durationSec: 100,
    });
    expect(adapter.estimateDurationSeconds(1, ['main'])).toBe(50);
  });
});
