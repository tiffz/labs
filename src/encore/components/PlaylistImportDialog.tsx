import LibraryMusicOutlinedIcon from '@mui/icons-material/LibraryMusicOutlined';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { collectUniquePlaylistIdsFromMixedPaste } from '../import/collectPlaylistIdsFromText';
import {
  buildPlaylistImportRows,
  diceCoefficient,
  encoreSongFromImportRow,
  mergeSplitPairRows,
  parseYoutubeTitleForSongWithContext,
  splitPairedImportRow,
  type PlaylistImportRow,
  type SplitPairRef,
} from '../import/matchPlaylists';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import {
  buildSpotifyTrackSearchQuery,
  fetchSpotifyPlaylistTracks,
  searchTracks,
  type SpotifyPlaylistTrackRow,
  type SpotifySearchTrack,
} from '../spotify/spotifyApi';
import { encoreAppHref, isModifiedOrNonPrimaryClick } from '../routes/encoreAppHash';
import { encoreLoopbackUrlFromCurrent } from '../spotify/spotifyRedirectUri';
import { readAndClearSpotifyOAuthFlash } from '../spotify/completeOAuthFromUrl';
import { fetchYouTubePlaylistItems, type YouTubePlaylistItemRow } from '../youtube/youtubePlaylistApi';
import type { EncoreSong } from '../types';
import {
  findExistingSongForImport,
  importRowHasLibraryMerge,
  mergeSongWithImport,
  scoreSongSimilarityForImport,
  totalCrossSectionLinksForPlaylistImport,
  crossSectionMovesForPlaylistRow,
} from '../import/findExistingSongForImport';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import { useEncoreBlockingJobs } from '../context/EncoreBlockingJobContext';
import { useEncore } from '../context/EncoreContext';
import { encoreDialogActionsSx, encoreDialogContentSx, encoreDialogTitleSx } from '../theme/encoreUiTokens';
import { EncoreSpotifyConnectionChip } from '../ui/EncoreSpotifyConnectionChip';
import { PlaylistImportSpotifyPicker } from './playlistImport/PlaylistImportSpotifyPicker';
import { encoreImportReviewTableSx } from './encoreImportReviewTableSx';
import { LibrarySongPickerDialog } from './LibrarySongPickerDialog';
import { SpotifyBrandIcon, YouTubeBrandIcon } from './EncoreBrandIcon';

type Step = 'urls' | 'review';

const LIBRARY_MATCH_FILTER_TOOLTIP =
  'Rows match your library when titles and artists are close, or when this row’s Spotify or YouTube id is already on a song. Use Matched / No match to review suggestions. If there is no match, pick a library song or link Spotify (especially for YouTube-only rows) before importing.';

function youtubeThumbUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
}

function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

function spotifyTrackOpenUrl(trackId: string): string {
  return `https://open.spotify.com/track/${encodeURIComponent(trackId)}`;
}

/** Denser primary/secondary lines in import review cells */
const importCellPrimarySx = {
  fontWeight: 600,
  fontSize: '0.8125rem',
  lineHeight: 1.35,
  wordBreak: 'break-word' as const,
};

const importCellSecondarySx = {
  fontSize: '0.75rem',
  lineHeight: 1.3,
  color: 'text.secondary',
  mt: 0.25,
};

