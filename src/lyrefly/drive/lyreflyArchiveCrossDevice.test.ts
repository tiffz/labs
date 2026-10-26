// @vitest-environment jsdom
/**
 * Publish-log / press rows must survive a round trip between two devices.
 *
 * Before this suite, three things lost them:
 * - a device that already held the comic never re-downloaded it (the gallery merge stamped the
 *   remote clock onto the local row before the download step compared the two),
 * - a remote `archive.json` was only written when this device had no archive at all, and
 * - adding a row never advanced the project clock, so nothing told the other device to look.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listLyreflyDirtyRows, lyreflyDb } from '../db/lyreflyDb';
import {
  addPublishLogEntry,
  deletePressMemorabiliaEntry,
  ensureLyreflyArchive,
  updatePublishLogEntry,
} from '../db/lyreflyProjectMutations';
import { createBlankComicProject } from '../types';
import type { ComicArchiveBinder, ComicProject, PublishLogEntry } from '../types';

vi.mock('../../shared/drive/driveFetch', () => ({
  driveListFiles: vi.fn(),
  driveCreateFolder: vi.fn(),
  driveCreateJsonFile: vi.fn(),
  drivePatchJsonMedia: vi.fn(),
  driveUploadFileResumable: vi.fn(),
  driveGetFileMetadata: vi.fn(),
  driveGetMedia: vi.fn(),
  driveGetMediaArrayBuffer: vi.fn(),
}));

import { driveGetMedia, driveListFiles } from '../../shared/drive/driveFetch';
import { mergeLyreflySyncPayload } from './lyreflyDriveMerge';
import { readLyreflyLocalPayload, writeLyreflyLocalPayload } from './lyreflyLocalData';
import { applyLyreflyProjectPackageToDb, buildLyreflyProjectPackageFromDb } from './lyreflyProjectPackageDb';
import { downloadMissingLyreflyProjectSidecars } from './lyreflyProjectPackageDriveSync';
import type { LyreflyProjectPackage } from './projectPackage';

const driveListFilesMock = driveListFiles as unknown as ReturnType<typeof vi.fn>;
const driveGetMediaMock = driveGetMedia as unknown as ReturnType<typeof vi.fn>;

const T0 = '2026-10-01T00:00:00.000Z';
const T1 = '2026-10-02T00:00:00.000Z';

function row(id: string, platform = 'Bluesky'): PublishLogEntry {
  return { id, platform, publishedAt: '2026-09-30', url: `https://example.com/${id}` };
}

function archiveFor(project: ComicProject, publishLog: PublishLogEntry[], id = project.archiveId!): ComicArchiveBinder {
  return { id, projectId: project.id, publishLog, pressEntries: [], salesLedger: [] };
}

/** A comic this device already holds: one page, an archive, a Drive folder. */
async function seedHydratedProject(publishLog: PublishLogEntry[]): Promise<ComicProject> {
  const project = createBlankComicProject(T0);
  project.archiveId = crypto.randomUUID();
  project.modules.archive = true;
  project.layoutOrder = ['n1'];
  project.pageCount = 1;
  project.projectFolderId = 'project-folder';
  await lyreflyDb.projects.put(project);
  await lyreflyDb.pageNodes.put({
    id: 'n1',
    projectId: project.id,
    isSpread: false,
    activeRevisionId: null,
    revisionIds: [],
    createdAt: T0,
    updatedAt: T0,
  });
  await lyreflyDb.archives.put(archiveFor(project, publishLog));
  return project;
}

function remotePackage(project: ComicProject, archive: ComicArchiveBinder): LyreflyProjectPackage {
  return {
    project: { ...project, updatedAt: T1 },
    layoutOrder: project.layoutOrder,
    pageNodes: new Map(),
    visualDevAssets: [],
    snapshots: [],
    archive,
  };
}

async function localRows(project: ComicProject): Promise<string[]> {
  const stored = await lyreflyDb.projects.get(project.id);
  const archive = await lyreflyDb.archives.get(stored!.archiveId!);
  return (archive?.publishLog ?? []).map((r) => r.id).sort();
}

