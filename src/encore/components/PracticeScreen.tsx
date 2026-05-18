import PlaylistAddOutlinedIcon from '@mui/icons-material/PlaylistAddOutlined';
import PlaylistRemoveOutlinedIcon from '@mui/icons-material/PlaylistRemoveOutlined';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent } from 'react';
import { useEncoreBlockingJobs } from '../context/EncoreBlockingJobContext';
import { useEncore } from '../context/EncoreContext';
import { mergeSongWithImport } from '../import/findExistingSongForImport';
import { readSpotifyToken } from '../spotify/pkce';
import { encoreAppHref, navigateEncore } from '../routes/encoreAppHash';
import { applyTemplateProgressToSong } from '../repertoire/repertoireMilestones';
import { milestoneProgressSummary } from '../repertoire/repertoireMilestoneSummary';
import { withPracticingToggle } from '../repertoire/practicingToggle';
import {
  encoreSongStubFromSpotifyPlaylistRow,
  runEncoreSpotifyPlaylistSync,
  spotifyTrackIdsForPracticingSongs,
  type EncorePlaylistImportSuggestRow,
} from '../spotify/encoreSpotifyPlaylistSync';
import { parseSpotifyPlaylistId } from '../spotify/parseSpotifyPlaylistUrl';
import { spotifyGrantedScopesSufficientForPlaylistModify } from '../spotify/spotifyScopes';
import type { SpotifyPlaylistTrackRow } from '../spotify/spotifyApi';
import type { EncoreSong } from '../types';
import { AddToPracticeDialog } from './AddToPracticeDialog';
import {
  encoreMaxWidthPage,
  encoreRadius,
  encoreShadowSurface,
} from '../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { EncorePageHeader } from '../ui/EncorePageHeader';
import { EncoreSynchronizableSpotifyPlaylistPanel } from '../ui/EncoreSynchronizableSpotifyPlaylistPanel';
import {
  ENCORE_ROW_HOVER_ACTIONS_SX,
  ENCORE_ROW_HOVER_TARGET_CLASS,
} from '../ui/encoreRowHoverActions';
import { encoreNoAlbumArtIconSx, encoreNoAlbumArtSurfaceSx } from '../utils/encoreNoAlbumArtSurface';
import { SongMilestoneChecklist } from './SongMilestoneChecklist';
import { EncoreSpotifyPlaylistImportReviewDialog } from './EncoreSpotifyPlaylistImportReviewDialog';
import { encorePossessivePageTitle } from '../utils/encorePossessivePageTitle';
import { songAutosaveDirty } from './song/songPageHelpers';
import { useSongPageMediaHub } from './song/useSongPageMediaHub';
import { SongPageMediaHubCards } from './song/SongPageMediaHubCards';
import type { SongMediaUploadSlot } from './song/songMediaUploadSlot';
import {
  dragPayloadRelevantToMediaHub,
  eligibleSlotsForDragDataTransfer,
  hasPotentialUrlPayload,
} from './song/encoreDragPayload';
import { applyMediaUrlToSongSlot, extractFirstUrlFromDataTransfer } from './song/songMediaUrlDrop';
import { PracticeExercisesSection } from './practice/PracticeExercisesSection';

