/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, type ReactElement, type ReactNode } from 'react';
import { encoreDb, markDirtyRow } from '../db/encoreDb';
import { isOriginalSongPersistable } from '../originals/originalsWorkflowCompletion';
import { normalizeEncoreOriginalSong, type EncoreOriginalSong } from '../originals/types';
import { useEncoreSync } from './useEncoreSync';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';

export interface EncoreOriginalsActionsContextValue {
  saveOriginal: (song: EncoreOriginalSong, options?: { silentUndo?: boolean }) => Promise<void>;
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
    async (song: EncoreOriginalSong, options?: { silentUndo?: boolean }) => {
      const previous = await encoreDb.originals.get(song.id);
      if (!isOriginalSongPersistable(song, previous)) return;
      const next = normalizeEncoreOriginalSong({ ...song, updatedAt: new Date().toISOString() });
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
      await markDirtyRow('original', id, 'delete');
      scheduleBackgroundSync();
      if (prevSnap) {
        pushUndo({
          undo: async () => {
            await encoreDb.originals.put(prevSnap);
            await markDirtyRow('original', id, 'upsert');
            scheduleBackgroundSync();
          },
          redo: async () => {
            await encoreDb.originals.delete(id);
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
