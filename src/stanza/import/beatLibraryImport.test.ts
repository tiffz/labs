import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BEAT_ANALYSIS_VERSION,
  type PersistedAnalysisBundle,
} from '../../shared/beat/analysisVersion';
import { stanzaDb, type StanzaSong } from '../db/stanzaDb';
import {
  BEAT_MIGRATION_STATE_KEY,
  beatSettingsToMetronomeCalibration,
  beatCorrectedKeyToStanzaLocalKey,
  findStanzaSongByMediaFingerprint,
  importBeatLibraryIfNeeded,
  readBeatFingerprintForStanzaSong,
  resolveBeatYoutubeVideoId,
} from './beatLibraryImport';

vi.mock('../utils/probeFileAudioDuration', () => ({
  probeFileAudioDurationSeconds: vi.fn(async () => 180.5),
}));

const BEAT_DB_NAME = 'beat-finder-library';

function mockBeatAnalysisBundle(): PersistedAnalysisBundle {
  return {
    beat: {
      bpm: 120,
      confidence: 0.9,
      confidenceLevel: 'high',
      beats: [0, 0.5, 1],
      musicStartTime: 0,
      musicEndTime: 180,
      offset: 0.1,
      warnings: [],
    },
    metadata: {
      analysisVersion: BEAT_ANALYSIS_VERSION,
      analyzedAt: 1_700_000_000_000,
      stale: false,
    },
  };
}

async function beatDbExists(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = indexedDB.open(BEAT_DB_NAME);
    req.onsuccess = () => {
      req.result.close();
      resolve(true);
    };
    req.onerror = () => resolve(false);
  });
}

async function deleteBeatDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(BEAT_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('delete beat db failed'));
    req.onblocked = () => resolve();
  });
}

async function seedBeatLibrary(payload: {
  entries: Record<string, unknown>[];
  files?: Record<string, unknown>[];
  analysis?: Record<string, unknown>[];
  practiceSections?: Record<string, unknown>[];
  songSettings?: Record<string, unknown>[];
}): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(BEAT_DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('entries')) {
        const entries = db.createObjectStore('entries', { keyPath: 'id' });
        entries.createIndex('by_updatedAt', 'updatedAt');
        entries.createIndex('by_fingerprint', 'fingerprint', { unique: true });
      }
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'videoId' });
      }
      if (!db.objectStoreNames.contains('analysis')) {
        db.createObjectStore('analysis', { keyPath: 'videoId' });
      }
      if (!db.objectStoreNames.contains('practiceSections')) {
        db.createObjectStore('practiceSections', { keyPath: 'videoId' });
      }
      if (!db.objectStoreNames.contains('songSettings')) {
        db.createObjectStore('songSettings', { keyPath: 'videoId' });
      }
    };
    req.onerror = () => reject(req.error ?? new Error('open beat db failed'));
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(
        ['entries', 'files', 'analysis', 'practiceSections', 'songSettings'],
        'readwrite',
      );
      for (const row of payload.entries) {
        tx.objectStore('entries').put(row);
      }
      for (const row of payload.files ?? []) {
        tx.objectStore('files').put(row);
      }
      for (const row of payload.analysis ?? []) {
        tx.objectStore('analysis').put(row);
      }
      for (const row of payload.practiceSections ?? []) {
        tx.objectStore('practiceSections').put(row);
      }
      for (const row of payload.songSettings ?? []) {
        tx.objectStore('songSettings').put(row);
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error('seed beat db failed'));
    };
  });
}

beforeEach(async () => {
  localStorage.clear();
  await stanzaDb.songs.clear();
  await deleteBeatDb();
});

afterEach(async () => {
  localStorage.clear();
  await stanzaDb.songs.clear();
  await deleteBeatDb();
});

