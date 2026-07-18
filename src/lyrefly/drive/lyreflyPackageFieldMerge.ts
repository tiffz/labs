/**
 * Field-level merge helpers for Lyrefly project packages (same-id rows after hydrate).
 *
 * Additive insert-if-missing was the safety floor; this layer reconciles cross-device edits to the
 * *same* page/asset/script/project fields using content-beats-empty + newer-`updatedAt` (ADR 0019 /
 * Zinebox/Stanza portfolio patterns). Blobs are never overwritten here — only metadata rows.
 */
import type {
  ComicProject,
  PageNode,
  PageRevision,
  ScriptDocument,
  VisualDevAsset,
} from '../types';

const HTML_TAG = /<[^>]*>/g;

export function isBlankLyreflyText(value: string | undefined | null): boolean {
  if (!value) return true;
  return value.replace(HTML_TAG, '').replace(/&nbsp;/gi, ' ').trim().length === 0;
}

function pickFilledString(
  a: string | undefined,
  b: string | undefined,
  preferAWhenTie: boolean,
): string | undefined {
  const aBlank = isBlankLyreflyText(a);
  const bBlank = isBlankLyreflyText(b);
  if (!aBlank && bBlank) return a;
  if (!bBlank && aBlank) return b;
  if (aBlank && bBlank) return preferAWhenTie ? a : b;
  return preferAWhenTie ? a : b;
}

