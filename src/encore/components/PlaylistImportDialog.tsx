import LibraryMusicOutlinedIcon from '@mui/icons-material/LibraryMusicOutlined';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
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
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { collectUniquePlaylistIdsFromMixedPaste } from '../import/collectPlaylistIdsFromText';
import {
  buildPlaylistImportRows,
  diceCoefficient,
  encoreSongFromImportRow,
  parseYoutubeTitleForSongWithContext,
  scoreSpotifyYoutube,
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
import { encoreLoopbackUrlFromCurrent } from '../spotify/spotifyRedirectUri';
import { readAndClearSpotifyOAuthFlash } from '../spotify/completeOAuthFromUrl';
import { fetchYouTubePlaylistItems, type YouTubePlaylistItemRow } from '../youtube/youtubePlaylistApi';
import type { EncoreSong } from '../types';
import {
  findExistingSongForImport,
  importRowHasLibraryMerge,
  mergeSongWithImport,
  scoreSongSimilarityForImport,
} from '../import/findExistingSongForImport';
import { useEncore } from '../context/EncoreContext';
import { encoreImportReviewTableSx } from './encoreImportReviewTableSx';
import { LibrarySongPickerDialog } from './LibrarySongPickerDialog';

type Step = 'urls' | 'review';

function youtubeThumbUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
}

function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