beforeEach(async () => {
  window.localStorage.clear();
  await Promise.all(lyreflyDb.tables.map((table) => table.clear()));
  vi.clearAllMocks();
});

describe('publish log across devices — full pull sequence', () => {
  it('a row added on another device reaches a device that already holds the comic', async () => {
    const project = await seedHydratedProject([row('a')]);
    const remoteArchive = archiveFor(project, [row('a'), row('b')]);
    const remoteProject = { ...project, updatedAt: T1 };

    driveListFilesMock.mockImplementation(async (_token: string, q: string) => {
      if (q.includes("'project-folder' in parents")) {
        return {
          files: [
            { id: 'project-json', name: 'project.json' },
            { id: 'layout-json', name: 'layout.json' },
            { id: 'archive-folder', name: 'archive', mimeType: 'application/vnd.google-apps.folder' },
          ],
        };
      }
      if (q.includes("'archive-folder' in parents")) {
        return { files: [{ id: 'archive-json', name: 'archive.json' }] };
      }
      return { files: [] };
    });
    driveGetMediaMock.mockImplementation(async (_token: string, fileId: string) => {
      if (fileId === 'project-json') return JSON.stringify(remoteProject);
      if (fileId === 'layout-json') return JSON.stringify({ schemaVersion: 1, order: ['n1'] });
      if (fileId === 'archive-json') return JSON.stringify(remoteArchive);
      throw new Error(`unexpected fileId ${fileId}`);
    });

    // What the shared portfolio backup does on pull: merge the gallery envelope, write it
    // locally, then hand the merged payload to the per-project download step.
    const remoteEnvelope = {
      projects: [
        {
          id: project.id,
          title: project.title,
          status: project.status,
          updatedAt: T1,
          projectFolderId: 'project-folder',
          pageCount: 1,
        },
      ],
    };
    const { payload: merged } = mergeLyreflySyncPayload(await readLyreflyLocalPayload(), remoteEnvelope);
    await writeLyreflyLocalPayload(merged);
    await downloadMissingLyreflyProjectSidecars('token', merged, vi.fn());

    // The remote clock is newer, so this device must at least look at the package.
    expect(driveListFilesMock).toHaveBeenCalled();
    expect(await localRows(project)).toEqual(['a', 'b']);
  });
});

describe('one-time catch-up for edits missed before pending pulls existed', () => {
  function summaryOf(project: ComicProject) {
    return {
      projects: [
        {
          id: project.id,
          title: project.title,
          status: project.status,
          updatedAt: project.updatedAt,
          projectFolderId: 'project-folder',
          pageCount: 1,
        },
      ],
    };
  }

  it('re-reads a hydrated comic once, then goes back to skipping it', async () => {
    const project = await seedHydratedProject([row('a')]);
    driveListFilesMock.mockImplementation(async (_token: string, q: string) =>
      q.includes("'project-folder' in parents")
        ? { files: [{ id: 'project-json', name: 'project.json' }] }
        : { files: [] },
    );
    driveGetMediaMock.mockResolvedValue(JSON.stringify(project));

    await downloadMissingLyreflyProjectSidecars('token', summaryOf(project), vi.fn());
    expect(driveListFilesMock).toHaveBeenCalled();

    driveListFilesMock.mockClear();
    await downloadMissingLyreflyProjectSidecars('token', summaryOf(project), vi.fn());
    expect(driveListFilesMock).not.toHaveBeenCalled();
  });

  it('keeps retrying a comic whose package could not be read', async () => {
    const project = await seedHydratedProject([row('a')]);
    driveListFilesMock.mockResolvedValue({ files: [] }); // no project.json on Drive

    await downloadMissingLyreflyProjectSidecars('token', summaryOf(project), vi.fn());
    driveListFilesMock.mockClear();
    await downloadMissingLyreflyProjectSidecars('token', summaryOf(project), vi.fn());
    expect(driveListFilesMock).toHaveBeenCalled();
  });
});