function unionStringIds(local: readonly string[], remote: readonly string[]): string[] {
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

export function mergeLyreflyPageNode(local: PageNode, remote: PageNode): PageNode {
  const preferLocal = local.updatedAt >= remote.updatedAt;
  const base = preferLocal ? local : remote;
  return {
    ...base,
    displayName: pickFilledString(local.displayName, remote.displayName, preferLocal),
    scriptPageSectionId: local.scriptPageSectionId ?? remote.scriptPageSectionId,
    isSpread: base.isSpread,
    activeRevisionId: base.activeRevisionId ?? local.activeRevisionId ?? remote.activeRevisionId,
    revisionIds: unionStringIds(local.revisionIds, remote.revisionIds),
    createdAt: local.createdAt <= remote.createdAt ? local.createdAt : remote.createdAt,
    updatedAt: local.updatedAt >= remote.updatedAt ? local.updatedAt : remote.updatedAt,
  };
}

/** Revisions are mostly immutable art versions — prefer richer metadata; never drop driveFileId. */
export function mergeLyreflyPageRevision(local: PageRevision, remote: PageRevision): PageRevision {
  const preferLocal =
    Boolean(local.driveFileId) && !remote.driveFileId
      ? true
      : Boolean(remote.driveFileId) && !local.driveFileId
        ? false
        : local.createdAt >= remote.createdAt;
  const base = preferLocal ? local : remote;
  return {
    ...base,
    label: pickFilledString(local.label, remote.label, preferLocal) ?? base.label,
    driveFileId: local.driveFileId ?? remote.driveFileId,
    byteSize: Math.max(local.byteSize ?? 0, remote.byteSize ?? 0) || base.byteSize,
    width: Math.max(local.width, remote.width) || base.width,
    height: Math.max(local.height, remote.height) || base.height,
  };
}

export function mergeLyreflyVisualDevAsset(local: VisualDevAsset, remote: VisualDevAsset): VisualDevAsset {
  const preferLocal = local.updatedAt >= remote.updatedAt;
  const base = preferLocal ? local : remote;
  return {
    ...base,
    title: pickFilledString(local.title, remote.title, preferLocal) ?? base.title,
    caption: pickFilledString(local.caption, remote.caption, preferLocal),
    tags: unionStringIds(local.tags, remote.tags),
    fileName: local.fileName ?? remote.fileName,
    mimeType: local.mimeType ?? remote.mimeType,
    driveFileId: local.driveFileId ?? remote.driveFileId,
    url: pickFilledString(local.url, remote.url, preferLocal),
    markdown: pickFilledString(local.markdown, remote.markdown, preferLocal),
    updatedAt: local.updatedAt >= remote.updatedAt ? local.updatedAt : remote.updatedAt,
  };
}

export function mergeLyreflyScriptDocument(local: ScriptDocument, remote: ScriptDocument): ScriptDocument {
  const localBlank = isBlankLyreflyText(local.markdown);
  const remoteBlank = isBlankLyreflyText(remote.markdown);
  if (!localBlank && remoteBlank) return local;
  if (!remoteBlank && localBlank) return remote;
  const preferLocal = local.updatedAt >= remote.updatedAt;
  const base = preferLocal ? local : remote;
  return {
    ...base,
    markdown: preferLocal ? local.markdown : remote.markdown,
    blocks: preferLocal ? local.blocks : remote.blocks,
    pacingWarnings: preferLocal ? local.pacingWarnings : remote.pacingWarnings,
    updatedAt: local.updatedAt >= remote.updatedAt ? local.updatedAt : remote.updatedAt,
  };
}

function mergeMilestones(
  local: ComicProject['milestones'],
  remote: ComicProject['milestones'],
): ComicProject['milestones'] {
  if (!local.length) return remote;
  if (!remote.length) return local;
  const byId = new Map(local.map((m) => [m.id, m] as const));
  for (const m of remote) {
    const prev = byId.get(m.id);
    if (!prev) {
      byId.set(m.id, m);
      continue;
    }
    const complete = prev.complete || m.complete;
    byId.set(m.id, {
      ...prev,
      label: prev.label ?? m.label,
      note: prev.note ?? m.note,
      complete,
      completedAt: complete ? (prev.completedAt ?? m.completedAt) : undefined,
    });
  }
  return [...byId.values()];
}

/** Merge project-level rich fields after first hydrate (not first-hydrate-only adopt). */
export function mergeLyreflyProjectFields(local: ComicProject, remote: ComicProject): ComicProject {
  const preferLocal = local.updatedAt >= remote.updatedAt;
  const base = preferLocal ? local : remote;
  const title = pickFilledString(local.title, remote.title, preferLocal) ?? base.title;
  const brainstormHtml = pickFilledString(local.brainstormHtml, remote.brainstormHtml, preferLocal);
  return {
    ...base,
    title,
    subtitle: pickFilledString(local.subtitle, remote.subtitle, preferLocal),
    coverRef: local.coverRef ?? remote.coverRef,
    brainstormHtml,
    milestones: mergeMilestones(local.milestones, remote.milestones),
    printSpec: local.printSpec ?? remote.printSpec,
    colorPalette: local.colorPalette ?? remote.colorPalette,
    pipelineStatus: local.pipelineStatus ?? remote.pipelineStatus,
    priorityRank: local.priorityRank ?? remote.priorityRank,
    stageCompletion: (() => {
      const keys = new Set([
        ...Object.keys(local.stageCompletion ?? {}),
        ...Object.keys(remote.stageCompletion ?? {}),
      ]) as Set<keyof NonNullable<ComicProject['stageCompletion']>>;
      if (keys.size === 0) return undefined;
      const out: NonNullable<ComicProject['stageCompletion']> = {};
      for (const key of keys) {
        out[key] = Boolean(local.stageCompletion?.[key] || remote.stageCompletion?.[key]);
      }
      return out;
    })(),
    publicSnapshotDriveFileId: local.publicSnapshotDriveFileId ?? remote.publicSnapshotDriveFileId,
    distributionPdfDriveFileId: local.distributionPdfDriveFileId ?? remote.distributionPdfDriveFileId,
    projectFolderId: local.projectFolderId ?? remote.projectFolderId,
    finalArtVersionId: local.finalArtVersionId ?? remote.finalArtVersionId,
    updatedAt: local.updatedAt >= remote.updatedAt ? local.updatedAt : remote.updatedAt,
  };
}
