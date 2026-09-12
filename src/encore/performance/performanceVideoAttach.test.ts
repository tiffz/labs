// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  findPerformanceVideoBySource,
  upsertPerformanceVideoBySource,
} from './performanceVideoAttach';
import { planForeignVideoCopies } from './foreignDriveVideoCopy';
import type { EncorePerformanceVideo } from '../types';

const video = (o: Partial<EncorePerformanceVideo> & Pick<EncorePerformanceVideo, 'id'>) =>
  ({ createdAt: '2026-01-01T00:00:00.000Z', ...o }) as EncorePerformanceVideo;

let n = 0;
const makeVideo = () => video({ id: `new-${++n}` });

/** What the append branch did before: append, every time, no identity check. */
const legacyAppend = (
  videos: readonly EncorePerformanceVideo[],
  fields: { videoTargetDriveFileId?: string },
) => [...videos, video({ id: 'appended', ...fields })];

describe('attaching a Drive video is idempotent on the source', () => {
  it('re-applying the same Drive link updates in place instead of appending', () => {
    const videos = [video({ id: 'v1', videoTargetDriveFileId: 'file-abc' })];
    const fields = { videoTargetDriveFileId: 'file-abc' };

    // The bug: the debounce re-fires and the old code appended a second row for one file.
    expect(legacyAppend(videos, fields)).toHaveLength(2);

    const result = upsertPerformanceVideoBySource(videos, fields, makeVideo);
    expect(result.videos).toHaveLength(1);
    expect(result.videoId).toBe('v1');
  });

  it('survives the handler firing many times for one paste', () => {
    let videos: EncorePerformanceVideo[] = [video({ id: 'existing', videoTargetDriveFileId: 'old' })];
    const fields = { videoTargetDriveFileId: 'file-abc' };
    let lastId = '';
    for (let i = 0; i < 5; i += 1) {
      const r = upsertPerformanceVideoBySource(videos, fields, makeVideo);
      videos = r.videos;
      lastId = r.videoId;
    }
    // One new row for the pasted link, not five.
    expect(videos).toHaveLength(2);
    expect(videos.filter((v) => v.videoTargetDriveFileId === 'file-abc')).toHaveLength(1);
    // The id is stable across passes, so a foreign-copy registration keyed to it still matches.
    expect(videos.some((v) => v.id === lastId)).toBe(true);
  });

  it('still appends a genuinely different Drive file', () => {
    const videos = [video({ id: 'v1', videoTargetDriveFileId: 'file-abc' })];
    const result = upsertPerformanceVideoBySource(
      videos,
      { videoTargetDriveFileId: 'file-xyz' },
      makeVideo,
    );
    expect(result.videos).toHaveLength(2);
    expect(result.videoId).not.toBe('v1');
  });

  it('matches an external URL when there is no Drive file', () => {
    const videos = [video({ id: 'v1', externalVideoUrl: 'https://youtu.be/abc' })];
    const result = upsertPerformanceVideoBySource(
      videos,
      { externalVideoUrl: 'https://youtu.be/abc' },
      makeVideo,
    );
    expect(result.videos).toHaveLength(1);
    expect(result.videoId).toBe('v1');
  });

  it('treats the Drive file id as identity even when the external URL differs', () => {
    const videos = [
      video({ id: 'v1', videoTargetDriveFileId: 'file-abc', externalVideoUrl: undefined }),
    ];
    expect(
      findPerformanceVideoBySource(videos, { videoTargetDriveFileId: 'file-abc' })?.id,
    ).toBe('v1');
  });

  it('does not match when there is no source at all', () => {
    const videos = [video({ id: 'v1', videoTargetDriveFileId: 'file-abc' })];
    expect(findPerformanceVideoBySource(videos, {})).toBeUndefined();
  });
});

/**
 * The other half of the report: an external Drive link added through "add video" never got copied
 * into her Drive. The copy registry is keyed by video id, and a staged link used to receive its id
 * from `newPerformanceVideo` at SAVE time — so the id the registration was anchored to never
 * existed on the saved row, `planForeignVideoCopies` matched nothing, and the performance kept a
 * pointer at a stranger's file. Staging now mints the id up front and save preserves it.
 */
describe('a staged external link still gets copied', () => {
  const FILE = 'friends-file-id';
  const source = {
    videoId: 'staged-id',
    fileId: FILE,
    name: 'Their recording.mov',
    copyRequested: true,
  };

  it('plans the copy when the staged row keeps its id', () => {
    // Save path: the staged id is handed to the row factory, so the saved row keeps it.
    const saved = upsertPerformanceVideoBySource([], { videoTargetDriveFileId: FILE }, () =>
      video({ id: 'staged-id' }),
    );
    expect(saved.videoId).toBe('staged-id');
    const tasks = planForeignVideoCopies(saved.videos, [source]);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.sourceFileId).toBe(FILE);
  });

  it('plans nothing when save mints a fresh id — the bug', () => {
    const savedWithFreshId = [video({ id: 'minted-at-save', videoTargetDriveFileId: FILE })];
    expect(planForeignVideoCopies(savedWithFreshId, [source])).toHaveLength(0);
  });
});
