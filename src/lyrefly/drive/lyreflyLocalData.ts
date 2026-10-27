import { lyreflyDb } from '../db/lyreflyDb';
import { projectToSummary, type ComicProject } from '../types';
import type { LyreflySyncPayload } from './lyreflyDriveEnvelope';
import { markLyreflyPackagePullPending } from './lyreflyPendingPackagePulls';
import { writeLyreflySketchbookLocal } from './lyreflySketchbookSync';
import { readLyreflyCollectionsLocal, writeLyreflyCollectionsLocal } from './lyreflyCollectionsSync';

export async function readLyreflyLocalPayload(): Promise<LyreflySyncPayload> {
  const [projects, personas, series, accounts, sketchbook, collections] = await Promise.all([
    lyreflyDb.projects.toArray(),
    lyreflyDb.personas.toArray(),
    lyreflyDb.series.toArray(),
    lyreflyDb.accounts.toArray(),
    lyreflyDb.sketchbookSeeds.toArray(),
    readLyreflyCollectionsLocal(),
  ]);
  return {
    projects: projects.map(projectToSummary),
    identities: { personas, series, accounts },
    sketchbook,
    collections,
  };
}

export async function writeLyreflyLocalPayload(payload: LyreflySyncPayload): Promise<void> {
  // Identities never delete. Write a merged row only when it is newer than what is here now: the
  // payload was read before the Drive fetch, so an edit made while the sync ran is newer than it
  // and must not be put back to the copy from the start of the sync.
  if (payload.identities) {
    const { personas, series, accounts } = payload.identities;
    await lyreflyDb.transaction('rw', [lyreflyDb.personas, lyreflyDb.series, lyreflyDb.accounts], async () => {
      const isNewer = (row: { updatedAt: string }, current: { updatedAt: string } | undefined) =>
        !current || row.updatedAt > current.updatedAt;
      for (const row of personas) {
        if (isNewer(row, await lyreflyDb.personas.get(row.id))) await lyreflyDb.personas.put(row);
      }
      for (const row of series) {
        if (isNewer(row, await lyreflyDb.series.get(row.id))) await lyreflyDb.series.put(row);
      }
      for (const row of accounts) {
        if (isNewer(row, await lyreflyDb.accounts.get(row.id))) await lyreflyDb.accounts.put(row);
      }
    });
  }
  if (payload.sketchbook) await writeLyreflySketchbookLocal(payload.sketchbook);
  if (payload.collections) await writeLyreflyCollectionsLocal(payload.collections);
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