function spotifyTrackOpenUrl(trackId: string): string {
  return `https://open.spotify.com/track/${encodeURIComponent(trackId)}`;
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

/** Split a paired Spotify+YouTube row into separate Spotify-only and YouTube-only rows. */
function splitPairedImportRow(row: PlaylistImportRow): PlaylistImportRow[] {
  if (row.kind !== 'paired' || !row.spotify || !row.youtube) return [row];
  const sp = row.spotify;
  const yt = row.youtube;
  const splitPairRef: SplitPairRef = { spotifyTrackId: sp.trackId, youtubeVideoId: yt.videoId };
  const extra: Partial<PlaylistImportRow> = {
    ...(row.skipRow ? { skipRow: row.skipRow } : {}),
    ...(row.linkedLibrarySongId ? { linkedLibrarySongId: row.linkedLibrarySongId } : {}),
    ...(row.ignoreAutoMatch ? { ignoreAutoMatch: row.ignoreAutoMatch } : {}),
  };
  return [
    {
      id: `sp-${sp.trackId}`,
      spotify: sp,
      youtubeVideoId: null,
      matchScore: 0,
      kind: 'spotify_only',
      splitPairRef,
      ...extra,
    },
    {
      id: `yt-${yt.videoId}`,
      youtube: yt,
      youtubeVideoId: yt.videoId,
      matchScore: 0,
      kind: 'youtube_only',
      splitPairRef,
    },
  ];
}

function mergeSplitPairRows(rows: PlaylistImportRow[], ref: SplitPairRef): PlaylistImportRow[] {
  const spIdx = rows.findIndex(
    (r) =>
      r.kind === 'spotify_only' &&
      r.spotify?.trackId === ref.spotifyTrackId &&
      r.splitPairRef?.youtubeVideoId === ref.youtubeVideoId,
  );
  const ytIdx = rows.findIndex(
    (r) =>
      r.kind === 'youtube_only' &&
      r.youtube?.videoId === ref.youtubeVideoId &&
      r.splitPairRef?.spotifyTrackId === ref.spotifyTrackId,
  );
  if (spIdx < 0 || ytIdx < 0) return rows;
  const a = rows[spIdx]!;
  const b = rows[ytIdx]!;
  const sp = a.spotify;
  const ytResolved = b.youtube ?? a.youtube;
  if (!sp || !ytResolved) return rows;
  const skipRow = Boolean(a.skipRow || b.skipRow);
  const linkedLibrarySongId = a.linkedLibrarySongId ?? b.linkedLibrarySongId;
  const ignoreAutoMatch = a.ignoreAutoMatch || b.ignoreAutoMatch;
  const paired: PlaylistImportRow = {
    id: `pair-${sp.trackId}-${ytResolved.videoId}`,
    spotify: sp,
    youtube: ytResolved,
    youtubeVideoId: ytResolved.videoId,
    matchScore: scoreSpotifyYoutube(sp, ytResolved),
    kind: 'paired',
    ...(skipRow ? { skipRow: true } : {}),
    ...(linkedLibrarySongId ? { linkedLibrarySongId } : {}),
    ...(ignoreAutoMatch ? { ignoreAutoMatch: true } : {}),
  };
  const next = [...rows];
  const hi = Math.max(spIdx, ytIdx);
  const lo = Math.min(spIdx, ytIdx);
  next.splice(hi, 1);
  next.splice(lo, 1);
  next.splice(lo, 0, paired);
  return next;
}

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
        gap: 0.35,
        borderRadius: 2,
        px: 1,
        py: 0.35,
        maxWidth: '100%',
        border: '1px solid',
        borderColor: paired ? alpha(success, 0.45) : alpha(theme.palette.divider, 0.9),
        bgcolor: paired ? alpha(success, 0.14) : alpha(theme.palette.action.hover, 0.9),
        boxShadow: paired ? `0 1px 0 ${alpha(success, 0.2)}, 0 2px 8px ${alpha(theme.palette.common.black, 0.06)}` : 'none',
      }}
    >
      <Typography
        variant="caption"
        component="span"
        sx={{
          fontWeight: 800,
          letterSpacing: '0.03em',
          fontSize: '0.7rem',
          lineHeight: 1.45,
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
              p: 0.35,
              color: paired ? success : 'action.active',
              '&:hover': { bgcolor: paired ? alpha(success, 0.12) : 'action.selected' },
            }}
          >
            {paired ? <LinkOffIcon sx={{ fontSize: 18 }} /> : <LinkIcon sx={{ fontSize: 18 }} />}
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
        gap: 1.25,
        width: '100%',
        minWidth: 0,
        py: 1,
        px: 1.25,
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
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
}): ReactElement {
  const { open, onClose, googleAccessToken, spotifyLinked, existingSongs, onSaveSong } = props;
  const { connectSpotify, spotifyConnectError, clearSpotifyConnectError } = useEncore();
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

  const youtubeOptions = useMemo(() => youtubeItems ?? [], [youtubeItems]);
  const loopbackHref = useMemo(() => encoreLoopbackUrlFromCurrent(), []);

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
        }
      }

      const sp = mergedSp.length ? mergedSp : null;
      const yt = mergedYt.length ? mergedYt : null;
      setYoutubeItems(yt);
      const built = buildPlaylistImportRows(sp, yt);
      setRows(built);
      setYtPairFilter('all');
      setLibraryMatchFilter('all');
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
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [clientId, googleAccessToken, playlistPaste, spotifyLinked, setMsg]);

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
    setBusy(true);
    setMsg(null);
    try {
      const librarySnapshot = [...existingSongs];
      for (const r of rows) {
        if (r.skipRow) continue;
        const song = encoreSongFromImportRow(r);
        if (!song) continue;
        const manual =
          r.linkedLibrarySongId != null
            ? (librarySnapshot.find((s) => s.id === r.linkedLibrarySongId) ??
                existingSongs.find((s) => s.id === r.linkedLibrarySongId) ??
                null)
            : null;
        const auto =
          manual == null && !r.ignoreAutoMatch ? findExistingSongForImport(librarySnapshot, song) : null;
        const match = manual ?? auto;
        const toSave = match ? mergeSongWithImport(match, song) : song;
        await onSaveSong(toSave);
        if (!match) librarySnapshot.push(toSave);
        else {
          const i = librarySnapshot.findIndex((s) => s.id === match.id);
          if (i >= 0) librarySnapshot[i] = toSave;
        }
      }
      reset();
      onClose();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [rows, onSaveSong, onClose, reset, setMsg, existingSongs]);

  const showYoutubeColumns = youtubeOptions.length > 0;
  const reviewFullscreen = step === 'review';
  const importActiveCount = useMemo(() => rows.filter((r) => !r.skipRow).length, [rows]);

  const ytPairedCount = useMemo(() => rows.filter((r) => r.kind === 'paired').length, [rows]);
  const ytUnpairedCount = useMemo(() => rows.filter((r) => r.kind !== 'paired').length, [rows]);

  const libraryMatchByRowId = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const r of rows) {
      m.set(r.id, importRowHasLibraryMerge(r, existingSongs));
    }
    return m;
  }, [rows, existingSongs]);

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

  const displayRows = useMemo(() => {
    let list = rows;
    if (showYoutubeColumns && ytPairFilter !== 'all') {
      list = ytPairFilter === 'paired' ? list.filter((r) => r.kind === 'paired') : list.filter((r) => r.kind !== 'paired');
    }
    if (libraryMatchFilter === 'matched') {
      list = list.filter((r) => libraryMatchByRowId.get(r.id));
    } else if (libraryMatchFilter === 'unmatched') {
      list = list.filter((r) => !libraryMatchByRowId.get(r.id));
    }
    return list;
  }, [rows, ytPairFilter, showYoutubeColumns, libraryMatchFilter, libraryMatchByRowId]);

  const libraryPickerRow = useMemo(
    () => (libraryPickerRowId ? (rows.find((r) => r.id === libraryPickerRowId) ?? null) : null),
    [libraryPickerRowId, rows],
  );
  const libraryPickerIncoming = useMemo(
    () => (libraryPickerRow ? encoreSongFromImportRow(libraryPickerRow) : null),
    [libraryPickerRow],
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
      <DialogTitle id="playlist-import-title" sx={{ flexShrink: 0 }}>
        {reviewFullscreen ? 'Review import' : 'Import playlists'}
      </DialogTitle>
      <DialogContent
        sx={
          reviewFullscreen
            ? {
                flex: '1 1 auto',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                pt: 1,
                pb: 0,
                px: { xs: 1.5, sm: 2 },
              }
            : {}
        }
      >
        {step === 'urls' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Paste Spotify and/or YouTube playlist links or ids together (one per line, or comma-separated). Encore
              detects the platform from each URL. If both sides have tracks, Encore suggests matches from titles; you
              can fix links in the next step before saving.
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
            {clientId ? (
              spotifyLinked ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1, columnGap: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Spotify is connected. Paste Spotify playlist URLs to load them (including private playlists in your
                    account).
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      clearSpotifyConnectError();
                      void connectSpotify();
                    }}
                    sx={{ fontWeight: 600 }}
                  >
                    Sign in to Spotify again
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      clearSpotifyConnectError();
                      void connectSpotify();
                    }}
                  >
                    Connect Spotify
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Sign in here to load Spotify playlists (including private ones you can open in Spotify).
                  </Typography>
                </Box>
              )
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
            <Stack spacing={1.25} sx={{ mb: 1, flexShrink: 0 }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                <strong>{rows.length}</strong> tracks · turn off <strong>Include</strong> to skip a row when importing
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                {libraryReviewStats.included === 0 ? (
                  <>Library: no rows are included for import (all rows are unchecked).</>
                ) : libraryReviewStats.unmatchedIncluded === 0 ? (
                  <>
                    Library: every included row matches (<strong>{libraryReviewStats.matchedIncluded}</strong> of{' '}
                    <strong>{libraryReviewStats.included}</strong>
                    {libraryReviewStats.included !== rows.length ? (
                      <>
                        {' '}
                        · <strong>{libraryReviewStats.matchedAll}</strong> of <strong>{rows.length}</strong> rows overall
                      </>
                    ) : null}
                    ).
                  </>
                ) : (
                  <>
                    Library: <strong>{libraryReviewStats.matchedIncluded}</strong> of <strong>{libraryReviewStats.included}</strong>{' '}
                    included rows match · <strong>{libraryReviewStats.unmatchedIncluded}</strong> included with no match
                    {libraryReviewStats.included !== rows.length ? (
                      <>
                        {' '}
                        (<strong>{libraryReviewStats.matchedAll}</strong> of <strong>{rows.length}</strong> rows overall match)
                      </>
                    ) : null}
                  </>
                )}
              </Typography>
              <Stack spacing={2}>
                {showYoutubeColumns ? (
                  <Box>
                    <Typography
                      variant="overline"
                      sx={{ display: 'block', color: 'text.secondary', letterSpacing: '0.08em', fontWeight: 700, mb: 0.25 }}
                    >
                      Spotify ↔ YouTube
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.45 }}>
                      Filter by whether each import row has both a Spotify track and a YouTube video linked.
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
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ display: 'block', color: 'text.secondary', letterSpacing: '0.08em', fontWeight: 700, mb: 0.25 }}
                  >
                    Your Encore library
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.45 }}>
                    Filter by whether a row will merge into an existing library song when you import.
                  </Typography>
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
            {(showYoutubeColumns && ytPairFilter !== 'all') || libraryMatchFilter !== 'all' ? (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', flexShrink: 0 }}>
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
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Table size="small" stickyHeader sx={encoreImportReviewTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ width: 52, minWidth: 52, maxWidth: 56 }}>
                      Include
                    </TableCell>
                    <TableCell sx={{ width: '5%', minWidth: 44, maxWidth: 56 }}>Art</TableCell>
                    <TableCell sx={{ width: showYoutubeColumns ? '20%' : '28%', minWidth: 0 }}>Spotify</TableCell>
                    {showYoutubeColumns ? (
                      <TableCell sx={{ width: '30%', minWidth: 0 }}>
                        YouTube
                      </TableCell>
                    ) : null}
                    <TableCell sx={{ width: showYoutubeColumns ? '38%' : '58%', minWidth: 0 }}>
                      Library
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayRows.map((r) => {
                    const incoming = encoreSongFromImportRow(r);
                    const autoMatch = incoming ? findExistingSongForImport(existingSongs, incoming) : null;
                    const manualLib =
                      r.linkedLibrarySongId != null
                        ? (existingSongs.find((s) => s.id === r.linkedLibrarySongId) ?? null)
                        : null;
                    const matchPct =
                      incoming && autoMatch && !manualLib && !r.ignoreAutoMatch
                        ? Math.round(scoreSongSimilarityForImport(autoMatch, incoming) * 100)
                        : null;
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
                        })}
                      >
                        <TableCell padding="checkbox" sx={{ verticalAlign: 'middle', pt: 1.5 }}>
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
                              width: 44,
                              height: 44,
                              borderRadius: 1,
                              overflow: 'hidden',
                              bgcolor: 'action.hover',
                              flexShrink: 0,
                              mt: 0.25,
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
                        <TableCell sx={cell}>
                          {r.spotify ? (
                            <Stack direction="row" alignItems="flex-start" spacing={0.5}>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="subtitle2" component="div" sx={{ wordBreak: 'break-word', lineHeight: 1.43, fontWeight: 500 }}>
                                  {r.spotify.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.43 }}>
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
                            <Stack spacing={1} alignItems="flex-start">
                              {r.spotifyEnrichment ? (
                                <>
                                  <Stack direction="row" alignItems="flex-start" spacing={0.5} sx={{ width: '100%', minWidth: 0 }}>
                                    <Chip
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                      label={`${r.spotifyEnrichment.title} — ${r.spotifyEnrichment.artist}`}
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
                                </>
                              ) : clientId ? (
                                <Button size="small" variant="outlined" onClick={() => openSpotifyPicker(r)} disabled={busy}>
                                  Link Spotify song…
                                </Button>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  Spotify search unavailable
                                </Typography>
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        {showYoutubeColumns ? (
                          <TableCell sx={cell}>
                            {r.youtube ? (
                              <Stack spacing={1} alignItems="flex-start">
                                <Stack direction="row" alignItems="flex-start" spacing={0.5} sx={{ width: '100%', minWidth: 0 }}>
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Tooltip title={r.youtube.title}>
                                      <Typography variant="subtitle2" component="div" sx={{ wordBreak: 'break-word', lineHeight: 1.43, fontWeight: 500 }}>
                                        {r.youtube.title.length > 88 ? `${r.youtube.title.slice(0, 88)}…` : r.youtube.title}
                                      </Typography>
                                    </Tooltip>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.43 }}>
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
                                {r.kind === 'youtube_only' ? (
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.45 }}>
                                    {(() => {
                                      const p = parseYoutubeTitleForSongWithContext(r.youtube.title, {
                                        description: r.youtube.description,
                                      });
                                      return `${p.artist ? `${p.artist} — ` : ''}${p.songTitle}`;
                                    })()}
                                  </Typography>
                                ) : null}
                              </Stack>
                            ) : r.spotify || r.kind === 'youtube_only' ? (
                              <Stack spacing={1} alignItems="flex-start">
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
                                —
                              </Typography>
                            )}
                          </TableCell>
                        ) : null}
                        <TableCell sx={cell}>
                          <Stack spacing={1} alignItems="flex-start">
                            {manualLib ? (
                              <>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
                                  <Avatar
                                    src={manualLib.albumArtUrl}
                                    variant="rounded"
                                    alt=""
                                    sx={{ width: 48, height: 48, flexShrink: 0 }}
                                  />
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="subtitle2" component="div" fontWeight={500} noWrap title={manualLib.title}>
                                      {manualLib.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap title={manualLib.artist}>
                                      {manualLib.artist}
                                    </Typography>
                                  </Box>
                                  <Tooltip title="Switch library match">
                                    <IconButton size="small" aria-label="Switch library match" onClick={() => setLibraryPickerRowId(r.id)}>
                                      <SwapHorizIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
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
                              </>
                            ) : autoMatch && !r.ignoreAutoMatch ? (
                              <>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
                                  <Avatar
                                    src={autoMatch.albumArtUrl}
                                    variant="rounded"
                                    alt=""
                                    sx={{ width: 48, height: 48, flexShrink: 0 }}
                                  />
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="subtitle2" component="div" fontWeight={500} noWrap title={autoMatch.title}>
                                      {autoMatch.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap title={autoMatch.artist}>
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
                              </>
                            ) : autoMatch && r.ignoreAutoMatch ? (
                              <>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
                                  <Avatar
                                    src={autoMatch.albumArtUrl}
                                    variant="rounded"
                                    alt=""
                                    sx={{ width: 48, height: 48, flexShrink: 0, opacity: 0.65 }}
                                  />
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="subtitle2" component="div" fontWeight={500} noWrap title={autoMatch.title}>
                                      {autoMatch.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap title={autoMatch.artist}>
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
                                hint="Tap to match a library song."
                                swapLabel="Choose library song"
                                onPickClick={() => setLibraryPickerRowId(r.id)}
                              />
                            )}
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
      <DialogActions sx={{ flexShrink: 0, px: reviewFullscreen ? 2 : undefined }}>
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
      <DialogTitle id="video-picker-title">Choose video</DialogTitle>
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          pt: 2.5,
          px: 3,
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
      <DialogActions>
        <Button onClick={closeVideoPicker}>Cancel</Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={spotifyPickerRowId != null}
      onClose={closeSpotifyPicker}
      maxWidth="sm"
      fullWidth
      aria-labelledby="spotify-picker-title"
    >
      <DialogTitle id="spotify-picker-title">Link Spotify song</DialogTitle>
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          pt: 2.5,
          px: 3,
          pb: 2,
          overflow: 'visible',
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
          Pick a track already in this import (Spotify-only rows), or search Spotify and choose a result.
        </Typography>
        {spotifyPickError ? (
          <Alert severity="error" onClose={() => setSpotifyPickError(null)}>
            {spotifyPickError}
          </Alert>
        ) : null}
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
            <TextField
              size="small"
              label="Spotify search"
              value={spotifyPickQuery}
              onChange={(e) => {
                setSpotifyPickQuery(e.target.value);
                setSpotifyPickError(null);
              }}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1, minWidth: 0 }}
            />
            <Button
              variant="contained"
              size="medium"
              onClick={() => void runSpotifyPickSearch()}
              disabled={busy || !spotifyPickQuery.trim()}
              sx={{ flexShrink: 0, mt: { xs: 0, sm: 0.25 } }}
            >
              Search Spotify
            </Button>
            {spotifyPickLoading ? <CircularProgress size={28} sx={{ alignSelf: 'center' }} /> : null}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, lineHeight: 1.45 }}>
            Prefilled using track and artist hints from the YouTube title. Import-only rows below always show; rows
            matching your search text are sorted to the top.
          </Typography>
        </Box>
        {spotifyPickerImportTracks.length > 0 ? (
          <>
            <Box>
              <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', letterSpacing: '0.08em', fontWeight: 700, mb: 1 }}>
                From this import
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.45 }}>
                Spotify-only rows with no video yet in this import.
              </Typography>
              <List dense sx={{ maxHeight: 220, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {spotifyPickerImportTracks.map((sp) => (
                <ListItemButton
                  key={sp.trackId}
                  onClick={() => {
                    const id = spotifyPickerRowId;
                    if (!id) return;
                    applySpotifyFromPlaylistTrack(id, sp);
                  }}
                  alignItems="flex-start"
                >
                  <ListItemAvatar sx={{ minWidth: 56, mt: 0.5 }}>
                    <Avatar src={sp.albumArtUrl} variant="rounded" alt="" sx={{ width: 44, height: 44 }} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={sp.title}
                    secondary={sp.artist}
                    primaryTypographyProps={{ noWrap: true, title: sp.title, variant: 'subtitle2', fontWeight: 500 }}
                    secondaryTypographyProps={{ noWrap: true, variant: 'body2' }}
                  />
                </ListItemButton>
              ))}
            </List>
            </Box>
          </>
        ) : null}
        {spotifyPickerImportTracks.length > 0 && spotifyPickResultsSorted.length > 0 ? (
          <Divider role="presentation" sx={{ borderColor: 'divider' }} />
        ) : null}
        {spotifyPickResultsSorted.length > 0 ? (
          <>
            <Box>
              <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', letterSpacing: '0.08em', fontWeight: 700, mb: 1 }}>
                Spotify catalog
              </Typography>
              <List dense sx={{ maxHeight: 280, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {spotifyPickResultsSorted.map((t) => {
                const thumb = t.album.images?.[0]?.url;
                return (
                  <ListItemButton
                    key={t.id}
                    onClick={() => {
                      const id = spotifyPickerRowId;
                      if (!id) return;
                      applySpotifyEnrichment(id, t);
                    }}
                    alignItems="flex-start"
                  >
                    <ListItemAvatar sx={{ minWidth: 56, mt: 0.5 }}>
                      <Avatar src={thumb} variant="rounded" alt="" sx={{ width: 44, height: 44 }} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={t.name}
                      secondary={t.artists.map((a) => a.name).join(', ')}
                      primaryTypographyProps={{ noWrap: true, variant: 'subtitle2', fontWeight: 500 }}
                      secondaryTypographyProps={{ noWrap: true, variant: 'body2' }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
            </Box>
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={closeSpotifyPicker}>Cancel</Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
