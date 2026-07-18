import { lyreflyDb, markLyreflyDirtyRow } from '../db/lyreflyDb';
import { notifyLyreflyLocalChange } from '../db/lyreflyChangeBus';
import { recordLyreflyProjectTombstone } from '../drive/lyreflyDriveTombstones';
import { parseAndSortPageFiles } from '../../shared/zine/pageFileParser';
import {
  displayNameFromParsedPageFile,
  filterImageFilesForPageUpload,
} from '../utils/artPageUploadUtils';
import { fileLastModifiedIso } from '../utils/artVersionUtils';
import type {
  ComicArchiveBinder,
  ComicProject,
  PageNode,
  PageRevision,
  PageRevisionStage,
  PressMemorabiliaEntry,
  PublishLogEntry,
  VisualDevAsset,
  VisualDevAssetKind,
} from '../types';

export async function saveLyreflyProject(
  project: ComicProject,
  options?: { notifySync?: boolean; immediate?: boolean },
): Promise<ComicProject> {
  const updated: ComicProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  await lyreflyDb.projects.put(updated);
  await markLyreflyDirtyRow('project', updated.id, 'upsert', updated.id);
  if (options?.notifySync !== false) {
    notifyLyreflyLocalChange(options?.immediate ? { immediate: true } : undefined);
  }
  return updated;
}

/**
 * Deletes a project and all local rows scoped to it, then records a Drive tombstone so union merge
 * does not resurrect it on another device (see `lyreflyDriveTombstones.ts` + `lyreflyDriveMerge.ts`).
 * Drive package bytes under `projects/{id}/` are left in place (harmless orphan) — see
 * `docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md` § Known gaps.
 */
export async function deleteLyreflyProject(project: ComicProject): Promise<void> {
  const pageNodes = await lyreflyDb.pageNodes.where('projectId').equals(project.id).toArray();
  for (const node of pageNodes) {
    const revisions = await lyreflyDb.pageRevisions.where('pageNodeId').equals(node.id).toArray();
    for (const revision of revisions) {
      await lyreflyDb.revisionBlobs.delete(revision.id);
      await lyreflyDb.pageRevisions.delete(revision.id);
    }
    await lyreflyDb.pageNodes.delete(node.id);
  }

  const visualDevAssets = await lyreflyDb.visualDevAssets.where('projectId').equals(project.id).toArray();
  for (const asset of visualDevAssets) {
    await lyreflyDb.visualDevBlobs.delete(asset.id);
    await lyreflyDb.visualDevAssets.delete(asset.id);
  }

  await lyreflyDb.scriptDocuments.where('projectId').equals(project.id).delete();
  await lyreflyDb.snapshots.where('projectId').equals(project.id).delete();
  await lyreflyDb.artVersions.where('projectId').equals(project.id).delete();
  await lyreflyDb.comicCharacters.where('projectId').equals(project.id).delete();
  await lyreflyDb.pageReferences.where('projectId').equals(project.id).delete();
  await lyreflyDb.pageMockups.where('projectId').equals(project.id).delete();
  if (project.archiveId) {
    await lyreflyDb.archives.delete(project.archiveId);
  }
  await lyreflyDb.projects.delete(project.id);

  recordLyreflyProjectTombstone(project.id);
  notifyLyreflyLocalChange({ immediate: true });
}

export async function ensureLyreflyArchive(project: ComicProject): Promise<ComicArchiveBinder> {
  if (project.archiveId) {
    const existing = await lyreflyDb.archives.get(project.archiveId);
    if (existing) return existing;
  }
  const archive: ComicArchiveBinder = {
    id: project.archiveId ?? crypto.randomUUID(),
    projectId: project.id,
    publishLog: [],
    pressEntries: [],
    salesLedger: [],
  };
  await lyreflyDb.archives.put(archive);
  await markLyreflyDirtyRow('archive', archive.id, 'upsert', project.id);
  if (!project.archiveId) {
    await saveLyreflyProject({ ...project, archiveId: archive.id, modules: { ...project.modules, archive: true } });
  }
  notifyLyreflyLocalChange();
  return archive;
}

export async function addPublishLogEntry(
  archive: ComicArchiveBinder,
  entry: Omit<PublishLogEntry, 'id'>,
): Promise<ComicArchiveBinder> {
  const updated: ComicArchiveBinder = {
    ...archive,
    publishLog: [...archive.publishLog, { ...entry, id: crypto.randomUUID() }],
  };
  await lyreflyDb.archives.put(updated);
  await markLyreflyDirtyRow('archive', updated.id, 'upsert', archive.projectId);
  notifyLyreflyLocalChange();
  return updated;
}

export async function updatePublishLogEntry(
  archive: ComicArchiveBinder,
  entryId: string,
  patch: Partial<Pick<PublishLogEntry, 'platform' | 'publishedAt' | 'url' | 'notes'>>,
): Promise<ComicArchiveBinder> {
  const updated: ComicArchiveBinder = {
    ...archive,
    publishLog: archive.publishLog.map((entry) =>
      entry.id === entryId ? { ...entry, ...patch } : entry,
    ),
  };
  await lyreflyDb.archives.put(updated);
  await markLyreflyDirtyRow('archive', updated.id, 'upsert', archive.projectId);
  notifyLyreflyLocalChange();
  return updated;
}

