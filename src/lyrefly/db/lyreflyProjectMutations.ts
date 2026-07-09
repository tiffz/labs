import { lyreflyDb, markLyreflyDirtyRow } from '../db/lyreflyDb';
import { notifyLyreflyLocalChange } from '../db/lyreflyChangeBus';
import type {
  ComicArchiveBinder,
  ComicProject,
  PageNode,
  PageRevision,
  PageRevisionStage,
  PublishLogEntry,
  VisualDevAsset,
  VisualDevAssetKind,
} from '../types';

export async function saveLyreflyProject(
  project: ComicProject,
  options?: { notifySync?: boolean },
): Promise<ComicProject> {
  const updated: ComicProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  await lyreflyDb.projects.put(updated);
  await markLyreflyDirtyRow('project', updated.id, 'upsert', updated.id);
  if (options?.notifySync !== false) {
    notifyLyreflyLocalChange();
  }
  return updated;
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

export async function createVisualDevAsset(
  projectId: string,
  input: {
    kind: VisualDevAssetKind;
    title: string;
    caption?: string;
    url?: string;
    markdown?: string;
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

export async function deleteVisualDevAsset(asset: VisualDevAsset): Promise<void> {
  await lyreflyDb.visualDevAssets.delete(asset.id);
  await lyreflyDb.visualDevBlobs.delete(asset.id);
  await markLyreflyDirtyRow('visual_dev', asset.id, 'delete', asset.projectId);
  notifyLyreflyLocalChange();
}

export async function createPageNode(project: ComicProject, displayName?: string): Promise<PageNode> {
  const now = new Date().toISOString();
  const node: PageNode = {
    id: crypto.randomUUID(),
    projectId: project.id,
    displayName: displayName ?? `Page ${project.layoutOrder.length + 1}`,
    isSpread: false,
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

export async function addPageRevisionFromFile(
  pageNode: PageNode,
  file: File,
  label: string,
  stage: PageRevisionStage,
): Promise<PageRevision> {
  const now = new Date().toISOString();
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
    importedAt: now,
    createdAt: now,
  };
  await lyreflyDb.revisionBlobs.put({ revisionId: revision.id, blob: file });
  await lyreflyDb.pageRevisions.put(revision);
  const updatedNode: PageNode = {
    ...pageNode,
    revisionIds: [...pageNode.revisionIds, revision.id],
    activeRevisionId: revision.id,
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
