/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { mergeSongWithImport } from '../import/findExistingSongForImport';
import { parseSpotifyPlaylistId } from '../spotify/parseSpotifyPlaylistUrl';
import { readSpotifyToken } from '../spotify/pkce';
import {
  encoreSongStubFromSpotifyPlaylistRow,
  encoreStubWithPlaylistImportTags,
  runEncoreSpotifyPlaylistSync,
  spotifyTrackIdsForRepertoireSavedSearch,
  type EncorePlaylistImportSuggestRow,
} from '../spotify/encoreSpotifyPlaylistSync';
import { spotifyGrantedScopesSufficientForPlaylistModify } from '../spotify/spotifyScopes';
import type { SpotifyPlaylistTrackRow } from '../spotify/spotifyApi';
import { EncoreSpotifyPlaylistImportReviewDialog } from '../components/EncoreSpotifyPlaylistImportReviewDialog';
import { useEncoreAuth } from './EncoreAuthContext';
import { useEncoreBlockingJobs } from './EncoreBlockingJobContext';
import { useEncoreActions } from './useEncoreActions';
import { useEncoreLibraryExtras, useEncoreLibraryTables } from './EncoreLibraryContext';
import { encoreDb } from '../db/encoreDb';
import type { EncorePerformance, EncoreRepertoireSavedSearch } from '../types';

export type EncoreRepertoirePlaylistContextValue = {
  spotifyClientId: string;
  clientIdConfigured: boolean;
  spotifyLinked: boolean;
  /** Bi-directional playlist sync for one saved search (pull with review, then rewrite playlist order). */
  runSavedSearchPlaylistSync: (saved: EncoreRepertoireSavedSearch) => void;
  syncBusySavedSearchId: string | null;
  pullBusy: boolean;
  syncError: string | null;
  dismissSyncError: () => void;
};

const EncoreRepertoirePlaylistContext = createContext<EncoreRepertoirePlaylistContextValue | null>(null);

export function useEncoreRepertoirePlaylist(): EncoreRepertoirePlaylistContextValue {
  const v = useContext(EncoreRepertoirePlaylistContext);
  if (!v) throw new Error('useEncoreRepertoirePlaylist outside EncoreRepertoirePlaylistProvider');
  return v;
}

function buildPerfBySong(performances: EncorePerformance[]): Map<string, EncorePerformance[]> {
  const m = new Map<string, EncorePerformance[]>();
  for (const p of performances) {
    const list = m.get(p.songId) ?? [];
    list.push(p);
    m.set(p.songId, list);
  }
  for (const list of m.values()) {
    list.sort((a, b) => b.date.localeCompare(a.date));
  }
  return m;
}

