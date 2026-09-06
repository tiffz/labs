import { describe, expect, it } from 'vitest';
import {
  applyForeignVideoCopies,
  foreignSourceForVideo,
  planForeignVideoCopies,
  pruneForeignVideoSources,
  setForeignVideoCopyRequested,
  upsertForeignVideoSource,
  type ForeignVideoSource,
} from './foreignDriveVideoCopy';
import type { EncorePerformanceVideo } from '../types';

function video(id: string, targetFileId?: string): EncorePerformanceVideo {
  return { id, createdAt: '2026-09-06T00:00:00.000Z', videoTargetDriveFileId: targetFileId };
}

function source(partial: Partial<ForeignVideoSource> = {}): ForeignVideoSource {
  return {
    videoId: 'v1',
    fileId: 'their-file',
    name: '07.mp4',
    copyRequested: true,
    ...partial,
  };
}

describe('planForeignVideoCopies', () => {
  it('plans a copy for a video whose Drive file the user does not own', () => {
    const tasks = planForeignVideoCopies([video('v1', 'their-file')], [source()]);
    expect(tasks).toEqual([{ videoId: 'v1', sourceFileId: 'their-file', name: '07.mp4' }]);
  });

  it('plans nothing when the user unchecked the box', () => {
    // Opting out is legitimate: the reference still works while the file stays shared.
    expect(planForeignVideoCopies([video('v1', 'their-file')], [source({ copyRequested: false })])).toEqual([]);
  });

  it('skips a video removed from the draft before saving', () => {
    expect(planForeignVideoCopies([], [source()])).toEqual([]);
  });

  it('skips a source whose video now points somewhere else', () => {
    // The row was re-pasted with a different link; copying the old file would attach a video the
    // user did not ask for.
    expect(planForeignVideoCopies([video('v1', 'a-different-file')], [source()])).toEqual([]);
  });

  it('plans at most one copy per video', () => {
    const tasks = planForeignVideoCopies(
      [video('v1', 'their-file')],
      [source(), source({ name: 'stale duplicate' })],
    );
    expect(tasks).toHaveLength(1);
  });
});

describe('applyForeignVideoCopies', () => {
  it('repoints the video at the copy without adding a second entry', () => {
    // The reported bug: one pasted link produced two rows, because the copy was appended rather
    // than swapped in. Length is the assertion that matters here.
    const before = [video('v1', 'their-file')];
    const after = applyForeignVideoCopies(before, [{ videoId: 'v1', copiedFileId: 'my-copy' }]);

    expect(after).toHaveLength(1);
    expect(after[0]!.id).toBe('v1');
    expect(after[0]!.videoTargetDriveFileId).toBe('my-copy');
  });

  it('preserves order, ids, and untouched videos', () => {
    const before = [video('v1', 'mine'), video('v2', 'their-file'), video('v3', 'also-mine')];
    const after = applyForeignVideoCopies(before, [{ videoId: 'v2', copiedFileId: 'my-copy' }]);

    expect(after.map((v) => v.id)).toEqual(['v1', 'v2', 'v3']);
    expect(after.map((v) => v.videoTargetDriveFileId)).toEqual(['mine', 'my-copy', 'also-mine']);
  });

  it('clears shortcut and external fields that described the foreign reference', () => {
    const before: EncorePerformanceVideo[] = [
      {
        id: 'v1',
        createdAt: '2026-09-06T00:00:00.000Z',
        videoTargetDriveFileId: 'their-file',
        videoShortcutDriveFileId: 'their-shortcut',
        externalVideoUrl: 'https://drive.google.com/file/d/their-file/view',
      },
    ];
    const after = applyForeignVideoCopies(before, [{ videoId: 'v1', copiedFileId: 'my-copy' }]);

    expect(after[0]!.videoShortcutDriveFileId).toBeUndefined();
    expect(after[0]!.externalVideoUrl).toBeUndefined();
  });

  it('is a no-op when nothing was copied', () => {
    const before = [video('v1', 'mine')];
    expect(applyForeignVideoCopies(before, [])).toEqual(before);
  });
});

describe('the source registry', () => {
  it('replaces rather than accumulates when the same video is re-pasted', () => {
    const first = upsertForeignVideoSource([], source({ fileId: 'first' }));
    const second = upsertForeignVideoSource(first, source({ fileId: 'second' }));

    expect(second).toHaveLength(1);
    expect(second[0]!.fileId).toBe('second');
  });

  it('keeps sources for other videos', () => {
    const sources = upsertForeignVideoSource([source({ videoId: 'v1' })], source({ videoId: 'v2' }));
    expect(sources.map((s) => s.videoId).sort()).toEqual(['v1', 'v2']);
  });

  it('prunes sources whose video is gone', () => {
    const sources = [source({ videoId: 'v1' }), source({ videoId: 'v2' })];
    expect(pruneForeignVideoSources(sources, [video('v2', 'their-file')]).map((s) => s.videoId)).toEqual(['v2']);
  });

  it('toggles the copy checkbox for one video only', () => {
    const sources = [source({ videoId: 'v1' }), source({ videoId: 'v2' })];
    const next = setForeignVideoCopyRequested(sources, 'v1', false);

    expect(foreignSourceForVideo(next, 'v1')!.copyRequested).toBe(false);
    expect(foreignSourceForVideo(next, 'v2')!.copyRequested).toBe(true);
  });

  it('reports no source for a video that is not foreign', () => {
    expect(foreignSourceForVideo([source({ videoId: 'v1' })], 'v9')).toBeUndefined();
  });
});

describe('the end-to-end save shape', () => {
  it('turns one pasted foreign link into exactly one owned video', () => {
    // The whole point, asserted as one sequence: paste -> plan -> copy -> apply.
    const videos = [video('v1', 'their-file')];
    const sources = upsertForeignVideoSource([], source({ videoId: 'v1', fileId: 'their-file' }));

    const tasks = planForeignVideoCopies(videos, sources);
    expect(tasks).toHaveLength(1);

    const saved = applyForeignVideoCopies(
      videos,
      tasks.map((t) => ({ videoId: t.videoId, copiedFileId: `copy-of-${t.sourceFileId}` })),
    );

    expect(saved).toHaveLength(1);
    expect(saved[0]!.videoTargetDriveFileId).toBe('copy-of-their-file');
  });
});
