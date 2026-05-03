import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent } from 'react';
import type { EncoreAppRoute } from '../routes/encoreAppHash';
import { navigateEncore, encoreAppHref } from '../routes/encoreAppHash';
import type { SpotifySearchTrack } from '../spotify/spotifyApi';
import type { EncorePerformance, EncoreSong } from '../types';
import {
  encoreNoAlbumArtIconSx,
  encoreNoAlbumArtSurfaceSx,
} from '../utils/encoreNoAlbumArtSurface';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import { useEncore, useEncoreSong } from '../context/EncoreContext';
import {
  encoreHairline,
  encoreMaxWidthPage,
  encoreRadius,
  encoreShadowSurface,
} from '../theme/encoreUiTokens';
import {
  encorePagePaddingTop,
  encoreScreenPaddingX,
} from '../theme/encoreM3Layout';
import { SongJournalEditor } from './song/SongJournalEditor';
import {
  SongPageSongTopSection,
  type SongPageHeroBlocks,
  type SongPageTopHalfBlocks,
} from './song/SongPageSongTopSection';
import { SongPerformancesPanel } from './song/SongPerformancesPanel';
import { PerformanceEditorDialog } from './PerformanceEditorDialog';
import { SongMilestoneChecklist } from './SongMilestoneChecklist';
import { SpotifyBrandIcon } from './EncoreBrandIcon';
import { songWithSyncedLegacyDriveIds } from '../utils/songAttachments';
import { applyTemplateProgressToSong } from '../repertoire/repertoireMilestones';
import { ENCORE_PERFORMANCE_KEY_OPTIONS } from '../repertoire/performanceKeys';
import { collectAllSongTags, normalizeSongTags } from '../repertoire/songTags';
import { ensureSongHasDerivedMediaLinks } from '../repertoire/songMediaLinks';
import { InlineChipSelect } from '../ui/InlineEditChip';
import { InlineSongTagsCell } from '../ui/InlineSongTagsCell';
import { renderSpotifyTrackAutocompleteOption } from '../ui/renderSpotifyTrackAutocompleteOption';
import { SongMediaUploadIntentDialog } from './song/SongMediaUploadIntentDialog';
import type { SongMediaUploadSlot } from './song/songMediaUploadSlot';
import { useSongPageMediaHub } from './song/useSongPageMediaHub';

function newSong(): EncoreSong {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: '',
    artist: '',
    journalMarkdown: '',
    createdAt: now,
    updatedAt: now,
  };
}

function trackLabel(t: SpotifySearchTrack): string {
  const artists = t.artists?.map((a) => a.name).join(', ') ?? '';
  return `${t.name} — ${artists}`;
}

/** Shared elevated surface for song hero + lower sections (Performances, Practice). */
const encoreSongPageCardPaperSx = {
  p: 0,
  width: 1,
  minWidth: 0,
  borderRadius: encoreRadius,
  border: 1,
  borderColor: encoreHairline,
  boxShadow: encoreShadowSurface,
  bgcolor: 'background.paper',
} as const;

const encoreSongPageCardPaddingSx = {
  px: { xs: 2.25, sm: 3 },
  pt: { xs: 2.25, sm: 3 },
  pb: { xs: 2.25, sm: 3 },
} as const;

/**
 * Structural change detector for the debounced autosave path. Compares the substantive song
 * fields with `===` and arrays element-by-element so a typing burst can compare in microseconds
 * (the previous `JSON.stringify` ran on every keystroke and dominated edit-tab CPU).
 */
