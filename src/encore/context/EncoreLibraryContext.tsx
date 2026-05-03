/* Provider + hook share module state; Fast Refresh split not worth the import churn. */
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { encoreDb, type RepertoireExtrasRow } from '../db/encoreDb';
import type { EncorePerformance, EncoreSong } from '../types';
import { defaultRepertoireExtrasRow } from '../drive/repertoireWire';
import { useEncoreAuth } from './EncoreAuthContext';

/**
 * Library surface: live Dexie-backed `songs`, `performances`, `repertoireExtras`. Backed by
 * `dexie-react-hooks#useLiveQuery` so a single-row Dexie write only re-emits that table; we no
 * longer reload the whole library on every save (the legacy `refreshLibrary()` is preserved as a
 * no-op for the small set of callers that still pass it as a callback dependency).
 */
export interface EncoreLibraryContextValue {
  songs: EncoreSong[];
  performances: EncorePerformance[];
  repertoireExtras: RepertoireExtrasRow;
  /** True after the first live Dexie read commits (avoids treating an empty in-memory list as definitive). */
  libraryReady: boolean;
  /** No-op kept for back-compat. Prefer relying on the live query instead. */
  refreshLibrary: () => Promise<void>;
  /** Owner display name shown in app + share view: user override (synced) wins; falls back to Google profile. */
  effectiveDisplayName: string | null;
}

const EncoreLibraryContext = createContext<EncoreLibraryContextValue | null>(null);

const EMPTY_SONGS: EncoreSong[] = [];
const EMPTY_PERFORMANCES: EncorePerformance[] = [];

export function EncoreLibraryProvider({ children }: { children: ReactNode }): ReactElement {
  const { displayName } = useEncoreAuth();

  const songsRaw = useLiveQuery(() => encoreDb.songs.orderBy('title').toArray(), [], undefined);
  const performancesRaw = useLiveQuery(() => encoreDb.performances.toArray(), [], undefined);
  const extrasRaw = useLiveQuery(() => encoreDb.repertoireExtras.get('default'), [], undefined);

  const songs = songsRaw ?? EMPTY_SONGS;
  const performances = performancesRaw ?? EMPTY_PERFORMANCES;

  // Bootstrap: when extras has loaded as missing, seed it with the venue catalog inferred
  // from existing performances. Runs once when the live query reports an empty row.
  useEffect(() => {
    if (extrasRaw !== undefined) return; // either still loading (undefined) or already present
    if (performancesRaw === undefined) return;
    let cancelled = false;
    void (async () => {
      const existing = await encoreDb.repertoireExtras.get('default');
      if (cancelled || existing) return;
      const fromPerf = [
        ...new Set(performancesRaw.map((r) => r.venueTag.trim()).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      const now = new Date().toISOString();
      await encoreDb.repertoireExtras.put({
        id: 'default',
        venueCatalog: fromPerf,
        milestoneTemplate: [],
        updatedAt: now,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [extrasRaw, performancesRaw]);

  const fallbackExtras = useMemo(
    () => defaultRepertoireExtrasRow(new Date().toISOString()),
    [],
  );
  const repertoireExtras: RepertoireExtrasRow = extrasRaw ?? fallbackExtras;

  const libraryReady =
    songsRaw !== undefined && performancesRaw !== undefined && extrasRaw !== undefined;

  const refreshLibrary = useCallback(async () => {
    /* No-op; useLiveQuery keeps state fresh. Kept as a stable reference for back-compat. */
  }, []);

  const effectiveDisplayName = useMemo<string | null>(() => {
    const override = repertoireExtras.ownerDisplayName?.trim();
    if (override) return override;
    return displayName?.trim() || null;
  }, [repertoireExtras.ownerDisplayName, displayName]);

  const value = useMemo<EncoreLibraryContextValue>(
    () => ({
      songs,
      performances,
      repertoireExtras,
      libraryReady,
      refreshLibrary,
      effectiveDisplayName,
    }),
    [
      songs,
      performances,
      repertoireExtras,
      libraryReady,
      refreshLibrary,
      effectiveDisplayName,
    ],
  );

  return <EncoreLibraryContext.Provider value={value}>{children}</EncoreLibraryContext.Provider>;
}

export function useEncoreLibrary(): EncoreLibraryContextValue {
  const ctx = useContext(EncoreLibraryContext);
  if (!ctx) throw new Error('useEncoreLibrary outside EncoreLibraryProvider');
  return ctx;
}

/**
 * Per-song selector. Reads directly from the live query so SongPage no longer rebinds when an
 * unrelated song updates — only the currently-viewed song's row identity changes.
 */
export function useEncoreSong(songId: string | null | undefined): EncoreSong | undefined {
  return useLiveQuery(
    async () => {
      if (!songId) return undefined;
      return encoreDb.songs.get(songId);
    },
    [songId],
    undefined,
  );
}
