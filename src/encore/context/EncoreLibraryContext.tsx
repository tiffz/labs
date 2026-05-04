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
 *
 * Tables (`songs` / `performances`) and `repertoireExtras` are exposed through **separate**
 * React contexts so a write to extras (e.g. MRT column prefs) does not force list screens to
 * treat `songs` / `performances` as changed. Prefer {@link useEncoreLibraryTables} and
 * {@link useEncoreLibraryExtras} on heavy surfaces; {@link useEncoreLibrary} merges both for
 * back-compat.
 *
 * Per-song reads use {@link useEncoreSong}: `{ status: 'loading' | 'missing' | 'ok' }` so callers
 * do not conflate Dexie `get` returning `undefined` with the live query still settling.
 */
export type EncoreSongLiveState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ok'; song: EncoreSong };

export interface EncoreLibraryTablesContextValue {
  songs: EncoreSong[];
  performances: EncorePerformance[];
  /** True after the first `songs` live query resolves (empty array may be real empty library). */
  songsHydrated: boolean;
  /** True after the performances live query has resolved at least once. */
  performancesHydrated: boolean;
}

export interface EncoreLibraryExtrasContextValue {
  repertoireExtras: RepertoireExtrasRow;
  /** True after the repertoire extras row has resolved at least once (including seeded default). */
  extrasHydrated: boolean;
  /** No-op kept for back-compat. Prefer relying on the live query instead. */
  refreshLibrary: () => Promise<void>;
  /** Owner display name shown in app + share view: user override (synced) wins; falls back to Google profile. */
  effectiveDisplayName: string | null;
}

export interface EncoreLibraryContextValue extends EncoreLibraryTablesContextValue, EncoreLibraryExtrasContextValue {
  /** True after songs, performances, and extras live queries have each resolved at least once. */
  libraryReady: boolean;
}

const EncoreLibraryTablesContext = createContext<EncoreLibraryTablesContextValue | null>(null);
const EncoreLibraryExtrasContext = createContext<EncoreLibraryExtrasContextValue | null>(null);

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

  const songsHydrated = songsRaw !== undefined;
  const performancesHydrated = performancesRaw !== undefined;
  const extrasHydrated = extrasRaw !== undefined;

  const refreshLibrary = useCallback(async () => {
    /* No-op; useLiveQuery keeps state fresh. Kept as a stable reference for back-compat. */
  }, []);

  const effectiveDisplayName = useMemo<string | null>(() => {
    const override = repertoireExtras.ownerDisplayName?.trim();
    if (override) return override;
    return displayName?.trim() || null;
  }, [repertoireExtras.ownerDisplayName, displayName]);

  const tablesValue = useMemo<EncoreLibraryTablesContextValue>(
    () => ({
      songs,
      performances,
      songsHydrated,
      performancesHydrated,
    }),
    [songs, performances, songsHydrated, performancesHydrated],
  );

  const extrasValue = useMemo<EncoreLibraryExtrasContextValue>(
    () => ({
      repertoireExtras,
      extrasHydrated,
      refreshLibrary,
      effectiveDisplayName,
    }),
    [repertoireExtras, extrasHydrated, refreshLibrary, effectiveDisplayName],
  );

  return (
    <EncoreLibraryTablesContext.Provider value={tablesValue}>
      <EncoreLibraryExtrasContext.Provider value={extrasValue}>{children}</EncoreLibraryExtrasContext.Provider>
    </EncoreLibraryTablesContext.Provider>
  );
}

export function useEncoreLibraryTables(): EncoreLibraryTablesContextValue {
  const ctx = useContext(EncoreLibraryTablesContext);
  if (!ctx) throw new Error('useEncoreLibraryTables outside EncoreLibraryProvider');
  return ctx;
}

export function useEncoreLibraryExtras(): EncoreLibraryExtrasContextValue {
  const ctx = useContext(EncoreLibraryExtrasContext);
  if (!ctx) throw new Error('useEncoreLibraryExtras outside EncoreLibraryProvider');
  return ctx;
}

/**
 * True once songs, performances, and extras live queries have each resolved at least once.
 * Subscribes to both library slices; use instead of `useEncoreLibrary()` when only readiness matters.
 */
export function useEncoreLibraryReady(): boolean {
  const tables = useContext(EncoreLibraryTablesContext);
  const extras = useContext(EncoreLibraryExtrasContext);
  if (!tables || !extras) throw new Error('useEncoreLibraryReady outside EncoreLibraryProvider');
  return tables.songsHydrated && tables.performancesHydrated && extras.extrasHydrated;
}

/**
 * Merged library hook for back-compat. Prefer {@link useEncoreLibraryTables} / {@link useEncoreLibraryExtras}
 * on list screens so extras-only writes do not invalidate memoized work keyed on `songs` / `performances`.
 */
export function useEncoreLibrary(): EncoreLibraryContextValue {
  const tables = useEncoreLibraryTables();
  const extras = useEncoreLibraryExtras();
  return useMemo<EncoreLibraryContextValue>(
    () => ({
      ...tables,
      ...extras,
      libraryReady: tables.songsHydrated && tables.performancesHydrated && extras.extrasHydrated,
    }),
    [tables, extras],
  );
}

/**
 * Per-song selector. Reads directly from Dexie via `liveQuery` so SongPage hydrates as soon as this
 * row resolves — without waiting on unrelated tables (performances/extras) used for `libraryReady`.
 */
export function useEncoreSong(songId: string | null | undefined): EncoreSongLiveState {
  return useLiveQuery(
    async () => {
      if (songId == null || songId === '') return { status: 'missing' } as const;
      const song = await encoreDb.songs.get(songId);
      return song ? ({ status: 'ok', song } as const) : ({ status: 'missing' } as const);
    },
    [songId],
    { status: 'loading' } as const,
  );
}
