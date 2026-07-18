/**
 * Dexie ↔ {@link LyreflyProjectPackage} adapters for real Drive project-package sync (Phase 7).
 *
 * Merge policy on {@link applyLyreflyProjectPackageToDb}:
 * - Id lists (`layoutOrder`, modules flags, snapshot/art version ids) union additively.
 * - Same-id sub-entities field-merge (content beats empty + newer `updatedAt`) — see
 *   `lyreflyPackageFieldMerge.ts`. Blobs are never overwritten (download path skips existing bytes).
 * - Project-only rich fields merge on every apply (not first-hydrate-only).
 */
import { lyreflyDb } from '../db/lyreflyDb';
import type { ComicProject, PageNode, PageRevision, VisualDevAsset } from '../types';
import {
  mergeLyreflyPageNode,
  mergeLyreflyPageRevision,
  mergeLyreflyProjectFields,
  mergeLyreflyScriptDocument,
  mergeLyreflyVisualDevAsset,
} from './lyreflyPackageFieldMerge';
import type { LyreflyProjectPackage } from './projectPackage';

export async function buildLyreflyProjectPackageFromDb(
  projectId: string,
): Promise<LyreflyProjectPackage | null> {
  const project = await lyreflyDb.projects.get(projectId);
  if (!project) return null;

  const pageNodeRows = await lyreflyDb.pageNodes.where('projectId').equals(projectId).toArray();
  const pageNodes = new Map<string, { node: PageNode; revisions: PageRevision[] }>();
  for (const node of pageNodeRows) {
    const revisions = await lyreflyDb.pageRevisions.where('pageNodeId').equals(node.id).toArray();
    pageNodes.set(node.id, { node, revisions });
  }

  const visualDevAssets = await lyreflyDb.visualDevAssets.where('projectId').equals(projectId).toArray();
  const snapshots = await lyreflyDb.snapshots.where('projectId').equals(projectId).toArray();

  let script: LyreflyProjectPackage['script'];
  if (project.modules.script) {
    const doc = await lyreflyDb.scriptDocuments.get(project.scriptDocumentId);
    if (doc) script = { markdown: doc.markdown, document: doc };
  }

  const archive = project.archiveId ? await lyreflyDb.archives.get(project.archiveId) : undefined;

  return {
    project,
    layoutOrder: project.layoutOrder,
    script,
    pageNodes,
    visualDevAssets,
    snapshots,
    archive,
  };
}

function unionIds(local: readonly string[], remote: readonly string[]): string[] {
  const seen = new Set(local);
  const merged = [...local];
  for (const id of remote) {
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(id);
    }
  }
  return merged;
}

export async function applyLyreflyProjectPackageToDb(pkg: LyreflyProjectPackage): Promise<void> {
  const existing = await lyreflyDb.projects.get(pkg.project.id);
  const localPageCount = await lyreflyDb.pageNodes.where('projectId').equals(pkg.project.id).count();
  const hasLocalWorkbench =
    localPageCount > 0 ||
    (existing?.layoutOrder.length ?? 0) > 0 ||
    (existing?.milestones.length ?? 0) > 0 ||
    Boolean(existing?.brainstormHtml && existing.brainstormHtml !== '<p></p>');
  const isFirstHydrate = !existing || !hasLocalWorkbench;

  const mergedLayoutOrder = existing
    ? unionIds(existing.layoutOrder, pkg.layoutOrder)
    : pkg.layoutOrder;
  const mergedModules = existing
    ? {
        milestones: existing.modules.milestones || pkg.project.modules.milestones,
        visualDev: existing.modules.visualDev || pkg.project.modules.visualDev,
        script: existing.modules.script || pkg.project.modules.script,
        layout: existing.modules.layout || pkg.project.modules.layout,
        archive: existing.modules.archive || pkg.project.modules.archive,
      }
    : pkg.project.modules;
  const mergedSnapshotIds = existing
    ? unionIds(existing.snapshotIds, pkg.project.snapshotIds)
    : pkg.project.snapshotIds;
  const mergedArtVersionIds = existing
    ? unionIds(existing.artVersionIds ?? [], pkg.project.artVersionIds ?? [])
    : pkg.project.artVersionIds;

  let nextProject: ComicProject;
  if (!existing || isFirstHydrate) {
    nextProject = {
      ...pkg.project,
      ...(existing
        ? {
            title: existing.title || pkg.project.title,
            status: existing.status,
            subtitle: existing.subtitle ?? pkg.project.subtitle,
            coverRef: existing.coverRef ?? pkg.project.coverRef,
          }
        : {}),
      layoutOrder: mergedLayoutOrder,
      modules: mergedModules,
      snapshotIds: mergedSnapshotIds,
      artVersionIds: mergedArtVersionIds,
      archiveId: existing?.archiveId ?? pkg.project.archiveId,
      pageCount: mergedLayoutOrder.length,
      updatedAt:
        existing && existing.updatedAt >= pkg.project.updatedAt
          ? existing.updatedAt
          : pkg.project.updatedAt,
    };
  } else {
    const fieldMerged = mergeLyreflyProjectFields(existing, pkg.project);
    nextProject = {
      ...fieldMerged,
      layoutOrder: mergedLayoutOrder,
      modules: mergedModules,
      snapshotIds: mergedSnapshotIds,
      artVersionIds: mergedArtVersionIds,
      archiveId: existing.archiveId ?? pkg.project.archiveId,
      pageCount: mergedLayoutOrder.length,
    };
  }
  await lyreflyDb.projects.put(nextProject);

  for (const entry of pkg.pageNodes.values()) {
    const localNode = await lyreflyDb.pageNodes.get(entry.node.id);
    await lyreflyDb.pageNodes.put(
      localNode ? mergeLyreflyPageNode(localNode, entry.node) : entry.node,
    );
    for (const revision of entry.revisions) {
      const localRevision = await lyreflyDb.pageRevisions.get(revision.id);
      await lyreflyDb.pageRevisions.put(
        localRevision ? mergeLyreflyPageRevision(localRevision, revision) : revision,
      );
    }
  }

  for (const asset of pkg.visualDevAssets as VisualDevAsset[]) {
    const localAsset = await lyreflyDb.visualDevAssets.get(asset.id);
    await lyreflyDb.visualDevAssets.put(
      localAsset ? mergeLyreflyVisualDevAsset(localAsset, asset) : asset,
    );
  }

  if (pkg.script) {
    const localDoc = await lyreflyDb.scriptDocuments.get(pkg.script.document.id);
    await lyreflyDb.scriptDocuments.put(
      localDoc
        ? mergeLyreflyScriptDocument(localDoc, pkg.script.document)
        : pkg.script.document,
    );
  }

  for (const snapshot of pkg.snapshots) {
    const localSnapshot = await lyreflyDb.snapshots.get(snapshot.id);
    if (!localSnapshot) await lyreflyDb.snapshots.put(snapshot);
  }

  if (pkg.archive) {
    const localArchive = await lyreflyDb.archives.get(pkg.archive.id);
    if (!localArchive) await lyreflyDb.archives.put(pkg.archive);
  }
}