describe('importBeatLibraryIfNeeded', () => {
  it('resolveBeatYoutubeVideoId reads fingerprint and sourceUrl when youtubeVideoId is missing', () => {
    expect(
      resolveBeatYoutubeVideoId({
        fingerprint: 'youtube:dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
      }),
    ).toBe('dQw4w9WgXcQ');
    expect(
      resolveBeatYoutubeVideoId({
        sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Rick',
      }),
    ).toBe('dQw4w9WgXcQ');
    expect(
      resolveBeatYoutubeVideoId({
        title: 'YouTube dQw4w9WgXcQ',
      }),
    ).toBe('dQw4w9WgXcQ');
  });

  it('beatSettingsToMetronomeCalibration falls back to analysis BPM and Beat 1 anchor', () => {
    const cal = beatSettingsToMetronomeCalibration(null, {
      ...mockBeatAnalysisBundle(),
      beat: { ...mockBeatAnalysisBundle().beat, bpm: 132, musicStartTime: 2.5 },
    });
    expect(cal?.bpm).toBe(132);
    expect(cal?.firstBeatOffsetSec).toBeCloseTo(2.6);
    expect(cal?.source).toBe('analysis');
  });

  it('beatCorrectedKeyToStanzaLocalKey accepts display keys only', () => {
    expect(beatCorrectedKeyToStanzaLocalKey('F#')).toBe('F#');
    expect(beatCorrectedKeyToStanzaLocalKey('C major')).toBeUndefined();
    expect(beatCorrectedKeyToStanzaLocalKey(null)).toBeUndefined();
  });

  it('imports YouTube entries when only fingerprint/sourceUrl identify the video', async () => {
    await seedBeatLibrary({
      entries: [
        {
          id: 'yt-fp-only',
          sourceType: 'youtube',
          mediaKind: 'video',
          title: 'Fingerprint only',
          fingerprint: 'youtube:dQw4w9WgXcQ',
          sourceUrl: 'https://youtu.be/dQw4w9WgXcQ',
          updatedAt: 100,
        },
      ],
    });

    const result = await importBeatLibraryIfNeeded();
    expect(result?.imported).toBe(1);
    const song = await stanzaDb.songs.where('ytId').equals('dQw4w9WgXcQ').first();
    expect(song?.title).toBe('Fingerprint only');
  });

  it('imports correctedDetectedKey into localOriginalKey for local uploads', async () => {
    const entryId = 'local-key';
    const blob = new Blob(['audio'], { type: 'audio/mpeg' });
    await seedBeatLibrary({
      entries: [
        {
          id: entryId,
          sourceType: 'local',
          mediaKind: 'audio',
          title: 'Keyed upload',
          fingerprint: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
          updatedAt: 100,
        },
      ],
      files: [{ videoId: entryId, blob }],
      songSettings: [
        {
          videoId: entryId,
          updatedAt: 100,
          settings: { correctedDetectedKey: 'Ab' },
        },
      ],
    });

    await importBeatLibraryIfNeeded();
    const song = await stanzaDb.songs.filter((s) => s.title === 'Keyed upload').first();
    expect(song?.localOriginalKey).toBe('Ab');
  });

  it('derives metronome sync from analysis when Beat saved no explicit BPM or syncStartTime', async () => {
    const entryId = 'local-analysis-only';
    await seedBeatLibrary({
      entries: [
        {
          id: entryId,
          sourceType: 'local',
          mediaKind: 'audio',
          title: 'Analyzed upload',
          fingerprint: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          updatedAt: 100,
        },
      ],
      files: [{ videoId: entryId, blob: new Blob(['audio'], { type: 'audio/mpeg' }) }],
      analysis: [
        {
          videoId: entryId,
          bundle: {
            ...mockBeatAnalysisBundle(),
            beat: { ...mockBeatAnalysisBundle().beat, bpm: 118, musicStartTime: 1.75 },
          },
        },
      ],
    });

    await importBeatLibraryIfNeeded();
    const song = await stanzaDb.songs.toCollection().first();
    expect(song?.metronomeSongCalibration?.bpm).toBe(118);
    expect(song?.metronomeSongCalibration?.firstBeatOffsetSec).toBeCloseTo(1.85);
    expect(song?.metronomeSongCalibration?.source).toBe('analysis');
  });

  it('does not re-infer analysis Beat 1 when user saved explicit zero offset', async () => {
    await stanzaDb.songs.put({
      id: 'user-zero-beat1',
      ytId: null,
      title: 'Local song',
      markers: [],
      stats: {},
      updatedAt: 1,
      metronomeSongCalibration: {
        bpm: 118,
        anchorMediaTime: 0,
        firstBeatOffsetSec: 0,
        source: 'tap',
      },
      analysisCache: mockBeatAnalysisBundle(),
    });

    await importBeatLibraryIfNeeded();
    const song = await stanzaDb.songs.get('user-zero-beat1');
    expect(song?.metronomeSongCalibration?.firstBeatOffsetSec).toBe(0);
    expect(song?.metronomeSongCalibration?.source).toBe('tap');
  });

  it('upgrades earlier imports missing ytId without overwriting an existing Beat 1 offset', async () => {
    await stanzaDb.songs.put({
      id: 'bad-yt-import',
      ytId: null,
      title: 'YouTube dQw4w9WgXcQ',
      markers: [],
      stats: {},
      updatedAt: 1,
      metronomeSongCalibration: {
        bpm: 120,
        anchorMediaTime: 0,
        firstBeatOffsetSec: 0,
        source: 'tap',
      },
      analysisCache: {
        ...mockBeatAnalysisBundle(),
        beat: { ...mockBeatAnalysisBundle().beat, musicStartTime: 3.2 },
      },
    });

    const result = await importBeatLibraryIfNeeded();
    expect(result?.upgraded).toBe(1);
    const song = await stanzaDb.songs.get('bad-yt-import');
    expect(song?.ytId).toBe('dQw4w9WgXcQ');
    expect(song?.metronomeSongCalibration?.firstBeatOffsetSec).toBe(0);
  });

  it('returns null when Beat library DB is missing and nothing to upgrade', async () => {
    await expect(importBeatLibraryIfNeeded()).resolves.toBeNull();
    expect(localStorage.getItem(BEAT_MIGRATION_STATE_KEY)).toBeNull();
  });

  it('retries migration when only the legacy v2 done flag is set', async () => {
    localStorage.setItem('stanza:beat-library-import-v2', '1');
    await seedBeatLibrary({
      entries: [
        {
          id: 'legacy-retry-yt',
          sourceType: 'youtube',
          mediaKind: 'audio',
          title: 'Legacy Retry',
          fingerprint: 'youtube:legacyRetry',
          youtubeVideoId: 'legacyRetry',
          updatedAt: 100,
        },
      ],
    });
    const result = await importBeatLibraryIfNeeded();
    expect(result?.imported).toBe(1);
    const song = await stanzaDb.songs.where('ytId').equals('legacyRetry').first();
    expect(song?.title).toBe('Legacy Retry');
  });

  it('imports a YouTube entry as a native Stanza row with markers and settings', async () => {
    const entryId = 'yt-entry-1';
    await seedBeatLibrary({
      entries: [
        {
          id: entryId,
          sourceType: 'youtube',
          mediaKind: 'audio',
          title: 'Practice Track',
          fingerprint: 'youtube:abc123DEF45',
          youtubeVideoId: 'abc123DEF45',
          updatedAt: 100,
        },
      ],
      practiceSections: [
        {
          videoId: entryId,
          sections: [
            { id: 's1', label: 'Intro', startTime: 0, endTime: 30 },
            { id: 's2', label: 'Verse', startTime: 30, endTime: 60 },
          ],
        },
      ],
      songSettings: [
        {
          videoId: entryId,
          updatedAt: 100,
          settings: {
            bpm: 128,
            syncStartTime: 0.25,
            metronomeEnabled: true,
            metronomeVolume: 80,
            audioVolume: 90,
            transposeSemitones: 2,
          },
        },
      ],
      analysis: [{ videoId: entryId, bundle: mockBeatAnalysisBundle() }],
    });

    const result = await importBeatLibraryIfNeeded();
    expect(result).toEqual({ imported: 1, merged: 0, skipped: 0, upgraded: 0 });

    const song = await stanzaDb.songs.where('ytId').equals('abc123DEF45').first();
    expect(song?.title).toBe('Practice Track');
    expect(song?.markers).toHaveLength(1);
    expect(song?.markers?.[0]?.time).toBe(30);
    expect(song?.markers?.[0]?.label).toBe('Verse');
    expect(song?.markers?.[0]?.id).not.toMatch(/^beat-import-/);
    expect(song?.metronomeSongCalibration?.bpm).toBe(128);
    expect(song?.localTransposeSemitones).toBe(2);
    expect(JSON.parse(localStorage.getItem(BEAT_MIGRATION_STATE_KEY)!).beatLibraryPurged).toBe(true);
  });

  it('merges into an existing Stanza YouTube song without overwriting markers or calibration', async () => {
    const existing: StanzaSong = {
      id: crypto.randomUUID(),
      ytId: 'abc123DEF45',
      title: 'Existing Stanza title',
      markers: [{ id: 'keep-me', time: 45, label: 'Chorus' }],
      stats: { seg0: { totalMs: 1000, lastPracticed: 1 } },
      updatedAt: 50,
      metronomeSongCalibration: {
        bpm: 100,
        anchorMediaTime: 0,
        firstBeatOffsetSec: 0,
        source: 'tap',
      },
      analysisCache: mockBeatAnalysisBundle(),
    };
    await stanzaDb.songs.put(existing);

    await seedBeatLibrary({
      entries: [
        {
          id: 'beat-entry',
          sourceType: 'youtube',
          mediaKind: 'audio',
          title: 'Beat title',
          fingerprint: 'youtube:abc123DEF45',
          youtubeVideoId: 'abc123DEF45',
          updatedAt: 200,
        },
      ],
      practiceSections: [
        {
          videoId: 'beat-entry',
          sections: [{ id: 's1', label: 'Verse', startTime: 30, endTime: 60 }],
        },
      ],
      songSettings: [
        {
          videoId: 'beat-entry',
          updatedAt: 200,
          settings: { bpm: 140, syncStartTime: 1 },
        },
      ],
      analysis: [
        {
          videoId: 'beat-entry',
          bundle: {
            ...mockBeatAnalysisBundle(),
            beat: { ...mockBeatAnalysisBundle().beat, bpm: 999 },
          },
        },
      ],
    });

    const result = await importBeatLibraryIfNeeded();
    expect(result).toEqual({ imported: 0, merged: 1, skipped: 0, upgraded: 0 });

    const song = await stanzaDb.songs.get(existing.id);
    expect(song?.markers).toEqual(existing.markers);
    expect(song?.metronomeSongCalibration?.bpm).toBe(100);
    expect(song?.analysisCache?.beat.bpm).toBe(120);
  });

  it('merges local Beat uploads into existing rows and copies the audio blob', async () => {
    const blob = new Blob(['audio'], { type: 'audio/mpeg' });
    await stanzaDb.songs.put({
      id: 'local-existing',
      ytId: null,
      title: 'Local existing',
      markers: [],
      stats: {},
      updatedAt: 1,
      localMediaFingerprint: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });

    await seedBeatLibrary({
      entries: [
        {
          id: 'local-beat-id',
          sourceType: 'local',
          mediaKind: 'audio',
          title: 'Beat local',
          fingerprint: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          updatedAt: 2,
        },
      ],
      files: [{ videoId: 'local-beat-id', blob }],
      practiceSections: [
        {
          videoId: 'local-beat-id',
          sections: [{ id: 's1', label: 'Part A', startTime: 12, endTime: 24 }],
        },
      ],
    });

    const result = await importBeatLibraryIfNeeded();
    expect(result).toEqual({ imported: 0, merged: 1, skipped: 0, upgraded: 1 });

    const song = await stanzaDb.songs.get('local-existing');
    expect(song?.localAudioBlob).toBeTruthy();
    expect(song?.localMediaFingerprint).toMatch(/^\d+:\d+\.\d{2}$/);
    expect(isBeatSha256(song?.localMediaFingerprint)).toBe(false);
    expect(song?.markers?.[0]?.time).toBe(12);
  });

  it('stores Stanza-style fingerprints for new local uploads', async () => {
    const blob = new Blob(['audio-bytes'], { type: 'audio/mpeg' });
    await seedBeatLibrary({
      entries: [
        {
          id: 'local-new',
          sourceType: 'local',
          mediaKind: 'audio',
          title: 'Uploaded track',
          fingerprint: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          updatedAt: 3,
        },
      ],
      files: [{ videoId: 'local-new', blob }],
    });

    await importBeatLibraryIfNeeded();
    const song = await stanzaDb.songs.toCollection().first();
    expect(song?.localMediaFingerprint).toMatch(/^\d+:\d+\.\d{2}$/);
    expect(isBeatSha256(song?.localMediaFingerprint)).toBe(false);
  });

  it('skips local entries without a stored blob and does not purge Beat library', async () => {
    await seedBeatLibrary({
      entries: [
        {
          id: 'local-missing-blob',
          sourceType: 'local',
          mediaKind: 'audio',
          title: 'Missing blob',
          fingerprint: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
          updatedAt: 4,
        },
      ],
    });

    const result = await importBeatLibraryIfNeeded();
    expect(result).toEqual({ imported: 0, merged: 0, skipped: 1, upgraded: 0 });
    expect(await stanzaDb.songs.count()).toBe(0);
    expect(await beatDbExists()).toBe(true);
  });

  it('upgrades legacy Beat-imported rows to Stanza fingerprints and marker ids', async () => {
    await stanzaDb.songs.put({
      id: 'legacy-row',
      ytId: null,
      title: 'Legacy import',
      markers: [{ id: 'beat-import-0-12000', time: 12, label: 'Part A' }],
      stats: {},
      updatedAt: 1,
      localAudioBlob: new Blob(['audio'], { type: 'audio/mpeg' }),
      localMediaFingerprint: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    });

    const result = await importBeatLibraryIfNeeded();
    expect(result).toEqual({ imported: 0, merged: 0, skipped: 0, upgraded: 1 });

    const song = await stanzaDb.songs.get('legacy-row');
    expect(song?.localMediaFingerprint).toMatch(/^\d+:\d+\.\d{2}$/);
    expect(isBeatSha256(song?.localMediaFingerprint)).toBe(false);
    expect(song?.markers?.[0]?.id).not.toMatch(/^beat-import-/);
  });

  it('is idempotent after Beat library is purged', async () => {
    await seedBeatLibrary({
      entries: [
        {
          id: 'once-only',
          sourceType: 'youtube',
          mediaKind: 'audio',
          title: 'Once',
          fingerprint: 'youtube:onceOnly001',
          youtubeVideoId: 'onceOnly001',
          updatedAt: 7,
        },
      ],
    });

    const first = await importBeatLibraryIfNeeded();
    expect(first?.imported).toBe(1);

    const second = await importBeatLibraryIfNeeded();
    expect(second).toBeNull();
    expect(await stanzaDb.songs.count()).toBe(1);
  });

  it('records Beat SHA256 fingerprint mapping so ?f= survives Stanza fingerprint upgrade', async () => {
    const beatFp = '69a9c79ec8c4519a732ee7429969e167817d3c397118b38ec81c4af050c1fa33';
    const entryId = 'local-video-entry';
    await seedBeatLibrary({
      entries: [
        {
          id: entryId,
          sourceType: 'local',
          mediaKind: 'video',
          title: 'Uploaded video',
          fingerprint: beatFp,
          updatedAt: 100,
        },
      ],
      files: [{ videoId: entryId, blob: new Blob(['video'], { type: 'video/mp4' }) }],
    });

    await importBeatLibraryIfNeeded();
    const song = await findStanzaSongByMediaFingerprint(beatFp);
    expect(song?.title).toBe('Uploaded video');
    expect(readBeatFingerprintForStanzaSong(song!.id)).toBe(beatFp);
    expect(song?.localMediaFingerprint).toMatch(/^\d+:\d+\.\d{2}$/);
  });
});

describe('findStanzaSongByMediaFingerprint', () => {
  it('resolves legacy id prefix when migration state is missing', async () => {
    const beatFp = '69a9c79ec8c4519a732ee7429969e167817d3c397118b38ec81c4af050c1fa33';
    await stanzaDb.songs.put({
      id: `local-${beatFp.slice(0, 16)}-legacy`,
      ytId: null,
      title: 'Legacy import',
      markers: [],
      stats: {},
      updatedAt: 1,
      localAudioBlob: new Blob(['video'], { type: 'video/mp4' }),
      localMediaFingerprint: '12345678:180.50',
    });

    const song = await findStanzaSongByMediaFingerprint(beatFp);
    expect(song?.title).toBe('Legacy import');
  });
});

function isBeatSha256(value: string | undefined): boolean {
  if (!value) return false;
  return /^[a-f0-9]{64}$/i.test(value);
}