function shallowItemsEqual<T>(a: T[] | undefined, b: T[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return (a?.length ?? 0) === 0 && (b?.length ?? 0) === 0;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function shallowRecordEqual(a: Record<string, unknown> | undefined, b: Record<string, unknown> | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return Object.keys(a ?? {}).length === 0 && Object.keys(b ?? {}).length === 0;
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

function songAutosaveDirty(prev: EncoreSong | null, next: EncoreSong): boolean {
  if (!prev) return true;
  if (prev === next) return false;
  if (prev.id !== next.id) return true;
  if (prev.title !== next.title) return true;
  if (prev.artist !== next.artist) return true;
  if (prev.journalMarkdown !== next.journalMarkdown) return true;
  if (prev.spotifyTrackId !== next.spotifyTrackId) return true;
  if (prev.youtubeVideoId !== next.youtubeVideoId) return true;
  if (prev.performanceKey !== next.performanceKey) return true;
  if (prev.practicing !== next.practicing) return true;
  if (prev.albumArtUrl !== next.albumArtUrl) return true;
  if (!shallowItemsEqual(prev.tags, next.tags)) return true;
  if (!shallowRecordEqual(prev.milestoneProgress as Record<string, unknown> | undefined, next.milestoneProgress as Record<string, unknown> | undefined)) return true;
  if (!shallowItemsEqual(prev.songOnlyMilestones, next.songOnlyMilestones)) return true;
  if (!shallowItemsEqual(prev.attachments, next.attachments)) return true;
  if (!shallowItemsEqual(prev.referenceLinks, next.referenceLinks)) return true;
  if (!shallowItemsEqual(prev.backingLinks, next.backingLinks)) return true;
  return false;
}

export function SongPage(props: {
  route: Extract<EncoreAppRoute, { kind: 'song' } | { kind: 'songNew' }>;
}): React.ReactElement {
  const { route } = props;
  const theme = useTheme();
  const {
    songs,
    libraryReady,
    saveSong,
    deleteSong,
    savePerformance,
    deletePerformance,
    performances,
    repertoireExtras,
    googleAccessToken,
    spotifyLinked,
  } = useEncore();
  const { push: pushUndo } = useLabsUndo();
  const clientId =
    (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ??
    '';

  const [loadState, setLoadState] = useState<'pending' | 'ok' | 'missing'>(
    () => (route.kind === 'songNew' ? 'ok' : 'pending')
  );
  const [draft, setDraft] = useState<EncoreSong | null>(() =>
    route.kind === 'songNew' ? newSong() : null
  );
  const [committedJournal, setCommittedJournal] = useState('');
  const [journalLocal, setJournalLocal] = useState('');
  const [journalSaving, setJournalSaving] = useState(false);
  const [songMenuAnchor, setSongMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [perfOpen, setPerfOpen] = useState(false);
  const [perfEditing, setPerfEditing] = useState<EncorePerformance | null>(
    null
  );
  const [perfVenueFilter, setPerfVenueFilter] = useState<string | null>(null);
  const [songPageFileDragActive, setSongPageFileDragActive] = useState(false);
  const [hoveredMediaSlot, setHoveredMediaSlot] = useState<SongMediaUploadSlot | null>(null);
  const [intentUploadFiles, setIntentUploadFiles] = useState<File[] | null>(null);
  const songFileDragDepthRef = useRef(0);

  /** Most-recently autosaved song, used by `songAutosaveDirty` to decide whether to schedule a write. */
  const lastAutosavedSongRef = useRef<EncoreSong | null>(null);
  /**
   * Snapshot of the song *as it was when SongPage first opened it* (or null for new songs).
   * Used to push a single combined undo entry on navigate-away rather than one per
   * autosave debounce tick.
   */
  const originalSongRef = useRef<EncoreSong | null>(null);
  /** Latest version successfully autosaved (silentUndo: true). Used as the redo target on commit. */
  const latestSavedRef = useRef<EncoreSong | null>(null);

  const venueOptions = useMemo(() => {
    const s = new Set<string>();
    for (const v of repertoireExtras.venueCatalog) {
      const t = v.trim();
      if (t) s.add(t);
    }
    for (const p of performances) {
      const t = p.venueTag.trim();
      if (t) s.add(t);
    }
    return [...s];
  }, [repertoireExtras.venueCatalog, performances]);

  const isNew = route.kind === 'songNew';

  const songPerformances = useMemo(() => {
    if (!draft || isNew) return [];
    return performances
      .filter((p) => p.songId === draft.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [draft, isNew, performances]);

  const songPerformanceVenueBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of songPerformances) {
      const v = p.venueTag.trim() || 'Venue';
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [songPerformances]);

  const filteredSongPerformances = useMemo(() => {
    if (!perfVenueFilter) return songPerformances;
    return songPerformances.filter((p) => (p.venueTag.trim() || 'Venue') === perfVenueFilter);
  }, [songPerformances, perfVenueFilter]);

  const milestoneSong = useMemo(
    () => (draft ? { ...draft, journalMarkdown: committedJournal } : null),
    [draft, committedJournal]
  );

  /**
   * Per-song selector via Dexie live query: SongPage rehydrates only when the *current* song
   * changes upstream — unrelated saves elsewhere (other songs, performances, extras) no longer
   * trigger SongPage's hydration effect, which used to throw away `draft`/`journalLocal` and
   * reset the editor focus.
   */
  const routeSongId = route.kind === 'song' ? route.id : null;
  const liveSong = useEncoreSong(routeSongId);
  const hydratedSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (route.kind === 'songNew') {
      if (hydratedSongIdRef.current === '__new__') return;
      hydratedSongIdRef.current = '__new__';
      const s = newSong();
      setDraft(s);
      setCommittedJournal('');
      setJournalLocal('');
      setPerfVenueFilter(null);
      lastAutosavedSongRef.current = s;
      // New song: no "before" state; commit-time undo will simply delete the song.
      originalSongRef.current = null;
      latestSavedRef.current = null;
      setLoadState('ok');
      return;
    }
    if (!libraryReady) {
      setLoadState('pending');
      return;
    }
    if (liveSong === undefined) {
      // Live query hasn't resolved yet for this id.
      setLoadState('pending');
      return;
    }
    if (liveSong === null || liveSong === (undefined as never)) {
      hydratedSongIdRef.current = null;
      setDraft(null);
      setLoadState('missing');
      return;
    }
    // Re-bind editor state when the route id changes; subsequent live updates to the same row
    // do not reset draft/journal (autosave is already keeping local state in sync).
    if (hydratedSongIdRef.current === liveSong.id) return;
    hydratedSongIdRef.current = liveSong.id;
    const hydrated = ensureSongHasDerivedMediaLinks({ ...liveSong });
    setDraft(hydrated);
    setCommittedJournal(liveSong.journalMarkdown);
    setJournalLocal(liveSong.journalMarkdown);
    setPerfVenueFilter(null);
    lastAutosavedSongRef.current = liveSong;
    originalSongRef.current = { ...liveSong };
    latestSavedRef.current = { ...liveSong };
    setLoadState('ok');
  }, [route.kind, liveSong, libraryReady]);

  const persistSongNow = useCallback(
    async (raw: EncoreSong) => {
      const now = new Date().toISOString();
      const withMilestones = applyTemplateProgressToSong(
        raw,
        repertoireExtras.milestoneTemplate
      );
      const cleanedTags = normalizeSongTags(withMilestones.tags);
      const normalized = songWithSyncedLegacyDriveIds({
        ...withMilestones,
        title: withMilestones.title.trim() || 'Untitled',
        artist: withMilestones.artist.trim() || 'Unknown artist',
        tags: cleanedTags.length > 0 ? cleanedTags : undefined,
        updatedAt: now,
        createdAt: withMilestones.createdAt || now,
      });
      // Autosave path: skip per-tick undo entries; the page commits one combined
      // entry on navigate-away (see commit-time effect below).
      await saveSong(normalized, { silentUndo: true });
      latestSavedRef.current = { ...normalized };
      if (isNew) {
        navigateEncore({ kind: 'song', id: normalized.id });
      }
      lastAutosavedSongRef.current = normalized;
    },
    [isNew, repertoireExtras.milestoneTemplate, saveSong]
  );

  useEffect(() => {
    if (!draft || loadState !== 'ok') return;
    if (isNew && !draft.title.trim()) return;
    const payload = { ...draft, journalMarkdown: committedJournal };
    if (!songAutosaveDirty(lastAutosavedSongRef.current, payload)) return;
    const t = setTimeout(() => {
      void (async () => {
        try {
          await persistSongNow(payload);
        } catch {
          /* ignore */
        }
      })();
    }, 550);
    return () => clearTimeout(t);
  }, [draft, committedJournal, loadState, isNew, persistSongNow]);

  /**
   * Commit-time undo: when the user navigates away (route change or unmount),
   * push *one* combined undo entry covering the entire editing session so the
   * autosave debounce stream collapses to a single ⌘Z step. See PR 4 of the
   * Encore quality sweep.
   */
  const songRouteKey = route.kind === 'song' ? route.id : 'new';
  useEffect(() => {
    void songRouteKey;
    return () => {
      const original = originalSongRef.current;
      const latest = latestSavedRef.current;
      if (!latest) return;
      if (!songAutosaveDirty(original, latest)) return;
      const id = latest.id;
      pushUndo({
        undo: async () => {
          if (original) {
            await saveSong({ ...original }, { silentUndo: true });
          } else {
            await deleteSong(id);
          }
        },
        redo: async () => {
          await saveSong({ ...latest }, { silentUndo: true });
        },
      });
    };
  }, [songRouteKey, pushUndo, saveSong, deleteSong]);

  const mediaHub = useSongPageMediaHub({
    draft,
    setDraft,
    isNew,
    routeKind: route.kind,
    routeSongId: route.kind === 'song' ? route.id : null,
    songs,
    googleAccessToken,
    spotifyLinked,
    driveUploadFolderOverrides: repertoireExtras.driveUploadFolderOverrides,
    persistAfterMetadataRefresh: persistSongNow,
  });
  const { uploadFilesToMediaSlot } = mediaHub;

  useEffect(() => {
    if (!draft || loadState !== 'ok') {
      songFileDragDepthRef.current = 0;
      setSongPageFileDragActive(false);
      setHoveredMediaSlot(null);
      return;
    }
    const hasFiles = (dt: DataTransfer | null) => Boolean(dt?.types?.includes('Files'));
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      songFileDragDepthRef.current += 1;
      setSongPageFileDragActive(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      songFileDragDepthRef.current = Math.max(0, songFileDragDepthRef.current - 1);
      if (songFileDragDepthRef.current === 0) {
        setSongPageFileDragActive(false);
        setHoveredMediaSlot(null);
      }
    };
    const onEnd = () => {
      songFileDragDepthRef.current = 0;
      setSongPageFileDragActive(false);
      setHoveredMediaSlot(null);
    };
    const onDragOver = (e: DragEvent) => {
      if (hasFiles(e.dataTransfer)) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
      }
    };
    document.addEventListener('dragenter', onEnter);
    document.addEventListener('dragleave', onLeave);
    document.addEventListener('dragend', onEnd);
    document.addEventListener('dragover', onDragOver);
    return () => {
      document.removeEventListener('dragenter', onEnter);
      document.removeEventListener('dragleave', onLeave);
      document.removeEventListener('dragend', onEnd);
      document.removeEventListener('dragover', onDragOver);
    };
  }, [draft, loadState]);

  const onMediaSlotDragOver = useCallback((slot: SongMediaUploadSlot, e: ReactDragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    setHoveredMediaSlot(slot);
  }, []);

  const onMediaSlotDragEnter = useCallback((slot: SongMediaUploadSlot, e: ReactDragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setHoveredMediaSlot(slot);
  }, []);

  const onMediaSlotDragLeave = useCallback((slot: SongMediaUploadSlot, e: ReactDragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;
    setHoveredMediaSlot((h) => (h === slot ? null : h));
  }, []);

  const onMediaSlotDrop = useCallback(
    (slot: SongMediaUploadSlot, e: ReactDragEvent<HTMLElement>) => {
      if (!e.dataTransfer.types.includes('Files')) return;
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      void uploadFilesToMediaSlot(slot, files);
    },
    [uploadFilesToMediaSlot],
  );

  const mediaHubFileDrop = useMemo(
    () => ({
      globalFileDragActive: songPageFileDragActive,
      hoveredSlot: hoveredMediaSlot,
      onMediaSlotDragEnter,
      onMediaSlotDragLeave,
      onMediaSlotDragOver,
      onMediaSlotDrop,
    }),
    [
      songPageFileDragActive,
      hoveredMediaSlot,
      onMediaSlotDragEnter,
      onMediaSlotDragLeave,
      onMediaSlotDragOver,
      onMediaSlotDrop,
    ],
  );

  const handleSongPageFileDrop = useCallback((e: ReactDragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    const fl = e.dataTransfer.files;
    if (!fl?.length) return;
    e.preventDefault();
    setIntentUploadFiles(Array.from(fl));
  }, []);

  const handleSaveJournal = async () => {
    if (!draft) return;
    setJournalSaving(true);
    try {
      const next = {
        ...draft,
        journalMarkdown: journalLocal,
        updatedAt: new Date().toISOString(),
      };
      setCommittedJournal(journalLocal);
      await persistSongNow(next);
      setDraft(next);
    } finally {
      setJournalSaving(false);
    }
  };

  const onMilestoneSongChange = useCallback(
    (next: EncoreSong) => {
      setDraft(next);
      void (async () => {
        try {
          await persistSongNow(next);
        } catch {
          /* ignore */
        }
      })();
    },
    [persistSongNow]
  );

  const handleDelete = async () => {
    if (!draft || isNew) return;
    if (!window.confirm(`Delete “${draft.title}” from your library?`)) return;
    await deleteSong(draft.id);
    navigateEncore({ kind: 'library' });
  };

  const tagSuggestions = collectAllSongTags(songs);

  if (loadState === 'pending') {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 8 }}
        aria-busy="true"
        aria-label="Loading song"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (route.kind === 'song' && loadState === 'missing') {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          component="a"
          href={encoreAppHref({ kind: 'library' })}
          sx={{ mb: 2 }}
        >
          Back to library
        </Button>
        <Typography variant="h6" gutterBottom>
          Song not found
        </Typography>
        <Typography color="text.secondary">
          This id is not in your library. It may have been removed, or the link
          is wrong.
        </Typography>
      </Container>
    );
  }

  if (!draft || !milestoneSong) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const songHeroBlocks: SongPageHeroBlocks = {
    albumArt: draft.albumArtUrl ? (
      <Box
        component="img"
        src={draft.albumArtUrl}
        alt=""
        sx={{
          width: { xs: 228, sm: 252, md: 280 },
          height: { xs: 228, sm: 252, md: 280 },
          objectFit: 'cover',
          borderRadius: 2,
          flexShrink: 0,
          display: 'block',
        }}
      />
    ) : (
      <Box
        sx={{
          ...encoreNoAlbumArtSurfaceSx(theme),
          width: { xs: 228, sm: 252, md: 280 },
          height: { xs: 228, sm: 252, md: 280 },
          borderRadius: 2,
          flexShrink: 0,
        }}
      >
        <MusicNoteIcon sx={{ ...encoreNoAlbumArtIconSx(theme), fontSize: 56 }} aria-hidden />
      </Box>
    ),
    titleField:
      isNew && spotifyLinked && clientId ? (
        <Autocomplete
          freeSolo
          size="small"
          options={mediaHub.spotifyOptions}
          loading={mediaHub.spotifyLoading}
          getOptionLabel={(o) => (typeof o === 'string' ? o : trackLabel(o))}
          isOptionEqualToValue={(a, b) =>
            typeof a !== 'string' && typeof b !== 'string' && a.id === b.id
          }
          value={null}
          inputValue={draft.title}
          onInputChange={(_, v, reason) => {
            if (reason === 'reset') return;
            setDraft((d) => (d ? { ...d, title: v } : d));
          }}
          onChange={(_, v) => {
            if (v && typeof v === 'object' && 'id' in v)
              mediaHub.applySpotifyDataSourceFromTrack(v as SpotifySearchTrack);
          }}
          filterOptions={(x) => x}
          renderOption={(props, t) => renderSpotifyTrackAutocompleteOption(props, t)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Title"
              required
              variant="outlined"
              size="small"
              helperText="Search Spotify, pick a match, or type a title. Paste a track link to import."
              onBlur={() => void mediaHub.resolveSpotifyDataSourcePaste(draft.title)}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <>
                    <SpotifyBrandIcon
                      sx={{
                        mr: 0.75,
                        opacity: 0.85,
                        fontSize: 18,
                        alignSelf: 'center',
                      }}
                    />
                    {params.InputProps.startAdornment}
                  </>
                ),
                endAdornment: (
                  <>
                    {mediaHub.spotifyLoading ? <CircularProgress color="inherit" size={16} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      ) : (
        <TextField
          label="Title"
          value={draft.title}
          onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))}
          fullWidth
          required
          size="small"
          variant="outlined"
        />
      ),
    artistField: (
      <TextField
        label="Artist"
        value={draft.artist}
        onChange={(e) => setDraft((d) => (d ? { ...d, artist: e.target.value } : d))}
        fullWidth
        size="small"
        variant="outlined"
      />
    ),
    tagsKeyPractice: (
      <Stack spacing={1.75} sx={{ width: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <InlineSongTagsCell
            tags={draft.tags ?? []}
            suggestions={tagSuggestions}
            onCommit={(next) =>
              setDraft((d) => (d ? { ...d, tags: next.length > 0 ? next : undefined } : d))
            }
          />
        </Box>
        <Stack
          direction="row"
          flexWrap="wrap"
          alignItems="center"
          gap={1}
          useFlexGap
          sx={{
            width: 1,
            pt: 1.5,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          {/*
            Single-border presentation: the chip itself carries the visible border. The previous
            wrapper Box added a second tinted-bg border around the chip which read as a heavy
            double frame for a single-value selector.
          */}
          <Typography
            component="span"
            variant="caption"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'text.secondary',
            }}
          >
            Key
          </Typography>
          <InlineChipSelect<string>
            value={draft.performanceKey ?? null}
            options={ENCORE_PERFORMANCE_KEY_OPTIONS}
            freeSolo
            clearable
            placeholder="Set key"
            onChange={(v) => setDraft((d) => (d ? { ...d, performanceKey: v ?? undefined } : d))}
          />
          <FormControlLabel
            sx={{ alignItems: 'center', m: 0, ml: { xs: 0, sm: 'auto' } }}
            control={
              <Switch
                checked={Boolean(draft.practicing)}
                onChange={(e) => {
                  const ts = new Date().toISOString();
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          practicing: e.target.checked,
                          updatedAt: ts,
                        }
                      : d
                  );
                }}
                inputProps={{ 'aria-label': 'Currently practicing this song' }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Practicing
              </Typography>
            }
          />
        </Stack>
      </Stack>
    ),
  };
  const songTopHalfBlocks: SongPageTopHalfBlocks = {
    ...songHeroBlocks,
    catalogStrip: mediaHub.catalogStrip,
    spotifyAlerts: mediaHub.spotifyAlerts,
    mediaSlots: mediaHub.mediaSlots,
    searchWebFooter: mediaHub.searchWebFooter,
  };

  return (
    <Box
      sx={{
        alignSelf: 'stretch',
        flex: '1 1 auto',
        width: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
      }}
      onDrop={handleSongPageFileDrop}
    >
      <Box
        sx={{
          boxSizing: 'border-box',
          px: encoreScreenPaddingX,
          pt: encorePagePaddingTop,
          pb: { xs: 6, sm: 5 },
          ...encoreMaxWidthPage,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 2.5,
          }}
        >
          <IconButton
            aria-label="Back to library"
            component="a"
            href={encoreAppHref({ kind: 'library' })}
            edge="start"
            size="small"
            sx={{ ml: -0.5 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="overline"
            color="primary"
            sx={{ fontWeight: 700, letterSpacing: '0.18em', lineHeight: 1.2 }}
          >
            {isNew ? 'New song' : 'Song'}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }} />
          {!isNew ? (
            <>
              <Tooltip title="More">
                <IconButton
                  aria-label="Song actions"
                  size="small"
                  onClick={(e) => setSongMenuAnchor(e.currentTarget)}
                >
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={songMenuAnchor}
                open={Boolean(songMenuAnchor)}
                onClose={() => setSongMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem
                  onClick={() => {
                    setSongMenuAnchor(null);
                    void handleDelete();
                  }}
                  sx={{ color: 'error.main' }}
                >
                  <ListItemIcon>
                    <DeleteOutlineIcon
                      fontSize="small"
                      sx={{ color: 'error.main' }}
                    />
                  </ListItemIcon>
                  <ListItemText>Delete from library</ListItemText>
                </MenuItem>
              </Menu>
            </>
          ) : null}
        </Box>

        <Paper
          component="section"
          aria-label="Song details"
          elevation={0}
          sx={{ ...encoreSongPageCardPaperSx, mb: 2.5 }}
        >
          <Box sx={encoreSongPageCardPaddingSx}>
            <SongPageSongTopSection blocks={songTopHalfBlocks} mediaHubFileDrop={mediaHubFileDrop} />
          </Box>
        </Paper>

        {!isNew ? (
          <Paper
            component="section"
            elevation={0}
            aria-labelledby="encore-song-performances-heading"
            sx={{ ...encoreSongPageCardPaperSx, mb: 2.5 }}
          >
            <Box sx={encoreSongPageCardPaddingSx}>
              <Typography
                id="encore-song-performances-heading"
                component="h2"
                variant="subtitle1"
                sx={{ fontWeight: 700, mb: 2 }}
              >
                Performances{songPerformances.length > 0 ? ` (${songPerformances.length})` : ''}
              </Typography>
              <SongPerformancesPanel
                performances={songPerformances}
                filteredPerformances={filteredSongPerformances}
                venueBreakdown={songPerformanceVenueBreakdown}
                venueFilter={perfVenueFilter}
                googleAccessToken={googleAccessToken}
                onSelectVenueFilter={setPerfVenueFilter}
                onAddPerformance={() => {
                  setPerfEditing(null);
                  setPerfOpen(true);
                }}
                onEditPerformance={(p) => {
                  setPerfEditing(p);
                  setPerfOpen(true);
                }}
              />
            </Box>
          </Paper>
        ) : null}

        <Paper
          component="section"
          elevation={0}
          aria-labelledby={!isNew ? 'encore-song-practice-heading' : undefined}
          aria-label={isNew ? 'Practice' : undefined}
          sx={encoreSongPageCardPaperSx}
        >
          <Box sx={encoreSongPageCardPaddingSx}>
            <Stack spacing={3}>
              {!isNew ? (
                <Typography
                  id="encore-song-practice-heading"
                  component="h2"
                  variant="subtitle1"
                  sx={{ fontWeight: 700 }}
                >
                  Practice
                </Typography>
              ) : null}
              <SongMilestoneChecklist
                song={milestoneSong}
                milestoneTemplate={repertoireExtras.milestoneTemplate}
                onChange={onMilestoneSongChange}
              />

              <SongJournalEditor
                journalLocal={journalLocal}
                committedJournal={committedJournal}
                saving={journalSaving}
                onChangeLocal={setJournalLocal}
                onSave={() => void handleSaveJournal()}
              />

              {isNew ? (
                <Typography variant="body2" color="text.secondary">
                  Save this song (add a title — it saves automatically) to log
                  performances.
                </Typography>
              ) : null}
            </Stack>
          </Box>
        </Paper>
      </Box>

      {!isNew && (
        <PerformanceEditorDialog
          open={perfOpen}
          performance={perfEditing}
          songId={draft.id}
          googleAccessToken={googleAccessToken}
          venueOptions={venueOptions}
          onClose={() => {
            setPerfOpen(false);
            setPerfEditing(null);
          }}
          onSave={async (p: EncorePerformance) => {
            await savePerformance(p);
          }}
          onDelete={
            perfEditing
              ? async (id) => {
                  await deletePerformance(id);
                }
              : undefined
          }
        />
      )}

      <SongMediaUploadIntentDialog
        open={intentUploadFiles !== null}
        files={intentUploadFiles ?? []}
        onClose={() => setIntentUploadFiles(null)}
        onChoose={(slot) => {
          const files = intentUploadFiles;
          setIntentUploadFiles(null);
          if (files && files.length > 0) void uploadFilesToMediaSlot(slot, files);
        }}
      />
    </Box>
  );
}
