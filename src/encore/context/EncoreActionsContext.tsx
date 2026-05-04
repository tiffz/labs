/* eslint-disable react-refresh/only-export-components -- Provider + context only; useEncoreActions is in useEncoreActions.ts for Vite Fast Refresh */
import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { encoreDb, markDirtyRow, markDirtyRows, type RepertoireExtrasRow } from '../db/encoreDb';
import type { EncorePerformance, EncoreSong } from '../types';
import { syncSongLegacyMediaIds } from '../repertoire/songMediaLinks';
import { defaultRepertoireExtrasRow } from '../drive/repertoireWire';
import { publishSnapshotToDrive, type BuildPublicSnapshotOptions } from '../drive/publicSnapshot';
import { reorganizeAllDriveUploads, type ReorganizeDriveUploadsResult } from '../drive/driveReorganize';
import { syncPerformanceVideo, syncPerformanceVideoFileName } from '../drive/performanceShortcut';
import { installServerLogger } from '../../shared/utils/serverLogger';
import { useEncoreAuth } from './EncoreAuthContext';
import { useEncoreLibraryExtras } from './EncoreLibraryContext';
import { useEncoreSync } from './useEncoreSync';
import { useEncoreBlockingJobs } from './EncoreBlockingJobContext';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';

const serverLogger = installServerLogger('ENCORE');

/**
 * Mutation surface: every Encore-data write goes through here. Writes touch only the affected
 * Dexie row; the live query in {@link EncoreLibraryContext} re-emits the change. We no longer
 * `refreshLibrary()` the entire library after each save.
 */
export interface EncoreActionsContextValue {
  /**
   * Persist a song.
   *
   * Pass `silentUndo: true` for autosave-driven writes that should not push a per-tick undo entry
   * (e.g. SongPage debounced autosave). When silent, the caller is responsible for pushing a
   * single combined undo at the explicit commit boundary (e.g. on navigate-away).
   */
  saveSong: (song: EncoreSong, options?: { silentUndo?: boolean }) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  savePerformance: (p: EncorePerformance, options?: { silentUndo?: boolean }) => Promise<void>;
  deletePerformance: (id: string) => Promise<void>;
  /**
   * Atomic bulk write for songs. All rows are persisted in one Dexie transaction, one undo entry
   * is pushed, and the debounced Drive push is triggered once. Use this for "set practicing on N",
   * "add tag to N", row import flows.
   */
  bulkSaveSongs: (songs: EncoreSong[]) => Promise<void>;
  /** Atomic bulk delete for songs (also removes their performances). */
  bulkDeleteSongs: (ids: string[]) => Promise<void>;
  /** Atomic bulk write for performances. */
  bulkSavePerformances: (performances: EncorePerformance[]) => Promise<void>;
  /** Atomic bulk delete for performances. */
  bulkDeletePerformances: (ids: string[]) => Promise<void>;
  saveRepertoireExtras: (patch: Partial<Omit<RepertoireExtrasRow, 'id'>>) => Promise<void>;
  setOwnerDisplayName: (name: string) => Promise<void>;
  publishPublicSnapshot: (options?: BuildPublicSnapshotOptions) => Promise<{
    fileId: string;
    generatedAt: string;
    driveModifiedTime?: string;
    publiclyReadable: boolean;
    warning?: string;
    publicVideoCount: number;
    privateVideoCount: number;
  }>;
  reorganizeDriveUploads: () => Promise<ReorganizeDriveUploadsResult>;
}

export const EncoreActionsContext = createContext<EncoreActionsContextValue | null>(null);

function cloneRow<T>(value: T): T {
  return structuredClone(value);
}

