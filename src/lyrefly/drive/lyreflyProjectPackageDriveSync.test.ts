import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lyreflyDb, listLyreflyDirtyRows } from '../db/lyreflyDb';
import {
  addPageRevisionFromFile,
  createPageNode,
  createVisualDevAsset,
  saveLyreflyProject,
} from '../db/lyreflyProjectMutations';
import { createBlankComicProject } from '../types';

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

import {
  driveCreateFolder,
  driveCreateJsonFile,
  driveGetFileMetadata,
  driveGetMedia,
  driveGetMediaArrayBuffer,
  driveListFiles,
  driveUploadFileResumable,
  drivePatchJsonMedia,
} from '../../shared/drive/driveFetch';
import {
  downloadMissingLyreflyProjectSidecars,
  lyreflyNeedsSidecarDownload,
  uploadLyreflyProjectSidecars,
} from './lyreflyProjectPackageDriveSync';

const driveListFilesMock = driveListFiles as unknown as ReturnType<typeof vi.fn>;
const driveCreateFolderMock = driveCreateFolder as unknown as ReturnType<typeof vi.fn>;
const driveCreateJsonFileMock = driveCreateJsonFile as unknown as ReturnType<typeof vi.fn>;
const drivePatchJsonMediaMock = drivePatchJsonMedia as unknown as ReturnType<typeof vi.fn>;
const driveUploadFileResumableMock = driveUploadFileResumable as unknown as ReturnType<typeof vi.fn>;
const driveGetFileMetadataMock = driveGetFileMetadata as unknown as ReturnType<typeof vi.fn>;
const driveGetMediaMock = driveGetMedia as unknown as ReturnType<typeof vi.fn>;
const driveGetMediaArrayBufferMock = driveGetMediaArrayBuffer as unknown as ReturnType<typeof vi.fn>;

async function clearAllLyreflyTables(): Promise<void> {
  await lyreflyDb.projects.clear();
  await lyreflyDb.pageNodes.clear();
  await lyreflyDb.pageRevisions.clear();
  await lyreflyDb.revisionBlobs.clear();
  await lyreflyDb.visualDevAssets.clear();
  await lyreflyDb.visualDevBlobs.clear();
  await lyreflyDb.scriptDocuments.clear();
  await lyreflyDb.snapshots.clear();
  await lyreflyDb.archives.clear();
  await lyreflyDb.dirtySync.clear();
}

let folderCounter = 0;
let fileCounter = 0;

