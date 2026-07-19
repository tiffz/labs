/**
 * ADR 0020 characterization: Lyrefly union merge auto-resolves everything except
 * both-edited projects where the dry run would drop a title/subtitle.
 */
import { describe, expect, it } from 'vitest';
import type { ComicProjectSummary } from '../types';
import { analyzeLyreflyConflict } from './lyreflyDriveConflict';
import {
  applyLyreflyConflictChoices,
  lyreflyProjectMergeWouldLoseContent,
} from './lyreflyDriveMerge';
import type { LyreflyDriveEnvelopeV1 } from './lyreflyDriveEnvelope';

function project(overrides: Partial<ComicProjectSummary> & { id: string }): ComicProjectSummary {
  return {
    title: 'Project',
    status: 'wip',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function envelope(projects: ComicProjectSummary[]): LyreflyDriveEnvelopeV1 {
  return {
    schemaVersion: 1,
    app: 'lyrefly',
    exportedAt: '2026-01-04T00:00:00.000Z',
    projects,
  };
}

const syncMeta = {
  lastBackupExportedAt: '2026-01-02T00:00:00.000Z',
  lastCloudModifiedTime: '2026-01-02T00:00:00.000Z',
};

describe('lyreflyProjectMergeWouldLoseContent (ADR 0020 dry run)', () => {
  it('flags differing non-empty titles (local wins, remote rename lost)', () => {
    expect(
      lyreflyProjectMergeWouldLoseContent(
        project({ id: 'p1', title: 'Local Title' }),
        project({ id: 'p1', title: 'Drive Title' }),
      ),
    ).toBe(true);
  });

  it('flags differing non-empty subtitles', () => {
    expect(
      lyreflyProjectMergeWouldLoseContent(
        project({ id: 'p1', title: 'Same', subtitle: 'local sub' }),
        project({ id: 'p1', title: 'Same', subtitle: 'drive sub' }),
      ),
    ).toBe(true);
  });

  it('is safe when only one side has a subtitle and status diverges (rank union)', () => {
    expect(
      lyreflyProjectMergeWouldLoseContent(
        project({ id: 'p1', title: 'Same', status: 'wip' }),
        project({ id: 'p1', title: 'Same', status: 'finished', subtitle: 'drive-only' }),
      ),
    ).toBe(false);
  });
});

describe('analyzeLyreflyConflict (ADR 0020 dry run)', () => {
  it('needsReview when both sides renamed the same project', () => {
    const analysis = analyzeLyreflyConflict({
      syncMeta,
      local: { projects: [project({ id: 'p1', title: 'Local Title', updatedAt: '2026-01-03T00:00:00.000Z' })] },
      remoteEnvelope: envelope([project({ id: 'p1', title: 'Drive Title', updatedAt: '2026-01-04T00:00:00.000Z' })]),
    });
    expect(analysis.needsReview.map((r) => r.id)).toEqual(['p1']);
  });

  it('auto-resolves both-edited projects when titles agree', () => {
    const analysis = analyzeLyreflyConflict({
      syncMeta,
      local: { projects: [project({ id: 'p1', title: 'Same', pageCount: 3, updatedAt: '2026-01-03T00:00:00.000Z' })] },
      remoteEnvelope: envelope([project({ id: 'p1', title: 'Same', pageCount: 5, updatedAt: '2026-01-04T00:00:00.000Z' })]),
    });
    expect(analysis.needsReview).toHaveLength(0);
  });
});

describe('applyLyreflyConflictChoices', () => {
  const local = { projects: [project({ id: 'p1', title: 'Local Title', pageCount: 4 })] };
  const remote = { projects: [project({ id: 'p1', title: 'Drive Title', pageCount: 2 })] };

  it('keeps this device’s copy for choice=local', () => {
    const { payload } = applyLyreflyConflictChoices(local, remote, new Map([['p1', 'local']]));
    expect(payload.projects[0]?.title).toBe('Local Title');
    expect(payload.projects[0]?.pageCount).toBe(4);
  });

  it('takes Drive’s copy for choice=remote', () => {
    const { payload } = applyLyreflyConflictChoices(local, remote, new Map([['p1', 'remote']]));
    expect(payload.projects[0]?.title).toBe('Drive Title');
    expect(payload.projects[0]?.pageCount).toBe(2);
  });
});
