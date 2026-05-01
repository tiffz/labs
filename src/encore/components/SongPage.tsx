import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EncoreAppRoute } from '../routes/encoreAppHash';
import { navigateEncore } from '../routes/encoreAppHash';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import {
  fetchSpotifyTrack,
  searchTracks,
  type SpotifySearchTrack,
} from '../spotify/spotifyApi';
import { parseSpotifyTrackId } from '../spotify/parseSpotifyTrackUrl';
import type { EncorePerformance, EncoreSong } from '../types';
import {
  encoreNoAlbumArtIconSx,
  encoreNoAlbumArtSurfaceSx,
} from '../utils/encoreNoAlbumArtSurface';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import { useEncoreBlockingJobs } from '../context/EncoreBlockingJobContext';
import { useEncore } from '../context/EncoreContext';
import {
  encoreHairline,
  encoreMaxWidthPage,
  encoreMediaLinkRowSx,
  encoreRadius,
  encoreShadowLift,
} from '../theme/encoreUiTokens';
import {
  encorePagePaddingTop,
  encoreScreenPaddingX,
} from '../theme/encoreM3Layout';
import { driveUploadFileResumable } from '../drive/driveFetch';
import { ensureEncoreDriveLayout } from '../drive/bootstrapFolders';
import { driveFileWebUrl } from '../drive/driveWebUrls';
import { ENCORE_DRIVE_CHART_MIME_TYPES } from '../drive/googlePicker';
import { SongJournalEditor } from './song/SongJournalEditor';
import { SongPerformancesPanel } from './song/SongPerformancesPanel';
import { PerformanceEditorDialog } from './PerformanceEditorDialog';
import { SongMilestoneChecklist } from './SongMilestoneChecklist';
import { DriveFilePickerDialog } from './DriveFilePickerDialog';
import { SpotifyBrandIcon, YouTubeBrandIcon } from './EncoreBrandIcon';
import {
  encoreGeniusSearchUrl,
  encoreUltimateGuitarSearchUrl,
  encoreYouTubeSearchUrl,
} from './encoreSongResourceLinks';
import {
  addSongAttachment,
  effectiveSongAttachments,
  primaryChartAttachment,
  setPrimaryChartByDriveFileId,
  songWithSyncedLegacyDriveIds,
} from '../utils/songAttachments';
import { applyTemplateProgressToSong } from '../repertoire/repertoireMilestones';
import { ENCORE_PERFORMANCE_KEY_OPTIONS } from '../repertoire/performanceKeys';
import { collectAllSongTags, normalizeSongTags } from '../repertoire/songTags';
import {
  appendSpotifyBackingLink,
  appendSpotifyReferenceLink,
  appendYoutubeBackingLink,
  appendYoutubeReferenceLink,
  applySpotifyDataSourcePick,
  ensureSongHasDerivedMediaLinks,
  mergeSpotifyTrackWebMetadata,
  removeMediaLinkById,
  setPrimaryBackingLinkId,
  setPrimaryReferenceLinkId,
  spotifyDataSourceTrackId,
} from '../repertoire/songMediaLinks';
import { InlineChipSelect } from '../ui/InlineEditChip';
import { InlineSongTagsCell } from '../ui/InlineSongTagsCell';
import { EncoreSpotifyConnectionChip } from '../ui/EncoreSpotifyConnectionChip';
import { EncoreStreamingHoverCard } from './EncoreStreamingHoverCard';
import { EncoreMediaLinkRow } from '../ui/EncoreMediaLinkRow';
import {
  formatMediaLinkCaption,
  youtubeWatchUrlFromMediaLink,
} from '../ui/encoreMediaLinkFormat';
import { renderSpotifyTrackAutocompleteOption } from '../ui/renderSpotifyTrackAutocompleteOption';

/** Dense subsection labels on the song page */
const songPageBlockTitleSx = {
  fontWeight: 600,
  fontSize: '0.8125rem',
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
  lineHeight: 1.4,
  mb: 1.25,
};

