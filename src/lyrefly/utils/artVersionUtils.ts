import type { ComicArtVersion, ComicProject, PageNode, PageRevision } from '../types';

/** ISO timestamp from a File's lastModified when available. */
export function fileLastModifiedIso(file: File, fallback = new Date().toISOString()): string {
  if (file.lastModified > 0) {
    return new Date(file.lastModified).toISOString();
  }
  return fallback;
}

export function buildPageRevisionMapFromNodes(pageNodes: readonly PageNode[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const node of pageNodes) {
    if (node.activeRevisionId) map[node.id] = node.activeRevisionId;
  }
  return map;
}

/** Latest revision timestamp across a version's page picks. */
export function inferArtVersionCompletedAt(
  pageRevisions: Record<string, string>,
  revisions: readonly PageRevision[],
): string | undefined {
  const byId = new Map(revisions.map((revision) => [revision.id, revision]));
  let latest: string | undefined;
  for (const revisionId of Object.values(pageRevisions)) {
    const revision = byId.get(revisionId);
    if (!revision) continue;
    const candidate = revision.importedAt || revision.createdAt;
    if (!latest || candidate > latest) latest = candidate;
  }
  return latest;
}

export function resolveExportRevisionMap(
  project: ComicProject,
  artVersions: readonly ComicArtVersion[],
): Record<string, string> | undefined {
  if (!project.finalArtVersionId) return undefined;
  const finalVersion = artVersions.find((version) => version.id === project.finalArtVersionId);
  if (!finalVersion || Object.keys(finalVersion.pageRevisions).length === 0) return undefined;
  return finalVersion.pageRevisions;
}

export function defaultArtVersionLabel(existingCount: number): string {
  return `Version ${existingCount + 1}`;
}

export type ArtVersionPickerValue = 'current' | string;

export function defaultArtVersionPickerValue(project: ComicProject): ArtVersionPickerValue {
  return project.finalArtVersionId ?? 'current';
}

export function revisionMapForArtVersionPicker(
  value: ArtVersionPickerValue,
  artVersions: readonly ComicArtVersion[],
): Record<string, string> | undefined {
  if (value === 'current') return undefined;
  const version = artVersions.find((entry) => entry.id === value);
  if (!version || Object.keys(version.pageRevisions).length === 0) return undefined;
  return version.pageRevisions;
}

export function artVersionPickerLabel(
  value: ArtVersionPickerValue,
  artVersions: readonly ComicArtVersion[],
): string | undefined {
  if (value === 'current') return undefined;
  return artVersions.find((entry) => entry.id === value)?.label;
}

export function artVersionSourceLabel(source: ComicArtVersion['source']): string {
  if (source === 'upload') return 'Uploaded set';
  return 'Snapshot';
}

export function orderArtVersions(
  project: ComicProject,
  artVersions: readonly ComicArtVersion[],
): ComicArtVersion[] {
  const ids = project.artVersionIds ?? [];
  const byId = new Map(artVersions.map((version) => [version.id, version]));
  const ordered = ids.map((id) => byId.get(id)).filter((version): version is ComicArtVersion => Boolean(version));
  const remainder = artVersions
    .filter((version) => !ids.includes(version.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return [...ordered, ...remainder];
}

export type ArtVersionViewId = 'current' | string;

export function revisionMapForArtVersionView(
  viewId: ArtVersionViewId,
  artVersions: readonly ComicArtVersion[],
): Record<string, string> | undefined {
  if (viewId === 'current') return undefined;
  const version = artVersions.find((entry) => entry.id === viewId);
  if (!version || Object.keys(version.pageRevisions).length === 0) return undefined;
  return version.pageRevisions;
}
