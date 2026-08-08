/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, type ReactElement, type ReactNode } from 'react';
import { encoreDb, markDirtyRow } from '../db/encoreDb';
import {
  clearDeletedOriginalIds,
  recordDeletedOriginalIds,
} from '../drive/encoreRepertoireTombstones';
import { isOriginalSongPersistable } from '../originals/originalsWorkflowCompletion';
import { normalizeEncoreOriginalSong, type EncoreOriginalSong } from '../originals/types';
import { useEncoreSync } from './useEncoreSync';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';

export interface EncoreOriginalsActionsContextValue {
  saveOriginal: (
    song: EncoreOriginalSong,
    options?: { silentUndo?: boolean; preserveUpdatedAt?: boolean },
  ) => Promise<void>;
  deleteOriginal: (id: string) => Promise<void>;
}

const EncoreOriginalsActionsContext = createContext<EncoreOriginalsActionsContextValue | null>(null);

function cloneRow<T>(value: T): T {
  return structuredClone(value);
}

export function EncoreOriginalsActionsProvider({ children }: { children: ReactNode }): ReactElement {
  const { scheduleBackgroundSync } = useEncoreSync();
  const { push: pushUndo, isReplayingRef } = useLabsUndo();

  const saveOriginal = useCallback(
    async (
      song: EncoreOriginalSong,
      options?: { silentUndo?: boolean; preserveUpdatedAt?: boolean },
    ) => {
      const previous = await encoreDb.originals.get(song.id);
      if (!isOriginalSongPersistable(song, previous)) return;
      const updatedAt =
        options?.preserveUpdatedAt && previous?.updatedAt
          ? previous.updatedAt
          : options?.preserveUpdatedAt && song.updatedAt
            ? song.updatedAt
            : new Date().toISOString();
      const next = normalizeEncoreOriginalSong({ ...song, updatedAt });
      const willPushUndo = !isReplayingRef.current && !options?.silentUndo;
      const prevSnap = willPushUndo && previous ? cloneRow(previous) : undefined;
      const nextSnap = willPushUndo ? cloneRow(next) : undefined;
      await encoreDb.originals.put(next);
      await markDirtyRow('original', next.id, 'upsert');
      scheduleBackgroundSync();
      if (willPushUndo && nextSnap) {
        const id = next.id;
        pushUndo({
          undo: async () => {
            if (prevSnap) await encoreDb.originals.put(prevSnap);
            else await encoreDb.originals.delete(id);
            await markDirtyRow('original', id, prevSnap ? 'upsert' : 'delete');
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.originals.put(nextSnap);
            await markDirtyRow('original', id, 'upsert');
            scheduleBackgroundSync();
          },
        });
      }
    },
    [isReplayingRef, pushUndo, scheduleBackgroundSync],
  );

  const deleteOriginal = useCallback(
    async (id: string) => {
      const previous = await encoreDb.originals.get(id);
      if (!previous) return;
      const prevSnap = !isReplayingRef.current ? cloneRow(previous) : undefined;
      await encoreDb.originals.delete(id);
      // Tombstone first-class: the originals pull deletes only on a tombstone, so without this an
      // intentional delete is resurrected by any peer still holding the row.
      await recordDeletedOriginalIds([id]);
      // Take blobs stay put so undo can restore a playable song. `pruneOrphanedOriginalTakeBlobs`
      // reclaims them on the next sync once the delete is settled.
      await markDirtyRow('original', id, 'delete');
      scheduleBackgroundSync();
      if (prevSnap) {
        pushUndo({
          undo: async () => {
            // Bump the clock so the restored row supersedes its own tombstone on every device.
            await encoreDb.originals.put({ ...prevSnap, updatedAt: new Date().toISOString() });
            await clearDeletedOriginalIds([id]);
            await markDirtyRow('original', id, 'upsert');
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.originals.delete(id);
            await recordDeletedOriginalIds([id]);
            await markDirtyRow('original', id, 'delete');
            scheduleBackgroundSync();
          },
        });
      }
    },
    [isReplayingRef, pushUndo, scheduleBackgroundSync],
  );

  const value = useMemo(() => ({ saveOriginal, deleteOriginal }), [saveOriginal, deleteOriginal]);

  return (
    <EncoreOriginalsActionsContext.Provider value={value}>{children}</EncoreOriginalsActionsContext.Provider>
  );
}

export function useEncoreOriginalsActions(): EncoreOriginalsActionsContextValue {
  const ctx = useContext(EncoreOriginalsActionsContext);
  if (!ctx) throw new Error('useEncoreOriginalsActions must be used within EncoreOriginalsActionsProvider');
  return ctx;
}
