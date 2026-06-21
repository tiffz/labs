/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useRef, type ReactElement, type ReactNode } from 'react';
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

function originalsListSignature(rows: EncoreOriginalSong[]): string {
  return rows.map((row) => `${row.id}:${row.updatedAt}`).join('|');
}

export function EncoreOriginalsLibraryProvider({ children }: { children: ReactNode }): ReactElement {
  const raw = useLiveQuery(() => encoreDb.originals.orderBy('updatedAt').reverse().toArray(), [], undefined);
  const stableOriginalsRef = useRef<EncoreOriginalSong[]>(EMPTY);
  const stableSignatureRef = useRef('');
  const originals = useMemo(() => {
    const next = (raw ?? EMPTY).map((row) =>
      normalizeEncoreOriginalSong(
        row as EncoreOriginalSong & { tags?: string[]; status?: string; brainstormMarkdown?: string },
      ),
    );
    const signature = originalsListSignature(next);
    if (signature === stableSignatureRef.current) {
      return stableOriginalsRef.current;
    }
    stableSignatureRef.current = signature;
    stableOriginalsRef.current = next;
    return next;
  }, [raw]);
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
