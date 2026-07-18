/**
 * Real Drive upload/download for Lyrefly project packages (Phase 7).
 *
 * Layout on Drive: `Tiff Zhang Labs/Lyrefly/projects/{projectId}/` mirrors the flat-file tree from
 * {@link projectPackageToFiles} (`project.json`, `layout.json`, `script/`, `pages/{nodeId}/`,
 * `visual-dev/`, `archive/`, `snapshots/`) plus binary sidecars not covered by that map
 * (`pages/{nodeId}/revisions/{fileName}`, `visual-dev/assets/{fileName}`).
 *
 * Efficiency: uploads are driven by the `dirtySync` ledger (`listLyreflyDirtyRows`) so an idle
 * device with no local edits does no Drive work on auto-push.
 */
import {
  driveCreateFolder,
  driveCreateJsonFile,
  driveGetMedia,
  driveGetMediaArrayBuffer,
  driveListFiles,
  driveUploadFileResumable,
  drivePatchJsonMedia,
  type DriveFileListRow,
} from '../../shared/drive/driveFetch';
import { lyreflyDb, listLyreflyDirtyRows, clearLyreflyDirtyRow } from '../db/lyreflyDb';
import type { ComicProjectSummary } from '../types';
import {
  LYREFLY_ARCHIVE_FILE,
  LYREFLY_ARCHIVE_FOLDER,
  LYREFLY_DRIVE_PROJECTS_FOLDER,
  LYREFLY_LAYOUT_FILE,
  LYREFLY_PAGES_FOLDER,
  LYREFLY_PAGE_NODE_FILE,
  LYREFLY_PAGE_REVISIONS_FILE,
  LYREFLY_PAGE_REVISIONS_FOLDER,
  LYREFLY_PROJECT_FILE,
  LYREFLY_SCRIPT_FOLDER,
  LYREFLY_SCRIPT_JSON_FILE,
  LYREFLY_SCRIPT_MD_FILE,
  LYREFLY_SNAPSHOTS_FOLDER,
  LYREFLY_VISUAL_DEV_ASSETS_FOLDER,
  LYREFLY_VISUAL_DEV_FOLDER,
  LYREFLY_VISUAL_DEV_INDEX_FILE,
} from './constants';
import type { LyreflySyncPayload } from './lyreflyDriveEnvelope';
import { applyLyreflyProjectPackageToDb, buildLyreflyProjectPackageFromDb } from './lyreflyProjectPackageDb';
import { projectPackageFromFiles, projectPackageToFiles, type LyreflyProjectPackageFiles } from './projectPackage';

type FolderCache = Map<string, Promise<string>>;

function escapeDriveQueryValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

async function findChildFolderId(
  accessToken: string,
  parentId: string,
  name: string,
): Promise<string | undefined> {
  const q = `name='${escapeDriveQueryValue(name)}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const list = await driveListFiles(accessToken, q);
  return (list.files?.[0] as DriveFileListRow | undefined)?.id;
}

async function ensureChildFolder(
  accessToken: string,
  cache: FolderCache,
  parentId: string,
  name: string,
): Promise<string> {
  const key = `${parentId}/${name}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    const existingId = await findChildFolderId(accessToken, parentId, name);
    if (existingId) return existingId;
    const created = await driveCreateFolder(accessToken, name, parentId);
    return created.id;
  })();
  cache.set(key, promise);
  return promise;
}

async function resolveFolderPath(
  accessToken: string,
  cache: FolderCache,
  rootId: string,
  segments: readonly string[],
): Promise<string> {
  let currentId = rootId;
  for (const segment of segments) {
    currentId = await ensureChildFolder(accessToken, cache, currentId, segment);
  }
  return currentId;
}

async function upsertTextFile(
  accessToken: string,
  folderId: string,
  fileName: string,
  body: string,
): Promise<string> {
  const q = `name='${escapeDriveQueryValue(fileName)}' and '${folderId}' in parents and trashed=false`;
  const list = await driveListFiles(accessToken, q);
  const existingId = (list.files?.[0] as DriveFileListRow | undefined)?.id;
  if (existingId) {
    await drivePatchJsonMedia(accessToken, existingId, body, undefined);
    return existingId;
  }
  const created = await driveCreateJsonFile(accessToken, body, fileName, [folderId]);
  return created.id;
}