export async function addPressMemorabiliaEntry(
  archive: ComicArchiveBinder,
  entry: Omit<PressMemorabiliaEntry, 'id'>,
): Promise<ComicArchiveBinder> {
  const updated: ComicArchiveBinder = {
    ...archive,
    pressEntries: [...archive.pressEntries, { ...entry, id: crypto.randomUUID() }],
  };
  await lyreflyDb.archives.put(updated);
  await markLyreflyDirtyRow('archive', updated.id, 'upsert', archive.projectId);
  notifyLyreflyLocalChange();
  return updated;
}

export async function deletePressMemorabiliaEntry(
  archive: ComicArchiveBinder,
  entryId: string,
): Promise<ComicArchiveBinder> {
  const updated: ComicArchiveBinder = {
    ...archive,
    pressEntries: archive.pressEntries.filter((entry) => entry.id !== entryId),
  };
  await lyreflyDb.archives.put(updated);
  await markLyreflyDirtyRow('archive', updated.id, 'upsert', archive.projectId);
  notifyLyreflyLocalChange();
  return updated;
}

export async function createVisualDevAsset(
  projectId: string,
  input: {
    kind: VisualDevAssetKind;
    title: string;
    caption?: string;
    url?: string;
    markdown?: string;
    driveFileId?: string;
    file?: File;
  },
): Promise<VisualDevAsset> {
  const now = new Date().toISOString();
  const asset: VisualDevAsset = {
    id: crypto.randomUUID(),
    projectId,
    kind: input.kind,
    title: input.title.trim() || 'Untitled',
    caption: input.caption,
    tags: [],
    url: input.url,
    markdown: input.markdown,
    driveFileId: input.driveFileId,
    createdAt: now,
    updatedAt: now,
  };
  if (input.file) {
    asset.fileName = input.file.name;
    asset.mimeType = input.file.type || 'application/octet-stream';
    await lyreflyDb.visualDevBlobs.put({ assetId: asset.id, blob: input.file });
  }
  await lyreflyDb.visualDevAssets.put(asset);
  await markLyreflyDirtyRow('visual_dev', asset.id, 'upsert', projectId);
  notifyLyreflyLocalChange();
  return asset;
}

export async function updateVisualDevAsset(asset: VisualDevAsset): Promise<VisualDevAsset> {
  const updated: VisualDevAsset = { ...asset, updatedAt: new Date().toISOString() };
  await lyreflyDb.visualDevAssets.put(updated);
  await markLyreflyDirtyRow('visual_dev', updated.id, 'upsert', asset.projectId);
  notifyLyreflyLocalChange();
  return updated;
}

export async function deleteVisualDevAsset(asset: VisualDevAsset): Promise<void> {
  await lyreflyDb.visualDevAssets.delete(asset.id);
  await lyreflyDb.visualDevBlobs.delete(asset.id);
  await markLyreflyDirtyRow('visual_dev', asset.id, 'delete', asset.projectId);
  notifyLyreflyLocalChange();
}

export type VisualDevAssetRestorePayload = {
  asset: VisualDevAsset;
  blob: Blob | null;
};

export async function snapshotVisualDevAssetForUndo(
  asset: VisualDevAsset,
): Promise<VisualDevAssetRestorePayload> {
  const row = await lyreflyDb.visualDevBlobs.get(asset.id);
  return {
    asset: { ...asset },
    blob: row?.blob ?? null,
  };
}

export async function restoreVisualDevAsset(payload: VisualDevAssetRestorePayload): Promise<void> {
  await lyreflyDb.visualDevAssets.put(payload.asset);
  if (payload.blob) {
    await lyreflyDb.visualDevBlobs.put({ assetId: payload.asset.id, blob: payload.blob });
  }
  await markLyreflyDirtyRow('visual_dev', payload.asset.id, 'upsert', payload.asset.projectId);
  notifyLyreflyLocalChange();
}

/** Default revision stage for new uploads (no rigid pencil/inks workflow in UI). */
export const DEFAULT_PAGE_REVISION_STAGE: PageRevisionStage = 'other';

export async function deletePageNode(project: ComicProject, pageNode: PageNode): Promise<ComicProject> {
  const revisions = await lyreflyDb.pageRevisions.where('pageNodeId').equals(pageNode.id).toArray();
  for (const revision of revisions) {
    await lyreflyDb.revisionBlobs.delete(revision.id);
    await lyreflyDb.pageRevisions.delete(revision.id);
    await markLyreflyDirtyRow('page_revision', revision.id, 'delete', project.id);
  }
  await lyreflyDb.pageNodes.delete(pageNode.id);
  await markLyreflyDirtyRow('page_node', pageNode.id, 'delete', project.id);
  const layoutOrder = project.layoutOrder.filter((id) => id !== pageNode.id);
  const updated: ComicProject = {
    ...project,
    layoutOrder,
    pageCount: layoutOrder.length,
    updatedAt: new Date().toISOString(),
  };
  await lyreflyDb.projects.put(updated);
  notifyLyreflyLocalChange({ immediate: true });
  return updated;
}

