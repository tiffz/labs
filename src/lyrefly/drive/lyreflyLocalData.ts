import { lyreflyDb } from '../db/lyreflyDb';
import { projectToSummary, type ComicProject } from '../types';
import type { LyreflySyncPayload } from './lyreflyDriveEnvelope';
import { markLyreflyPackagePullPending } from './lyreflyPendingPackagePulls';

export async function readLyreflyLocalPayload(): Promise<LyreflySyncPayload> {
  const projects = await lyreflyDb.projects.toArray();
  return { projects: projects.map(projectToSummary) };
}

export async function writeLyreflyLocalPayload(payload: LyreflySyncPayload): Promise<void> {
  await lyreflyDb.transaction('rw', lyreflyDb.projects, async () => {
    const incomingIds = new Set(payload.projects.map((p) => p.id));
    const existing = await lyreflyDb.projects.toArray();
    for (const project of existing) {
      if (!incomingIds.has(project.id)) {
        await lyreflyDb.projects.delete(project.id);
      }
    }
    for (const summary of payload.projects) {
      const current = await lyreflyDb.projects.get(summary.id);
      if (!current) {
        const stub: ComicProject = {
          id: summary.id,
          title: summary.title,
          status: summary.status,
          subtitle: summary.subtitle,
          coverRef: summary.coverRef,
          modules: {
            milestones: true,
            visualDev: true,
            script: true,
            layout: true,
            archive: false,
          },
          milestones: [],
          layoutOrder: [],
          scriptDocumentId: crypto.randomUUID(),
          snapshotIds: [],
          artVersionIds: [],
          pageCount: summary.pageCount,
          // Do not copy projectFolderId onto brand-new stubs. Sidecar download uses
          // summary.projectFolderId, and leaving the local row unset keeps first-hydrate
          // detection accurate (see applyLyreflyProjectPackageToDb / downloadMissing…).
          createdAt: summary.updatedAt,
          updatedAt: summary.updatedAt,
        };
        await lyreflyDb.projects.put(stub);
        continue;
      }
      // Stamping the newer clock below hides that this device has not applied the remote
      // package yet; record it so the package download does not skip this project.
      if (summary.updatedAt > current.updatedAt) markLyreflyPackagePullPending(summary.id);
      await lyreflyDb.projects.put({
        ...current,
        title: summary.title,
        status: summary.status,
        subtitle: summary.subtitle,
        coverRef: summary.coverRef,
        pageCount: summary.pageCount,
        projectFolderId: summary.projectFolderId ?? current.projectFolderId,
        updatedAt: summary.updatedAt,
      });
    }
  });
}

export async function upsertLyreflyProject(project: ComicProject): Promise<void> {
  await lyreflyDb.projects.put(project);
}

export async function getLyreflyProject(projectId: string): Promise<ComicProject | undefined> {
  return lyreflyDb.projects.get(projectId);
}
