/**
 * ADR 0020 characterization: Zine Box union merge auto-resolves everything except
 * both-edited rows where the dry run would drop content (differing non-empty titles).
 */
import { describe, expect, it } from 'vitest';
import type { ZineboxComic } from '../types';
import { analyzeZineboxConflict } from './zineboxDriveConflict';
import {
  applyZineboxConflictChoices,
  zineboxComicMergeWouldLoseContent,
} from './zineboxDriveMerge';
import type { ZineboxDriveEnvelopeV1 } from './zineboxDriveEnvelope';

function comic(overrides: Partial<ZineboxComic> & { id: string }): ZineboxComic {
  return {
    title: '',
    source: 'local',
    fileId: overrides.id,
    coverThumbnailBase64: '',
    readStatus: 'unread',
    progressPercentage: 0,
    ...overrides,
  };
}

function envelope(comics: ZineboxComic[]): ZineboxDriveEnvelopeV1 {
  return {
    schemaVersion: 1,
    app: 'zinebox',
    exportedAt: '2026-01-03T00:00:00.000Z',
    comics,
    collections: [],
  };
}

const syncMeta = {
  lastBackupExportedAt: '2026-01-01T00:00:00.000Z',
  lastCloudModifiedTime: '2026-01-01T00:00:00.000Z',
};

describe('zineboxComicMergeWouldLoseContent', () => {
  it('flags differing non-empty titles (local wins, remote rename lost)', () => {
    expect(
      zineboxComicMergeWouldLoseContent(
        comic({ id: 'c1', title: 'My Rename' }),
        comic({ id: 'c1', title: 'Drive Rename' }),
      ),
    ).toBe(true);
  });

  it('is safe when only one side has a title', () => {
    expect(
      zineboxComicMergeWouldLoseContent(comic({ id: 'c1' }), comic({ id: 'c1', title: 'Drive Title' })),
    ).toBe(false);
  });

  it('is safe for progress/read-status divergence (max wins, nothing dropped)', () => {
    expect(
      zineboxComicMergeWouldLoseContent(
        comic({ id: 'c1', title: 'Same', progressPercentage: 80, readStatus: 'in_progress' }),
        comic({ id: 'c1', title: 'Same', progressPercentage: 20, readStatus: 'finished' }),
      ),
    ).toBe(false);
  });
});

describe('analyzeZineboxConflict (ADR 0020 dry run)', () => {
  it('needsReview when both sides renamed the same comic', () => {
    const analysis = analyzeZineboxConflict({
      syncMeta,
      local: { comics: [comic({ id: 'c1', title: 'Local Name', progressPercentage: 10 })], collections: [] },
      remoteEnvelope: envelope([comic({ id: 'c1', title: 'Drive Name', progressPercentage: 20 })]),
    });
    expect(analysis.needsReview.map((r) => r.id)).toEqual(['c1']);
  });

  it('auto-resolves both-edited rows when titles agree', () => {
    const analysis = analyzeZineboxConflict({
      syncMeta,
      local: { comics: [comic({ id: 'c1', title: 'Same', progressPercentage: 10 })], collections: [] },
      remoteEnvelope: envelope([comic({ id: 'c1', title: 'Same', progressPercentage: 20 })]),
    });
    expect(analysis.needsReview).toHaveLength(0);
  });
});

describe('applyZineboxConflictChoices', () => {
  const local = { comics: [comic({ id: 'c1', title: 'Local Name', progressPercentage: 50 })], collections: [] };
  const remote = { comics: [comic({ id: 'c1', title: 'Drive Name', progressPercentage: 10 })], collections: [] };

  it('keeps this device’s copy for choice=local', () => {
    const { payload } = applyZineboxConflictChoices(local, remote, new Map([['c1', 'local']]));
    expect(payload.comics).toHaveLength(1);
    expect(payload.comics[0]?.title).toBe('Local Name');
    expect(payload.comics[0]?.progressPercentage).toBe(50);
  });

  it('takes Drive’s copy for choice=remote', () => {
    const { payload } = applyZineboxConflictChoices(local, remote, new Map([['c1', 'remote']]));
    expect(payload.comics[0]?.title).toBe('Drive Name');
    expect(payload.comics[0]?.progressPercentage).toBe(10);
  });

  it('falls back to union merge with no choices', () => {
    const { payload } = applyZineboxConflictChoices(local, remote, new Map());
    expect(payload.comics[0]?.title).toBe('Local Name');
    expect(payload.comics[0]?.progressPercentage).toBe(50);
  });
});
