import { describe, expect, it } from 'vitest';
import {
  assessStanzaDriveBackupConflict,
  shouldPromptStanzaDriveMerge,
  stanzaLocalMaxUpdatedAtMs,
} from './stanzaDriveConflict';
import type { StanzaSong } from '../db/stanzaDb';

describe('assessStanzaDriveBackupConflict', () => {
  it('prompts when Drive file is newer than last seen', () => {
    const result = assessStanzaDriveBackupConflict({
      syncMeta: { lastCloudModifiedTime: '2026-05-24T02:11:19.989Z' },
      cloudModifiedTime: '2026-05-24T02:12:03.706Z',
      remoteEnvelope: { version: 1, exportedAt: '2026-05-24T02:12:03.223Z', songs: [{ id: 'a' } as never] },
    });
    expect(result.needsPrompt).toBe(true);
    expect(result.reasons).toContain('drive_file_newer_than_seen');
  });

  it('prompts on first device when Drive already has songs', () => {
    const result = assessStanzaDriveBackupConflict({
      syncMeta: {},
      cloudModifiedTime: '2026-05-24T02:12:03.706Z',
      remoteEnvelope: { version: 1, exportedAt: '2026-05-24T02:12:03.223Z', songs: [{ id: 'a' } as never] },
    });
    expect(result.needsPrompt).toBe(true);
    expect(result.reasons).toContain('drive_nonempty_first_device');
  });

  it('does not prompt when remote is missing', () => {
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
  it('skips dialog when cloud diverged but local unchanged since backup', () => {
    expect(
      shouldPromptStanzaDriveMerge({
        syncMeta: { lastBackupExportedAt: '2026-06-02T00:00:00.000Z' },
        cloudModifiedTime: '2026-06-03',
        remoteEnvelope: {
          version: 1,
          exportedAt: '2026-06-03T00:00:00.000Z',
          songs: [{ id: 'a', updatedAt: 1 } as never],
        },
        localRows: [{ id: 'b', updatedAt: Date.parse('2026-06-01T00:00:00.000Z') } as never],
      }),
    ).toBe(false);
  });

  it('requires dialog when local edited after last backup and cloud diverged', () => {
    expect(
      shouldPromptStanzaDriveMerge({
        syncMeta: { lastBackupExportedAt: '2026-06-01T00:00:00.000Z' },
        cloudModifiedTime: '2026-06-03',
        remoteEnvelope: {
          version: 1,
          exportedAt: '2026-06-03T00:00:00.000Z',
          songs: [{ id: 'a', updatedAt: 1 } as never],
        },
        localRows: [{ id: 'b', updatedAt: Date.parse('2026-06-02T00:00:00.000Z') } as never],
      }),
    ).toBe(true);
  });

  it('requires dialog on first device when local library already has songs', () => {
    expect(
      shouldPromptStanzaDriveMerge({
        syncMeta: {},
        cloudModifiedTime: '2026-06-03',
        remoteEnvelope: {
          version: 1,
          exportedAt: '2026-06-03T00:00:00.000Z',
          songs: [{ id: 'a', updatedAt: 1 } as never],
        },
        localRows: [{ id: 'b', updatedAt: Date.parse('2026-06-02T00:00:00.000Z') } as never],
      }),
    ).toBe(true);
  });

  it('allows silent merge on first device when local library is empty', () => {
    expect(
      shouldPromptStanzaDriveMerge({
        syncMeta: {},
        cloudModifiedTime: '2026-06-03',
        remoteEnvelope: {
          version: 1,
          exportedAt: '2026-06-03T00:00:00.000Z',
          songs: [{ id: 'a', updatedAt: 1 } as never],
        },
        localRows: [],
      }),
    ).toBe(false);
  });

  it('does not prompt when cloud matches last seen export', () => {
    expect(
      shouldPromptStanzaDriveMerge({
        syncMeta: {
          lastCloudModifiedTime: '2026-06-03',
          lastBackupExportedAt: '2026-06-03T00:00:00.000Z',
        },
        cloudModifiedTime: '2026-06-03',
        remoteEnvelope: {
          version: 1,
          exportedAt: '2026-06-03T00:00:00.000Z',
          songs: [{ id: 'a', updatedAt: 1 } as never],
        },
        localRows: [{ id: 'b', updatedAt: Date.parse('2026-06-04T00:00:00.000Z') } as never],
      }),
    ).toBe(false);
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