/** Repertoire saved-search Spotify sync + import-review dialog. */
export function EncoreRepertoirePlaylistProvider(props: { children: ReactNode }): ReactElement {
  const { children } = props;
  const { spotifyLinked } = useEncoreAuth();
  const { songs, performances } = useEncoreLibraryTables();
  const { repertoireExtras } = useEncoreLibraryExtras();
  const { saveSong } = useEncoreActions();
  const { withBlockingJob } = useEncoreBlockingJobs();

  const spotifyClientId = useMemo(
    () => (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '',
    [],
  );

  const [syncBusySavedSearchId, setSyncBusySavedSearchId] = useState<string | null>(null);
  const [pullBusy, setPullBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [importSuggestions, setImportSuggestions] = useState<EncorePlaylistImportSuggestRow[] | null>(null);
  const [importCandidates, setImportCandidates] = useState<SpotifyPlaylistTrackRow[] | null>(null);
  const [pendingPlaylistImportTags, setPendingPlaylistImportTags] = useState<string[] | undefined>(undefined);

  const milestoneTemplate = repertoireExtras.milestoneTemplate;

  const dismissSyncError = useCallback(() => setSyncError(null), []);

  const closeImportReview = useCallback(() => {
    setImportSuggestions(null);
    setImportCandidates(null);
    setPendingPlaylistImportTags(undefined);
  }, []);

  const importReviewOpen =
    (importSuggestions?.length ?? 0) > 0 || (importCandidates?.length ?? 0) > 0;

  const confirmImport = useCallback(async () => {
    if (!importCandidates?.length) {
      setImportCandidates(null);
      return;
    }
    const list = [...importCandidates];
    setPullBusy(true);
    try {
      await withBlockingJob('Adding songs from playlist…', async (setProgress) => {
        let i = 0;
        for (const row of list) {
          const stub = encoreStubWithPlaylistImportTags(
            encoreSongStubFromSpotifyPlaylistRow(row, { practicing: false }),
            pendingPlaylistImportTags,
          );
          await saveSong(stub);
          i += 1;
          setProgress(list.length ? i / list.length : null);
        }
      });
      setImportCandidates(null);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setPullBusy(false);
    }
  }, [importCandidates, pendingPlaylistImportTags, saveSong, withBlockingJob]);

  const mergeSuggestion = useCallback(
    async (item: EncorePlaylistImportSuggestRow) => {
      const now = new Date().toISOString();
      const incoming = encoreStubWithPlaylistImportTags(
        encoreSongStubFromSpotifyPlaylistRow(item.row, { practicing: false }),
        pendingPlaylistImportTags,
      );
      const merged = mergeSongWithImport(item.match, incoming);
      await saveSong({ ...merged, updatedAt: now });
      setImportSuggestions((cur) => {
        if (!cur) return null;
        const next = cur.filter((x) => x.row.trackId !== item.row.trackId);
        return next.length > 0 ? next : null;
      });
    },
    [pendingPlaylistImportTags, saveSong],
  );

  const importSuggestionAsNew = useCallback(
    async (item: EncorePlaylistImportSuggestRow) => {
      const stub = encoreStubWithPlaylistImportTags(
        encoreSongStubFromSpotifyPlaylistRow(item.row, { practicing: false }),
        pendingPlaylistImportTags,
      );
      await saveSong(stub);
      setImportSuggestions((cur) => {
        if (!cur) return null;
        const next = cur.filter((x) => x.row.trackId !== item.row.trackId);
        return next.length > 0 ? next : null;
      });
    },
    [pendingPlaylistImportTags, saveSong],
  );

  const runSavedSearchPlaylistSync = useCallback(
    (saved: EncoreRepertoireSavedSearch) => {
      void (async () => {
        setSyncError(null);
        if (!spotifyClientId || !spotifyLinked) {
          setSyncError('Connect Spotify (Account menu) to sync a playlist.');
          return;
        }
        const bundle = readSpotifyToken();
        if (bundle && !spotifyGrantedScopesSufficientForPlaylistModify(bundle.scope)) {
          setSyncError(
            'In the Account menu, use Refresh Spotify login so Encore can read and edit playlists (or Disconnect, then Connect).',
          );
          return;
        }
        const rawPl = saved.spotifyPlaylistId?.trim() ?? '';
        const pl = rawPl ? parseSpotifyPlaylistId(rawPl) ?? rawPl.replace(/^\/+|\/+$/g, '') : '';
        if (!pl) {
          setSyncError('Add a Spotify playlist URL or id to this saved search first.');
          return;
        }
        const playlistImportTags = saved.playlistImportTags;

        setSyncBusySavedSearchId(saved.id);
        try {
          await withBlockingJob(`Syncing “${saved.name}”…`, async (setProgress) => {
            const getRewriteIds = async () => {
              const freshSongs = await encoreDb.songs.toArray();
              return spotifyTrackIdsForRepertoireSavedSearch(
                saved,
                freshSongs,
                performances,
                buildPerfBySong(performances),
                milestoneTemplate,
              );
            };
            const emptyMsg =
              'No songs in this saved search have a Spotify track id to write yet. Link Spotify on matching songs, resolve imports, or broaden filters.';
            const result = await runEncoreSpotifyPlaylistSync({
              clientId: spotifyClientId,
              playlistId: pl,
              songs,
              saveSong,
              setProgress,
              stubPracticing: false,
              onMergedSong: (merged, now) => ({ ...merged, updatedAt: now }),
              getRewriteSpotifyTrackIds: getRewriteIds,
              emptyRewriteMessage: emptyMsg,
              playlistImportTags,
              reconcilePolicy: 'exactIdAutoOnly',
            });
            if (result.outcome === 'error') {
              setSyncError(result.message);
              return;
            }
            if (result.outcome === 'review') {
              setPendingPlaylistImportTags(result.playlistImportTags);
              setImportSuggestions(result.suggestions);
              setImportCandidates(result.fresh);
              setSyncError(
                'Imported every exact Spotify id match for this playlist. Review fuzzy matches or new tracks below, then run sync again to rewrite the playlist.',
              );
            }
          });
        } catch (e) {
          setSyncError(e instanceof Error ? e.message : String(e));
        } finally {
          setSyncBusySavedSearchId(null);
        }
      })();
    },
    [
      spotifyClientId,
      spotifyLinked,
      songs,
      performances,
      milestoneTemplate,
      saveSong,
      withBlockingJob,
    ],
  );

  const value = useMemo<EncoreRepertoirePlaylistContextValue>(
    () => ({
      spotifyClientId,
      clientIdConfigured: Boolean(spotifyClientId),
      spotifyLinked,
      runSavedSearchPlaylistSync,
      syncBusySavedSearchId,
      pullBusy,
      syncError,
      dismissSyncError,
    }),
    [
      spotifyClientId,
      spotifyLinked,
      runSavedSearchPlaylistSync,
      syncBusySavedSearchId,
      pullBusy,
      syncError,
      dismissSyncError,
    ],
  );

  return (
    <EncoreRepertoirePlaylistContext.Provider value={value}>
      {children}
      <EncoreSpotifyPlaylistImportReviewDialog
        open={importReviewOpen}
        onClose={closeImportReview}
        reviewKind="repertoire"
        importSuggestions={importSuggestions}
        importCandidates={importCandidates}
        onMergeSuggestion={(item) => void mergeSuggestion(item)}
        onImportSuggestionAsNew={(item) => void importSuggestionAsNew(item)}
        onConfirmImportNew={() => void confirmImport()}
        pullBusy={pullBusy}
      />
    </EncoreRepertoirePlaylistContext.Provider>
  );
}
