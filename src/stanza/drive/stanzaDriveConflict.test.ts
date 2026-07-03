import { describe, expect, it } from 'vitest';
import {
  analyzeStanzaConflict,
  assessStanzaDriveBackupConflict,
  shouldBlockSyncForConflict,
  shouldPromptStanzaDriveMerge,
  stanzaLocalMaxUpdatedAtMs,
  stanzaMergeWouldLoseContent,
} from './stanzaDriveConflict';
import type { StanzaSong } from '../db/stanzaDb';
import type { StanzaSongDriveRow } from './stanzaDriveEnvelope';

function song(partial: Partial<StanzaSong> & Pick<StanzaSong, 'id'>): StanzaSong {
  return {
    ytId: null,
    title: partial.title ?? partial.id,
    markers: [],
    stats: {},
    updatedAt: partial.updatedAt ?? 0,
    ...partial,
  } as StanzaSong;
}

function remote(partial: Partial<StanzaSongDriveRow> & Pick<StanzaSongDriveRow, 'id'>): StanzaSongDriveRow {
  return {
    ytId: null,
    title: partial.title ?? partial.id,
    markers: [],
    stats: {},
    updatedAt: partial.updatedAt ?? 0,
    ...partial,
  } as StanzaSongDriveRow;
}

describe('assessStanzaDriveBackupConflict', () => {
  it('records divergence when Drive file is newer than last seen', () => {
    const result = assessStanzaDriveBackupConflict({
      syncMeta: { lastCloudModifiedTime: '2026-05-24T02:11:19.989Z' },
      cloudModifiedTime: '2026-05-24T02:12:03.706Z',
      remoteEnvelope: {
        schemaVersion: 1,
        app: 'stanza',
        exportedAt: '2026-05-24T02:12:03.223Z',
        songs: [{ id: 'a' } as never],
      },
    });
    expect(result.needsPrompt).toBe(true);
    expect(result.reasons).toContain('drive_file_newer_than_seen');
  });

  it('records first-device divergence when Drive already has songs', () => {
    const result = assessStanzaDriveBackupConflict({
      syncMeta: {},
      cloudModifiedTime: '2026-05-24T02:12:03.706Z',
      remoteEnvelope: {
        schemaVersion: 1,
        app: 'stanza',
        exportedAt: '2026-05-24T02:12:03.223Z',
        songs: [{ id: 'a' } as never],
      },
    });
    expect(result.needsPrompt).toBe(true);
    expect(result.reasons).toContain('drive_nonempty_first_device');
  });

  it('does not flag when remote is missing', () => {
    const result = assessStanzaDriveBackupConflict({
      syncMeta: {},
      cloudModifiedTime: undefined,
      remoteEnvelope: null,
    });
    expect(result.needsPrompt).toBe(false);
    expect(result.reasons).toEqual([]);
  });
});

describe('shouldPromptStanzaDriveMerge', () => {
  it('never prompts (ADR 0020 silent_union)', () => {
    expect(
      shouldPromptStanzaDriveMerge({
        syncMeta: { lastBackupExportedAt: '2026-06-01T00:00:00.000Z' },
        cloudModifiedTime: '2026-06-03',
        remoteEnvelope: {
          schemaVersion: 1,
          app: 'stanza',
          exportedAt: '2026-06-03T00:00:00.000Z',
          songs: [{ id: 'a', updatedAt: 1 } as never],
        },
        localRows: [{ id: 'b', updatedAt: Date.parse('2026-06-02T00:00:00.000Z') } as never],
      }),
    ).toBe(false);
  });
});

describe('stanzaMergeWouldLoseContent', () => {
  it('returns false when richer merge keeps the max marker count', () => {
    const local = song({
      id: 'a',
      updatedAt: 2000,
      markers: [
        { id: 'm1', time: 1, label: 'A' },
        { id: 'm2', time: 2, label: 'B' },
      ],
    });
    const rem = remote({
      id: 'a',
      updatedAt: 3000,
      markers: [{ id: 'm3', time: 1.5, label: 'C' }],
    });
    expect(stanzaMergeWouldLoseContent(local, rem)).toBe(false);
  });
});

describe('analyzeStanzaConflict', () => {
  const baseline = '2026-06-01T00:00:00.000Z';
  const baselineMs = Date.parse(baseline);

  it('auto-resolves non-overlapping edits without needsReview', () => {
    const analysis = analyzeStanzaConflict({
      syncMeta: {
        lastBackupExportedAt: baseline,
        lastCloudModifiedTime: baseline,
      },
      localRows: [song({ id: 'local-only', updatedAt: baselineMs + 1000, title: 'Local' })],
      remoteSongs: [remote({ id: 'remote-only', updatedAt: baselineMs + 1000, title: 'Remote' })],
    });
    expect(analysis.localOnly.map((r) => r.id)).toEqual(['local-only']);
    expect(analysis.remoteOnly.map((r) => r.id)).toEqual(['remote-only']);
    expect(analysis.needsReview).toEqual([]);
    expect(shouldBlockSyncForConflict(analysis)).toBe(false);
  });

  it('auto-resolves bothEdited when richer merge is safe', () => {
    const analysis = analyzeStanzaConflict({
      syncMeta: {
        lastBackupExportedAt: baseline,
        lastCloudModifiedTime: baseline,
      },
      localRows: [
        song({
          id: 'shared',
          updatedAt: baselineMs + 1000,
          title: 'Shared',
          markers: [{ id: 'm1', time: 1, label: 'A' }],
        }),
      ],
      remoteSongs: [
        remote({
          id: 'shared',
          updatedAt: baselineMs + 2000,
          title: 'Shared',
          markers: [
            { id: 'm1', time: 1, label: 'A' },
            { id: 'm2', time: 2, label: 'B' },
          ],
        }),
      ],
    });
    expect(analysis.autoResolved.map((r) => r.id)).toEqual(['shared']);
    expect(analysis.needsReview).toEqual([]);
  });
});

describe('stanzaLocalMaxUpdatedAtMs', () => {
  it('returns zero for an empty library', () => {
    expect(stanzaLocalMaxUpdatedAtMs([])).toBe(0);
  });

  it('returns the newest song updatedAt', () => {
    const rows = [
      { updatedAt: 10 } as StanzaSong,
      { updatedAt: 50 } as StanzaSong,
      { updatedAt: 30 } as StanzaSong,
    ];
    expect(stanzaLocalMaxUpdatedAtMs(rows)).toBe(50);
  });
});
