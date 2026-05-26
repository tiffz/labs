/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { encoreDb } from '../db/encoreDb';
import { normalizeEncoreOriginalSong, type EncoreOriginalSong } from '../originals/types';

export type EncoreOriginalLiveState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ok'; song: EncoreOriginalSong };

export interface EncoreOriginalsLibraryContextValue {
  originals: EncoreOriginalSong[];
  originalsHydrated: boolean;
}

const EncoreOriginalsLibraryContext = createContext<EncoreOriginalsLibraryContextValue | null>(null);
const EMPTY: EncoreOriginalSong[] = [];

export function EncoreOriginalsLibraryProvider({ children }: { children: ReactNode }): ReactElement {
  const raw = useLiveQuery(() => encoreDb.originals.orderBy('updatedAt').reverse().toArray(), [], undefined);
  const originals = useMemo(
    () =>
      (raw ?? EMPTY).map((row) =>
        normalizeEncoreOriginalSong(
          row as EncoreOriginalSong & { tags?: string[]; status?: string; brainstormMarkdown?: string },
        ),
      ),
    [raw],
  );
  const value = useMemo(
    () => ({
      originals,
      originalsHydrated: raw !== undefined,
    }),
    [originals, raw],
  );
  return (
    <EncoreOriginalsLibraryContext.Provider value={value}>{children}</EncoreOriginalsLibraryContext.Provider>
  );
}

export function useEncoreOriginalsLibrary(): EncoreOriginalsLibraryContextValue {
  const ctx = useContext(EncoreOriginalsLibraryContext);
  if (!ctx) throw new Error('useEncoreOriginalsLibrary must be used within EncoreOriginalsLibraryProvider');
  return ctx;
}

export function useEncoreOriginal(id: string | null | undefined): EncoreOriginalLiveState {
  return useLiveQuery(
    async () => {
      if (id == null || id === '') return { status: 'missing' } as const;
      const song = await encoreDb.originals.get(id);
      return song
        ? ({
            status: 'ok',
            song: normalizeEncoreOriginalSong(
              song as EncoreOriginalSong & { tags?: string[]; status?: string; brainstormMarkdown?: string },
            ),
          } as const)
        : ({ status: 'missing' } as const);
    },
    [id],
    { status: 'loading' } as const,
  );
}