describe('applyLyreflyProjectPackageToDb — archive rows', () => {
  it('keeps rows from both devices and queues a push for the ones Drive lacks', async () => {
    const project = await seedHydratedProject([row('a'), row('local-only')]);
    await applyLyreflyProjectPackageToDb(remotePackage(project, archiveFor(project, [row('a'), row('remote-only')])));

    expect(await localRows(project)).toEqual(['a', 'local-only', 'remote-only']);
    const dirty = await listLyreflyDirtyRows();
    expect(dirty.some((d) => d.kind === 'archive' && d.projectId === project.id)).toBe(true);
  });

  it('does not queue a push when Drive already holds every local row', async () => {
    const project = await seedHydratedProject([row('a')]);
    await applyLyreflyProjectPackageToDb(remotePackage(project, archiveFor(project, [row('a'), row('b')])));

    expect(await localRows(project)).toEqual(['a', 'b']);
    expect((await listLyreflyDirtyRows()).filter((d) => d.kind === 'archive')).toEqual([]);
  });

  it('merges a remote archive with a different id into the one this device uses', async () => {
    // Both devices created an archive for the comic before either had synced.
    const project = await seedHydratedProject([row('mine')]);
    const otherDeviceArchive = archiveFor(project, [row('theirs')], 'other-device-archive');
    await applyLyreflyProjectPackageToDb(
      remotePackage({ ...project, archiveId: 'other-device-archive' }, otherDeviceArchive),
    );

    expect(await localRows(project)).toEqual(['mine', 'theirs']);
  });

  it('a row deleted here stays deleted when the other device still has it', async () => {
    const project = await seedHydratedProject([]);
    await lyreflyDb.archives.update(project.archiveId!, {
      pressEntries: [{ id: 'gone', title: 'Interview', markdown: 'x' }],
    });
    await deletePressMemorabiliaEntry((await lyreflyDb.archives.get(project.archiveId!))!, 'gone');

    const remoteArchive = archiveFor(project, []);
    remoteArchive.pressEntries = [{ id: 'gone', title: 'Interview', markdown: 'x' }];
    await applyLyreflyProjectPackageToDb(remotePackage(project, remoteArchive));

    const archive = await lyreflyDb.archives.get(project.archiveId!);
    expect(archive?.pressEntries.map((e) => e.id)).toEqual([]);
  });

  it('a row deleted on the other device is removed here', async () => {
    const project = await seedHydratedProject([row('a'), row('b')]);
    const remoteArchive = archiveFor(project, [row('a')]);
    remoteArchive.deletedRowIds = { b: T1 };
    await applyLyreflyProjectPackageToDb(remotePackage(project, remoteArchive));

    expect(await localRows(project)).toEqual(['a']);
  });

  it('the newer edit of the same row wins', async () => {
    const project = await seedHydratedProject([{ ...row('a'), notes: 'old', updatedAt: T0 }]);
    const remoteArchive = archiveFor(project, [{ ...row('a'), notes: 'new', updatedAt: T1 }]);
    await applyLyreflyProjectPackageToDb(remotePackage(project, remoteArchive));

    const archive = await lyreflyDb.archives.get(project.archiveId!);
    expect(archive?.publishLog[0]?.notes).toBe('new');
  });
});

describe('archive edits advance the project clock', () => {
  // The other device decides whether to download a comic by comparing project clocks. An edit
  // that leaves the clock alone is invisible to it.
  it.each([
    ['add a publish row', (a: ComicArchiveBinder) => addPublishLogEntry(a, row('x'))],
    ['edit a publish row', (a: ComicArchiveBinder) => updatePublishLogEntry(a, 'a', { notes: 'edited' })],
  ])('%s', async (_label, mutate) => {
    const project = await seedHydratedProject([row('a')]);
    const archive = await ensureLyreflyArchive(project);
    await mutate(archive);

    const stored = await lyreflyDb.projects.get(project.id);
    expect(stored!.updatedAt > T0).toBe(true);
    const pkg = await buildLyreflyProjectPackageFromDb(project.id);
    expect(pkg!.project.updatedAt > T0).toBe(true);
  });
});