describe('uploadLyreflyProjectSidecars', () => {
  beforeEach(async () => {
    await clearAllLyreflyTables();
    vi.clearAllMocks();
    folderCounter = 0;
    fileCounter = 0;
    driveListFilesMock.mockResolvedValue({ files: [] });
    driveCreateFolderMock.mockImplementation(async () => ({ id: `folder-${(folderCounter += 1)}` }));
    driveCreateJsonFileMock.mockImplementation(async () => ({ id: `file-${(fileCounter += 1)}` }));
    drivePatchJsonMediaMock.mockImplementation(async (_token: string, fileId: string) => ({ id: fileId }));
    const uploadedSizes = new Map<string, number>();
    driveUploadFileResumableMock.mockImplementation(async (_token: string, file: File) => {
      const id = `blob-${(fileCounter += 1)}`;
      uploadedSizes.set(id, file.size);
      return { id };
    });
    driveGetFileMetadataMock.mockImplementation(async (_token: string, fileId: string) => ({
      id: fileId,
      size: String(uploadedSizes.get(fileId) ?? 0),
    }));
  });

  it('does nothing when there are no dirty rows', async () => {
    await uploadLyreflyProjectSidecars('token', 'app-folder', { projects: [] }, vi.fn());
    expect(driveListFilesMock).not.toHaveBeenCalled();
  });

  it('uploads page art blobs before writing project/layout/page JSON, and clears the dirty ledger', async () => {
    const project = createBlankComicProject();
    await saveLyreflyProject(project);
    const node = await createPageNode(project, 'Page 1');
    const file = new File(['pixels'], 'page1.png', { type: 'image/png' });
    await addPageRevisionFromFile(node, file, 'v1');

    expect(await listLyreflyDirtyRows()).not.toHaveLength(0);

    const onLabel = vi.fn();
    await uploadLyreflyProjectSidecars('token', 'app-folder', { projects: [] }, onLabel);

    // Blob uploaded via resumable upload (not as a JSON text file).
    expect(driveUploadFileResumableMock).toHaveBeenCalledTimes(1);
    const [, uploadedFile] = driveUploadFileResumableMock.mock.calls[0] as [string, File];
    expect(uploadedFile.name).toBe('page1.png');

    // Revision row now carries the returned Drive file id.
    const storedRevisions = await lyreflyDb.pageRevisions.where('pageNodeId').equals(node.id).toArray();
    expect(storedRevisions[0]?.driveFileId).toMatch(/^blob-/);

    // project.json + layout.json + pages/{node}/node.json + revisions.json were written.
    expect(driveCreateJsonFileMock.mock.calls.map((call) => call[2])).toEqual(
      expect.arrayContaining(['project.json', 'layout.json', 'node.json', 'revisions.json']),
    );

    // Project folder id cached locally for next time.
    const storedProject = await lyreflyDb.projects.get(project.id);
    expect(storedProject?.projectFolderId).toMatch(/^folder-/);

    // Dirty ledger drained after a successful upload.
    expect(await listLyreflyDirtyRows()).toHaveLength(0);
    expect(onLabel).toHaveBeenCalled();
  });

  it('uploads visual dev asset blobs and the visual-dev index', async () => {
    const project = createBlankComicProject();
    await saveLyreflyProject(project);
    const file = new File(['sketch bytes'], 'hero.png', { type: 'image/png' });
    await createVisualDevAsset(project.id, { kind: 'image', title: 'Hero sketch', file });

    await uploadLyreflyProjectSidecars('token', 'app-folder', { projects: [] }, vi.fn());

    expect(driveUploadFileResumableMock).toHaveBeenCalledTimes(1);
    expect(driveCreateJsonFileMock.mock.calls.map((call) => call[2])).toContain('index.json');

    const [asset] = await lyreflyDb.visualDevAssets.where('projectId').equals(project.id).toArray();
    expect(asset?.driveFileId).toMatch(/^blob-/);
  });

  it('fail-closed: skips package JSON write and keeps the dirty ledger when a sidecar blob is missing', async () => {
    const project = createBlankComicProject();
    await saveLyreflyProject(project);
    const node = await createPageNode(project, 'Page 1');
    const file = new File(['pixels'], 'page1.png', { type: 'image/png' });
    const revision = await addPageRevisionFromFile(node, file, 'v1');
    // Simulate an interrupted upload state: revision row exists but its blob is gone.
    await lyreflyDb.revisionBlobs.delete(revision.id);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await uploadLyreflyProjectSidecars('token', 'app-folder', { projects: [] }, vi.fn());

    // No package JSON claiming content we did not upload.
    expect(driveCreateJsonFileMock.mock.calls.map((call) => call[2])).not.toContain('project.json');
    // Dirty ledger retained so the project retries next flush.
    expect(await listLyreflyDirtyRows()).not.toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('fail-closed: throws before package JSON write when upload size verification fails', async () => {
    const project = createBlankComicProject();
    await saveLyreflyProject(project);
    const node = await createPageNode(project, 'Page 1');
    const file = new File(['pixels'], 'page1.png', { type: 'image/png' });
    await addPageRevisionFromFile(node, file, 'v1');
    driveGetFileMetadataMock.mockResolvedValue({ id: 'blob-x', size: '0' });

    await expect(
      uploadLyreflyProjectSidecars('token', 'app-folder', { projects: [] }, vi.fn()),
    ).rejects.toThrow(/Upload verification failed/);

    expect(driveCreateJsonFileMock.mock.calls.map((call) => call[2])).not.toContain('project.json');
    expect(await listLyreflyDirtyRows()).not.toHaveLength(0);
  });

  it('skips re-uploading a page revision blob that already has a driveFileId', async () => {
    const project = createBlankComicProject();
    await saveLyreflyProject(project);
    const node = await createPageNode(project, 'Page 1');
    const file = new File(['pixels'], 'page1.png', { type: 'image/png' });
    const revision = await addPageRevisionFromFile(node, file, 'v1');
    await lyreflyDb.pageRevisions.update(revision.id, { driveFileId: 'already-uploaded' });

    await uploadLyreflyProjectSidecars('token', 'app-folder', { projects: [] }, vi.fn());

    expect(driveUploadFileResumableMock).not.toHaveBeenCalled();
  });
});

describe('downloadMissingLyreflyProjectSidecars + lyreflyNeedsSidecarDownload', () => {
  beforeEach(async () => {
    await clearAllLyreflyTables();
    vi.clearAllMocks();
  });

  it('needsSidecarDownload is false when no project has a Drive folder yet', () => {
    expect(lyreflyNeedsSidecarDownload({ projects: [{ id: 'p1', title: 'A', status: 'draft', updatedAt: 'x' }] })).toBe(
      false,
    );
  });

  it('needsSidecarDownload is true once any project has a projectFolderId', () => {
    expect(
      lyreflyNeedsSidecarDownload({
        projects: [{ id: 'p1', title: 'A', status: 'draft', updatedAt: 'x', projectFolderId: 'folder-1' }],
      }),
    ).toBe(true);
  });

  it('skips a project that already looks fully hydrated locally (no network calls)', async () => {
    const project = createBlankComicProject();
    project.projectFolderId = 'folder-1';
    project.pageCount = 1;
    await lyreflyDb.projects.put(project);
    await lyreflyDb.pageNodes.put({
      id: 'n1',
      projectId: project.id,
      isSpread: false,
      activeRevisionId: null,
      revisionIds: [],
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });

    await downloadMissingLyreflyProjectSidecars(
      'token',
      {
        projects: [
          {
            id: project.id,
            title: project.title,
            status: 'draft',
            updatedAt: project.updatedAt,
            projectFolderId: 'folder-1',
            pageCount: 1,
          },
        ],
      },
      vi.fn(),
    );

    expect(driveListFilesMock).not.toHaveBeenCalled();
  });

  it('downloads a brand-new project package and its blobs onto an empty device', async () => {
    const remoteProject = createBlankComicProject();
    remoteProject.layoutOrder = ['n1'];
    remoteProject.pageCount = 1;

    const revision = {
      id: 'r1',
      pageNodeId: 'n1',
      label: 'v1',
      stage: 'other' as const,
      fileName: 'page1.png',
      mimeType: 'image/png',
      width: 0,
      height: 0,
      driveFileId: 'blob-1',
      importedAt: remoteProject.createdAt,
      createdAt: remoteProject.createdAt,
    };
    const node = {
      id: 'n1',
      projectId: remoteProject.id,
      isSpread: false,
      activeRevisionId: 'r1',
      revisionIds: ['r1'],
      createdAt: remoteProject.createdAt,
      updatedAt: remoteProject.updatedAt,
    };

    driveGetMediaMock.mockImplementation(async (_token: string, fileId: string) => {
      if (fileId === 'project-json-file') return JSON.stringify(remoteProject);
      if (fileId === 'layout-json-file') return JSON.stringify({ schemaVersion: 1, order: ['n1'] });
      if (fileId === 'node-json') return JSON.stringify(node);
      if (fileId === 'revisions-json') return JSON.stringify({ schemaVersion: 1, revisions: [revision] });
      throw new Error(`unexpected fileId ${fileId}`);
    });
    driveListFilesMock.mockImplementation(async (_token: string, q: string) => {
      if (q.includes("'root-project-folder' in parents")) {
        return {
          files: [
            { id: 'project-json-file', name: 'project.json' },
            { id: 'layout-json-file', name: 'layout.json' },
            { id: 'pages-folder', name: 'pages', mimeType: 'application/vnd.google-apps.folder' },
          ],
        };
      }
      if (q.includes("'pages-folder' in parents")) {
        return { files: [{ id: 'n1-folder', name: 'n1', mimeType: 'application/vnd.google-apps.folder' }] };
      }
      if (q.includes("'n1-folder' in parents")) {
        return {
          files: [
            { id: 'node-json', name: 'node.json' },
            { id: 'revisions-json', name: 'revisions.json' },
          ],
        };
      }
      return { files: [] };
    });
    driveGetMediaArrayBufferMock.mockResolvedValue(new ArrayBuffer(4));

    await downloadMissingLyreflyProjectSidecars(
      'token',
      {
        projects: [
          {
            id: remoteProject.id,
            title: remoteProject.title,
            status: 'draft',
            updatedAt: 'x',
            projectFolderId: 'root-project-folder',
            pageCount: 1,
          },
        ],
      },
      vi.fn(),
    );

    const storedProject = await lyreflyDb.projects.get(remoteProject.id);
    expect(storedProject).toBeDefined();
    expect(storedProject?.layoutOrder).toEqual(['n1']);

    const storedNode = await lyreflyDb.pageNodes.get('n1');
    expect(storedNode).toBeDefined();

    const storedBlob = await lyreflyDb.revisionBlobs.get('r1');
    expect(storedBlob?.blob).toBeDefined();
    expect(driveGetMediaArrayBufferMock).toHaveBeenCalledWith('token', 'blob-1');
  });

  it('never overwrites a local blob that already exists (blob preservation)', async () => {
    const remoteProject = createBlankComicProject();
    remoteProject.layoutOrder = ['n1'];
    remoteProject.pageCount = 1;
    remoteProject.projectFolderId = 'root-project-folder';
    await lyreflyDb.projects.put(remoteProject);

    const node = {
      id: 'n1',
      projectId: remoteProject.id,
      isSpread: false,
      activeRevisionId: 'r1',
      revisionIds: ['r1'],
      createdAt: remoteProject.createdAt,
      updatedAt: remoteProject.updatedAt,
    };
    await lyreflyDb.pageNodes.put(node);
    // fake-indexeddb does not preserve Blob byte size through a structured-clone round trip, so
    // spy the read directly (mirrors how other Labs apps test "skip if blob already has bytes").
    const localBlob = new Blob(['already have this'], { type: 'image/png' });
    vi.spyOn(lyreflyDb.revisionBlobs, 'get').mockResolvedValue({ revisionId: 'r1', blob: localBlob });

    const revision = {
      id: 'r1',
      pageNodeId: 'n1',
      label: 'v1',
      stage: 'other' as const,
      fileName: 'page1.png',
      mimeType: 'image/png',
      width: 0,
      height: 0,
      driveFileId: 'blob-1',
      importedAt: remoteProject.createdAt,
      createdAt: remoteProject.createdAt,
    };

    driveListFilesMock.mockImplementation(async (_token: string, q: string) => {
      if (q.includes("'root-project-folder' in parents")) {
        return {
          files: [
            { id: 'project-json-file', name: 'project.json' },
            { id: 'layout-json-file', name: 'layout.json' },
            { id: 'pages-folder', name: 'pages', mimeType: 'application/vnd.google-apps.folder' },
          ],
        };
      }
      if (q.includes("'pages-folder' in parents")) {
        return { files: [{ id: 'n1-folder', name: 'n1', mimeType: 'application/vnd.google-apps.folder' }] };
      }
      if (q.includes("'n1-folder' in parents")) {
        return {
          files: [
            { id: 'node-json', name: 'node.json' },
            { id: 'revisions-json', name: 'revisions.json' },
          ],
        };
      }
      return { files: [] };
    });
    driveGetMediaMock.mockImplementation(async (_token: string, fileId: string) => {
      if (fileId === 'project-json-file') return JSON.stringify(remoteProject);
      if (fileId === 'layout-json-file') return JSON.stringify({ schemaVersion: 1, order: ['n1'] });
      if (fileId === 'node-json') return JSON.stringify(node);
      if (fileId === 'revisions-json') return JSON.stringify({ schemaVersion: 1, revisions: [revision] });
      throw new Error(`unexpected fileId ${fileId}`);
    });

    // Local pageCount already matches summary — but force a re-check by having pageCount higher than 0 pages
    // Use a fresh device scenario: no local page nodes counted differently. Force through by pageCount mismatch.
    await lyreflyDb.pageNodes.clear();

    await downloadMissingLyreflyProjectSidecars(
      'token',
      {
        projects: [
          {
            id: remoteProject.id,
            title: remoteProject.title,
            status: 'draft',
            updatedAt: 'x',
            projectFolderId: 'root-project-folder',
            pageCount: 1,
          },
        ],
      },
      vi.fn(),
    );

    expect(driveGetMediaArrayBufferMock).not.toHaveBeenCalled();
    const storedBlob = await lyreflyDb.revisionBlobs.get('r1');
    expect(storedBlob?.blob).toBe(localBlob);
  });
});