async function uploadPackageTextFiles(
  accessToken: string,
  cache: FolderCache,
  projectFolderId: string,
  files: LyreflyProjectPackageFiles,
): Promise<void> {
  for (const [relativePath, content] of Object.entries(files)) {
    const segments = relativePath.split('/');
    const fileName = segments.pop();
    if (!fileName) continue;
    const folderId =
      segments.length > 0 ? await resolveFolderPath(accessToken, cache, projectFolderId, segments) : projectFolderId;
    await upsertTextFile(accessToken, folderId, fileName, content);
  }
}

async function uploadOneLyreflyProjectPackage(
  accessToken: string,
  cache: FolderCache,
  projectFolderId: string,
  projectId: string,
  onLabel: (label: string) => void,
): Promise<boolean> {
  let pkg = await buildLyreflyProjectPackageFromDb(projectId);
  if (!pkg) return false;

  // Sidecars before envelope: upload blobs first so JSON serialized below carries their driveFileId.
  for (const entry of pkg.pageNodes.values()) {
    const revisionsNeedingUpload = entry.revisions.filter((r) => !r.driveFileId);
    if (revisionsNeedingUpload.length === 0) continue;
    const pageFolderId = await resolveFolderPath(accessToken, cache, projectFolderId, [
      LYREFLY_PAGES_FOLDER,
      entry.node.id,
    ]);
    const revisionsFolderId = await resolveFolderPath(accessToken, cache, pageFolderId, [
      LYREFLY_PAGE_REVISIONS_FOLDER,
    ]);
    for (const revision of revisionsNeedingUpload) {
      const blobRow = await lyreflyDb.revisionBlobs.get(revision.id);
      if (!blobRow?.blob || blobRow.blob.size <= 0) continue;
      onLabel(`Uploading page art: ${revision.label}`);
      const file = new File([blobRow.blob], revision.fileName, { type: revision.mimeType });
      const { id } = await driveUploadFileResumable(accessToken, file, [revisionsFolderId], revision.fileName);
      await lyreflyDb.pageRevisions.update(revision.id, { driveFileId: id });
    }
  }

  const assetsNeedingUpload = pkg.visualDevAssets.filter((a) => !a.driveFileId && a.fileName);
  if (assetsNeedingUpload.length > 0) {
    const assetsFolderId = await resolveFolderPath(accessToken, cache, projectFolderId, [
      LYREFLY_VISUAL_DEV_FOLDER,
      LYREFLY_VISUAL_DEV_ASSETS_FOLDER,
    ]);
    for (const asset of assetsNeedingUpload) {
      const blobRow = await lyreflyDb.visualDevBlobs.get(asset.id);
      if (!blobRow?.blob || blobRow.blob.size <= 0) continue;
      onLabel(`Uploading visual dev: ${asset.title}`);
      const fileName = asset.fileName as string;
      const file = new File([blobRow.blob], fileName, { type: asset.mimeType ?? 'application/octet-stream' });
      const { id } = await driveUploadFileResumable(accessToken, file, [assetsFolderId], fileName);
      await lyreflyDb.visualDevAssets.update(asset.id, { driveFileId: id });
    }
  }

  // Re-read so JSON reflects driveFileIds set above.
  pkg = await buildLyreflyProjectPackageFromDb(projectId);
  if (!pkg) return false;
  await uploadPackageTextFiles(accessToken, cache, projectFolderId, projectPackageToFiles(pkg));
  return true;
}

/**
 * `uploadSidecars` for {@link lyreflyPortfolioDriveBackupConfig}.
 * Uploads dirty-ledger projects plus any local project that never received a Drive folder id
 * (create-before-dirty, pre-ledger work, or auto-push that never flushed).
 */
export async function uploadLyreflyProjectSidecars(
  accessToken: string,
  appFolderId: string,
  _local: LyreflySyncPayload,
  onLabel: (label: string) => void,
): Promise<void> {
  const dirtyRows = await listLyreflyDirtyRows();
  const projectIds = new Set(
    dirtyRows.map((r) => r.projectId).filter((id): id is string => Boolean(id)),
  );
  const allProjects = await lyreflyDb.projects.toArray();
  for (const project of allProjects) {
    if (!project.projectFolderId) projectIds.add(project.id);
  }
  if (projectIds.size === 0) return;

  const cache: FolderCache = new Map();
  const projectsFolderId = await resolveFolderPath(accessToken, cache, appFolderId, [LYREFLY_DRIVE_PROJECTS_FOLDER]);
  const orderedIds = [...projectIds];

  for (let i = 0; i < orderedIds.length; i += 1) {
    const projectId = orderedIds[i];
    if (!projectId) continue;
    const dirtyForProject = dirtyRows.filter((r) => r.projectId === projectId);
    const project = await lyreflyDb.projects.get(projectId);
    if (!project) {
      // Deleted locally before upload ran — nothing to push; drop the stale ledger entries.
      for (const row of dirtyForProject) await clearLyreflyDirtyRow(row.kind, row.rowId);
      continue;
    }
    onLabel(`Uploading project ${i + 1} of ${orderedIds.length}: ${project.title}`);
    const projectFolderId = await resolveFolderPath(accessToken, cache, projectsFolderId, [project.id]);
    if (project.projectFolderId !== projectFolderId) {
      await lyreflyDb.projects.update(project.id, { projectFolderId });
    }
    const uploaded = await uploadOneLyreflyProjectPackage(
      accessToken,
      cache,
      projectFolderId,
      project.id,
      onLabel,
    );
    if (uploaded) {
      for (const row of dirtyForProject) await clearLyreflyDirtyRow(row.kind, row.rowId);
    }
  }
}