function SongPageSectionHeading(props: {
  title: string;
  tooltip: string;
  infoAriaLabel: string;
}): React.ReactElement {
  const { title, tooltip, infoAriaLabel } = props;
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
      <Typography
        component="h2"
        variant="body2"
        sx={{ ...songPageBlockTitleSx, mb: 0 }}
      >
        {title}
      </Typography>
      <Tooltip title={tooltip}>
        <IconButton
          size="small"
          aria-label={infoAriaLabel}
          sx={{ p: 0.25, color: 'text.secondary' }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

/** Inline icon buttons next to media links — keep visually quiet */
const extLinkIconBtnSx = {
  color: 'text.secondary',
  p: 0.25,
  '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
} as const;

function catalogKickerSx(): Record<string, unknown> {
  return {
    flexShrink: 0,
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'text.secondary',
    lineHeight: 1,
    whiteSpace: 'nowrap' as const,
  };
}

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

// Caption + URL helpers live in `../ui/encoreMediaLinkFormat` so PracticeScreen,
// GuestShareView, and PlaylistImportDialog can share them.

/**
 * Primary line for the Spotify catalog row: prefer the Spotify **reference** caption for this track id
 * so swapped song-level title/artist (e.g. bad YouTube import) does not masquerade as Spotify metadata.
 */
function spotifyCatalogDisplayLabel(draft: EncoreSong, catalogTrackId: string): string {
  const idNorm = catalogTrackId.trim();
  const link = (draft.referenceLinks ?? []).find(
    (l) => l.source === 'spotify' && (l.spotifyTrackId ?? '').trim() === idNorm,
  );
  if (link) {
    const line = formatMediaLinkCaption(link);
    const max = 72;
    return line.length <= max ? line : `${line.slice(0, max - 1)}…`;
  }
  const id = idNorm;
  return id.length <= 14 ? `Spotify · ${id}` : `Spotify · ${id.slice(0, 6)}…`;
}

/** Stable snapshot for debounced autosave (avoids loops from updatedAt-only writes). */
function songAutosaveSignature(s: EncoreSong): string {
  return JSON.stringify({
    id: s.id,
    title: s.title,
    artist: s.artist,
    journalMarkdown: s.journalMarkdown,
    spotifyTrackId: s.spotifyTrackId,
    youtubeVideoId: s.youtubeVideoId,
    performanceKey: s.performanceKey,
    practicing: s.practicing,
    tags: s.tags,
    milestoneProgress: s.milestoneProgress,
    songOnlyMilestones: s.songOnlyMilestones,
    attachments: s.attachments,
    albumArtUrl: s.albumArtUrl,
    referenceLinks: s.referenceLinks,
    backingLinks: s.backingLinks,
  });
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
    performances,
    repertoireExtras,
    googleAccessToken,
    spotifyLinked,
  } = useEncore();
  const { withBlockingJob } = useEncoreBlockingJobs();
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
  const [songTab, setSongTab] = useState(0);
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [refSpotifyQuery, setRefSpotifyQuery] = useState('');
  const [spotifyOptions, setSpotifyOptions] = useState<SpotifySearchTrack[]>(
    []
  );
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  /** When false and catalog id is set, show the linked track row instead of the search field. */
  const [spotifyCatalogSwapOpen, setSpotifyCatalogSwapOpen] = useState(false);
  const [spotifyMetaLoading, setSpotifyMetaLoading] = useState(false);
  const [spotifyMetaMessage, setSpotifyMetaMessage] = useState<string | null>(
    null
  );
  const [youtubeRefPaste, setYoutubeRefPaste] = useState('');
  const [youtubeBackPaste, setYoutubeBackPaste] = useState('');
  const [backingSpotifyPaste, setBackingSpotifyPaste] = useState('');
  const [songMenuAnchor, setSongMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [chartAddAnchor, setChartAddAnchor] = useState<null | HTMLElement>(
    null
  );
  const chartFileInputRef = useRef<HTMLInputElement | null>(null);
  const [perfOpen, setPerfOpen] = useState(false);
  const [perfEditing, setPerfEditing] = useState<EncorePerformance | null>(
    null
  );
  const [perfVenueFilter, setPerfVenueFilter] = useState<string | null>(null);
  const [chartsFolderId, setChartsFolderId] = useState<string | null>(null);
  const [chartPickerOpen, setChartPickerOpen] = useState(false);
  const [driveAttachMsg, setDriveAttachMsg] = useState<string | null>(null);
  const [driveUploading, setDriveUploading] = useState(false);
  const [referenceAddAnchor, setReferenceAddAnchor] = useState<null | HTMLElement>(null);
  const [referenceAddKind, setReferenceAddKind] = useState<'spotify' | 'youtube'>('spotify');
  const [backingAddAnchor, setBackingAddAnchor] = useState<null | HTMLElement>(null);
  const [backingAddKind, setBackingAddKind] = useState<'spotify' | 'youtube'>('spotify');

  const closeReferenceAdd = useCallback(() => {
    setReferenceAddAnchor(null);
    setRefSpotifyQuery('');
    setYoutubeRefPaste('');
  }, []);

  const closeBackingAdd = useCallback(() => {
    setBackingAddAnchor(null);
    setBackingSpotifyPaste('');
    setYoutubeBackPaste('');
  }, []);

  const lastAutosaveSigRef = useRef<string>('');
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

  useEffect(() => {
    if (!googleAccessToken) {
      setChartsFolderId(null);
      return;
    }
    void (async () => {
      try {
        const layout = await ensureEncoreDriveLayout(googleAccessToken);
        setChartsFolderId(layout.sheetMusicFolderId);
      } catch {
        setChartsFolderId(null);
      }
    })();
  }, [googleAccessToken]);

  useEffect(() => {
    if (route.kind === 'songNew') {
      const s = newSong();
      setDraft(s);
      setCommittedJournal('');
      setJournalLocal('');
      setSpotifyQuery('');
      setSpotifyCatalogSwapOpen(false);
      setSongTab(0);
      setPerfVenueFilter(null);
      lastAutosaveSigRef.current = songAutosaveSignature(s);
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
    const s = songs.find((x) => x.id === route.id);
    if (s) {
      const hydrated = ensureSongHasDerivedMediaLinks({ ...s });
      setDraft(hydrated);
      setCommittedJournal(s.journalMarkdown);
      setJournalLocal(s.journalMarkdown);
      setSpotifyQuery(`${s.title} ${s.artist}`.trim());
      setSpotifyCatalogSwapOpen(false);
      setSongTab(0);
      setPerfVenueFilter(null);
      lastAutosaveSigRef.current = songAutosaveSignature({
        ...s,
        journalMarkdown: s.journalMarkdown,
      });
      originalSongRef.current = { ...s };
      latestSavedRef.current = { ...s };
      setLoadState('ok');
    } else {
      setDraft(null);
      setLoadState('missing');
    }
  }, [route, songs, libraryReady]);

  const spotifySearchListQuery = useMemo(() => {
    if (isNew) {
      return `${draft?.title ?? ''} ${draft?.artist ?? ''}`.trim();
    }
    const catalogId = draft ? spotifyDataSourceTrackId(draft) : '';
    const catalogRowOnly = Boolean(catalogId) && !spotifyCatalogSwapOpen;
    const candidates = [
      refSpotifyQuery.trim(),
      ...(catalogRowOnly ? [] : [spotifyQuery.trim()]),
    ].filter((q) => q.length >= 2);
    if (candidates.length === 0) return '';
    return candidates.reduce((a, b) => (b.length > a.length ? b : a));
  }, [isNew, draft, spotifyQuery, refSpotifyQuery, spotifyCatalogSwapOpen]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!spotifyLinked || !clientId) {
      setSpotifyOptions([]);
      return;
    }
    const q = spotifySearchListQuery;
    if (q.length < 2) {
      setSpotifyOptions([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      void (async () => {
        setSpotifyLoading(true);
        setSpotifyError(null);
        try {
          const token = await ensureSpotifyAccessToken(clientId);
          if (!token) {
            setSpotifyOptions([]);
            return;
          }
          const tracks = await searchTracks(token, q, 8);
          setSpotifyOptions(tracks);
        } catch (e) {
          setSpotifyError(e instanceof Error ? e.message : String(e));
          setSpotifyOptions([]);
        } finally {
          setSpotifyLoading(false);
        }
      })();
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [spotifySearchListQuery, spotifyLinked, clientId]);

  const bootstrappedSearchRef = useRef<string | null>(null);
  useEffect(() => {
    if (isNew || !spotifyLinked || !clientId || route.kind !== 'song') return;
    const s = songs.find((x) => x.id === route.id);
    if (!s) return;
    const seed = `${s.title} ${s.artist}`.trim();
    if (seed.length < 3) return;
    if (bootstrappedSearchRef.current === `${s.id}:${seed}`) return;
    bootstrappedSearchRef.current = `${s.id}:${seed}`;
    void (async () => {
      setSpotifyLoading(true);
      setSpotifyError(null);
      try {
        const token = await ensureSpotifyAccessToken(clientId);
        if (!token) return;
        const tracks = await searchTracks(token, seed, 8);
        setSpotifyOptions(tracks);
      } catch {
        /* non-fatal */
      } finally {
        setSpotifyLoading(false);
      }
    })();
  }, [route, songs, isNew, spotifyLinked, clientId]);

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
      lastAutosaveSigRef.current = songAutosaveSignature(normalized);
    },
    [isNew, repertoireExtras.milestoneTemplate, saveSong]
  );

  useEffect(() => {
    if (!draft || loadState !== 'ok') return;
    if (isNew && !draft.title.trim()) return;
    const payload = { ...draft, journalMarkdown: committedJournal };
    const sig = songAutosaveSignature(payload);
    if (sig === lastAutosaveSigRef.current) return;
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
      const originalSig = original ? songAutosaveSignature(original) : '';
      const latestSig = songAutosaveSignature(latest);
      if (originalSig === latestSig) return;
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

  const applySpotifyDataSourceFromTrack = useCallback((t: SpotifySearchTrack) => {
    setSpotifyCatalogSwapOpen(false);
    setDraft((d) => {
      if (!d) return d;
      return applySpotifyDataSourcePick(d, t.id, {
        title: t.name?.trim() || d.title,
        artist:
          t.artists
            ?.map((a) => a.name)
            .join(', ')
            .trim() || d.artist,
        albumArtUrl: t.album?.images?.[0]?.url,
      });
    });
    setSpotifyQuery(trackLabel(t));
  }, []);

  const appendReferenceSpotifyFromTrack = useCallback((t: SpotifySearchTrack) => {
    setDraft((d) => (d ? appendSpotifyReferenceLink(d, t.id, { label: trackLabel(t) }) : d));
    setRefSpotifyQuery(trackLabel(t));
  }, []);

  const resolveSpotifyDataSourcePaste = useCallback(
    async (rawOverride?: string) => {
      if (!draft || !clientId || !spotifyLinked) return;
      const raw = (rawOverride ?? spotifyQuery).trim();
      const id = parseSpotifyTrackId(raw);
      if (!id) return;
      setSpotifyError(null);
      setSpotifyLoading(true);
      try {
        const token = await ensureSpotifyAccessToken(clientId);
        if (!token) {
          setSpotifyError('Connect Spotify first (Account menu).');
          return;
        }
        const t = await fetchSpotifyTrack(token, id);
        applySpotifyDataSourceFromTrack(t);
      } catch (e) {
        setSpotifyError(e instanceof Error ? e.message : String(e));
      } finally {
        setSpotifyLoading(false);
      }
    },
    [applySpotifyDataSourceFromTrack, clientId, draft, spotifyLinked, spotifyQuery],
  );

  const resolveRefSpotifyPaste = useCallback(async () => {
    if (!draft || !clientId || !spotifyLinked) return;
    const raw = refSpotifyQuery.trim();
    const id = parseSpotifyTrackId(raw);
    if (!id) return;
    setSpotifyError(null);
    setSpotifyLoading(true);
    try {
      const token = await ensureSpotifyAccessToken(clientId);
      if (!token) {
        setSpotifyError('Connect Spotify first (Account menu).');
        return;
      }
      const t = await fetchSpotifyTrack(token, id);
      appendReferenceSpotifyFromTrack(t);
      closeReferenceAdd();
    } catch (e) {
      setSpotifyError(e instanceof Error ? e.message : String(e));
    } finally {
      setSpotifyLoading(false);
    }
  }, [appendReferenceSpotifyFromTrack, clientId, closeReferenceAdd, draft, spotifyLinked, refSpotifyQuery]);

  const fillFromSpotify = useCallback(async () => {
    setSpotifyMetaMessage(null);
    setSpotifyError(null);
    if (!spotifyLinked) {
      setSpotifyMetaMessage('Connect Spotify first (Account menu).');
      return;
    }
    if (!clientId) {
      setSpotifyMetaMessage('Spotify client id is not configured.');
      return;
    }
    const d = draft;
    if (!d) return;
    const pid = spotifyDataSourceTrackId(d);
    if (!pid) {
      setSpotifyMetaMessage('No Spotify catalog track is set for this song.');
      return;
    }
    setSpotifyMetaLoading(true);
    try {
      const token = await ensureSpotifyAccessToken(clientId);
      if (!token) {
        setSpotifyMetaMessage('Connect Spotify first (Account menu).');
        return;
      }
      const track = await fetchSpotifyTrack(token, pid);
      const merged = mergeSpotifyTrackWebMetadata(d, track);
      setDraft(merged);
      await persistSongNow(merged);
      setSpotifyMetaMessage(
        'Updated from Spotify: title, artist, artwork, and Spotify link labels.'
      );
    } catch (e) {
      setSpotifyError(e instanceof Error ? e.message : String(e));
    } finally {
      setSpotifyMetaLoading(false);
    }
  }, [clientId, draft, spotifyLinked, persistSongNow]);

  const handleDriveChartUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!googleAccessToken) {
      setDriveAttachMsg('Sign in to Google to upload files to Drive.');
      return;
    }
    if (!chartsFolderId) {
      setDriveAttachMsg(
        'Drive folders are not ready yet. Try again after the first backup completes.'
      );
      return;
    }
    setDriveUploading(true);
    setDriveAttachMsg(null);
    try {
      await withBlockingJob('Uploading chart to Google Drive…', async () => {
        const created = await driveUploadFileResumable(googleAccessToken, file, [
          chartsFolderId,
        ]);
        setDraft((d) =>
          d
            ? addSongAttachment(d, {
                kind: 'chart',
                driveFileId: created.id,
                label: file.name,
              })
            : d,
        );
        setDriveAttachMsg('Chart linked.');
      });
    } catch (e) {
      setDriveAttachMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setDriveUploading(false);
    }
  };

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

  const handleBack = () => {
    navigateEncore({ kind: 'library' });
  };

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
          onClick={handleBack}
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

  const dataSpotifyId = spotifyDataSourceTrackId(draft);
  const primaryRefId =
    (draft.referenceLinks ?? []).find((r) => r.isPrimaryReference)?.id ??
    (draft.referenceLinks ?? [])[0]?.id ??
    '';
  const primaryBackingId =
    (draft.backingLinks ?? []).find((l) => l.isPrimaryBacking)?.id ??
    (draft.backingLinks ?? [])[0]?.id ??
    '';
  const resourceTitle = draft.title.trim() || 'song';
  const resourceArtist = draft.artist.trim() || 'artist';
  const primaryChartDriveFileId = primaryChartAttachment(draft)?.driveFileId ?? '';
  const chartAttachments = [...effectiveSongAttachments(draft).filter((a) => a.kind === 'chart')].sort((a, b) => {
    if (a.isPrimaryChart && !b.isPrimaryChart) return -1;
    if (!a.isPrimaryChart && b.isPrimaryChart) return 1;
    return 0;
  });

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
            onClick={handleBack}
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

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 3, sm: 4 },
            alignItems: { xs: 'stretch', sm: 'flex-start' },
            mb: 2.5,
            width: 1,
            minWidth: 0,
          }}
        >
          {draft.albumArtUrl ? (
            <Box
              component="img"
              src={draft.albumArtUrl}
              alt=""
              sx={{
                width: { xs: 180, sm: 200 },
                height: { xs: 180, sm: 200 },
                objectFit: 'cover',
                borderRadius: encoreRadius,
                boxShadow: encoreShadowLift,
                flexShrink: 0,
              }}
            />
          ) : (
            <Box
              sx={{
                ...encoreNoAlbumArtSurfaceSx(theme),
                width: { xs: 180, sm: 200 },
                height: { xs: 180, sm: 200 },
                borderRadius: encoreRadius,
                boxShadow: encoreShadowLift,
                flexShrink: 0,
              }}
            >
              <MusicNoteIcon
                sx={{ ...encoreNoAlbumArtIconSx(theme), fontSize: 48 }}
                aria-hidden
              />
            </Box>
          )}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              width: 1,
              maxWidth: { md: 560 },
            }}
          >
            <Stack spacing={3} sx={{ width: 1 }}>
              <Stack spacing={1.75}>
                {isNew && spotifyLinked && clientId ? (
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={spotifyOptions}
                    loading={spotifyLoading}
                    getOptionLabel={(o) =>
                      typeof o === 'string' ? o : trackLabel(o)
                    }
                    isOptionEqualToValue={(a, b) =>
                      typeof a !== 'string' &&
                      typeof b !== 'string' &&
                      a.id === b.id
                    }
                    value={null}
                    inputValue={draft.title}
                    onInputChange={(_, v, reason) => {
                      if (reason === 'reset') return;
                      setDraft((d) => (d ? { ...d, title: v } : d));
                    }}
                    onChange={(_, v) => {
                      if (v && typeof v === 'object' && 'id' in v)
                        applySpotifyDataSourceFromTrack(v as SpotifySearchTrack);
                    }}
                    filterOptions={(x) => x}
                    renderOption={(props, t) =>
                      renderSpotifyTrackAutocompleteOption(props, t)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Title"
                        required
                        variant="outlined"
                        size="small"
                        helperText="Search Spotify, pick a match, or type a title. Paste a track link to import."
                        onBlur={() => void resolveSpotifyDataSourcePaste(draft.title)}
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
                              {spotifyLoading ? (
                                <CircularProgress color="inherit" size={16} />
                              ) : null}
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
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, title: e.target.value } : d))
                    }
                    fullWidth
                    required
                    size="small"
                    variant="outlined"
                  />
                )}
                <TextField
                  label="Artist"
                  value={draft.artist}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, artist: e.target.value } : d))
                  }
                  fullWidth
                  size="small"
                  variant="outlined"
                />
              </Stack>

              <Stack
                direction="row"
                flexWrap="wrap"
                gap={1.5}
                alignItems="center"
                useFlexGap
              >
                <InlineSongTagsCell
                  tags={draft.tags ?? []}
                  suggestions={tagSuggestions}
                  onCommit={(next) =>
                    setDraft((d) =>
                      d ? { ...d, tags: next.length > 0 ? next : undefined } : d
                    )
                  }
                />
                <InlineChipSelect<string>
                  value={draft.performanceKey ?? null}
                  options={ENCORE_PERFORMANCE_KEY_OPTIONS}
                  freeSolo
                  clearable
                  placeholder="Key"
                  onChange={(v) =>
                    setDraft((d) =>
                      d ? { ...d, performanceKey: v ?? undefined } : d
                    )
                  }
                />
                <FormControlLabel
                  sx={{ alignItems: 'center', m: 0 }}
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
                      Currently practicing
                    </Typography>
                  }
                />
              </Stack>

              {!clientId ||
              (clientId && !spotifyLinked) ||
              spotifyError ||
              spotifyMetaMessage ? (
                <Stack spacing={1.5} sx={{ width: 1 }}>
                  {!clientId ? (
                    <Alert severity="info">
                      Set <code>VITE_SPOTIFY_CLIENT_ID</code> to link Spotify
                      tracks.
                    </Alert>
                  ) : null}
                  {clientId && !spotifyLinked ? (
                    <EncoreSpotifyConnectionChip description="Connect Spotify to search tracks and refresh metadata." />
                  ) : null}
                  {spotifyError ? (
                    <Alert severity="error">{spotifyError}</Alert>
                  ) : null}
                  {spotifyMetaMessage ? (
                    <Alert severity="success">{spotifyMetaMessage}</Alert>
                  ) : null}
                </Stack>
              ) : null}

              <Stack spacing={1.25} sx={{ width: 1 }}>
                <SongPageSectionHeading
                  title="Spotify catalog"
                  tooltip="This track identifies the song for playlist sync, Fill from Spotify, and default album art. It always appears under Reference recordings but may not be your primary reference."
                  infoAriaLabel="About Spotify catalog"
                />

                {isNew && !dataSpotifyId ? (
                  <Typography variant="caption" color="text.secondary">
                    None set. Use the Title field above.
                  </Typography>
                ) : null}
                {isNew && dataSpotifyId ? (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                      Linked from Title search.
                    </Typography>
                    <Tooltip title="Open catalog track in Spotify">
                      <IconButton
                        size="small"
                        component="a"
                        href={`https://open.spotify.com/track/${encodeURIComponent(dataSpotifyId)}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open catalog track in Spotify"
                        sx={extLinkIconBtnSx}
                      >
                        <SpotifyBrandIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ) : null}

                {spotifyLinked && clientId && !isNew ? (
                  dataSpotifyId && !spotifyCatalogSwapOpen ? (
                    <Stack
                      direction="row"
                      flexWrap="wrap"
                      alignItems="center"
                      gap={0.75}
                      useFlexGap
                      sx={{ width: 1 }}
                    >
                      <EncoreStreamingHoverCard
                        kind="spotify"
                        spotifyTrackId={dataSpotifyId}
                        fallbackTitle={spotifyCatalogDisplayLabel(draft, dataSpotifyId)}
                        fallbackSubtitle={draft.artist?.trim() ?? ''}
                        clientId={clientId}
                        spotifyLinked={spotifyLinked}
                      >
                        <Box sx={(t) => encoreMediaLinkRowSx(t, false)}>
                          <SpotifyBrandIcon sx={{ fontSize: 15, flexShrink: 0, opacity: 0.88 }} aria-hidden />
                          <Typography
                            variant="caption"
                            noWrap
                            sx={{ maxWidth: { xs: 160, sm: 320 }, fontWeight: 600, fontSize: '0.8125rem' }}
                            title={spotifyCatalogDisplayLabel(draft, dataSpotifyId)}
                          >
                            {spotifyCatalogDisplayLabel(draft, dataSpotifyId)}
                          </Typography>
                          <Typography component="span" sx={catalogKickerSx()}>
                            Catalog
                          </Typography>
                          <Tooltip title="Open catalog track in Spotify">
                            <IconButton
                              size="small"
                              component="a"
                              href={`https://open.spotify.com/track/${encodeURIComponent(dataSpotifyId)}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Open catalog track in Spotify"
                              sx={{ ...extLinkIconBtnSx, p: 0.35 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <OpenInNewIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Refresh title, artist, and artwork from the catalog Spotify track">
                            <span>
                              <IconButton
                                size="small"
                                aria-label="Refresh from Spotify catalog"
                                disabled={spotifyMetaLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void fillFromSpotify();
                                }}
                                sx={{ ...extLinkIconBtnSx, p: 0.35 }}
                              >
                                {spotifyMetaLoading ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <RefreshIcon sx={{ fontSize: 16 }} />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </EncoreStreamingHoverCard>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        startIcon={<SwapHorizIcon sx={{ fontSize: 17 }} />}
                        onClick={() => {
                          setSpotifyCatalogSwapOpen(true);
                          setSpotifyQuery(`${draft.title} ${draft.artist}`.trim());
                        }}
                        aria-label="Change Spotify catalog track"
                        sx={{
                          flexShrink: 0,
                          textTransform: 'none',
                          py: 0.25,
                          px: 1,
                          borderColor: 'divider',
                          fontSize: '0.8125rem',
                        }}
                      >
                        Swap
                      </Button>
                    </Stack>
                  ) : (
                    <Stack spacing={1} sx={{ width: 1 }}>
                      {dataSpotifyId && spotifyCatalogSwapOpen ? (
                        <Stack direction="row" justifyContent="flex-end" alignItems="center">
                          <Button
                            size="small"
                            onClick={() => setSpotifyCatalogSwapOpen(false)}
                            sx={{ textTransform: "none" }}
                          >
                            Cancel
                          </Button>
                        </Stack>
                      ) : null}
                      <Autocomplete
                    fullWidth
                    size="small"
                    options={spotifyOptions}
                    loading={spotifyLoading}
                    getOptionLabel={(o) => trackLabel(o)}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    value={null}
                    inputValue={spotifyQuery}
                    onInputChange={(_, v) => setSpotifyQuery(v)}
                    onChange={(_, v) => {
                      if (v && typeof v === "object" && "id" in v)
                        applySpotifyDataSourceFromTrack(v as SpotifySearchTrack);
                    }}
                    filterOptions={(x) => x}
                    renderOption={(props, t) =>
                      renderSpotifyTrackAutocompleteOption(props, t)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        size="small"
                        label="Set Spotify catalog track"
                        placeholder="Title, artist, or paste a track URL"
                        onBlur={() => void resolveSpotifyDataSourcePaste()}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <SpotifyBrandIcon
                                sx={{
                                  mr: 0.75,
                                  fontSize: 18,
                                  alignSelf: "center",
                                }}
                              />
                              {params.InputProps.startAdornment}
                            </>
                          ),
                          endAdornment: (
                            <>
                              {dataSpotifyId ? (
                                <>
                                  <Tooltip title="Open catalog track in Spotify">
                                    <IconButton
                                      size="small"
                                      component="a"
                                      href={`https://open.spotify.com/track/${encodeURIComponent(dataSpotifyId)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label="Open catalog track in Spotify"
                                      sx={{ ...extLinkIconBtnSx, mr: 0.5 }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <SpotifyBrandIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Refresh title, artist, and artwork from the catalog Spotify track">
                                    <span>
                                      <IconButton
                                        size="small"
                                        aria-label="Refresh from Spotify catalog"
                                        disabled={spotifyMetaLoading}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void fillFromSpotify();
                                        }}
                                        sx={{ ...extLinkIconBtnSx, mr: 0.5 }}
                                      >
                                        {spotifyMetaLoading ? (
                                          <CircularProgress size={16} />
                                        ) : (
                                          <RefreshIcon fontSize="small" />
                                        )}
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </>
                              ) : null}
                              {spotifyLoading ? (
                                <CircularProgress color="inherit" size={16} sx={{ mr: 0.5 }} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                    </Stack>
                  )
                ) : null}
              </Stack>

              <Divider sx={{ my: 0.5 }} />

              <Stack spacing={1} sx={{ width: 1 }}>
                <SongPageSectionHeading
                  title="Reference recordings"
                  tooltip="Study and comparison tracks. Pick one primary reference (Spotify or YouTube). The Spotify catalog track appears in this list when set."
                  infoAriaLabel="About reference recordings"
                />

                <Stack
                  direction="row"
                  flexWrap="wrap"
                  alignItems="center"
                  gap={0.75}
                  useFlexGap
                  sx={{ width: 1 }}
                >
                  {(draft.referenceLinks ?? []).length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      None yet.
                    </Typography>
                  ) : null}
                  {(draft.referenceLinks ?? []).map((link) => {
                    const isPrimary = link.id === primaryRefId;
                    const isCatalog =
                      link.source === 'spotify' &&
                      dataSpotifyId &&
                      link.spotifyTrackId?.trim() === dataSpotifyId;
                    const openUrl =
                      link.source === 'spotify' && link.spotifyTrackId
                        ? `https://open.spotify.com/track/${encodeURIComponent(link.spotifyTrackId)}`
                        : link.source === 'youtube'
                          ? (youtubeWatchUrlFromMediaLink(link) ?? undefined)
                          : undefined;
                    const openAria =
                      link.source === 'spotify' ? 'Open in Spotify' : 'Open in YouTube';
                    const strip = (
                      <EncoreMediaLinkRow
                        link={link}
                        slot="reference"
                        isPrimary={isPrimary}
                        onMakePrimary={() =>
                          setDraft((d) => (d ? setPrimaryReferenceLinkId(d, link.id) : d))
                        }
                        openUrl={openUrl}
                        openAriaLabel={openAria}
                        onRemove={() =>
                          setDraft((d) => (d ? removeMediaLinkById(d, link.id) : d))
                        }
                        trailing={
                          isCatalog ? (
                            <Typography component="span" sx={catalogKickerSx()}>
                              Catalog
                            </Typography>
                          ) : null
                        }
                      />
                    );

                    if (link.source === 'spotify' && link.spotifyTrackId?.trim()) {
                      return (
                        <EncoreStreamingHoverCard
                          key={link.id}
                          kind="spotify"
                          spotifyTrackId={link.spotifyTrackId}
                          fallbackTitle={link.label?.trim() || formatMediaLinkCaption(link)}
                          clientId={clientId}
                          spotifyLinked={spotifyLinked}
                        >
                          {strip}
                        </EncoreStreamingHoverCard>
                      );
                    }
                    if (link.source === 'youtube') {
                      return (
                        <EncoreStreamingHoverCard
                          key={link.id}
                          kind="youtube"
                          youtubeWatchUrl={youtubeWatchUrlFromMediaLink(link)}
                          fallbackTitle={link.label?.trim() || formatMediaLinkCaption(link)}
                          clientId={clientId}
                          spotifyLinked={spotifyLinked}
                        >
                          {strip}
                        </EncoreStreamingHoverCard>
                      );
                    }
                    return (
                      <Box key={link.id} sx={{ display: 'inline-flex', maxWidth: '100%' }}>
                        {strip}
                      </Box>
                    );
                  })}
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<AddIcon sx={{ fontSize: 17 }} />}
                    onClick={(e) => {
                      setReferenceAddKind('spotify');
                      setReferenceAddAnchor(e.currentTarget);
                    }}
                    sx={{ flexShrink: 0, textTransform: 'none', borderColor: 'divider', fontSize: '0.8125rem' }}
                  >
                    Add track
                  </Button>
                </Stack>

                <Popover
                  open={Boolean(referenceAddAnchor)}
                  anchorEl={referenceAddAnchor}
                  onClose={closeReferenceAdd}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                  PaperProps={{
                    sx: {
                      mt: 0.75,
                      p: 2,
                      width: { xs: "min(calc(100vw - 24px), 380px)", sm: 380 },
                    },
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700 }}>
                    Add reference track
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={referenceAddKind}
                    onChange={(_, v) => {
                      if (v) setReferenceAddKind(v);
                    }}
                    aria-label="Track source"
                    sx={{ mb: 1.25 }}
                  >
                    <ToggleButton value="spotify" sx={{ textTransform: "none" }}>
                      Spotify
                    </ToggleButton>
                    <ToggleButton value="youtube" sx={{ textTransform: "none" }}>
                      YouTube
                    </ToggleButton>
                  </ToggleButtonGroup>
                  {referenceAddKind === "spotify" ? (
                    spotifyLinked && clientId ? (
                      <Autocomplete
                        fullWidth
                        size="small"
                        options={spotifyOptions}
                        loading={spotifyLoading}
                        getOptionLabel={(o) => trackLabel(o)}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        value={null}
                        inputValue={refSpotifyQuery}
                        onInputChange={(_, v) => setRefSpotifyQuery(v)}
                        onChange={(_, v) => {
                          if (v && typeof v === "object" && "id" in v) {
                            appendReferenceSpotifyFromTrack(v as SpotifySearchTrack);
                            closeReferenceAdd();
                          }
                        }}
                        filterOptions={(x) => x}
                        renderOption={(props, t) =>
                          renderSpotifyTrackAutocompleteOption(props, t)
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            label="Find on Spotify"
                            placeholder="Title, artist, or paste URL"
                            onBlur={() => void resolveRefSpotifyPaste()}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <>
                                  <SpotifyBrandIcon
                                    sx={{
                                      mr: 0.75,
                                      fontSize: 18,
                                      alignSelf: "center",
                                    }}
                                  />
                                  {params.InputProps.startAdornment}
                                </>
                              ),
                              endAdornment: (
                                <>
                                  {spotifyLoading ? (
                                    <CircularProgress color="inherit" size={16} />
                                  ) : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Connect Spotify to search tracks.
                      </Typography>
                    )
                  ) : (
                    <Stack direction="row" spacing={0.75} alignItems="flex-start">
                      <TextField
                        size="small"
                        fullWidth
                        label="YouTube"
                        placeholder="Watch URL or video ID"
                        value={youtubeRefPaste}
                        onChange={(e) => setYoutubeRefPaste(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <YouTubeBrandIcon sx={{ fontSize: 18, opacity: 0.88 }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          if (!draft) return;
                          const raw = youtubeRefPaste.trim();
                          if (!raw) return;
                          const n = appendYoutubeReferenceLink(draft, raw);
                          if (!n) return;
                          setDraft(n);
                          closeReferenceAdd();
                        }}
                        sx={{ flexShrink: 0, mt: 0.5 }}
                      >
                        Add
                      </Button>
                    </Stack>
                  )}
                </Popover>
              </Stack>

              <Divider sx={{ my: 0.5 }} />

              <Stack spacing={1} sx={{ width: 1 }}>
                <SongPageSectionHeading
                  title="Backing tracks"
                  tooltip="Karaoke or practice playback, separate from reference listening. Pick one primary backing when the app needs a default practice track."
                  infoAriaLabel="About backing tracks"
                />

                <Stack
                  direction="row"
                  flexWrap="wrap"
                  alignItems="center"
                  gap={0.75}
                  useFlexGap
                  sx={{ width: 1 }}
                >
                  {(draft.backingLinks ?? []).length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      None yet.
                    </Typography>
                  ) : null}
                  {(draft.backingLinks ?? []).map((link) => {
                    const isPrimary = link.id === primaryBackingId;
                    const openUrl =
                      link.source === 'spotify' && link.spotifyTrackId
                        ? `https://open.spotify.com/track/${encodeURIComponent(link.spotifyTrackId)}`
                        : link.source === 'youtube'
                          ? (youtubeWatchUrlFromMediaLink(link) ?? undefined)
                          : undefined;
                    const openAria =
                      link.source === 'spotify' ? 'Open backing in Spotify' : 'Open backing in YouTube';
                    const strip = (
                      <EncoreMediaLinkRow
                        link={link}
                        slot="backing"
                        isPrimary={isPrimary}
                        onMakePrimary={() =>
                          setDraft((d) => (d ? setPrimaryBackingLinkId(d, link.id) : d))
                        }
                        openUrl={openUrl}
                        openAriaLabel={openAria}
                        onRemove={() =>
                          setDraft((d) => (d ? removeMediaLinkById(d, link.id) : d))
                        }
                      />
                    );

                    if (link.source === 'spotify' && link.spotifyTrackId?.trim()) {
                      return (
                        <EncoreStreamingHoverCard
                          key={link.id}
                          kind="spotify"
                          spotifyTrackId={link.spotifyTrackId}
                          fallbackTitle={link.label?.trim() || formatMediaLinkCaption(link)}
                          clientId={clientId}
                          spotifyLinked={spotifyLinked}
                        >
                          {strip}
                        </EncoreStreamingHoverCard>
                      );
                    }
                    if (link.source === 'youtube') {
                      return (
                        <EncoreStreamingHoverCard
                          key={link.id}
                          kind="youtube"
                          youtubeWatchUrl={youtubeWatchUrlFromMediaLink(link)}
                          fallbackTitle={link.label?.trim() || formatMediaLinkCaption(link)}
                          clientId={clientId}
                          spotifyLinked={spotifyLinked}
                        >
                          {strip}
                        </EncoreStreamingHoverCard>
                      );
                    }
                    return (
                      <Box key={link.id} sx={{ display: 'inline-flex', maxWidth: '100%' }}>
                        {strip}
                      </Box>
                    );
                  })}
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<AddIcon sx={{ fontSize: 17 }} />}
                    onClick={(e) => {
                      setBackingAddKind('spotify');
                      setBackingAddAnchor(e.currentTarget);
                    }}
                    sx={{ flexShrink: 0, textTransform: 'none', borderColor: 'divider', fontSize: '0.8125rem' }}
                  >
                    Add track
                  </Button>
                </Stack>

                <Popover
                  open={Boolean(backingAddAnchor)}
                  anchorEl={backingAddAnchor}
                  onClose={closeBackingAdd}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                  PaperProps={{
                    sx: {
                      mt: 0.75,
                      p: 2,
                      width: { xs: "min(calc(100vw - 24px), 380px)", sm: 380 },
                    },
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700 }}>
                    Add backing track
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={backingAddKind}
                    onChange={(_, v) => {
                      if (v) setBackingAddKind(v);
                    }}
                    aria-label="Backing track source"
                    sx={{ mb: 1.25 }}
                  >
                    <ToggleButton value="spotify" sx={{ textTransform: "none" }}>
                      Spotify
                    </ToggleButton>
                    <ToggleButton value="youtube" sx={{ textTransform: "none" }}>
                      YouTube
                    </ToggleButton>
                  </ToggleButtonGroup>
                  {backingAddKind === "spotify" ? (
                    <Stack direction="row" spacing={0.75} alignItems="flex-start">
                      <TextField
                        size="small"
                        fullWidth
                        label="Spotify"
                        placeholder="Open track or paste URL"
                        value={backingSpotifyPaste}
                        onChange={(e) => setBackingSpotifyPaste(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SpotifyBrandIcon sx={{ fontSize: 18, opacity: 0.88 }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          const id = parseSpotifyTrackId(backingSpotifyPaste.trim());
                          if (!id) return;
                          setDraft((d) => (d ? appendSpotifyBackingLink(d, id) : d));
                          closeBackingAdd();
                        }}
                        sx={{ flexShrink: 0, mt: 0.5 }}
                      >
                        Add
                      </Button>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={0.75} alignItems="flex-start">
                      <TextField
                        size="small"
                        fullWidth
                        label="YouTube"
                        placeholder="Watch URL or video ID"
                        value={youtubeBackPaste}
                        onChange={(e) => setYoutubeBackPaste(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <YouTubeBrandIcon sx={{ fontSize: 18, opacity: 0.88 }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          if (!draft) return;
                          const raw = youtubeBackPaste.trim();
                          if (!raw) return;
                          const n = appendYoutubeBackingLink(draft, raw);
                          if (!n) return;
                          setDraft(n);
                          closeBackingAdd();
                        }}
                        sx={{ flexShrink: 0, mt: 0.5 }}
                      >
                        Add
                      </Button>
                    </Stack>
                  )}
                </Popover>
              </Stack>

              <Stack
                direction="row"
                flexWrap="wrap"
                alignItems="center"
                columnGap={1.5}
                rowGap={0.75}
                useFlexGap
                sx={{ width: 1 }}
              >
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0, alignSelf: 'center' }}>
                  <Typography
                    component="h2"
                    variant="body2"
                    sx={{
                      ...songPageBlockTitleSx,
                      mb: 0,
                    }}
                  >
                    Charts
                  </Typography>
                  <Tooltip title="Pick one primary chart for Practice quick links and default sheet export.">
                    <IconButton size="small" aria-label="About charts" sx={{ p: 0.25, color: 'text.secondary' }}>
                      <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  gap={0.75}
                  alignItems="center"
                  useFlexGap
                  sx={{ flex: 1, minWidth: 0 }}
                >
                  {chartAttachments.map((a) => {
                    const isPrimary = Boolean(primaryChartDriveFileId && a.driveFileId === primaryChartDriveFileId);
                    const caption = a.label ?? a.driveFileId.slice(0, 8);
                    return (
                      <EncoreMediaLinkRow
                        key={a.driveFileId}
                        slot="chart"
                        isPrimary={isPrimary}
                        caption={caption}
                        fullCaption={a.label ?? a.driveFileId}
                        onMakePrimary={() =>
                          setDraft((d) => (d ? setPrimaryChartByDriveFileId(d, a.driveFileId) : d))
                        }
                        openUrl={driveFileWebUrl(a.driveFileId)}
                        openAriaLabel="Open chart in new tab"
                      />
                    );
                  })}
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<AddIcon sx={{ fontSize: 17 }} />}
                    disabled={!googleAccessToken || driveUploading}
                    onClick={(e) => setChartAddAnchor(e.currentTarget)}
                    sx={{
                      textTransform: 'none',
                      borderColor: 'divider',
                      fontSize: '0.8125rem',
                    }}
                  >
                    Add chart
                  </Button>
                  <Menu
                    anchorEl={chartAddAnchor}
                    open={Boolean(chartAddAnchor)}
                    onClose={() => setChartAddAnchor(null)}
                  >
                    <MenuItem
                      onClick={() => {
                        setChartAddAnchor(null);
                        queueMicrotask(() =>
                          chartFileInputRef.current?.click()
                        );
                      }}
                      disabled={driveUploading}
                    >
                      <ListItemIcon>
                        <CloudUploadIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Upload file…" />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        setChartAddAnchor(null);
                        setChartPickerOpen(true);
                      }}
                    >
                      <ListItemIcon>
                        <FolderOpenIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Pick from Drive" />
                    </MenuItem>
                  </Menu>
                  <input
                    ref={chartFileInputRef}
                    type="file"
                    hidden
                    accept=".pdf,.xml,.musicxml,.mxl,image/*"
                    onChange={(e) => {
                      void handleDriveChartUpload(e.target.files?.[0]);
                      setChartAddAnchor(null);
                      e.target.value = '';
                    }}
                  />
                </Stack>
              </Stack>
              {driveAttachMsg ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ lineHeight: 1.55 }}
                >
                  {driveAttachMsg}
                </Typography>
              ) : null}

              {draft.title.trim().length > 0 ? (
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  alignItems="center"
                  columnGap={1.5}
                  rowGap={0.75}
                  useFlexGap
                  sx={{ width: 1 }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ opacity: 0.85, flexShrink: 0, alignSelf: 'center' }}
                  >
                    Search the web
                  </Typography>
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    columnGap={2}
                    rowGap={0.5}
                    useFlexGap
                    sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}
                  >
                    <Button
                      component="a"
                      size="small"
                      variant="text"
                      color="inherit"
                      href={encoreUltimateGuitarSearchUrl(
                        resourceTitle,
                        resourceArtist
                      )}
                      target="_blank"
                      rel="noreferrer"
                      endIcon={
                        <OpenInNewIcon sx={{ fontSize: 14, opacity: 0.55 }} />
                      }
                      sx={{
                        textTransform: 'none',
                        fontWeight: 400,
                        color: 'text.secondary',
                        minWidth: 0,
                        px: 0.5,
                      }}
                    >
                      Ultimate Guitar
                    </Button>
                    <Button
                      component="a"
                      size="small"
                      variant="text"
                      color="inherit"
                      href={encoreGeniusSearchUrl(
                        resourceTitle,
                        resourceArtist
                      )}
                      target="_blank"
                      rel="noreferrer"
                      endIcon={
                        <OpenInNewIcon sx={{ fontSize: 14, opacity: 0.55 }} />
                      }
                      sx={{
                        textTransform: 'none',
                        fontWeight: 400,
                        color: 'text.secondary',
                        minWidth: 0,
                        px: 0.5,
                      }}
                    >
                      Genius
                    </Button>
                    <Button
                      component="a"
                      size="small"
                      variant="text"
                      color="inherit"
                      href={encoreYouTubeSearchUrl(
                        resourceTitle,
                        resourceArtist
                      )}
                      target="_blank"
                      rel="noreferrer"
                      endIcon={
                        <OpenInNewIcon sx={{ fontSize: 14, opacity: 0.55 }} />
                      }
                      sx={{
                        textTransform: 'none',
                        fontWeight: 400,
                        color: 'text.secondary',
                        minWidth: 0,
                        px: 0.5,
                      }}
                    >
                      YouTube search
                    </Button>
                  </Stack>
                </Stack>
              ) : null}
            </Stack>
          </Box>
        </Box>

        {!isNew ? (
          <Tabs
            value={songTab}
            onChange={(_, v) => setSongTab(v)}
            sx={{
              borderBottom: 1,
              borderColor: encoreHairline,
              mb: 2.5,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
            }}
          >
            <Tab
              label="Practice"
              id="encore-song-tab-practice"
              aria-controls="encore-song-panel-practice"
            />
            <Tab
              label={`Performances (${songPerformances.length})`}
              id="encore-song-tab-performances"
              aria-controls="encore-song-panel-performances"
            />
          </Tabs>
        ) : null}

        <Box
          role="tabpanel"
          id={
            !isNew
              ? songTab === 0
                ? 'encore-song-panel-practice'
                : 'encore-song-panel-performances'
              : undefined
          }
          hidden={!isNew && songTab !== 0}
          sx={{ display: !isNew && songTab !== 0 ? 'none' : 'block' }}
        >
          <Stack spacing={3}>
            <SongMilestoneChecklist
              song={milestoneSong}
              milestoneTemplate={repertoireExtras.milestoneTemplate}
              onChange={onMilestoneSongChange}
              onOpenGlobalMilestoneSettings={() =>
                navigateEncore({ kind: 'repertoireSettings' })
              }
            />

            <SongJournalEditor
              journalLocal={journalLocal}
              committedJournal={committedJournal}
              saving={journalSaving}
              onChangeLocal={setJournalLocal}
              onSave={() => void handleSaveJournal()}
            />

          </Stack>
        </Box>

        {!isNew ? (
          <Box
            role="tabpanel"
            id="encore-song-panel-performances"
            hidden={songTab !== 1}
            sx={{ display: songTab === 1 ? 'block' : 'none', pt: 1 }}
          >
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
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Save this song (add a title — it saves automatically) to log
            performances.
          </Typography>
        )}
      </Box>

      <DriveFilePickerDialog
        open={chartPickerOpen}
        title="Pick a chart"
        folderId={chartsFolderId}
        googleAccessToken={googleAccessToken}
        pickerMimeTypes={ENCORE_DRIVE_CHART_MIME_TYPES}
        onClose={() => setChartPickerOpen(false)}
        onPick={(id, name) => {
          setDraft((d) =>
            d
              ? addSongAttachment(d, {
                  kind: 'chart',
                  driveFileId: id,
                  label: name,
                })
              : d
          );
          setChartPickerOpen(false);
        }}
      />

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
        />
      )}
    </Box>
  );
}