export async function createPageNode(
  project: ComicProject,
  displayName?: string,
  options?: { isSpread?: boolean },
): Promise<PageNode> {
  const now = new Date().toISOString();
  const node: PageNode = {
    id: crypto.randomUUID(),
    projectId: project.id,
    displayName: displayName ?? `Page ${project.layoutOrder.length + 1}`,
    isSpread: options?.isSpread ?? false,
    activeRevisionId: null,
    revisionIds: [],
    createdAt: now,
    updatedAt: now,
  };
  await lyreflyDb.pageNodes.put(node);
  await saveLyreflyProject({
    ...project,
    layoutOrder: [...project.layoutOrder, node.id],
    pageCount: project.layoutOrder.length + 1,
  });
  await markLyreflyDirtyRow('page_node', node.id, 'upsert', project.id);
  return node;
}

export type BulkPageImportResult = {
  created: PageNode[];
  skippedNonImage: number;
};

/** Create page nodes + v1 revisions from a batch of images (Mixam / Zine Studio filename order). */
export async function createPageNodesFromFiles(
  project: ComicProject,
  files: readonly File[],
): Promise<BulkPageImportResult> {
  const images = filterImageFilesForPageUpload(files);
  const skippedNonImage = files.length - images.length;
  if (images.length === 0) {
    return { created: [], skippedNonImage };
  }

  const sorted = parseAndSortPageFiles(images);
  let currentProject = project;
  const created: PageNode[] = [];

  for (const parsed of sorted) {
    const displayName = displayNameFromParsedPageFile(parsed);
    const node = await createPageNode(currentProject, displayName, { isSpread: parsed.isSpread });
    await addPageRevisionFromFile(node, parsed.file, 'v1');
    const fresh = await lyreflyDb.projects.get(project.id);
    if (fresh) currentProject = fresh;
    created.push(node);
  }

  notifyLyreflyLocalChange({ immediate: true });
  return { created, skippedNonImage };
}

export async function addPageRevisionFromFile(
  pageNode: PageNode,
  file: File,
  label: string,
  options?: { stage?: PageRevisionStage; activate?: boolean },
): Promise<PageRevision> {
  const stage = options?.stage ?? DEFAULT_PAGE_REVISION_STAGE;
  const activate = options?.activate !== false;
  const now = new Date().toISOString();
  const fileTimestamp = fileLastModifiedIso(file, now);
  const revision: PageRevision = {
    id: crypto.randomUUID(),
    pageNodeId: pageNode.id,
    label: label.trim() || file.name,
    stage,
    fileName: file.name,
    mimeType: file.type || 'image/png',
    width: 0,
    height: 0,
    byteSize: file.size,
    importedAt: fileTimestamp,
    createdAt: fileTimestamp,
  };
  await lyreflyDb.revisionBlobs.put({ revisionId: revision.id, blob: file });
  await lyreflyDb.pageRevisions.put(revision);
  const updatedNode: PageNode = {
    ...pageNode,
    revisionIds: [...pageNode.revisionIds, revision.id],
    activeRevisionId: activate ? revision.id : pageNode.activeRevisionId,
    updatedAt: now,
  };
  await lyreflyDb.pageNodes.put(updatedNode);
  await markLyreflyDirtyRow('page_revision', revision.id, 'upsert', pageNode.projectId);
  await markLyreflyDirtyRow('page_node', pageNode.id, 'upsert', pageNode.projectId);
  notifyLyreflyLocalChange();
  return revision;
}

export async function setPageRevisionStage(
  revision: PageRevision,
  stage: PageRevisionStage,
): Promise<PageRevision> {
  const node = await lyreflyDb.pageNodes.get(revision.pageNodeId);
  const updated = { ...revision, stage };
  await lyreflyDb.pageRevisions.put(updated);
  await markLyreflyDirtyRow('page_revision', updated.id, 'upsert', node?.projectId);
  notifyLyreflyLocalChange();
  return updated;
}

export async function setActivePageRevision(pageNode: PageNode, revisionId: string): Promise<PageNode> {
  const updated: PageNode = {
    ...pageNode,
    activeRevisionId: revisionId,
    updatedAt: new Date().toISOString(),
  };
  await lyreflyDb.pageNodes.put(updated);
  await markLyreflyDirtyRow('page_node', updated.id, 'upsert', pageNode.projectId);
  notifyLyreflyLocalChange();
  return updated;
}

export async function loadVisualDevBlobUrl(assetId: string): Promise<string | null> {
  const row = await lyreflyDb.visualDevBlobs.get(assetId);
  if (!row) return null;
  return URL.createObjectURL(row.blob);
}

export async function loadRevisionBlobUrl(revisionId: string): Promise<string | null> {
  const row = await lyreflyDb.revisionBlobs.get(revisionId);
  if (!row) return null;
  return URL.createObjectURL(row.blob);
}