async function listChildren(accessToken: string, parentId: string): Promise<DriveFileListRow[]> {
  const rows: DriveFileListRow[] = [];
  let pageToken: string | undefined;
  do {
    const list = await driveListFiles(
      accessToken,
      `'${parentId}' in parents and trashed=false`,
      'nextPageToken,files(id,name,mimeType,parents,modifiedTime)',
      100,
      pageToken,
    );
    rows.push(...(list.files ?? []));
    pageToken = list.nextPageToken;
  } while (pageToken);
  return rows;
}

async function readTextFilesInto(
  accessToken: string,
  files: LyreflyProjectPackageFiles,
  byName: Map<string, DriveFileListRow>,
  entries: Array<{ name: string; path: string }>,
): Promise<void> {
  for (const { name, path } of entries) {
    const row = byName.get(name);
    if (!row?.id) continue;
    files[path] = await driveGetMedia(accessToken, row.id);
  }
}

async function fetchLyreflyProjectPackageFiles(
  accessToken: string,
  projectFolderId: string,
): Promise<LyreflyProjectPackageFiles> {
  const files: LyreflyProjectPackageFiles = {};
  const root = await listChildren(accessToken, projectFolderId);
  const rootByName = new Map(root.filter((r) => r.name).map((r) => [r.name as string, r]));

  await readTextFilesInto(accessToken, files, rootByName, [
    { name: LYREFLY_PROJECT_FILE, path: 'project.json' },
    { name: LYREFLY_LAYOUT_FILE, path: 'layout.json' },
  ]);

  const scriptFolder = rootByName.get(LYREFLY_SCRIPT_FOLDER);
  if (scriptFolder?.id) {
    const scriptChildren = await listChildren(accessToken, scriptFolder.id);
    const scriptByName = new Map(scriptChildren.filter((r) => r.name).map((r) => [r.name as string, r]));
    await readTextFilesInto(accessToken, files, scriptByName, [
      { name: LYREFLY_SCRIPT_MD_FILE, path: 'script/script.md' },
      { name: LYREFLY_SCRIPT_JSON_FILE, path: 'script/script.json' },
    ]);
  }

  const pagesFolder = rootByName.get(LYREFLY_PAGES_FOLDER);
  if (pagesFolder?.id) {
    const pageNodeFolders = await listChildren(accessToken, pagesFolder.id);
    for (const nodeFolder of pageNodeFolders) {
      if (!nodeFolder.id || !nodeFolder.name) continue;
      const nodeChildren = await listChildren(accessToken, nodeFolder.id);
      const nodeByName = new Map(nodeChildren.filter((r) => r.name).map((r) => [r.name as string, r]));
      await readTextFilesInto(accessToken, files, nodeByName, [
        { name: LYREFLY_PAGE_NODE_FILE, path: `pages/${nodeFolder.name}/node.json` },
        { name: LYREFLY_PAGE_REVISIONS_FILE, path: `pages/${nodeFolder.name}/revisions.json` },
      ]);
    }
  }

  const visualDevFolder = rootByName.get(LYREFLY_VISUAL_DEV_FOLDER);
  if (visualDevFolder?.id) {
    const vdChildren = await listChildren(accessToken, visualDevFolder.id);
    const vdByName = new Map(vdChildren.filter((r) => r.name).map((r) => [r.name as string, r]));
    await readTextFilesInto(accessToken, files, vdByName, [
      { name: LYREFLY_VISUAL_DEV_INDEX_FILE, path: 'visual-dev/index.json' },
    ]);
  }

  const archiveFolder = rootByName.get(LYREFLY_ARCHIVE_FOLDER);
  if (archiveFolder?.id) {
    const archiveChildren = await listChildren(accessToken, archiveFolder.id);
    const archiveByName = new Map(archiveChildren.filter((r) => r.name).map((r) => [r.name as string, r]));
    await readTextFilesInto(accessToken, files, archiveByName, [
      { name: LYREFLY_ARCHIVE_FILE, path: 'archive/archive.json' },
    ]);
  }

  const snapshotsFolder = rootByName.get(LYREFLY_SNAPSHOTS_FOLDER);
  if (snapshotsFolder?.id) {
    const snapshotChildren = await listChildren(accessToken, snapshotsFolder.id);
    for (const snap of snapshotChildren) {
      if (!snap.id || !snap.name?.endsWith('.json')) continue;
      files[`snapshots/${snap.name}`] = await driveGetMedia(accessToken, snap.id);
    }
  }

  return files;
}

