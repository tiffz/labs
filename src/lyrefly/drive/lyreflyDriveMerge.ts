import type { ComicProjectSummary, LyreflyProjectStatus } from '../types';
import type { LyreflySyncPayload } from './lyreflyDriveEnvelope';

export type LyreflyDriveMergeReport = {
  projectsMerged: number;
  projectsFromLocalOnly: number;
  projectsFromRemoteOnly: number;
  projectsUpdatedFromRemote: number;
};

function statusRank(status: LyreflyProjectStatus): number {
  switch (status) {
    case 'archived':
      return 4;
    case 'finished':
      return 3;
    case 'wip':
      return 2;
    default:
      return 1;
  }
}

function mergeStatus(a: LyreflyProjectStatus, b: LyreflyProjectStatus): LyreflyProjectStatus {
  return statusRank(a) >= statusRank(b) ? a : b;
}

function projectChangedByMerge(
  local: ComicProjectSummary,
  merged: ComicProjectSummary,
): boolean {
  return (
    local.title !== merged.title ||
    local.status !== merged.status ||
    (local.subtitle ?? '') !== (merged.subtitle ?? '') ||
    (local.pageCount ?? 0) !== (merged.pageCount ?? 0) ||
    (local.projectFolderId ?? null) !== (merged.projectFolderId ?? null)
  );
}

function mergeProject(local: ComicProjectSummary, remote: ComicProjectSummary): ComicProjectSummary {
  const preferLocalTitle = local.title.trim().length > 0;
  return {
    id: local.id,
    title: preferLocalTitle ? local.title : remote.title,
    status: mergeStatus(local.status, remote.status),
    subtitle: local.subtitle ?? remote.subtitle,
    coverRef: local.coverRef ?? remote.coverRef,
    pageCount: Math.max(local.pageCount ?? 0, remote.pageCount ?? 0) || undefined,
    updatedAt: local.updatedAt >= remote.updatedAt ? local.updatedAt : remote.updatedAt,
    projectFolderId: local.projectFolderId ?? remote.projectFolderId,
  };
}

function textFieldLost(local: string | undefined, remote: string | undefined, merged: string | undefined): boolean {
  const lv = (local ?? '').trim();
  const rv = (remote ?? '').trim();
  if (!lv || !rv || lv === rv) return false;
  const mv = (merged ?? '').trim();
  return mv !== lv || mv !== rv;
}

/**
 * ADR 0020 dry-run content-loss gate: true when auto-merging this project would
 * drop a non-empty title or subtitle one side wrote (merge keeps local text).
 */
export function lyreflyProjectMergeWouldLoseContent(
  local: ComicProjectSummary,
  remote: ComicProjectSummary,
): boolean {
  const merged = mergeProject(local, remote);
  return (
    textFieldLost(local.title, remote.title, merged.title) ||
    textFieldLost(local.subtitle, remote.subtitle, merged.subtitle)
  );
}

/**
 * Apply per-project conflict choices (ADR 0020) then run the normal union merge.
 * - `local`: drop the remote row so this device's copy is kept.
 * - `remote`: take Drive's row wholesale.
 */
export function applyLyreflyConflictChoices(
  local: LyreflySyncPayload,
  remote: LyreflySyncPayload,
  choices: ReadonlyMap<string, 'local' | 'remote'>,
  options?: { tombstoneProjectIds?: ReadonlySet<string> },
): { payload: LyreflySyncPayload; report: LyreflyDriveMergeReport } {
  const remoteFiltered: LyreflySyncPayload = {
    projects: remote.projects.filter((p) => choices.get(p.id) !== 'local'),
  };
  const { payload, report } = mergeLyreflySyncPayload(local, remoteFiltered, options);
  const remoteById = new Map(remote.projects.map((p) => [p.id, p] as const));
  const projects = payload.projects.map((project) => {
    if (choices.get(project.id) !== 'remote') return project;
    return remoteById.get(project.id) ?? project;
  });
  return { payload: { projects }, report };
}

export function mergeLyreflySyncPayload(
  local: LyreflySyncPayload,
  remote: LyreflySyncPayload,
  options?: { tombstoneProjectIds?: ReadonlySet<string> },
): { payload: LyreflySyncPayload; report: LyreflyDriveMergeReport } {
  const tombstones = options?.tombstoneProjectIds ?? new Set<string>();
  const localMap = new Map(local.projects.map((p) => [p.id, p]));
  const remoteMap = new Map(remote.projects.map((p) => [p.id, p]));
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

  const mergedProjects: ComicProjectSummary[] = [];
  let projectsMerged = 0;
  let projectsFromLocalOnly = 0;
  let projectsFromRemoteOnly = 0;
  let projectsUpdatedFromRemote = 0;

  for (const id of allIds) {
    if (tombstones.has(id)) continue;
    const localProject = localMap.get(id);
    const remoteProject = remoteMap.get(id);

    if (localProject && remoteProject) {
      projectsMerged += 1;
      const merged = mergeProject(localProject, remoteProject);
      if (projectChangedByMerge(localProject, merged)) {
        projectsUpdatedFromRemote += 1;
      }
      mergedProjects.push(merged);
    } else if (localProject) {
      projectsFromLocalOnly += 1;
      mergedProjects.push(localProject);
    } else if (remoteProject) {
      projectsFromRemoteOnly += 1;
      mergedProjects.push(remoteProject);
    }
  }

  mergedProjects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return {
    payload: { projects: mergedProjects },
    report: {
      projectsMerged,
      projectsFromLocalOnly,
      projectsFromRemoteOnly,
      projectsUpdatedFromRemote,
    },
  };
}

export function formatLyreflyDriveMergeReport(report: LyreflyDriveMergeReport): string {
  const parts: string[] = [];
  if (report.projectsFromRemoteOnly > 0) {
    parts.push(`${report.projectsFromRemoteOnly} project(s) from Drive`);
  }
  if (report.projectsUpdatedFromRemote > 0) {
    parts.push(`${report.projectsUpdatedFromRemote} project(s) updated from Drive`);
  }
  if (parts.length === 0) return 'Library already in sync.';
  return parts.join('; ');
}

export function lyreflyMergeReportHasUserVisibleRemoteChanges(report: LyreflyDriveMergeReport): boolean {
  return report.projectsFromRemoteOnly > 0 || report.projectsUpdatedFromRemote > 0;
}