export function EncoreActionsProvider({ children }: { children: ReactNode }): ReactElement {
  const { googleAccessToken } = useEncoreAuth();
  const { effectiveDisplayName, repertoireExtras } = useEncoreLibraryExtras();
  const driveUploadFolderOverridesRef = useRef(repertoireExtras.driveUploadFolderOverrides);
  driveUploadFolderOverridesRef.current = repertoireExtras.driveUploadFolderOverrides;
  const { scheduleBackgroundSync } = useEncoreSync();
  const { withBlockingJob } = useEncoreBlockingJobs();
  const { push: pushUndo, isReplayingRef } = useLabsUndo();

  const saveSong = useCallback(
    async (song: EncoreSong, options?: { silentUndo?: boolean }) => {
      const previous = await encoreDb.songs.get(song.id);
      const synced = syncSongLegacyMediaIds(song);
      const willPushUndo = !isReplayingRef.current && !options?.silentUndo;
      const prevSnap = willPushUndo && previous ? cloneRow(previous) : undefined;
      const nextSnap = willPushUndo ? cloneRow(synced) : undefined;
      await encoreDb.songs.put(synced);
      await markDirtyRow('song', synced.id, 'upsert');
      scheduleBackgroundSync();
      if (googleAccessToken && previous && previous.title !== synced.title) {
        void (async () => {
          try {
            const songPerformances = await encoreDb.performances.where('songId').equals(song.id).toArray();
            await Promise.all(
              songPerformances
                .filter((p) => p.videoShortcutDriveFileId || p.videoTargetDriveFileId)
                .map((p) =>
                  syncPerformanceVideoFileName(
                    googleAccessToken,
                    p,
                    synced,
                    driveUploadFolderOverridesRef.current,
                  ).catch((err) => {
                    serverLogger.warn('encore.saveSong: video rename failed', err);
                  }),
                ),
            );
          } catch (err) {
            serverLogger.warn('encore.saveSong: video rename batch failed', err);
          }
        })();
      }
      if (willPushUndo && nextSnap) {
        const id = synced.id;
        pushUndo({
          undo: async () => {
            if (prevSnap) {
              await encoreDb.songs.put(prevSnap);
              await markDirtyRow('song', id, 'upsert');
            } else {
              await encoreDb.songs.delete(id);
              await markDirtyRow('song', id, 'delete');
            }
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.songs.put(nextSnap);
            await markDirtyRow('song', id, 'upsert');
            scheduleBackgroundSync();
          },
        });
      }
    },
    [googleAccessToken, isReplayingRef, pushUndo, scheduleBackgroundSync],
  );

  const deleteSong = useCallback(
    async (id: string) => {
      const prevSong = await encoreDb.songs.get(id);
      if (!prevSong) return;
      const prevPerfs = await encoreDb.performances.where('songId').equals(id).toArray();
      const willPushUndo = !isReplayingRef.current;
      const songSnap = willPushUndo ? cloneRow(prevSong) : undefined;
      const perfsSnap = willPushUndo ? prevPerfs.map((p) => cloneRow(p)) : undefined;
      await encoreDb.transaction('rw', encoreDb.songs, encoreDb.performances, async () => {
        await encoreDb.songs.delete(id);
        await encoreDb.performances.where('songId').equals(id).delete();
      });
      const perfIdsToDelete = prevPerfs.map((p) => p.id);
      await markDirtyRows([
        { kind: 'song', rowId: id, op: 'delete' },
        ...perfIdsToDelete.map((pid) => ({ kind: 'performance' as const, rowId: pid, op: 'delete' as const })),
      ]);
      scheduleBackgroundSync();
      if (willPushUndo && songSnap && perfsSnap) {
        pushUndo({
          undo: async () => {
            await encoreDb.transaction('rw', encoreDb.songs, encoreDb.performances, async () => {
              await encoreDb.songs.put(songSnap);
              await Promise.all(perfsSnap.map((perf) => encoreDb.performances.put(perf)));
            });
            await markDirtyRows([
              { kind: 'song', rowId: songSnap.id, op: 'upsert' },
              ...perfsSnap.map((p) => ({ kind: 'performance' as const, rowId: p.id, op: 'upsert' as const })),
            ]);
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.transaction('rw', encoreDb.songs, encoreDb.performances, async () => {
              await encoreDb.songs.delete(id);
              await encoreDb.performances.where('songId').equals(id).delete();
            });
            await markDirtyRows([
              { kind: 'song', rowId: id, op: 'delete' },
              ...perfIdsToDelete.map((pid) => ({ kind: 'performance' as const, rowId: pid, op: 'delete' as const })),
            ]);
            scheduleBackgroundSync();
          },
        });
      }
    },
    [isReplayingRef, pushUndo, scheduleBackgroundSync],
  );

  const savePerformance = useCallback(
    async (p: EncorePerformance, options?: { silentUndo?: boolean }) => {
      const previous = await encoreDb.performances.get(p.id);
      const willPushUndo = !isReplayingRef.current && !options?.silentUndo;
      const prevSnap = willPushUndo && previous ? cloneRow(previous) : undefined;
      const nextSnap = willPushUndo ? cloneRow(p) : undefined;
      await encoreDb.performances.put(p);
      await markDirtyRow('performance', p.id, 'upsert');
      scheduleBackgroundSync();
      if (willPushUndo && nextSnap) {
        pushUndo({
          undo: async () => {
            if (prevSnap) {
              await encoreDb.performances.put(prevSnap);
              await markDirtyRow('performance', p.id, 'upsert');
            } else {
              await encoreDb.performances.delete(p.id);
              await markDirtyRow('performance', p.id, 'delete');
            }
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.performances.put(nextSnap);
            await markDirtyRow('performance', p.id, 'upsert');
            scheduleBackgroundSync();
          },
        });
      }
      if (googleAccessToken && p.videoTargetDriveFileId) {
        void (async () => {
          try {
            const song = (await encoreDb.songs.get(p.songId)) ?? null;
            const result = await syncPerformanceVideo(
              googleAccessToken,
              p,
              song,
              driveUploadFolderOverridesRef.current,
            );
            if (result.shortcutCreatedId && result.shortcutCreatedId !== p.videoShortcutDriveFileId) {
              await encoreDb.performances.put({
                ...p,
                videoShortcutDriveFileId: result.shortcutCreatedId,
                updatedAt: new Date().toISOString(),
              });
              scheduleBackgroundSync();
            }
          } catch (err) {
            serverLogger.warn('encore.savePerformance: video shortcut sync failed', err);
          }
        })();
      }
    },
    [googleAccessToken, isReplayingRef, pushUndo, scheduleBackgroundSync],
  );

  const deletePerformance = useCallback(
    async (id: string) => {
      const prev = await encoreDb.performances.get(id);
      if (!prev) return;
      const willPushUndo = !isReplayingRef.current;
      const snap = willPushUndo ? cloneRow(prev) : undefined;
      await encoreDb.performances.delete(id);
      await markDirtyRow('performance', id, 'delete');
      scheduleBackgroundSync();
      if (willPushUndo && snap) {
        pushUndo({
          undo: async () => {
            await encoreDb.performances.put(snap);
            await markDirtyRow('performance', id, 'upsert');
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.performances.delete(id);
            await markDirtyRow('performance', id, 'delete');
            scheduleBackgroundSync();
          },
        });
      }
    },
    [isReplayingRef, pushUndo, scheduleBackgroundSync],
  );

  const bulkSaveSongs = useCallback(
    async (songs: EncoreSong[]) => {
      if (songs.length === 0) return;
      const synced = songs.map((s) => syncSongLegacyMediaIds(s));
      const previousById = new Map<string, EncoreSong | undefined>();
      for (const s of synced) {
        previousById.set(s.id, await encoreDb.songs.get(s.id));
      }
      const willPushUndo = !isReplayingRef.current;
      const prevSnaps = willPushUndo
        ? synced.map((s) => {
            const prev = previousById.get(s.id);
            return prev ? cloneRow(prev) : undefined;
          })
        : undefined;
      const nextSnaps = willPushUndo ? synced.map((s) => cloneRow(s)) : undefined;
      await encoreDb.transaction('rw', encoreDb.songs, async () => {
        await Promise.all(synced.map((s) => encoreDb.songs.put(s)));
      });
      await markDirtyRows(synced.map((s) => ({ kind: 'song' as const, rowId: s.id, op: 'upsert' as const })));
      scheduleBackgroundSync();
      if (willPushUndo && prevSnaps && nextSnaps) {
        pushUndo({
          undo: async () => {
            await encoreDb.transaction('rw', encoreDb.songs, async () => {
              await Promise.all(
                synced.map((s, i) => {
                  const prev = prevSnaps[i];
                  return prev ? encoreDb.songs.put(prev) : encoreDb.songs.delete(s.id);
                }),
              );
            });
            await markDirtyRows(
              synced.map((s, i) => ({
                kind: 'song' as const,
                rowId: s.id,
                op: prevSnaps[i] ? ('upsert' as const) : ('delete' as const),
              })),
            );
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.transaction('rw', encoreDb.songs, async () => {
              await Promise.all(nextSnaps.map((s) => encoreDb.songs.put(s)));
            });
            await markDirtyRows(nextSnaps.map((s) => ({ kind: 'song' as const, rowId: s.id, op: 'upsert' as const })));
            scheduleBackgroundSync();
          },
        });
      }
    },
    [isReplayingRef, pushUndo, scheduleBackgroundSync],
  );

  const bulkDeleteSongs = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const willPushUndo = !isReplayingRef.current;
      const songSnaps: EncoreSong[] = [];
      const perfSnaps: EncorePerformance[] = [];
      if (willPushUndo) {
        for (const id of ids) {
          const s = await encoreDb.songs.get(id);
          if (s) songSnaps.push(cloneRow(s));
          const ps = await encoreDb.performances.where('songId').equals(id).toArray();
          for (const p of ps) perfSnaps.push(cloneRow(p));
        }
      }
      const collectedPerfIds = perfSnaps.map((p) => p.id);
      await encoreDb.transaction('rw', encoreDb.songs, encoreDb.performances, async () => {
        await Promise.all(ids.map((id) => encoreDb.songs.delete(id)));
        await Promise.all(
          ids.map((id) => encoreDb.performances.where('songId').equals(id).delete()),
        );
      });
      await markDirtyRows([
        ...ids.map((id) => ({ kind: 'song' as const, rowId: id, op: 'delete' as const })),
        ...collectedPerfIds.map((pid) => ({ kind: 'performance' as const, rowId: pid, op: 'delete' as const })),
      ]);
      scheduleBackgroundSync();
      if (willPushUndo) {
        pushUndo({
          undo: async () => {
            await encoreDb.transaction('rw', encoreDb.songs, encoreDb.performances, async () => {
              await Promise.all(songSnaps.map((s) => encoreDb.songs.put(s)));
              await Promise.all(perfSnaps.map((p) => encoreDb.performances.put(p)));
            });
            await markDirtyRows([
              ...songSnaps.map((s) => ({ kind: 'song' as const, rowId: s.id, op: 'upsert' as const })),
              ...perfSnaps.map((p) => ({ kind: 'performance' as const, rowId: p.id, op: 'upsert' as const })),
            ]);
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.transaction('rw', encoreDb.songs, encoreDb.performances, async () => {
              await Promise.all(ids.map((id) => encoreDb.songs.delete(id)));
              await Promise.all(
                ids.map((id) => encoreDb.performances.where('songId').equals(id).delete()),
              );
            });
            await markDirtyRows([
              ...ids.map((id) => ({ kind: 'song' as const, rowId: id, op: 'delete' as const })),
              ...collectedPerfIds.map((pid) => ({ kind: 'performance' as const, rowId: pid, op: 'delete' as const })),
            ]);
            scheduleBackgroundSync();
          },
        });
      }
    },
    [isReplayingRef, pushUndo, scheduleBackgroundSync],
  );

  const bulkSavePerformances = useCallback(
    async (performances: EncorePerformance[]) => {
      if (performances.length === 0) return;
      const previousById = new Map<string, EncorePerformance | undefined>();
      for (const p of performances) {
        previousById.set(p.id, await encoreDb.performances.get(p.id));
      }
      const willPushUndo = !isReplayingRef.current;
      const prevSnaps = willPushUndo
        ? performances.map((p) => {
            const prev = previousById.get(p.id);
            return prev ? cloneRow(prev) : undefined;
          })
        : undefined;
      const nextSnaps = willPushUndo ? performances.map((p) => cloneRow(p)) : undefined;
      await encoreDb.transaction('rw', encoreDb.performances, async () => {
        await Promise.all(performances.map((p) => encoreDb.performances.put(p)));
      });
      await markDirtyRows(
        performances.map((p) => ({ kind: 'performance' as const, rowId: p.id, op: 'upsert' as const })),
      );
      scheduleBackgroundSync();
      if (willPushUndo && prevSnaps && nextSnaps) {
        pushUndo({
          undo: async () => {
            await encoreDb.transaction('rw', encoreDb.performances, async () => {
              await Promise.all(
                performances.map((p, i) => {
                  const prev = prevSnaps[i];
                  return prev ? encoreDb.performances.put(prev) : encoreDb.performances.delete(p.id);
                }),
              );
            });
            await markDirtyRows(
              performances.map((p, i) => ({
                kind: 'performance' as const,
                rowId: p.id,
                op: prevSnaps[i] ? ('upsert' as const) : ('delete' as const),
              })),
            );
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.transaction('rw', encoreDb.performances, async () => {
              await Promise.all(nextSnaps.map((p) => encoreDb.performances.put(p)));
            });
            await markDirtyRows(
              nextSnaps.map((p) => ({ kind: 'performance' as const, rowId: p.id, op: 'upsert' as const })),
            );
            scheduleBackgroundSync();
          },
        });
      }
    },
    [isReplayingRef, pushUndo, scheduleBackgroundSync],
  );

  const bulkDeletePerformances = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const willPushUndo = !isReplayingRef.current;
      const snaps: EncorePerformance[] = [];
      if (willPushUndo) {
        for (const id of ids) {
          const p = await encoreDb.performances.get(id);
          if (p) snaps.push(cloneRow(p));
        }
      }
      await encoreDb.transaction('rw', encoreDb.performances, async () => {
        await Promise.all(ids.map((id) => encoreDb.performances.delete(id)));
      });
      await markDirtyRows(ids.map((id) => ({ kind: 'performance' as const, rowId: id, op: 'delete' as const })));
      scheduleBackgroundSync();
      if (willPushUndo) {
        pushUndo({
          undo: async () => {
            await encoreDb.transaction('rw', encoreDb.performances, async () => {
              await Promise.all(snaps.map((p) => encoreDb.performances.put(p)));
            });
            await markDirtyRows(
              snaps.map((p) => ({ kind: 'performance' as const, rowId: p.id, op: 'upsert' as const })),
            );
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.transaction('rw', encoreDb.performances, async () => {
              await Promise.all(ids.map((id) => encoreDb.performances.delete(id)));
            });
            await markDirtyRows(ids.map((id) => ({ kind: 'performance' as const, rowId: id, op: 'delete' as const })));
            scheduleBackgroundSync();
          },
        });
      }
    },
    [isReplayingRef, pushUndo, scheduleBackgroundSync],
  );

  const saveRepertoireExtras = useCallback(
    async (patch: Partial<Omit<RepertoireExtrasRow, 'id'>>) => {
      const now = new Date().toISOString();
      const cur = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(now);
      const next: RepertoireExtrasRow = { ...cur, ...patch, id: 'default', updatedAt: now };
      const willPushUndo = !isReplayingRef.current;
      const prevSnap = willPushUndo ? cloneRow(cur) : undefined;
      const nextSnap = willPushUndo ? cloneRow(next) : undefined;
      await encoreDb.repertoireExtras.put(next);
      await markDirtyRow('extras', 'default', 'upsert');
      scheduleBackgroundSync();
      if (willPushUndo && prevSnap && nextSnap) {
        pushUndo({
          undo: async () => {
            await encoreDb.repertoireExtras.put(prevSnap);
            await markDirtyRow('extras', 'default', 'upsert');
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.repertoireExtras.put(nextSnap);
            await markDirtyRow('extras', 'default', 'upsert');
            scheduleBackgroundSync();
          },
        });
      }
    },
    [isReplayingRef, pushUndo, scheduleBackgroundSync],
  );

  const setOwnerDisplayName = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      await saveRepertoireExtras({ ownerDisplayName: trimmed || undefined });
    },
    [saveRepertoireExtras],
  );

  const publishPublicSnapshot = useCallback(
    async (options?: BuildPublicSnapshotOptions) => {
      if (!googleAccessToken) throw new Error('Not signed in');
      return withBlockingJob('Publishing guest snapshot…', () =>
        publishSnapshotToDrive(googleAccessToken, options, effectiveDisplayName),
      );
    },
    [googleAccessToken, effectiveDisplayName, withBlockingJob],
  );

  const reorganizeDriveUploads = useCallback(async () => {
    if (!googleAccessToken) throw new Error('Not signed in');
    return withBlockingJob('Organizing files in Google Drive…', () =>
      reorganizeAllDriveUploads(googleAccessToken),
    );
  }, [googleAccessToken, withBlockingJob]);

  const value = useMemo<EncoreActionsContextValue>(
    () => ({
      saveSong,
      deleteSong,
      savePerformance,
      deletePerformance,
      bulkSaveSongs,
      bulkDeleteSongs,
      bulkSavePerformances,
      bulkDeletePerformances,
      saveRepertoireExtras,
      setOwnerDisplayName,
      publishPublicSnapshot,
      reorganizeDriveUploads,
    }),
    [
      saveSong,
      deleteSong,
      savePerformance,
      deletePerformance,
      bulkSaveSongs,
      bulkDeleteSongs,
      bulkSavePerformances,
      bulkDeletePerformances,
      saveRepertoireExtras,
      setOwnerDisplayName,
      publishPublicSnapshot,
      reorganizeDriveUploads,
    ],
  );

  return <EncoreActionsContext.Provider value={value}>{children}</EncoreActionsContext.Provider>;
}