async function downloadOneLyreflyProjectPackage(
  accessToken: string,
  summary: ComicProjectSummary,
  onProgress: (label: string) => void,
): Promise<void> {
  const projectFolderId = summary.projectFolderId;
  if (!projectFolderId) return;
  const files = await fetchLyreflyProjectPackageFiles(accessToken, projectFolderId);
  if (!files['project.json']) return;

  const pkg = projectPackageFromFiles(files);
  await applyLyreflyProjectPackageToDb(pkg);
  // Summary carries the Drive folder id; package JSON may omit it.
  await lyreflyDb.projects.update(summary.id, { projectFolderId });

  for (const entry of pkg.pageNodes.values()) {
    for (const revision of entry.revisions) {
      if (!revision.driveFileId) continue;
      const existing = await lyreflyDb.revisionBlobs.get(revision.id);
      if (existing?.blob && existing.blob.size > 0) continue;
      onProgress(`Downloading page art: ${revision.label}`);
      const bytes = await driveGetMediaArrayBuffer(accessToken, revision.driveFileId);
      await lyreflyDb.revisionBlobs.put({
        revisionId: revision.id,
        blob: new Blob([bytes], { type: revision.mimeType }),
      });
    }
  }

  for (const asset of pkg.visualDevAssets) {
    if (!asset.driveFileId) continue;
    const existing = await lyreflyDb.visualDevBlobs.get(asset.id);
    if (existing?.blob && existing.blob.size > 0) continue;
    onProgress(`Downloading visual dev: ${asset.title}`);
    const bytes = await driveGetMediaArrayBuffer(accessToken, asset.driveFileId);
    await lyreflyDb.visualDevBlobs.put({
      assetId: asset.id,
      blob: new Blob([bytes], { type: asset.mimeType ?? 'application/octet-stream' }),
    });
  }
}

/**
 * `downloadSidecars` for {@link lyreflyPortfolioDriveBackupConfig}. Skips projects that already
 * look fully hydrated *and* are not behind the gallery summary clock, so steady-state devices
 * avoid re-listing Drive folders — but same-row remote edits (script, captions) still re-apply.
 */
export async function downloadMissingLyreflyProjectSidecars(
  accessToken: string,
  merged: LyreflySyncPayload,
  onProgress: (label: string) => void,
): Promise<void> {
  const candidates = merged.projects.filter((p) => Boolean(p.projectFolderId));
  if (candidates.length === 0) return;

  for (let i = 0; i < candidates.length; i += 1) {
    const summary = candidates[i];
    if (!summary) continue;
    const localProject = await lyreflyDb.projects.get(summary.id);
    const localPageCount = await lyreflyDb.pageNodes.where('projectId').equals(summary.id).count();
    const remotePageCount = summary.pageCount ?? 0;
    // Never treat an empty local workbench as hydrated (stubs used to copy projectFolderId and
    // skip download when pageCount was 0/undefined). Require local pages when remote has any.
    const pagesCaughtUp =
      localPageCount > 0 && (remotePageCount === 0 || localPageCount >= remotePageCount);
    const clockCaughtUp =
      Boolean(localProject) && localProject!.updatedAt >= (summary.updatedAt || '');
    if (pagesCaughtUp && clockCaughtUp) continue;
    onProgress(`Downloading project ${i + 1} of ${candidates.length}: ${summary.title}`);
    await downloadOneLyreflyProjectPackage(accessToken, summary, onProgress);
  }
}

/** `needsSidecarDownload` for {@link lyreflyPortfolioDriveBackupConfig} — synchronous by contract. */
export function lyreflyNeedsSidecarDownload(merged: LyreflySyncPayload): boolean {
  return merged.projects.some((p) => Boolean(p.projectFolderId));
}