function PlaylistImportCrossSectionChip(props: {
  crossMoves: number;
  skipRow: boolean;
  importPlacement: 'reference' | 'backing';
}): ReactElement | null {
  const { crossMoves, skipRow, importPlacement } = props;
  if (crossMoves <= 0 || skipRow) return null;
  const title =
    importPlacement === 'backing'
      ? 'This Spotify or YouTube link is already under Reference recordings. It will move to Backing tracks when you import.'
      : 'This Spotify or YouTube link is already under Backing tracks. It will move to Reference recordings when you import.';
  const label =
    importPlacement === 'backing'
      ? crossMoves > 1
        ? `Also in reference (${crossMoves})`
        : 'Also in reference'
      : crossMoves > 1
        ? `Also in backing (${crossMoves})`
        : 'Also in backing';
  return (
    <Tooltip title={title}>
      <Chip
        size="small"
        color="warning"
        variant="outlined"
        icon={<LinkIcon sx={{ fontSize: 16 }} />}
        label={label}
        sx={{
          height: 24,
          maxWidth: '100%',
          '& .MuiChip-icon': { ml: 0.5 },
          '& .MuiChip-label': {
            px: 0.75,
            fontSize: '0.7rem',
            fontWeight: 600,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        }}
      />
    </Tooltip>
  );
}

/** True if another import row already uses this YouTube video (paired or selected). */
function isYoutubeVideoUsedOnOtherRow(rows: PlaylistImportRow[], videoId: string, excludeRowId: string): boolean {
  return rows.some((r) => {
    if (r.id === excludeRowId) return false;
    if (r.kind === 'paired' && r.youtube?.videoId === videoId) return true;
    if (r.youtubeVideoId === videoId) return true;
    return false;
  });
}

/** Sort key: orphan youtube_only rows in this import first, then videos not tied to other rows, then the rest. */
function youtubePickerScore(rows: PlaylistImportRow[], pickerRowId: string, y: YouTubePlaylistItemRow): number {
  let score = 0;
  const fromOrphanYoutubeRow = rows.some(
    (r) => r.id !== pickerRowId && r.kind === 'youtube_only' && r.youtubeVideoId === y.videoId,
  );
  if (fromOrphanYoutubeRow) score += 100;
  if (!isYoutubeVideoUsedOnOtherRow(rows, y.videoId, pickerRowId)) score += 10;
  return score;
}

function sortYoutubePickerPool(
  rows: PlaylistImportRow[],
  pickerRowId: string,
  pool: YouTubePlaylistItemRow[],
): YouTubePlaylistItemRow[] {
  return [...pool].sort((a, b) => {
    const sa = youtubePickerScore(rows, pickerRowId, a);
    const sb = youtubePickerScore(rows, pickerRowId, b);
    if (sb !== sa) return sb - sa;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });
}

// `splitPairedImportRow` and `mergeSplitPairRows` live in `../import/matchPlaylists.ts`
// so they can be unit-tested independently of the dialog UI.

type PairingBandProps = {
  paired: boolean;
  label: string;
  onToggle: () => void;
  pairTooltip: string;
  unpairTooltip: string;
};

function PairingBand(props: PairingBandProps): ReactElement {
  const theme = useTheme();
  const { paired, label, onToggle, pairTooltip, unpairTooltip } = props;
  const success = theme.palette.success.main;
  const muted = theme.palette.text.secondary;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        borderRadius: 1.5,
        px: 0.75,
        py: 0.2,
        maxWidth: '100%',
        border: '1px solid',
        borderColor: paired ? alpha(success, 0.35) : alpha(theme.palette.divider, 0.85),
        bgcolor: paired ? alpha(success, 0.08) : alpha(theme.palette.action.hover, 0.45),
      }}
    >
      <Typography
        variant="caption"
        component="span"
        sx={{
          fontWeight: 700,
          letterSpacing: '0.02em',
          fontSize: '0.68rem',
          lineHeight: 1.3,
          minWidth: 0,
          color: paired ? success : muted,
        }}
        noWrap
      >
        {label}
      </Typography>
      <Tooltip title={paired ? unpairTooltip : pairTooltip}>
        <span>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-label={paired ? unpairTooltip : pairTooltip}
            sx={{
              p: 0.25,
              color: paired ? success : 'action.active',
              '&:hover': { bgcolor: paired ? alpha(success, 0.1) : 'action.selected' },
            }}
          >
            {paired ? <LinkOffIcon sx={{ fontSize: 16 }} /> : <LinkIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

type PairingEmptyNudgeProps = {
  icon: ReactElement;
  title: string;
  hint: string;
  swapLabel: string;
  onPickClick: () => void;
};

function PairingEmptyNudge(props: PairingEmptyNudgeProps): ReactElement {
  const { icon, title, hint, swapLabel, onPickClick } = props;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        width: '100%',
        minWidth: 0,
        py: 0.65,
        px: 1,
        borderRadius: 1.5,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
      }}
    >
      <Box sx={{ color: 'primary.main', opacity: 0.85, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</Box>
      <ButtonBase
        component="div"
        onClick={() => onPickClick()}
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'block',
          textAlign: 'left',
          borderRadius: 1,
          px: 0.5,
          py: 0.25,
          alignSelf: 'stretch',
          justifyContent: 'flex-start',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        aria-label={`${swapLabel}. ${title}`}
      >
        <Typography variant="caption" fontWeight={700} display="block" sx={{ lineHeight: 1.4 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25, lineHeight: 1.45 }}>
          {hint}
        </Typography>
      </ButtonBase>
      <Tooltip title={swapLabel}>
        <IconButton
          size="small"
          color="primary"
          aria-label={swapLabel}
          onClick={() => onPickClick()}
          sx={{ flexShrink: 0 }}
        >
          <SwapHorizIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export function PlaylistImportDialog(props: {
  open: boolean;
  onClose: () => void;
  googleAccessToken: string | null;
  /** From Encore context; avoids showing "Connect Spotify" when the user is already linked. */
  spotifyLinked: boolean;
  /** Current library for merge/dedupe on import. */
  existingSongs: EncoreSong[];
  onSaveSong: (song: EncoreSong) => Promise<void>;
  /** Reference imports add to reference recordings; backing imports add to backing tracks. */
  importPlacement?: 'reference' | 'backing';
}): ReactElement {
  const {
    open,
    onClose,
    googleAccessToken,
    spotifyLinked,
    existingSongs,
    onSaveSong,
    importPlacement: importPlacementProp,
  } = props;
  const importPlacement = importPlacementProp ?? 'reference';
  const { spotifyConnectError, clearSpotifyConnectError } = useEncore();
  const { withBlockingJob } = useEncoreBlockingJobs();
  const { withBatch } = useLabsUndo();
  const clientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';

  const [step, setStep] = useState<Step>('urls');
  const [playlistPaste, setPlaylistPaste] = useState('');
  const [msg, setMsgState] = useState<string | null>(null);
  const [msgLoopbackUrl, setMsgLoopbackUrl] = useState<string | null>(null);

  const setMsg = useCallback((text: string | null, opts?: { loopbackUrl?: string | null }) => {
    setMsgState(text);
    setMsgLoopbackUrl(opts && 'loopbackUrl' in opts ? opts.loopbackUrl ?? null : null);
  }, []);
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [youtubeItems, setYoutubeItems] = useState<YouTubePlaylistItemRow[] | null>(null);
  const [rows, setRows] = useState<PlaylistImportRow[]>([]);
  const [spotifyPickerRowId, setSpotifyPickerRowId] = useState<string | null>(null);
  const [spotifyPickQuery, setSpotifyPickQuery] = useState('');
  const [spotifyPickResults, setSpotifyPickResults] = useState<SpotifySearchTrack[]>([]);
  const [spotifyPickLoading, setSpotifyPickLoading] = useState(false);
  const [spotifyPickError, setSpotifyPickError] = useState<string | null>(null);
  const [libraryPickerRowId, setLibraryPickerRowId] = useState<string | null>(null);
  const [libraryPickQuery, setLibraryPickQuery] = useState('');
  const [videoPickerRowId, setVideoPickerRowId] = useState<string | null>(null);
  const [videoPickQuery, setVideoPickQuery] = useState('');
  const [ytPairFilter, setYtPairFilter] = useState<'all' | 'paired' | 'unpaired'>('all');
  const [libraryMatchFilter, setLibraryMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [crossSectionPrompt, setCrossSectionPrompt] = useState<{
    fromReference: number;
    fromBacking: number;
  } | null>(null);
  const [crossSectionBannerDismissed, setCrossSectionBannerDismissed] = useState(false);
  const allowCrossSectionMovesRef = useRef(false);

  const youtubeOptions = useMemo(() => youtubeItems ?? [], [youtubeItems]);
  const loopbackHref = useMemo(() => encoreLoopbackUrlFromCurrent(), []);

  useEffect(() => {
    if (!open) {
      allowCrossSectionMovesRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || step !== 'urls') return;
    const flash = readAndClearSpotifyOAuthFlash();
    if (flash) setMsg(flash.message, flash.loopbackUrl != null ? { loopbackUrl: flash.loopbackUrl } : undefined);
  }, [open, step, setMsg]);

  const reset = useCallback(() => {
    setStep('urls');
    setPlaylistPaste('');
    setMsg(null);
    setLoadWarnings([]);
    setBusy(false);
    setYoutubeItems(null);
    setRows([]);
    setYtPairFilter('all');
    setLibraryMatchFilter('all');
    setSpotifyPickerRowId(null);
    setSpotifyPickQuery('');
    setSpotifyPickResults([]);
    setSpotifyPickLoading(false);
    setSpotifyPickError(null);
    setVideoPickerRowId(null);
    setVideoPickQuery('');
    setCrossSectionPrompt(null);
    setCrossSectionBannerDismissed(false);
  }, [setMsg]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const load = useCallback(async () => {
    setMsg(null);
    setLoadWarnings([]);
    const { spotifyIds: spIds, youtubeIds: ytIds } = collectUniquePlaylistIdsFromMixedPaste(playlistPaste);
    if (!spIds.length && !ytIds.length) {
      setMsg('Paste at least one Spotify or YouTube playlist URL or id (one per line or comma-separated).');
      return;
    }
    if (spIds.length && !clientId) {
      setMsg('Spotify playlist import needs VITE_SPOTIFY_CLIENT_ID in your env.');
      return;
    }
    if (ytIds.length && !googleAccessToken) {
      setMsg('YouTube import needs Google sign-in (YouTube readonly scope).');
      return;
    }
    setBusy(true);
    try {
      if (spIds.length) {
        const token = await ensureSpotifyAccessToken(clientId);
        if (!token) {
          setMsg(
            spotifyLinked
              ? 'Spotify could not refresh your session. Use "Sign in to Spotify again" below, then try Load playlists.'
              : 'Tap Connect Spotify below, finish sign-in, then tap Load playlists again.',
          );
          return;
        }
      }

      await withBlockingJob('Loading playlists…', async (setProgress) => {
        const fetchTotal = spIds.length + ytIds.length;
        let fetchDone = 0;
        const bump = () => {
          fetchDone += 1;
          setProgress(fetchTotal ? fetchDone / fetchTotal : null);
        };

        const warnings: string[] = [];
        const mergedSp: SpotifyPlaylistTrackRow[] = [];
        const seenTrack = new Set<string>();
        for (const id of spIds) {
          try {
            const chunk = await fetchSpotifyPlaylistTracks(clientId, id);
            for (const row of chunk) {
              if (seenTrack.has(row.trackId)) continue;
              seenTrack.add(row.trackId);
              mergedSp.push(row);
            }
          } catch (e) {
            warnings.push(`Spotify playlist ${id}: ${e instanceof Error ? e.message : String(e)}`);
          }
          bump();
        }

        const mergedYt: YouTubePlaylistItemRow[] = [];
        const seenVideo = new Set<string>();
        if (googleAccessToken) {
          for (const id of ytIds) {
            try {
              const chunk = await fetchYouTubePlaylistItems(googleAccessToken, id);
              for (const row of chunk) {
                if (seenVideo.has(row.videoId)) continue;
                seenVideo.add(row.videoId);
                mergedYt.push(row);
              }
            } catch (e) {
              warnings.push(`YouTube playlist ${id}: ${e instanceof Error ? e.message : String(e)}`);
            }
            bump();
          }
        }

        const sp = mergedSp.length ? mergedSp : null;
        const yt = mergedYt.length ? mergedYt : null;
        setYoutubeItems(yt);
        const built = buildPlaylistImportRows(sp, yt);
        setRows(built);
        setYtPairFilter('all');
        setLibraryMatchFilter('all');
        setCrossSectionBannerDismissed(false);
        if (!built.length) {
          setMsg(
            warnings.length
              ? 'No tracks or videos could be loaded. Fix the errors below or check your playlists.'
              : 'No tracks or videos found in those playlists.',
          );
          if (warnings.length) setLoadWarnings(warnings);
          return;
        }
        if (warnings.length) setLoadWarnings(warnings);
        setStep('review');
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [clientId, googleAccessToken, playlistPaste, spotifyLinked, setMsg, withBlockingJob]);

  const pickYoutubeForRow = useCallback((rowId: string, videoId: string | null, pool: YouTubePlaylistItemRow[]) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        if (!videoId) return { ...r, youtubeVideoId: null, youtube: undefined, spotifyEnrichment: undefined };
        const item = pool.find((y) => y.videoId === videoId);
        const videoChanged = videoId !== r.youtubeVideoId;
        return {
          ...r,
          youtubeVideoId: videoId,
          youtube: item ?? r.youtube,
          ...(videoChanged
            ? {
                spotifyEnrichment: undefined,
                linkedLibrarySongId: undefined,
                ignoreAutoMatch: undefined,
              }
            : {}),
        };
      }),
    );
  }, []);

  const openSpotifyPicker = useCallback((row: PlaylistImportRow) => {
    if (!row.youtube) return;
    const parsed = parseYoutubeTitleForSongWithContext(row.youtube.title, { description: row.youtube.description });
    const q = buildSpotifyTrackSearchQuery({
      songTitle: parsed.songTitle.trim() || row.youtube.title,
      artistHint: parsed.artist?.trim() || undefined,
      channelTitle: row.youtube.channelTitle,
    });
    setSpotifyPickerRowId(row.id);
    setSpotifyPickQuery(q);
    setSpotifyPickResults([]);
    setSpotifyPickLoading(false);
    setSpotifyPickError(null);
  }, []);

  const runSpotifyPickSearch = useCallback(async () => {
    if (!spotifyPickerRowId || !clientId) return;
    const token = await ensureSpotifyAccessToken(clientId);
    if (!token) {
      setSpotifyPickError(
        spotifyLinked
          ? 'Spotify could not refresh your session. Use "Sign in to Spotify again" on the first import step, then try search again.'
          : 'Connect Spotify to search.',
      );
      return;
    }
    const q = spotifyPickQuery.trim();
    if (!q) return;
    setSpotifyPickError(null);
    setSpotifyPickLoading(true);
    try {
      const tracks = await searchTracks(token, q, 10);
      setSpotifyPickResults(tracks);
    } catch (e) {
      setSpotifyPickResults([]);
      setSpotifyPickError(e instanceof Error ? e.message : String(e));
    } finally {
      setSpotifyPickLoading(false);
    }
  }, [spotifyPickerRowId, spotifyPickQuery, clientId, spotifyLinked]);

  const applySpotifyEnrichment = useCallback((rowId: string, track: SpotifySearchTrack) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              spotifyEnrichment: {
                spotifyTrackId: track.id,
                title: track.name,
                artist: track.artists.map((a) => a.name).join(', '),
                albumArtUrl: track.album.images?.[0]?.url,
              },
              linkedLibrarySongId: undefined,
              ignoreAutoMatch: undefined,
            }
          : r,
      ),
    );
    setSpotifyPickerRowId(null);
    setSpotifyPickQuery('');
    setSpotifyPickResults([]);
    setSpotifyPickError(null);
  }, []);

  const applySpotifyFromPlaylistTrack = useCallback((rowId: string, sp: SpotifyPlaylistTrackRow) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              spotifyEnrichment: {
                spotifyTrackId: sp.trackId,
                title: sp.title,
                artist: sp.artist,
                albumArtUrl: sp.albumArtUrl,
              },
              linkedLibrarySongId: undefined,
              ignoreAutoMatch: undefined,
            }
          : r,
      ),
    );
    setSpotifyPickerRowId(null);
    setSpotifyPickQuery('');
    setSpotifyPickResults([]);
    setSpotifyPickError(null);
  }, []);

  const clearSpotifyEnrichment = useCallback((rowId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, spotifyEnrichment: undefined, linkedLibrarySongId: undefined, ignoreAutoMatch: undefined } : r,
      ),
    );
  }, []);

  const dissolvePairing = useCallback((rowId: string) => {
    setRows((prev) => {
      const i = prev.findIndex((r) => r.id === rowId);
      if (i < 0) return prev;
      const row = prev[i]!;
      if (row.kind !== 'paired') return prev;
      const pair = splitPairedImportRow(row);
      return [...prev.slice(0, i), ...pair, ...prev.slice(i + 1)];
    });
  }, []);

  const repairSplitPairing = useCallback((ref: SplitPairRef) => {
    setRows((prev) => mergeSplitPairRows(prev, ref));
  }, []);

  const applyImport = useCallback(async () => {
    const cross = totalCrossSectionLinksForPlaylistImport(rows, existingSongs, importPlacement);
    if (
      (cross.fromReference > 0 || cross.fromBacking > 0) &&
      !allowCrossSectionMovesRef.current
    ) {
      setCrossSectionPrompt(cross);
      return;
    }
    allowCrossSectionMovesRef.current = false;
    setCrossSectionPrompt(null);
    setBusy(true);
    setMsg(null);
    try {
      const toProcess = rows.filter((r) => !r.skipRow);
      const importTotal = toProcess.length;
      let importDone = 0;
      await withBlockingJob('Importing songs…', async (setProgress) => {
        await withBatch(async () => {
          const librarySnapshot = [...existingSongs];
          for (const r of toProcess) {
            const song = encoreSongFromImportRow(r, importPlacement);
            if (!song) {
              importDone += 1;
              setProgress(importTotal ? importDone / importTotal : null);
              continue;
            }
            const manual =
              r.linkedLibrarySongId != null
                ? (librarySnapshot.find((s) => s.id === r.linkedLibrarySongId) ??
                    existingSongs.find((s) => s.id === r.linkedLibrarySongId) ??
                    null)
                : null;
            const auto =
              manual == null && !r.ignoreAutoMatch
                ? findExistingSongForImport(librarySnapshot, song)
                : null;
            const match = manual ?? auto;
            const toSave = match
              ? mergeSongWithImport(match, song, { placement: importPlacement })
              : song;
            await onSaveSong(toSave);
            if (!match) librarySnapshot.push(toSave);
            else {
              const i = librarySnapshot.findIndex((s) => s.id === match.id);
              if (i >= 0) librarySnapshot[i] = toSave;
            }
            importDone += 1;
            setProgress(importTotal ? importDone / importTotal : null);
          }
        });
        reset();
        onClose();
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [
    rows,
    onSaveSong,
    onClose,
    reset,
    setMsg,
    existingSongs,
    importPlacement,
    withBlockingJob,
    withBatch,
  ]);

  const showYoutubeColumns = youtubeOptions.length > 0;
  /** True when at least one row came from a Spotify playlist (paired or Spotify-only). YouTube-only imports omit the Spotify column. */
  const importIncludesSpotifyFromPlaylists = useMemo(() => rows.some((r) => r.spotify != null), [rows]);
  const hideSpotifyColumn = showYoutubeColumns && !importIncludesSpotifyFromPlaylists;
  const reviewFullscreen = step === 'review';
  const importActiveCount = useMemo(() => rows.filter((r) => !r.skipRow).length, [rows]);

  const ytPairedCount = useMemo(() => rows.filter((r) => r.kind === 'paired').length, [rows]);
  const ytUnpairedCount = useMemo(() => rows.filter((r) => r.kind !== 'paired').length, [rows]);

  const libraryMatchByRowId = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const r of rows) {
      m.set(r.id, importRowHasLibraryMerge(r, existingSongs, importPlacement));
    }
    return m;
  }, [rows, existingSongs, importPlacement]);

  const libraryReviewStats = useMemo(() => {
    let matchedAll = 0;
    let matchedIncluded = 0;
    let included = 0;
    for (const r of rows) {
      const ok = libraryMatchByRowId.get(r.id) === true;
      if (ok) matchedAll += 1;
      if (!r.skipRow) {
        included += 1;
        if (ok) matchedIncluded += 1;
      }
    }
    return {
      matchedAll,
      unmatchedAll: rows.length - matchedAll,
      matchedIncluded,
      unmatchedIncluded: included - matchedIncluded,
      included,
    };
  }, [rows, libraryMatchByRowId]);

  const crossSectionMovesByRowId = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      m.set(r.id, crossSectionMovesForPlaylistRow(r, existingSongs, importPlacement));
    }
    return m;
  }, [rows, existingSongs, importPlacement]);

  const crossSectionIncludedCount = useMemo(() => {
    let n = 0;
    for (const r of rows) {
      if (r.skipRow) continue;
      if ((crossSectionMovesByRowId.get(r.id) ?? 0) > 0) n += 1;
    }
    return n;
  }, [rows, crossSectionMovesByRowId]);

  const displayRows = useMemo(() => {
    let list = rows;
    if (showYoutubeColumns && importIncludesSpotifyFromPlaylists && ytPairFilter !== 'all') {
      list = ytPairFilter === 'paired' ? list.filter((r) => r.kind === 'paired') : list.filter((r) => r.kind !== 'paired');
    }
    if (libraryMatchFilter === 'matched') {
      list = list.filter((r) => libraryMatchByRowId.get(r.id));
    } else if (libraryMatchFilter === 'unmatched') {
      list = list.filter((r) => !libraryMatchByRowId.get(r.id));
    }
    return list;
  }, [rows, ytPairFilter, showYoutubeColumns, importIncludesSpotifyFromPlaylists, libraryMatchFilter, libraryMatchByRowId]);

  const libraryPickerRow = useMemo(
    () => (libraryPickerRowId ? (rows.find((r) => r.id === libraryPickerRowId) ?? null) : null),
    [libraryPickerRowId, rows],
  );
  const libraryPickerIncoming = useMemo(
    () => (libraryPickerRow ? encoreSongFromImportRow(libraryPickerRow, importPlacement) : null),
    [libraryPickerRow, importPlacement],
  );

  const videoPickerSortedPool = useMemo(() => {
    if (!videoPickerRowId) return youtubeOptions;
    return sortYoutubePickerPool(rows, videoPickerRowId, youtubeOptions);
  }, [videoPickerRowId, rows, youtubeOptions]);

  const videoPickerFiltered = useMemo(() => {
    const q = videoPickQuery.trim().toLowerCase();
    if (!q) return videoPickerSortedPool;
    return videoPickerSortedPool.filter(
      (y) =>
        y.title.toLowerCase().includes(q) ||
        y.channelTitle.toLowerCase().includes(q) ||
        y.videoId.toLowerCase().includes(q),
    );
  }, [videoPickerSortedPool, videoPickQuery]);

  /** Spotify-only rows in this import with no video yet (always listed in the picker; not filtered by search). */
  const spotifyPickerImportTracks = useMemo(() => {
    if (!spotifyPickerRowId) return [] as SpotifyPlaylistTrackRow[];
    const rid = spotifyPickerRowId;
    const seen = new Set<string>();
    const out: SpotifyPlaylistTrackRow[] = [];
    for (const r of rows) {
      if (r.id === rid) continue;
      if (r.kind !== 'spotify_only' || !r.spotify) continue;
      if (r.youtubeVideoId) continue;
      const tid = r.spotify.trackId;
      if (seen.has(tid)) continue;
      if (rows.some((row) => row.id !== rid && row.kind === 'paired' && row.spotify?.trackId === tid)) continue;
      seen.add(tid);
      out.push(r.spotify);
    }
    const q = spotifyPickQuery.trim().toLowerCase();
    out.sort((a, b) => {
      if (q) {
        const hit = (sp: SpotifyPlaylistTrackRow) =>
          sp.title.toLowerCase().includes(q) ||
          sp.artist.toLowerCase().includes(q) ||
          sp.trackId.toLowerCase().includes(q);
        const ha = hit(a);
        const hb = hit(b);
        if (ha !== hb) return hb ? 1 : -1;
      }
      const ta = `${a.title} ${a.artist}`.toLowerCase();
      const tb = `${b.title} ${b.artist}`.toLowerCase();
      return ta.localeCompare(tb, undefined, { sensitivity: 'base' });
    });
    return out;
  }, [spotifyPickerRowId, rows, spotifyPickQuery]);

  const spotifyPickResultsSorted = useMemo(() => {
    if (!spotifyPickResults.length || !spotifyPickerRowId) return [];
    const prefer = new Set(
      rows
        .filter((r) => r.id !== spotifyPickerRowId && r.kind === 'spotify_only' && r.spotify && !r.youtubeVideoId)
        .map((r) => r.spotify!.trackId),
    );
    const pickerRow = rows.find((r) => r.id === spotifyPickerRowId);
    const yt = pickerRow?.youtube;
    const rankLabel =
      yt != null
        ? (() => {
            const p = parseYoutubeTitleForSongWithContext(yt.title, { description: yt.description });
            return `${p.songTitle} ${p.artist || yt.channelTitle}`.trim();
          })()
        : '';
    return [...spotifyPickResults].sort((a, b) => {
      const pa = prefer.has(a.id) ? 1 : 0;
      const pb = prefer.has(b.id) ? 1 : 0;
      if (pb !== pa) return pb - pa;
      if (rankLabel.length > 2) {
        const la = `${a.name} ${a.artists.map((x) => x.name).join(' ')}`;
        const lb = `${b.name} ${b.artists.map((x) => x.name).join(' ')}`;
        const da = diceCoefficient(rankLabel, la);
        const db = diceCoefficient(rankLabel, lb);
        if (Math.abs(da - db) > 0.004) return db - da;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }, [spotifyPickResults, spotifyPickerRowId, rows]);

  useEffect(() => {
    if (libraryPickerRowId) setLibraryPickQuery('');
  }, [libraryPickerRowId]);

  useEffect(() => {
    if (videoPickerRowId) setVideoPickQuery('');
  }, [videoPickerRowId]);

  useEffect(() => {
    if (step !== 'review') {
      setVideoPickerRowId(null);
      setVideoPickQuery('');
      setSpotifyPickerRowId(null);
      setSpotifyPickQuery('');
      setSpotifyPickResults([]);
      setSpotifyPickLoading(false);
      setSpotifyPickError(null);
    }
  }, [step]);

  const closeLibraryPicker = useCallback(() => {
    setLibraryPickerRowId(null);
    setLibraryPickQuery('');
  }, []);

  const closeVideoPicker = useCallback(() => {
    setVideoPickerRowId(null);
    setVideoPickQuery('');
  }, []);

  const closeSpotifyPicker = useCallback(() => {
    setSpotifyPickerRowId(null);
    setSpotifyPickQuery('');
    setSpotifyPickResults([]);
    setSpotifyPickLoading(false);
    setSpotifyPickError(null);
  }, []);

  return (
    <>
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={reviewFullscreen}
      fullWidth={!reviewFullscreen}
      maxWidth={reviewFullscreen ? false : 'lg'}
      scroll="paper"
      aria-labelledby="playlist-import-title"
      slotProps={{
        paper: {
          sx: reviewFullscreen
            ? { m: 0, maxHeight: 'none', height: '100%', display: 'flex', flexDirection: 'column' }
            : {
                m: { xs: 2, md: 2 },
                maxHeight: { xs: 'calc(100% - 32px)', md: 'min(90vh, 960px)' },
                alignSelf: { md: 'flex-start' },
              },
        },
      }}
    >
      <DialogTitle id="playlist-import-title" sx={{ ...encoreDialogTitleSx, flexShrink: 0 }}>
        {reviewFullscreen
          ? importPlacement === 'backing'
            ? 'Review backing import'
            : 'Review import'
          : importPlacement === 'backing'
            ? 'Import backing from playlists'
            : 'Import playlists'}
      </DialogTitle>
      <DialogContent
        sx={
          reviewFullscreen
            ? {
                ...encoreDialogContentSx,
                flex: '1 1 auto',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                pt: 2,
                pb: 1,
                px: { xs: 2, sm: 3 },
              }
            : { ...encoreDialogContentSx, px: { xs: 2.5, sm: 3 } }
        }
      >
        {step === 'urls' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary" component="div" sx={{ lineHeight: 1.55 }}>
              Paste{' '}
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.22em',
                  verticalAlign: 'middle',
                  marginInline: '0.06em',
                }}
              >
                <SpotifyBrandIcon
                  sx={{
                    fontSize: '1.15em',
                    flexShrink: 0,
                    position: 'relative',
                    top: '0.08em',
                  }}
                  aria-hidden
                />
                Spotify
              </Box>{' '}
              or{' '}
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.22em',
                  verticalAlign: 'middle',
                  marginInline: '0.06em',
                }}
              >
                <YouTubeBrandIcon
                  sx={{
                    fontSize: '1.15em',
                    flexShrink: 0,
                    position: 'relative',
                    top: '0.08em',
                  }}
                  aria-hidden
                />
                YouTube
              </Box>{' '}
              playlist links or ids (one per line or comma-separated). Encore picks the platform from each URL. When
              both sides have tracks, we suggest title matches; you can adjust pairings before saving.
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: -0.5 }}>
              {importPlacement === 'backing'
                ? 'Saving adds Spotify and YouTube rows to backing tracks. If the same id already lives under reference recordings, Encore will ask before moving it.'
                : 'Saving adds Spotify and YouTube rows to reference recordings. If the same id is only on backing tracks, Encore will ask before moving it.'}
            </Typography>
            <TextField
              label="Playlist URLs or ids"
              value={playlistPaste}
              onChange={(e) => setPlaylistPaste(e.target.value)}
              fullWidth
              multiline
              minRows={5}
              placeholder={
                'https://open.spotify.com/playlist/…\nhttps://www.youtube.com/playlist?list=…\nhttps://open.spotify.com/playlist/…'
              }
              helperText="Mix Spotify and YouTube in any order. Duplicate tracks or videos across lists are merged once. Bare 22-character ids are treated as Spotify."
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: -0.5 }}>
              New here? Read the{' '}
              <Link
                href={encoreAppHref({ kind: 'help' })}
                sx={{ fontSize: 'inherit', verticalAlign: 'baseline' }}
                onClick={(e) => {
                  if (!isModifiedOrNonPrimaryClick(e)) onClose();
                }}
              >
                import guide
              </Link>{' '}
              for suggested playlist order and bulk file naming.
            </Typography>
            {clientId ? (
              <EncoreSpotifyConnectionChip
                onBeforeOAuth={clearSpotifyConnectError}
                description={
                  spotifyLinked
                    ? 'Spotify is connected. Paste playlist URLs to load them, including private lists in your account.'
                    : 'Connect Spotify from the chip menu to load playlists from URLs, including private lists in your account.'
                }
              />
            ) : null}
            {loopbackHref ? (
              <Alert severity="warning">
                Spotify needs a loopback redirect host (<code>127.0.0.1</code>), not <code>localhost</code>.{' '}
                <Link href={loopbackHref}>Open this page on 127.0.0.1</Link>
                {' '}
                and register <code>{new URL(loopbackHref).origin}/encore/</code> in your Spotify app redirect URIs.
              </Alert>
            ) : null}
            {!clientId && (
              <Alert severity="info">Spotify import is disabled until VITE_SPOTIFY_CLIENT_ID is set.</Alert>
            )}
            {!googleAccessToken && (
              <Alert severity="info">YouTube import requires Google sign-in with YouTube access.</Alert>
            )}
            {msg && (
              <Alert severity="error">
                <Typography variant="body2" component="span" display="block">
                  {msg}
                </Typography>
                {msgLoopbackUrl ? (
                  <Link href={msgLoopbackUrl} sx={{ mt: 0.75, display: 'inline-block' }}>
                    Open this app on 127.0.0.1
                  </Link>
                ) : null}
              </Alert>
            )}
            {loadWarnings.length > 0 && (
              <Alert severity="warning">
                Per-playlist errors:
                <Box component="ul" sx={{ m: 0, mt: 1, pl: 2 }}>
                  {loadWarnings.map((w, i) => (
                    <li key={`${i}-${w.slice(0, 48)}`}>
                      <Typography variant="body2" component="span">
                        {w}
                      </Typography>
                    </li>
                  ))}
                </Box>
              </Alert>
            )}
          </Box>
        )}
        {step === 'review' && (
          <Box
            sx={{
              flex: reviewFullscreen ? '1 1 auto' : undefined,
              minHeight: reviewFullscreen ? 0 : undefined,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              pt: reviewFullscreen ? 0 : 1,
            }}
          >
            {loadWarnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2, flexShrink: 0 }}>
                Some playlists did not load completely.
                <Box component="ul" sx={{ m: 0, mt: 1, pl: 2, maxHeight: 120, overflow: 'auto' }}>
                  {loadWarnings.map((w, i) => (
                    <li key={`${i}-${w.slice(0, 48)}`}>
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{ wordBreak: 'break-word', display: 'block', maxWidth: '100%' }}
                      >
                        {w.length > 280 ? `${w.slice(0, 280)}…` : w}
                      </Typography>
                    </li>
                  ))}
                </Box>
              </Alert>
            )}
            <Stack spacing={2} sx={{ mb: 2, flexShrink: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, fontSize: '0.8125rem', maxWidth: 640 }}>
                Toggle <strong>Include</strong> on each row you want to import. Use the filters below to focus by pairing or
                library match.
              </Typography>
              {crossSectionIncludedCount > 0 && !crossSectionBannerDismissed ? (
                <Alert
                  severity="info"
                  variant="outlined"
                  onClose={() => setCrossSectionBannerDismissed(true)}
                  sx={{
                    py: 0.65,
                    px: 1.25,
                    alignItems: 'flex-start',
                    '& .MuiAlert-action': { pt: 0.25, alignItems: 'flex-start' },
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                    <strong>{crossSectionIncludedCount}</strong> included row{crossSectionIncludedCount === 1 ? '' : 's'}: the
                    same media is already under <strong>{importPlacement === 'backing' ? 'Reference recordings' : 'Backing tracks'}</strong>{' '}
                    and will move to <strong>{importPlacement === 'backing' ? 'Backing tracks' : 'Reference recordings'}</strong>.
                    You&rsquo;ll confirm when you import.
                  </Typography>
                </Alert>
              ) : null}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 2, sm: 4 }}
                alignItems="flex-start"
                flexWrap="wrap"
                useFlexGap
                sx={{ columnGap: { sm: 5 }, rowGap: 2 }}
              >
                {showYoutubeColumns && importIncludesSpotifyFromPlaylists ? (
                  <Box sx={{ minWidth: { sm: 200 } }}>
                    <Typography
                      variant="overline"
                      sx={{ display: 'block', color: 'text.secondary', letterSpacing: '0.08em', fontWeight: 700, mb: 0.5, lineHeight: 1.2 }}
                    >
                      Spotify ↔ YouTube
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75, lineHeight: 1.45, maxWidth: 280 }}>
                      Paired rows link both sources on one line.
                    </Typography>
                    <ToggleButtonGroup
                      size="small"
                      color="primary"
                      value={ytPairFilter}
                      exclusive
                      onChange={(_, v: 'all' | 'paired' | 'unpaired' | null) => {
                        if (v != null) setYtPairFilter(v);
                      }}
                      aria-label="Filter by Spotify and YouTube pairing"
                    >
                      <ToggleButton value="all">All ({rows.length})</ToggleButton>
                      <ToggleButton value="paired">Paired ({ytPairedCount})</ToggleButton>
                      <ToggleButton value="unpaired">Unpaired ({ytUnpairedCount})</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                ) : null}
                <Box sx={{ minWidth: { sm: 220 } }}>
                  <Stack direction="row" alignItems="center" spacing={0.25} sx={{ mb: 0.75 }}>
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.8125rem', letterSpacing: '0.01em' }}
                    >
                      Songs matching library
                    </Typography>
                    <Tooltip title={LIBRARY_MATCH_FILTER_TOOLTIP}>
                      <IconButton size="small" aria-label="How library matching works" sx={{ p: 0.35, color: 'text.secondary' }}>
                        <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <ToggleButtonGroup
                    size="small"
                    value={libraryMatchFilter}
                    exclusive
                    onChange={(_, v: 'all' | 'matched' | 'unmatched' | null) => {
                      if (v != null) setLibraryMatchFilter(v);
                    }}
                    aria-label="Filter by library match"
                  >
                    <ToggleButton value="all">All ({rows.length})</ToggleButton>
                    <ToggleButton value="matched">Matched ({libraryReviewStats.matchedAll})</ToggleButton>
                    <ToggleButton value="unmatched">No match ({libraryReviewStats.unmatchedAll})</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Stack>
            </Stack>
            {(showYoutubeColumns && importIncludesSpotifyFromPlaylists && ytPairFilter !== 'all') ||
            libraryMatchFilter !== 'all' ? (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, mt: -0.5, display: 'block', flexShrink: 0 }}>
                Showing {displayRows.length} of {rows.length} rows
              </Typography>
            ) : null}
            {spotifyConnectError ? (
              <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={clearSpotifyConnectError}>
                {spotifyConnectError}
              </Alert>
            ) : null}
            {msg && (
              <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
                {msg}
              </Alert>
            )}
            <TableContainer
              sx={{
                flex: reviewFullscreen ? '1 1 auto' : undefined,
                minHeight: reviewFullscreen ? 0 : undefined,
                minWidth: 0,
                maxWidth: '100%',
                overflowX: 'hidden',
                overflowY: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
                mt: 0.5,
              }}
            >
              <Table size="small" stickyHeader sx={encoreImportReviewTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ width: 52, minWidth: 52, maxWidth: 56 }}>
                      Include
                    </TableCell>
                    <TableCell sx={{ width: '5%', minWidth: 44, maxWidth: 56 }}>Art</TableCell>
                    {!hideSpotifyColumn ? (
                      <TableCell sx={{ width: showYoutubeColumns ? '20%' : '28%', minWidth: 0 }}>Spotify</TableCell>
                    ) : null}
                    {showYoutubeColumns ? (
                      <TableCell sx={{ width: hideSpotifyColumn ? '40%' : '30%', minWidth: 0 }}>
                        YouTube
                      </TableCell>
                    ) : null}
                    <TableCell sx={{ width: hideSpotifyColumn ? '50%' : showYoutubeColumns ? '38%' : '58%', minWidth: 0 }}>
                      Library
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayRows.map((r) => {
                    const incoming = encoreSongFromImportRow(r, importPlacement);
                    const autoMatch = incoming ? findExistingSongForImport(existingSongs, incoming) : null;
                    const manualLib =
                      r.linkedLibrarySongId != null
                        ? (existingSongs.find((s) => s.id === r.linkedLibrarySongId) ?? null)
                        : null;
                    const matchPct =
                      incoming && autoMatch && !manualLib && !r.ignoreAutoMatch
                        ? Math.round(scoreSongSimilarityForImport(autoMatch, incoming) * 100)
                        : null;
                    const crossMoves = crossSectionMovesByRowId.get(r.id) ?? 0;
                    const artUrl =
                      r.spotify?.albumArtUrl ??
                      r.spotifyEnrichment?.albumArtUrl ??
                      (r.youtubeVideoId ? youtubeThumbUrl(r.youtubeVideoId) : undefined);
                    const cell = { minWidth: 0 as const };
                    const rowLibraryMatched = libraryMatchByRowId.get(r.id) === true;
                    return (
                      <TableRow
                        key={r.id}
                        hover
                        sx={(theme) => ({
                          opacity: r.skipRow ? 0.5 : 1,
                          ...(!rowLibraryMatched && !r.skipRow
                            ? { boxShadow: `inset 3px 0 0 ${alpha(theme.palette.primary.main, 0.42)}` }
                            : {}),
                          ...(rowLibraryMatched && crossMoves > 0 && !r.skipRow
                            ? { bgcolor: alpha(theme.palette.warning.main, 0.04) }
                            : {}),
                        })}
                      >
                        <TableCell padding="checkbox" sx={{ verticalAlign: 'middle', py: 0.5 }}>
                          <Tooltip title="Include this row when you import">
                            <Checkbox
                              size="small"
                              checked={!r.skipRow}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((row) =>
                                    row.id === r.id ? { ...row, skipRow: e.target.checked ? undefined : true } : row,
                                  ),
                                )
                              }
                              inputProps={{
                                'aria-label': `Include in import: ${r.spotify?.title ?? r.youtube?.title ?? 'row'}`,
                              }}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={cell}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1,
                              overflow: 'hidden',
                              bgcolor: 'action.hover',
                              flexShrink: 0,
                            }}
                          >
                            {artUrl ? (
                              <Box
                                component="img"
                                src={artUrl}
                                alt=""
                                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                            ) : null}
                          </Box>
                        </TableCell>
                        {!hideSpotifyColumn ? (
                        <TableCell sx={cell}>
                          {r.spotify ? (
                            <Stack direction="row" alignItems="flex-start" spacing={0.5}>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography component="div" sx={importCellPrimarySx}>
                                  {r.spotify.title}
                                </Typography>
                                <Typography component="div" sx={importCellSecondarySx}>
                                  {r.spotify.artist}
                                </Typography>
                              </Box>
                              <Tooltip title="Open in Spotify">
                                <IconButton
                                  component="a"
                                  href={spotifyTrackOpenUrl(r.spotify.trackId)}
                                  target="_blank"
                                  rel="noreferrer"
                                  size="small"
                                  aria-label="Open in Spotify"
                                  sx={{ mt: -0.25, flexShrink: 0 }}
                                >
                                  <OpenInNewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          ) : r.kind === 'youtube_only' && r.youtube ? (
                            <Stack spacing={0.5} alignItems="flex-start">
                              {r.spotifyEnrichment ? (
                                <>
                                  <Stack direction="row" alignItems="flex-start" spacing={0.5} sx={{ width: '100%', minWidth: 0 }}>
                                    <Chip
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                      label={`${r.spotifyEnrichment.title} · ${r.spotifyEnrichment.artist}`}
                                      sx={{
                                        maxWidth: '100%',
                                        height: 'auto',
                                        flex: 1,
                                        minWidth: 0,
                                        '& .MuiChip-label': { whiteSpace: 'normal', py: 0.35, fontSize: '0.75rem', lineHeight: 1.3 },
                                      }}
                                    />
                                    <Tooltip title="Open in Spotify">
                                      <IconButton
                                        component="a"
                                        href={spotifyTrackOpenUrl(r.spotifyEnrichment.spotifyTrackId)}
                                        target="_blank"
                                        rel="noreferrer"
                                        size="small"
                                        aria-label="Open in Spotify"
                                        sx={{ flexShrink: 0, mt: -0.25 }}
                                      >
                                        <OpenInNewIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                  <Button size="small" variant="text" onClick={() => clearSpotifyEnrichment(r.id)} sx={{ textTransform: 'none', py: 0, minHeight: 0 }}>
                                    Clear Spotify
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {rowLibraryMatched ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                                      –
                                    </Typography>
                                  ) : (
                                    <>
                                      {clientId ? (
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          onClick={() => openSpotifyPicker(r)}
                                          disabled={busy}
                                          sx={{ textTransform: 'none', mt: 0.25 }}
                                        >
                                          Link Spotify…
                                        </Button>
                                      ) : (
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                          Spotify search unavailable
                                        </Typography>
                                      )}
                                    </>
                                  )}
                                </>
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              –
                            </Typography>
                          )}
                        </TableCell>
                        ) : null}
                        {showYoutubeColumns ? (
                          <TableCell sx={cell}>
                            {r.youtube ? (
                              <Stack spacing={0.5} alignItems="flex-start">
                                <Stack direction="row" alignItems="flex-start" spacing={0.5} sx={{ width: '100%', minWidth: 0 }}>
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Tooltip title={r.youtube.title}>
                                      <Typography component="div" sx={importCellPrimarySx}>
                                        {r.youtube.title.length > 88 ? `${r.youtube.title.slice(0, 88)}…` : r.youtube.title}
                                      </Typography>
                                    </Tooltip>
                                    <Typography component="div" sx={importCellSecondarySx}>
                                      {r.youtube.channelTitle}
                                    </Typography>
                                  </Box>
                                  {youtubeOptions.length > 0 ? (
                                    <Tooltip title="Pick a different video for this row">
                                      <IconButton
                                        size="small"
                                        aria-label="Pick a different video for this row"
                                        sx={{ mt: -0.25, flexShrink: 0 }}
                                        onClick={() => setVideoPickerRowId(r.id)}
                                      >
                                        <SwapHorizIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  ) : null}
                                  <Tooltip title="Open on YouTube">
                                    <IconButton
                                      component="a"
                                      href={youtubeWatchUrl(r.youtube.videoId)}
                                      target="_blank"
                                      rel="noreferrer"
                                      size="small"
                                      aria-label="Open on YouTube"
                                      sx={{ mt: -0.25, flexShrink: 0 }}
                                    >
                                      <OpenInNewIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                                {(r.kind === 'paired' || r.splitPairRef) ? (
                                  <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center" sx={{ width: '100%' }}>
                                    {r.kind === 'paired' ? (
                                      <PairingBand
                                        paired
                                        label={`Paired · ${Math.round(r.matchScore * 100)}%`}
                                        onToggle={() => dissolvePairing(r.id)}
                                        unpairTooltip="Split Spotify and YouTube into separate rows"
                                        pairTooltip="Relink"
                                      />
                                    ) : r.splitPairRef ? (
                                      <PairingBand
                                        paired={false}
                                        label="Unlinked"
                                        onToggle={() => repairSplitPairing(r.splitPairRef!)}
                                        unpairTooltip=""
                                        pairTooltip="Merge Spotify and YouTube into one row again"
                                      />
                                    ) : null}
                                  </Stack>
                                ) : null}
                                {r.kind === 'youtube_only' ? (
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.35, fontSize: '0.7rem' }}>
                                    {(() => {
                                      const p = parseYoutubeTitleForSongWithContext(r.youtube.title, {
                                        description: r.youtube.description,
                                      });
                                      return `${p.artist ? `${p.artist} · ` : ''}${p.songTitle}`;
                                    })()}
                                  </Typography>
                                ) : null}
                              </Stack>
                            ) : r.spotify || r.kind === 'youtube_only' ? (
                              <Stack spacing={0.5} alignItems="flex-start">
                                {r.splitPairRef ? (
                                  <PairingBand
                                    paired={false}
                                    label="Unlinked"
                                    onToggle={() => {
                                      const ref = r.splitPairRef;
                                      if (ref) repairSplitPairing(ref);
                                    }}
                                    unpairTooltip=""
                                    pairTooltip="Merge Spotify and YouTube into one row again"
                                  />
                                ) : null}
                                {!r.youtubeVideoId && youtubeOptions.length > 0 ? (
                                  <PairingEmptyNudge
                                    icon={<VideoLibraryOutlinedIcon fontSize="small" />}
                                    title="No video paired"
                                    hint="Tap to pick a video."
                                    swapLabel="Choose video"
                                    onPickClick={() => setVideoPickerRowId(r.id)}
                                  />
                                ) : r.youtubeVideoId && youtubeOptions.length > 0 ? (
                                  <Tooltip title="Change paired video">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      aria-label="Change paired video"
                                      onClick={() => setVideoPickerRowId(r.id)}
                                    >
                                      <SwapHorizIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                ) : null}
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                –
                              </Typography>
                            )}
                          </TableCell>
                        ) : null}
                        <TableCell sx={cell}>
                          <Stack spacing={0.75} alignItems="flex-start" sx={{ width: '100%' }}>
                            {manualLib ? (
                              <>
                                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
                                  <Avatar
                                    src={manualLib.albumArtUrl}
                                    variant="rounded"
                                    alt=""
                                    sx={{ width: 40, height: 40, flexShrink: 0 }}
                                  />
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography component="div" sx={importCellPrimarySx} noWrap title={manualLib.title}>
                                      {manualLib.title}
                                    </Typography>
                                    <Typography component="div" sx={importCellSecondarySx} noWrap title={manualLib.artist}>
                                      {manualLib.artist}
                                    </Typography>
                                  </Box>
                                  <Tooltip title="Switch library match">
                                    <IconButton size="small" aria-label="Switch library match" onClick={() => setLibraryPickerRowId(r.id)}>
                                      <SwapHorizIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                                <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center" sx={{ width: '100%' }}>
                                  <PairingBand
                                    paired
                                    label="Paired · library"
                                    onToggle={() =>
                                      setRows((prev) =>
                                        prev.map((row) =>
                                          row.id === r.id
                                            ? { ...row, linkedLibrarySongId: undefined, ignoreAutoMatch: undefined }
                                            : row,
                                        ),
                                      )
                                    }
                                    unpairTooltip="Unlink this library pick"
                                    pairTooltip="Relink"
                                  />
                                  <PlaylistImportCrossSectionChip
                                    crossMoves={crossMoves}
                                    skipRow={!!r.skipRow}
                                    importPlacement={importPlacement}
                                  />
                                </Stack>
                              </>
                            ) : autoMatch && !r.ignoreAutoMatch ? (
                              <>
                                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
                                  <Avatar
                                    src={autoMatch.albumArtUrl}
                                    variant="rounded"
                                    alt=""
                                    sx={{ width: 40, height: 40, flexShrink: 0 }}
                                  />
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography component="div" sx={importCellPrimarySx} noWrap title={autoMatch.title}>
                                      {autoMatch.title}
                                    </Typography>
                                    <Typography component="div" sx={importCellSecondarySx} noWrap title={autoMatch.artist}>
                                      {autoMatch.artist}
                                    </Typography>
                                  </Box>
                                  <Tooltip title="Switch library match">
                                    <IconButton size="small" aria-label="Switch library match" onClick={() => setLibraryPickerRowId(r.id)}>
                                      <SwapHorizIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                                <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center" sx={{ width: '100%' }}>
                                  <PairingBand
                                    paired
                                    label={matchPct != null ? `Paired · ${matchPct}%` : 'Paired'}
                                    onToggle={() =>
                                      setRows((prev) =>
                                        prev.map((row) => (row.id === r.id ? { ...row, ignoreAutoMatch: true } : row)),
                                      )
                                    }
                                    unpairTooltip="Unlink from this library song (import as new)"
                                    pairTooltip="Relink"
                                  />
                                  <PlaylistImportCrossSectionChip
                                    crossMoves={crossMoves}
                                    skipRow={!!r.skipRow}
                                    importPlacement={importPlacement}
                                  />
                                </Stack>
                              </>
                            ) : autoMatch && r.ignoreAutoMatch ? (
                              <>
                                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
                                  <Avatar
                                    src={autoMatch.albumArtUrl}
                                    variant="rounded"
                                    alt=""
                                    sx={{ width: 40, height: 40, flexShrink: 0, opacity: 0.65 }}
                                  />
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography component="div" sx={importCellPrimarySx} noWrap title={autoMatch.title}>
                                      {autoMatch.title}
                                    </Typography>
                                    <Typography component="div" sx={importCellSecondarySx} noWrap title={autoMatch.artist}>
                                      {autoMatch.artist}
                                    </Typography>
                                  </Box>
                                  <Tooltip title="Switch library match">
                                    <IconButton size="small" aria-label="Switch library match" onClick={() => setLibraryPickerRowId(r.id)}>
                                      <SwapHorizIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                                <PairingBand
                                  paired={false}
                                  label="Unlinked"
                                  onToggle={() =>
                                    setRows((prev) =>
                                      prev.map((row) => (row.id === r.id ? { ...row, ignoreAutoMatch: undefined } : row)),
                                    )
                                  }
                                  unpairTooltip=""
                                  pairTooltip="Use suggested library match again"
                                />
                              </>
                            ) : (
                              <PairingEmptyNudge
                                icon={<LibraryMusicOutlinedIcon fontSize="small" />}
                                title="No library match"
                                hint={
                                  hideSpotifyColumn && r.kind === 'youtube_only'
                                    ? 'Pick a library song or search Spotify below.'
                                    : 'Tap to match a library song.'
                                }
                                swapLabel="Choose library song"
                                onPickClick={() => setLibraryPickerRowId(r.id)}
                              />
                            )}
                            {hideSpotifyColumn &&
                            r.kind === 'youtube_only' &&
                            r.youtube &&
                            (!rowLibraryMatched || r.spotifyEnrichment) ? (
                              <Box sx={{ width: '100%', borderTop: 1, borderColor: 'divider', pt: 0.75, mt: 0.25 }}>
                                {r.spotifyEnrichment ? (
                                  <Stack spacing={0.75} alignItems="flex-start">
                                    <Stack direction="row" alignItems="flex-start" spacing={0.5} sx={{ width: '100%', minWidth: 0 }}>
                                      <Chip
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        label={`${r.spotifyEnrichment.title} · ${r.spotifyEnrichment.artist}`}
                                        sx={{
                                          maxWidth: '100%',
                                          height: 'auto',
                                          flex: 1,
                                          minWidth: 0,
                                          '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                                        }}
                                      />
                                      <Tooltip title="Open in Spotify">
                                        <IconButton
                                          component="a"
                                          href={spotifyTrackOpenUrl(r.spotifyEnrichment.spotifyTrackId)}
                                          target="_blank"
                                          rel="noreferrer"
                                          size="small"
                                          aria-label="Open in Spotify"
                                          sx={{ flexShrink: 0, mt: -0.25 }}
                                        >
                                          <OpenInNewIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Stack>
                                    <Button size="small" variant="text" onClick={() => clearSpotifyEnrichment(r.id)}>
                                      Clear Spotify
                                    </Button>
                                  </Stack>
                                ) : !rowLibraryMatched ? (
                                  clientId ? (
                                    <Stack spacing={0.5} alignItems="flex-start">
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<SpotifyBrandIcon sx={{ fontSize: 18, opacity: 0.9 }} />}
                                        onClick={() => openSpotifyPicker(r)}
                                        disabled={busy}
                                        sx={{ textTransform: 'none' }}
                                      >
                                        Search Spotify…
                                      </Button>
                                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                                        Optional: attach a Spotify track to help match a library song.
                                      </Typography>
                                    </Stack>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                                      Spotify search needs a configured client id and connection.
                                    </Typography>
                                  )
                                ) : null}
                              </Box>
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          ...encoreDialogActionsSx,
          flexShrink: 0,
          ...(reviewFullscreen ? { px: 2 } : {}),
        }}
      >
        {step === 'review' && (
          <Button onClick={() => setStep('urls')} disabled={busy}>
            Back
          </Button>
        )}
        <Button onClick={handleClose} disabled={busy}>
          Cancel
        </Button>
        {step === 'urls' ? (
          <Button variant="contained" onClick={() => void load()} disabled={busy}>
            {busy ? 'Loading…' : 'Load playlists'}
          </Button>
        ) : (
          <Button variant="contained" onClick={() => void applyImport()} disabled={busy || importActiveCount === 0}>
            {busy
              ? 'Saving…'
              : importActiveCount === 0
                ? 'Nothing to import'
                : `Import ${importActiveCount} song${importActiveCount === 1 ? '' : 's'}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>

    <Dialog
      open={crossSectionPrompt != null}
      onClose={() => setCrossSectionPrompt(null)}
      aria-labelledby="cross-section-import-title"
    >
      <DialogTitle id="cross-section-import-title" sx={encoreDialogTitleSx}>
        Move media links?
      </DialogTitle>
      <DialogContent sx={encoreDialogContentSx}>
        <Stack spacing={1.5}>
          {crossSectionPrompt && crossSectionPrompt.fromReference > 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
              {crossSectionPrompt.fromReference} link{crossSectionPrompt.fromReference === 1 ? '' : 's'} will move from
              reference recordings to backing tracks (the same Spotify or YouTube item cannot stay in both).
            </Typography>
          ) : null}
          {crossSectionPrompt && crossSectionPrompt.fromBacking > 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
              {crossSectionPrompt.fromBacking} link{crossSectionPrompt.fromBacking === 1 ? '' : 's'} will move from
              backing tracks to reference recordings.
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={encoreDialogActionsSx}>
        <Button
          onClick={() => {
            setCrossSectionPrompt(null);
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            allowCrossSectionMovesRef.current = true;
            setCrossSectionPrompt(null);
            void applyImport();
          }}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>

    <LibrarySongPickerDialog
      open={libraryPickerRowId != null}
      onClose={closeLibraryPicker}
      existingSongs={existingSongs}
      incoming={libraryPickerIncoming}
      pickQuery={libraryPickQuery}
      onPickQueryChange={setLibraryPickQuery}
      linkedOnOtherRow={(song) =>
        Boolean(libraryPickerRowId && rows.some((r) => r.id !== libraryPickerRowId && r.linkedLibrarySongId === song.id))
      }
      onSelect={(song) => {
        const id = libraryPickerRowId;
        if (!id) return;
        setRows((prev) =>
          prev.map((row) => (row.id === id ? { ...row, linkedLibrarySongId: song.id, ignoreAutoMatch: undefined } : row)),
        );
        closeLibraryPicker();
      }}
      emptyLibraryHint="Your library is empty. Import will create new songs."
      emptySearchHint="No songs match that search."
    />

    <Dialog
      open={videoPickerRowId != null}
      onClose={closeVideoPicker}
      maxWidth="sm"
      fullWidth
      aria-labelledby="video-picker-title"
    >
      <DialogTitle id="video-picker-title" sx={encoreDialogTitleSx}>
        Choose video
      </DialogTitle>
      <DialogContent
        sx={{
          ...encoreDialogContentSx,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflow: 'visible',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Search videos from the YouTube playlists you pasted. Or pick one from the list below (best matches first).
        </Typography>
        <TextField
          size="small"
          label="Search in import"
          value={videoPickQuery}
          onChange={(e) => setVideoPickQuery(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <List dense sx={{ maxHeight: 400, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <ListItemButton
            onClick={() => {
              const id = videoPickerRowId;
              if (!id) return;
              pickYoutubeForRow(id, null, youtubeOptions);
              closeSpotifyPicker();
              closeVideoPicker();
            }}
            alignItems="flex-start"
          >
            <ListItemText primary={<em>No video</em>} secondary="Clear pairing for this row" />
          </ListItemButton>
          <Divider component="li" />
          {videoPickerFiltered.length === 0 ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {youtubeOptions.length === 0
                  ? 'No YouTube videos were loaded for this import.'
                  : 'No videos match that search.'}
              </Typography>
            </Box>
          ) : (
            videoPickerFiltered.map((y) => {
              const id = videoPickerRowId;
              const selected = id != null && rows.find((x) => x.id === id)?.youtubeVideoId === y.videoId;
              return (
                <ListItemButton
                  key={y.videoId}
                  selected={selected}
                  onClick={() => {
                    if (!id) return;
                    pickYoutubeForRow(id, y.videoId, youtubeOptions);
                    closeSpotifyPicker();
                    closeVideoPicker();
                  }}
                  alignItems="flex-start"
                >
                  <ListItemAvatar sx={{ minWidth: 56, alignSelf: 'flex-start', mt: 0.5 }}>
                    <Avatar src={youtubeThumbUrl(y.videoId)} variant="rounded" alt="" sx={{ width: 44, height: 44 }} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={y.title.length > 120 ? `${y.title.slice(0, 120)}…` : y.title}
                    secondary={y.channelTitle}
                    primaryTypographyProps={{ sx: { whiteSpace: 'normal' } }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              );
            })
          )}
        </List>
      </DialogContent>
      <DialogActions sx={encoreDialogActionsSx}>
        <Button onClick={closeVideoPicker}>Cancel</Button>
      </DialogActions>
    </Dialog>

    <PlaylistImportSpotifyPicker
      open={spotifyPickerRowId != null}
      importTracks={spotifyPickerImportTracks}
      searchResults={spotifyPickResultsSorted}
      query={spotifyPickQuery}
      loading={spotifyPickLoading}
      busy={busy}
      error={spotifyPickError}
      onChangeQuery={(value) => {
        setSpotifyPickQuery(value);
        setSpotifyPickError(null);
      }}
      onClearError={() => setSpotifyPickError(null)}
      onRunSearch={() => void runSpotifyPickSearch()}
      onPickImportTrack={(sp) => {
        const id = spotifyPickerRowId;
        if (!id) return;
        applySpotifyFromPlaylistTrack(id, sp);
      }}
      onPickSearchResult={(t) => {
        const id = spotifyPickerRowId;
        if (!id) return;
        applySpotifyEnrichment(id, t);
      }}
      onClose={closeSpotifyPicker}
    />
    </>
  );
}