const LEARNING_PLAYLIST_HELP_CONTENT = (
  <Box sx={{ maxWidth: 300, py: 0.25 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
      Learning playlist
    </Typography>
    <Typography variant="body2" sx={{ lineHeight: 1.5, mb: 1 }}>
      One Spotify playlist you tie to Encore for the Practice screen. Saving stores its id with your repertoire so it
      survives reloads.
    </Typography>
    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
      Sync imports tracks from that playlist into your library and, when everything matches cleanly, can rewrite the
      playlist from your practicing songs. It’s optional—only if you want Spotify and Encore lists to stay aligned.
    </Typography>
  </Box>
);

export type PracticeScreenProps = {
  /** When true, {@link songIdFromPracticeHash} is synchronized from the URL into the focused song. */
  practiceHashActive?: boolean;
  /** Song id from `#/practice/<id>` when the Practice tab route is active. */
  songIdFromPracticeHash?: string;
};

export function PracticeScreen({
  practiceHashActive = false,
  songIdFromPracticeHash,
}: PracticeScreenProps = {}): React.ReactElement {
  const theme = useTheme();
  const {
    songs,
    saveSong,
    repertoireExtras,
    saveRepertoireExtras,
    spotifyLinked,
    effectiveDisplayName,
    googleAccessToken,
    signInWithGoogle,
  } = useEncore();
  const { withBlockingJob } = useEncoreBlockingJobs();

  const clientId =
    (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';

  const practicingSongs = useMemo(
    () =>
      songs
        .filter((s) => Boolean(s.practicing))
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
    [songs],
  );

  const [playlistField, setPlaylistField] = useState('');
  useEffect(() => {
    const cur = repertoireExtras.currentlyLearningSpotifyPlaylistId ?? '';
    setPlaylistField((v) => (v.trim() === '' ? cur : v));
  }, [repertoireExtras.currentlyLearningSpotifyPlaylistId]);

  const [syncBusy, setSyncBusy] = useState(false);
  const [pullBusy, setPullBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [importCandidates, setImportCandidates] = useState<SpotifyPlaylistTrackRow[] | null>(null);
  const [importSuggestions, setImportSuggestions] = useState<EncorePlaylistImportSuggestRow[] | null>(null);
  const [focusedSongId, setFocusedSongId] = useState<string | null>(null);
  const [addToPracticeOpen, setAddToPracticeOpen] = useState(false);

  useEffect(() => {
    if (!practiceHashActive) return;
    if (songIdFromPracticeHash && practicingSongs.some((s) => s.id === songIdFromPracticeHash)) {
      setFocusedSongId(songIdFromPracticeHash);
      return;
    }
    if (!songIdFromPracticeHash) {
      setFocusedSongId(null);
      return;
    }
    if (practicingSongs.length > 0) navigateEncore({ kind: 'practice' });
  }, [practiceHashActive, songIdFromPracticeHash, practicingSongs]);

  const effectiveFocusId = useMemo(() => {
    if (practicingSongs.length === 0) return null;
    if (focusedSongId && practicingSongs.some((s) => s.id === focusedSongId)) return focusedSongId;
    return practicingSongs[0].id;
  }, [practicingSongs, focusedSongId]);

  const panelSong = useMemo(
    () => (effectiveFocusId ? practicingSongs.find((x) => x.id === effectiveFocusId) ?? null : null),
    [effectiveFocusId, practicingSongs],
  );

  const [journalLocalBySongId, setJournalLocalBySongId] = useState<Record<string, string>>({});
  const [practiceMediaDraft, setPracticeMediaDraft] = useState<EncoreSong | null>(null);
  const lastPracticeFocusIdRef = useRef<string | null | undefined>(undefined);
  const lastPracticeMediaSavedRef = useRef<EncoreSong | null>(null);
  const [practiceFileDragActive, setPracticeFileDragActive] = useState(false);
  const [practiceHoveredMediaSlot, setPracticeHoveredMediaSlot] = useState<SongMediaUploadSlot | null>(null);
  const [practiceMediaDragEligibleSlots, setPracticeMediaDragEligibleSlots] = useState<Set<SongMediaUploadSlot> | null>(
    null,
  );
  const practiceFileDragDepthRef = useRef(0);

  const savedPlaylistId = repertoireExtras.currentlyLearningSpotifyPlaylistId?.trim() ?? '';
  const resolvedPlaylistId =
    savedPlaylistId || parseSpotifyPlaylistId(playlistField.trim()) || playlistField.trim();

  useEffect(() => {
    setJournalLocalBySongId((prev) => {
      const next = { ...prev };
      for (const s of practicingSongs) {
        if (next[s.id] === undefined) {
          next[s.id] = s.journalMarkdown ?? '';
        }
      }
      return next;
    });
  }, [practicingSongs]);

  useEffect(() => {
    const id = effectiveFocusId;
    if (id === lastPracticeFocusIdRef.current) return;
    lastPracticeFocusIdRef.current = id;
    if (!id) {
      setPracticeMediaDraft(null);
      lastPracticeMediaSavedRef.current = null;
      return;
    }
    const s = practicingSongs.find((x) => x.id === id) ?? null;
    setPracticeMediaDraft(s);
    lastPracticeMediaSavedRef.current = s;
  }, [effectiveFocusId, practicingSongs]);

  const persistPlaylistId = useCallback(async () => {
    const raw = playlistField.trim();
    const id = raw ? parseSpotifyPlaylistId(raw) ?? raw.replace(/^\/+|\/+$/g, '') : '';
    await saveRepertoireExtras({
      currentlyLearningSpotifyPlaylistId: id || undefined,
    });
  }, [playlistField, saveRepertoireExtras]);

  const mergeJournalForPracticeSave = useCallback(
    (song: EncoreSong): EncoreSong => {
      const local = journalLocalBySongId[song.id];
      if (local === undefined) return song;
      return { ...song, journalMarkdown: local };
    },
    [journalLocalBySongId],
  );

  /**
   * Common handler for both the "pick existing library song" and "create new song" arms of the
   * AddToPracticeDialog. Focuses the newly-added song so the right pane jumps to it immediately,
   * and pushes the URL forward so the back button + reload behave coherently.
   */
  const handleSongAddedToPractice = useCallback(
    (song: EncoreSong) => {
      setFocusedSongId(song.id);
      navigateEncore({ kind: 'practice', songId: song.id });
    },
    [],
  );

  /**
   * "Stop practicing" — flips a song's `practicing` field off so it drops out of this screen.
   *
   * The action is intentionally one-click + reversible rather than guarded by a confirm dialog:
   *   - It's a low-stakes toggle (no data loss; the song stays in the library and keeps every
   *     other field — exercises, milestones, journal, attachments).
   *   - `saveSong` already pushes a `LabsUndoContext` entry, so the existing global undo bar is
   *     the recovery affordance. Adding a confirm dialog here would just slow down the common
   *     case (cleaning up after a finished practice cycle) without adding meaningful safety.
   *
   * When the removed song was the focused one, fall back to the next remaining practicing song
   * (or none) so the right-pane doesn't hang on a stale id while the URL settles.
   */
  const stopPracticingSong = useCallback(
    async (song: EncoreSong) => {
      const remaining = practicingSongs.filter((x) => x.id !== song.id);
      const wasFocused = effectiveFocusId === song.id;
      const nextFocusId = wasFocused ? (remaining[0]?.id ?? null) : effectiveFocusId;
      if (wasFocused) setFocusedSongId(nextFocusId);
      // Drive the URL forward in lock-step with the focus change so a refresh/back doesn't
      // resurrect the stale `#/practice/<removedId>` and silently re-add the song to focus.
      if (wasFocused && practiceHashActive) {
        navigateEncore(nextFocusId ? { kind: 'practice', songId: nextFocusId } : { kind: 'practice' });
      }
      // `withPracticingToggle(_, false)` is the only path that sets `practiceRemovedAt` — and
      // therefore the only path that prevents the Spotify Learning Playlist sync from quietly
      // re-adding this song on the next round-trip.
      await saveSong(withPracticingToggle(song, false));
    },
    [effectiveFocusId, practiceHashActive, practicingSongs, saveSong],
  );

  const persistPracticeSongBundle = useCallback(
    (next: EncoreSong): Promise<void> => {
      const merged = { ...mergeJournalForPracticeSave(next), updatedAt: new Date().toISOString() };
      setPracticeMediaDraft((d) => (d?.id === next.id ? merged : d));
      return saveSong(merged);
    },
    [saveSong, mergeJournalForPracticeSave],
  );

  const persistPracticeMediaNow = useCallback(
    async (song: EncoreSong) => {
      await saveSong({
        ...mergeJournalForPracticeSave(song),
        updatedAt: new Date().toISOString(),
      });
    },
    [saveSong, mergeJournalForPracticeSave],
  );

  const mediaHub = useSongPageMediaHub({
    draft: practiceMediaDraft,
    setDraft: setPracticeMediaDraft,
    isNew: false,
    routeKind: 'song',
    routeSongId: practiceMediaDraft?.id ?? null,
    songs,
    googleAccessToken,
    spotifyLinked,
    driveUploadFolderOverrides: repertoireExtras.driveUploadFolderOverrides,
    persistAfterMetadataRefresh: persistPracticeMediaNow,
  });

  const { uploadFilesToMediaSlot } = mediaHub;

  useEffect(() => {
    if (!practiceMediaDraft) return;
    const mergedNext = mergeJournalForPracticeSave(practiceMediaDraft);
    const mergedPrev = lastPracticeMediaSavedRef.current
      ? mergeJournalForPracticeSave(lastPracticeMediaSavedRef.current)
      : null;
    if (!songAutosaveDirty(mergedPrev, mergedNext)) return;
    const t = setTimeout(() => {
      void (async () => {
        try {
          await persistPracticeMediaNow(practiceMediaDraft);
          lastPracticeMediaSavedRef.current = practiceMediaDraft;
        } catch {
          /* ignore */
        }
      })();
    }, 550);
    return () => clearTimeout(t);
  }, [practiceMediaDraft, persistPracticeMediaNow, mergeJournalForPracticeSave]);

  useEffect(() => {
    if (!practiceMediaDraft) {
      practiceFileDragDepthRef.current = 0;
      setPracticeFileDragActive(false);
      setPracticeHoveredMediaSlot(null);
      setPracticeMediaDragEligibleSlots(null);
      return;
    }
    const onEnter = (e: DragEvent) => {
      if (!dragPayloadRelevantToMediaHub(e.dataTransfer)) return;
      e.preventDefault();
      practiceFileDragDepthRef.current += 1;
      setPracticeFileDragActive(true);
      setPracticeMediaDragEligibleSlots(eligibleSlotsForDragDataTransfer(e.dataTransfer));
    };
    const onLeave = (e: DragEvent) => {
      if (!dragPayloadRelevantToMediaHub(e.dataTransfer)) return;
      e.preventDefault();
      practiceFileDragDepthRef.current = Math.max(0, practiceFileDragDepthRef.current - 1);
      if (practiceFileDragDepthRef.current === 0) {
        setPracticeFileDragActive(false);
        setPracticeHoveredMediaSlot(null);
        setPracticeMediaDragEligibleSlots(null);
      }
    };
    const onEnd = () => {
      practiceFileDragDepthRef.current = 0;
      setPracticeFileDragActive(false);
      setPracticeHoveredMediaSlot(null);
      setPracticeMediaDragEligibleSlots(null);
    };
    const onDrop = (e: DragEvent) => {
      if (!dragPayloadRelevantToMediaHub(e.dataTransfer)) return;
      onEnd();
    };
    const onDragOver = (e: DragEvent) => {
      if (dragPayloadRelevantToMediaHub(e.dataTransfer)) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
      }
    };
    document.addEventListener('dragenter', onEnter);
    document.addEventListener('dragleave', onLeave);
    document.addEventListener('dragend', onEnd);
    document.addEventListener('drop', onDrop, true);
    document.addEventListener('dragover', onDragOver);
    return () => {
      document.removeEventListener('dragenter', onEnter);
      document.removeEventListener('dragleave', onLeave);
      document.removeEventListener('dragend', onEnd);
      document.removeEventListener('drop', onDrop, true);
      document.removeEventListener('dragover', onDragOver);
    };
  }, [practiceMediaDraft]);

  const onPracticeMediaSlotDragOver = useCallback(
    (slot: SongMediaUploadSlot, e: ReactDragEvent<HTMLElement>) => {
      if (!dragPayloadRelevantToMediaHub(e.dataTransfer)) return;
      if (practiceMediaDragEligibleSlots && !practiceMediaDragEligibleSlots.has(slot)) return;
      e.preventDefault();
      e.stopPropagation();
      setPracticeHoveredMediaSlot(slot);
    },
    [practiceMediaDragEligibleSlots],
  );

  const onPracticeMediaSlotDragEnter = useCallback(
    (slot: SongMediaUploadSlot, e: ReactDragEvent<HTMLElement>) => {
      if (!dragPayloadRelevantToMediaHub(e.dataTransfer)) return;
      if (practiceMediaDragEligibleSlots && !practiceMediaDragEligibleSlots.has(slot)) return;
      e.preventDefault();
      setPracticeHoveredMediaSlot(slot);
    },
    [practiceMediaDragEligibleSlots],
  );

  const onPracticeMediaSlotDragLeave = useCallback((slot: SongMediaUploadSlot, e: ReactDragEvent<HTMLElement>) => {
    if (!dragPayloadRelevantToMediaHub(e.dataTransfer)) return;
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;
    setPracticeHoveredMediaSlot((h) => (h === slot ? null : h));
  }, []);

  const onPracticeMediaSlotDrop = useCallback(
    (slot: SongMediaUploadSlot, e: ReactDragEvent<HTMLElement>) => {
      if (practiceMediaDragEligibleSlots && !practiceMediaDragEligibleSlots.has(slot)) return;
      if (e.dataTransfer.types.includes('Files')) {
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        void uploadFilesToMediaSlot(slot, files);
        return;
      }
      if (hasPotentialUrlPayload(e.dataTransfer)) {
        const url = extractFirstUrlFromDataTransfer(e.dataTransfer);
        if (!url) return;
        e.preventDefault();
        e.stopPropagation();
        setPracticeMediaDraft((d) => {
          if (!d) return d;
          const next = applyMediaUrlToSongSlot(d, slot, url);
          if (!next) return d;
          void persistPracticeMediaNow(next);
          return next;
        });
      }
    },
    [practiceMediaDragEligibleSlots, uploadFilesToMediaSlot, persistPracticeMediaNow],
  );

  const practiceMediaHubFileDrop = useMemo(
    () => ({
      globalFileDragActive: practiceFileDragActive,
      hoveredSlot: practiceHoveredMediaSlot,
      eligibleSlots: practiceMediaDragEligibleSlots,
      onMediaSlotDragEnter: onPracticeMediaSlotDragEnter,
      onMediaSlotDragLeave: onPracticeMediaSlotDragLeave,
      onMediaSlotDragOver: onPracticeMediaSlotDragOver,
      onMediaSlotDrop: onPracticeMediaSlotDrop,
    }),
    [
      practiceFileDragActive,
      practiceHoveredMediaSlot,
      practiceMediaDragEligibleSlots,
      onPracticeMediaSlotDragEnter,
      onPracticeMediaSlotDragLeave,
      onPracticeMediaSlotDragOver,
      onPracticeMediaSlotDrop,
    ],
  );

  const onLearningPlaylistSync = useCallback(async () => {
    setSyncError(null);
    if (!clientId || !spotifyLinked) {
      setSyncError('Connect Spotify (Account menu) to sync your playlist.');
      return;
    }
    const bundle = readSpotifyToken();
    if (bundle && !spotifyGrantedScopesSufficientForPlaylistModify(bundle.scope)) {
      setSyncError(
        'In the Account menu, use Refresh Spotify login so Encore can read and edit playlists (or Disconnect, then Connect).',
      );
      return;
    }
    const pl = resolvedPlaylistId;
    if (!pl) {
      setSyncError('Paste or save a Spotify playlist URL or id first.');
      return;
    }
    setSyncBusy(true);
    try {
      await withBlockingJob('Syncing learning playlist…', async (setProgress) => {
        const result = await runEncoreSpotifyPlaylistSync({
          clientId,
          playlistId: pl,
          songs,
          saveSong,
          setProgress,
          stubPracticing: true,
          // `onMergedSong` still forces `practicing: true` for *un-tombstoned* matches — the
          // engine itself respects `practiceRemovedAt` and bypasses this callback for any
          // song the user has explicitly removed from practice.
          onMergedSong: (merged, now) => ({ ...merged, practicing: true, updatedAt: now }),
          getRewriteSpotifyTrackIds: spotifyTrackIdsForPracticingSongs,
          emptyRewriteMessage:
            'No practicing songs have a Spotify track id to write to the playlist yet. Link Spotify on each song or merge imports first.',
          previousTrackIds: repertoireExtras.lastSyncedLearningPlaylistTrackIds,
          onPersistLastSeenTrackIds: async (ids) => {
            // Always persist a fresh copy: the snapshot anchors the next removal diff, so we
            // need it even when this sync ends in a review dialog. Using `[...]` so Dexie /
            // wire serialization never holds a reference to the engine's internal array.
            await saveRepertoireExtras({ lastSyncedLearningPlaylistTrackIds: [...ids] });
          },
        });
        if (result.outcome === 'error') {
          setSyncError(result.message);
          return;
        }
        if (result.outcome === 'review') {
          setImportSuggestions(result.suggestions);
          setImportCandidates(result.fresh);
          setSyncError(
            'Imported every exact Spotify match into your library. Review possible matches or new tracks below, then tap Sync again to rewrite the playlist from your practicing songs.',
          );
          return;
        }
      });
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncBusy(false);
    }
  }, [
    clientId,
    spotifyLinked,
    resolvedPlaylistId,
    songs,
    saveSong,
    saveRepertoireExtras,
    repertoireExtras.lastSyncedLearningPlaylistTrackIds,
    withBlockingJob,
  ]);

  const closePracticeImportReview = useCallback(() => {
    setImportSuggestions(null);
    setImportCandidates(null);
  }, []);

  const practiceImportReviewOpen =
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
          const stub = encoreSongStubFromSpotifyPlaylistRow(row, { practicing: true });
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
  }, [importCandidates, saveSong, withBlockingJob]);

  const mergeSuggestion = useCallback(
    async (item: EncorePlaylistImportSuggestRow) => {
      const now = new Date().toISOString();
      const incoming = encoreSongStubFromSpotifyPlaylistRow(item.row, { practicing: true });
      const merged = mergeSongWithImport(item.match, incoming);
      // Affirmative re-add: clearing any tombstone via `withPracticingToggle` is what keeps the
      // song from being silently dropped again by the next sync's removal diff.
      await saveSong(withPracticingToggle(merged, true, now));
      setImportSuggestions((cur) => {
        if (!cur) return null;
        const next = cur.filter((x) => x.row.trackId !== item.row.trackId);
        return next.length > 0 ? next : null;
      });
    },
    [saveSong],
  );

  const importSuggestionAsNew = useCallback(
    async (item: EncorePlaylistImportSuggestRow) => {
      const stub = encoreSongStubFromSpotifyPlaylistRow(item.row, { practicing: true });
      await saveSong(stub);
      setImportSuggestions((cur) => {
        if (!cur) return null;
        const next = cur.filter((x) => x.row.trackId !== item.row.trackId);
        return next.length > 0 ? next : null;
      });
    },
    [saveSong],
  );

  return (
    <Box
      sx={{
        px: encoreScreenPaddingX,
        pt: encorePagePaddingTop,
        pb: { xs: 10, md: 5 },
        ...encoreMaxWidthPage,
      }}
    >
      <EncorePageHeader title={encorePossessivePageTitle(effectiveDisplayName, 'practice')} />

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: encoreRadius,
          boxShadow: encoreShadowSurface,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={1.25}>
          <EncoreSynchronizableSpotifyPlaylistPanel
            sectionTitle="Learning playlist"
            helpContent={LEARNING_PLAYLIST_HELP_CONTENT}
            spotifyClientId={clientId}
            savedPlaylistId={savedPlaylistId}
            playlistField={playlistField}
            onPlaylistFieldChange={setPlaylistField}
            onSavePlaylistId={() => void persistPlaylistId()}
            resolvedPlaylistId={resolvedPlaylistId}
            onSync={() => void onLearningPlaylistSync()}
            syncBusy={syncBusy}
            pullBusy={pullBusy}
            spotifyLinked={spotifyLinked}
            clientIdConfigured={Boolean(clientId)}
            error={syncError}
            announcement={
              !clientId ? (
                <Alert severity="info" sx={{ width: '100%' }}>
                  Set <code>VITE_SPOTIFY_CLIENT_ID</code> for Spotify actions.
                </Alert>
              ) : null
            }
          />
        </Stack>
      </Paper>

      {practicingSongs.length === 0 ? (
        <Stack spacing={1.5} sx={{ py: 1, mb: 2, alignItems: 'flex-start' }}>
          <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
            Nothing here yet. Add a song you’re working on to keep it at hand for practice
            sessions — or sync from a <strong>Learning playlist</strong> above.
          </Typography>
          <Button
            variant="contained"
            startIcon={<PlaylistAddOutlinedIcon />}
            onClick={() => setAddToPracticeOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Add to practice
          </Button>
        </Stack>
      ) : panelSong ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 30%) minmax(0, 1fr)' },
            gap: { xs: 2, md: 3 },
            mb: 2,
            // `flex-start` (vs `stretch`) lets the sidebar stop at its own content height instead
            // of stretching to match the taller panel column. Combined with `overflowY: auto`
            // below this means the rail only becomes a scroll container when content genuinely
            // exceeds `maxHeight` — `overflow: auto` on a stretched rail painted a visible
            // scrollbar gutter under macOS "Always show" / Windows always-on configs even when
            // the practicing list was much shorter than the panel.
            alignItems: 'flex-start',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 1.25,
              borderRadius: encoreRadius,
              border: 1,
              borderColor: 'divider',
              boxShadow: encoreShadowSurface,
              bgcolor: 'background.paper',
              // Intentionally no `maxHeight` / `overflowY: 'auto'`: in macOS "Always show
              // scrollbars" mode and on Windows, `overflow: auto` reserves a visible scrollbar
              // gutter even when content fits, which read as a persistent vertical scrollbar in
              // the practice sidebar. Sizing to content (combined with `alignItems: 'flex-start'`
              // on the grid above) keeps the rail as tall as its songs and no taller. If the
              // practicing list ever grows long enough to feel uncomfortable, the right answer
              // is search/filter, not a bounded scroll region.
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>
              Practicing ({practicingSongs.length})
            </Typography>
            <Stack component="nav" aria-label="Practicing songs" spacing={0.5} sx={{ mt: 1 }}>
              {practicingSongs.map((s) => {
                const selected = s.id === effectiveFocusId;
                return (
                  <ListItem
                    key={s.id}
                    disablePadding
                    sx={ENCORE_ROW_HOVER_ACTIONS_SX}
                    secondaryAction={
                      <Tooltip title="Stop practicing">
                        <IconButton
                          size="small"
                          edge="end"
                          className={ENCORE_ROW_HOVER_TARGET_CLASS}
                          aria-label={`Stop practicing ${s.title}`}
                          onClick={(e) => {
                            // Don't navigate to the song; just remove it from the list.
                            e.stopPropagation();
                            void stopPracticingSong(s);
                          }}
                          sx={{ mr: 0.25, color: 'text.secondary' }}
                        >
                          <PlaylistRemoveOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemButton
                      selected={selected}
                      onClick={() => {
                        setFocusedSongId(s.id);
                        navigateEncore({ kind: 'practice', songId: s.id });
                      }}
                      sx={{
                        borderRadius: 1,
                        py: 1,
                        alignItems: 'flex-start',
                        border: 1,
                        borderColor: selected ? 'primary.main' : 'transparent',
                        bgcolor: selected ? (th) => alpha(th.palette.primary.main, 0.06) : 'transparent',
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 0.75,
                          overflow: 'hidden',
                          flexShrink: 0,
                          mr: 1.25,
                          bgcolor: 'action.hover',
                        }}
                      >
                        {s.albumArtUrl ? (
                          <Box
                            component="img"
                            src={s.albumArtUrl}
                            alt=""
                            sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <Box sx={{ ...encoreNoAlbumArtSurfaceSx(theme), width: 1, height: 1, minHeight: 0 }}>
                            <MusicNoteIcon sx={{ ...encoreNoAlbumArtIconSx(theme), fontSize: 20 }} aria-hidden />
                          </Box>
                        )}
                      </Box>
                      <ListItemText
                        primary={s.title}
                        secondary={s.artist}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 700, noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </Stack>
            {/*
             * "Add to practice" lives at the bottom of the list (Trello / Linear "+ Add a card"
             * pattern) so it reads as the next addable row rather than competing with the page
             * header. We render it as a "ghost song" placeholder — dashed outline on both the
             * row and the album-art slot — so it visually mirrors the practicing rows above
             * while reading as an empty slot waiting to be filled, not a competing CTA.
             */}
            <ListItem disablePadding sx={{ mt: 0.5 }}>
              <ListItemButton
                onClick={() => setAddToPracticeOpen(true)}
                aria-label="Add a song to practice"
                sx={{
                  borderRadius: 1,
                  py: 1,
                  alignItems: 'center',
                  border: '1px dashed',
                  borderColor: 'divider',
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  transition:
                    'border-color 120ms ease, color 120ms ease, background-color 120ms ease',
                  '&:hover, &:focus-visible': {
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    bgcolor: (th) => alpha(th.palette.primary.main, 0.04),
                  },
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 0.75,
                    flexShrink: 0,
                    mr: 1.25,
                    border: '1px dashed',
                    borderColor: 'currentColor',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.75,
                  }}
                >
                  <PlaylistAddOutlinedIcon sx={{ fontSize: 20 }} aria-hidden />
                </Box>
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ fontWeight: 700, color: 'inherit' }}
                >
                  Add to practice
                </Typography>
              </ListItemButton>
            </ListItem>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: encoreRadius,
              border: 1,
              borderColor: 'divider',
              boxShadow: encoreShadowSurface,
              bgcolor: 'background.paper',
              minHeight: { md: 360 },
            }}
          >
            {(() => {
              const s = panelSong;
              const exerciseBase =
                practiceMediaDraft?.id === s.id && practiceMediaDraft ? practiceMediaDraft : s;
              const milestoneSource = practiceMediaDraft?.id === s.id ? practiceMediaDraft : s;
              const milestoneSong = applyTemplateProgressToSong(milestoneSource, repertoireExtras.milestoneTemplate);
              const ms = milestoneProgressSummary(milestoneSource, repertoireExtras.milestoneTemplate);
              const journalKey = s.id;
              const journalVal = journalLocalBySongId[journalKey] ?? s.journalMarkdown ?? '';

              return (
                <Stack spacing={2.25}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                    justifyContent="space-between"
                    gap={1.25}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                        {s.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {s.artist}
                      </Typography>
                      {ms.total > 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                          {ms.labelShort}
                        </Typography>
                      ) : null}
                    </Box>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      gap={1}
                      sx={{ flexShrink: 0, width: { xs: 1, sm: 'auto' } }}
                    >
                      <Button
                        variant="text"
                        size="medium"
                        startIcon={<PlaylistRemoveOutlinedIcon />}
                        onClick={() => void stopPracticingSong(s)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          color: 'text.secondary',
                          width: { xs: 1, sm: 'auto' },
                        }}
                      >
                        Stop practicing
                      </Button>
                      <Button
                        component="a"
                        href={encoreAppHref({ kind: 'song', id: s.id })}
                        variant="contained"
                        size="medium"
                        startIcon={<OpenInNewIcon />}
                        sx={{ textTransform: 'none', fontWeight: 700, width: { xs: 1, sm: 'auto' } }}
                      >
                        Open song page
                      </Button>
                    </Stack>
                  </Stack>

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                      Practice resources
                    </Typography>
                    <SongPageMediaHubCards slots={mediaHub.mediaSlots} fileDrop={practiceMediaHubFileDrop} />
                  </Box>

                  <PracticeExercisesSection
                    song={exerciseBase}
                    onPersistSong={persistPracticeSongBundle}
                    googleAccessToken={googleAccessToken}
                    signInWithGoogle={signInWithGoogle}
                    withBlockingJob={withBlockingJob}
                  />

                  {/*
                   * "Milestones" gets its own subtitle so guided exercises above do not read as one
                   * continuous list with the checklist — without this header the two sections blur.
                   */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                      Milestones
                    </Typography>
                    <SongMilestoneChecklist
                      song={milestoneSong}
                      milestoneTemplate={repertoireExtras.milestoneTemplate}
                      onChange={(next) => void persistPracticeSongBundle(next)}
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                      Journal
                    </Typography>
                    <TextField
                      value={journalVal}
                      onChange={(e) =>
                        setJournalLocalBySongId((m) => ({ ...m, [journalKey]: e.target.value }))
                      }
                      fullWidth
                      multiline
                      minRows={4}
                      size="small"
                      inputProps={{ 'aria-label': `Practice journal for ${s.title}` }}
                      placeholder="Notes…"
                    />
                    <Button
                      size="small"
                      variant="contained"
                      sx={{ mt: 1, textTransform: 'none' }}
                      onClick={() => {
                        const md = journalVal;
                        const base =
                          practiceMediaDraft?.id === s.id && practiceMediaDraft ? practiceMediaDraft : s;
                        void saveSong({
                          ...mergeJournalForPracticeSave(base),
                          journalMarkdown: md,
                          updatedAt: new Date().toISOString(),
                        });
                      }}
                    >
                      Save
                    </Button>
                  </Box>
                </Stack>
              );
            })()}
          </Paper>
        </Box>
      ) : null}

      <EncoreSpotifyPlaylistImportReviewDialog
        open={practiceImportReviewOpen}
        onClose={closePracticeImportReview}
        reviewKind="practice"
        importSuggestions={importSuggestions}
        importCandidates={importCandidates}
        onMergeSuggestion={(item) => void mergeSuggestion(item)}
        onImportSuggestionAsNew={(item) => void importSuggestionAsNew(item)}
        onConfirmImportNew={() => void confirmImport()}
        pullBusy={pullBusy}
      />

      <AddToPracticeDialog
        open={addToPracticeOpen}
        onClose={() => setAddToPracticeOpen(false)}
        onAdded={handleSongAddedToPractice}
      />
    </Box>
  );
}
