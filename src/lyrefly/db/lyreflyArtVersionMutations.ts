import { lyreflyDb, markLyreflyDirtyRow } from './lyreflyDb';
import { notifyLyreflyLocalChange } from './lyreflyChangeBus';
import { addPageRevisionFromFile, saveLyreflyProject } from './lyreflyProjectMutations';
import { parseAndSortPageFiles } from '../../shared/zine/pageFileParser';
import { matchParsedFilesToPageNodes } from '../utils/artPageMatchUtils';
import { filterImageFilesForPageUpload } from '../utils/artPageUploadUtils';
import type { ComicArtVersion, ComicProject, PageNode, PageRevision } from '../types';
import {
  buildPageRevisionMapFromNodes,
  defaultArtVersionLabel,
  inferArtVersionCompletedAt,
} from '../utils/artVersionUtils';

export async function captureComicArtVersion(
  project: ComicProject,
  pageNodes: readonly PageNode[],
  revisions: readonly PageRevision[],
  input?: { label?: string; notes?: string; completedAt?: string },
): Promise<{ project: ComicProject; version: ComicArtVersion }> {
  const now = new Date().toISOString();
  const pageRevisions = buildPageRevisionMapFromNodes(pageNodes);
  const existingCount = project.artVersionIds?.length ?? 0;
  const version: ComicArtVersion = {
    id: crypto.randomUUID(),
    projectId: project.id,
    label: input?.label?.trim() || defaultArtVersionLabel(existingCount),
    notes: input?.notes?.trim() || undefined,
    pageRevisions,
    source: 'snapshot',
    completedAt:
      input?.completedAt ??
      inferArtVersionCompletedAt(pageRevisions, revisions) ??
      now,
    createdAt: now,
    updatedAt: now,
  };
  await lyreflyDb.artVersions.put(version);
  await markLyreflyDirtyRow('art_version', version.id, 'upsert', project.id);

  const artVersionIds = [...(project.artVersionIds ?? []), version.id];
  const updatedProject = await saveLyreflyProject({ ...project, artVersionIds });
  notifyLyreflyLocalChange({ immediate: true });
  return { project: updatedProject, version };
}

export async function updateComicArtVersion(
  version: ComicArtVersion,
  patch: Partial<Pick<ComicArtVersion, 'label' | 'notes' | 'completedAt'>>,
): Promise<ComicArtVersion> {
  const updated: ComicArtVersion = {
    ...version,
    ...patch,
    label: patch.label?.trim() || version.label,
    notes: patch.notes?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  await lyreflyDb.artVersions.put(updated);
  await markLyreflyDirtyRow('art_version', updated.id, 'upsert', version.projectId);
  notifyLyreflyLocalChange();
  return updated;
}

export async function deleteComicArtVersion(
  project: ComicProject,
  versionId: string,
): Promise<ComicProject> {
  await lyreflyDb.artVersions.delete(versionId);
  await markLyreflyDirtyRow('art_version', versionId, 'delete', project.id);
  const artVersionIds = (project.artVersionIds ?? []).filter((id) => id !== versionId);
  const finalArtVersionId =
    project.finalArtVersionId === versionId ? undefined : project.finalArtVersionId;
  const updatedProject = await saveLyreflyProject({ ...project, artVersionIds, finalArtVersionId });
  notifyLyreflyLocalChange({ immediate: true });
  return updatedProject;
}

export async function setFinalArtVersion(
  project: ComicProject,
  versionId: string | undefined,
): Promise<ComicProject> {
  const updatedProject = await saveLyreflyProject({ ...project, finalArtVersionId: versionId });
  notifyLyreflyLocalChange();
  return updatedProject;
}

export async function applyComicArtVersion(
  version: ComicArtVersion,
  pageNodes: readonly PageNode[],
): Promise<PageNode[]> {
  const now = new Date().toISOString();
  const updated: PageNode[] = [];
  for (const node of pageNodes) {
    const revisionId = version.pageRevisions[node.id];
    if (!revisionId || revisionId === node.activeRevisionId) continue;
    const next: PageNode = { ...node, activeRevisionId: revisionId, updatedAt: now };
    await lyreflyDb.pageNodes.put(next);
    await markLyreflyDirtyRow('page_node', next.id, 'upsert', node.projectId);
    updated.push(next);
  }
  if (updated.length > 0) notifyLyreflyLocalChange({ immediate: true });
  return updated;
}

export type ImportArtVersionResult = {
  project: ComicProject;
  version: ComicArtVersion;
  matchedPageCount: number;
  skippedFileCount: number;
};

/** Bulk-upload a page set as a saved version without changing current page picks. */
export async function importComicArtVersionFromFiles(
  project: ComicProject,
  orderedPageNodes: readonly PageNode[],
  files: readonly File[],
  input?: { label?: string; notes?: string },
): Promise<ImportArtVersionResult> {
  const images = filterImageFilesForPageUpload(files);
  if (images.length === 0) {
    throw new Error('No image files found');
  }
  if (orderedPageNodes.length === 0) {
    throw new Error('Add pages to the grid before uploading a page set');
  }

  const sorted = parseAndSortPageFiles(images);
  const { matches, unmatchedFiles } = matchParsedFilesToPageNodes(sorted, orderedPageNodes);
  if (matches.length === 0) {
    throw new Error('No uploaded files matched pages on the grid. Use names like front.png, page1.png, or Back Cover.');
  }

  const pageRevisions: Record<string, string> = {};
  const touchedNodeIds = new Set<string>();

  for (const { parsed, node } of matches) {
    const fresh = (await lyreflyDb.pageNodes.get(node.id)) ?? node;
    const revision = await addPageRevisionFromFile(fresh, parsed.file, parsed.originalName, {
      activate: false,
    });
    pageRevisions[node.id] = revision.id;
    touchedNodeIds.add(node.id);
  }

  const revisions = await lyreflyDb.pageRevisions
    .where('pageNodeId')
    .anyOf([...touchedNodeIds])
    .toArray();
  const existingCount = project.artVersionIds?.length ?? 0;
  const now = new Date().toISOString();
  const version: ComicArtVersion = {
    id: crypto.randomUUID(),
    projectId: project.id,
    label: input?.label?.trim() || defaultArtVersionLabel(existingCount),
    notes: input?.notes?.trim() || undefined,
    source: 'upload',
    pageRevisions,
    completedAt: inferArtVersionCompletedAt(pageRevisions, revisions) ?? now,
    createdAt: now,
    updatedAt: now,
  };
  await lyreflyDb.artVersions.put(version);
  await markLyreflyDirtyRow('art_version', version.id, 'upsert', project.id);

  const artVersionIds = [...(project.artVersionIds ?? []), version.id];
  const updatedProject = await saveLyreflyProject({ ...project, artVersionIds });
  notifyLyreflyLocalChange({ immediate: true });
  return {
    project: updatedProject,
    version,
    matchedPageCount: matches.length,
    skippedFileCount: unmatchedFiles.length,
  };
}

export async function reorderArtVersion(
  project: ComicProject,
  versionId: string,
  direction: 'earlier' | 'later',
): Promise<ComicProject> {
  const ids = [...(project.artVersionIds ?? [])];
  const index = ids.indexOf(versionId);
  if (index < 0) return project;
  const target = direction === 'earlier' ? index - 1 : index + 1;
  if (target < 0 || target >= ids.length) return project;
  [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  const updatedProject = await saveLyreflyProject({ ...project, artVersionIds: ids });
  notifyLyreflyLocalChange();
  return updatedProject;
}
