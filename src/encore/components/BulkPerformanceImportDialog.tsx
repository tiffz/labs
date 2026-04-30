import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useEncore } from '../context/EncoreContext';
import { driveCollectVideoFilesRecursive } from '../drive/driveFolderWalk';
import { driveFolderWebUrl } from '../drive/driveWebUrls';
import { openEncoreGoogleDrivePicker } from '../drive/googlePicker';
import { parseDriveFileIdFromUrlOrId, parseDriveFolderIdFromUrlOrId } from '../drive/parseDriveFileUrl';
import {
  bulkVideoIncomingSong,
  buildBulkVideoMatchText,
  encoreSongFromManualTitleArtist,
  fileBaseName,
  pickBestLibrarySongForBulkVideo,
} from '../import/bulkPerformanceSong';
import { buildSpotifyTrackSearchQuery } from '../spotify/spotifyApi';
import type { EncorePerformance, EncoreSong } from '../types';
import { encoreImportReviewTableSx } from './encoreImportReviewTableSx';
import { BulkVideoSongMatchDialog } from './BulkVideoSongMatchDialog';
import { LibrarySongPickerDialog } from './LibrarySongPickerDialog';

type Step = 'folder' | 'review';

export type BulkPerfNewSongSpotify = {
  spotifyTrackId: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
};

export interface BulkPerfRow {
  id: string;
  driveFileId: string;
  name: string;
  modifiedTime?: string;
  guessedSongId: string;
  venue: string;
  date: string;
  /** When true, row is skipped on import. */
  skipRow?: boolean;
  /** Import creates a new Encore song from this Spotify track before the performance. */
  newSongFromSpotify?: BulkPerfNewSongSpotify;
  /** Import creates a new Encore song with this title/artist before the performance. */
  newSongManual?: { title: string; artist: string };
  /** Drive file description (API metadata; not the same as Drive UI “AI summary”). */
  driveDescription?: string;
  /** Folder breadcrumb under the scanned root (from walker). */
  parentPathHint?: string;
  /** `contentHints.indexableText` when Drive returns it. */
  driveIndexableText?: string;
}

function driveVideoThumbUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w320`;
}

const libraryPickerNeverOtherLinked: (song: EncoreSong) => boolean = () => false;

function rowPairedToLibrary(row: BulkPerfRow, songs: EncoreSong[]): boolean {
  if (row.newSongFromSpotify || row.newSongManual) return false;
  const id = row.guessedSongId;
  return Boolean(id) && songs.some((s) => s.id === id);
}

/** Included row has a concrete song path (library id exists, or new song from Spotify / manual). */
function rowHasSongResolution(row: BulkPerfRow, songs: EncoreSong[]): boolean {
  if (row.newSongFromSpotify || row.newSongManual) return true;
  const id = row.guessedSongId;
  return Boolean(id) && songs.some((s) => s.id === id);
}

function isoFromDriveTime(t?: string): string {
  if (!t) return new Date().toISOString().slice(0, 10);
  const d = t.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date().toISOString().slice(0, 10);
}

function guessDateFromName(name: string): string | null {
  const m = name.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const y = m[1]!;
    const mo = m[2]!.padStart(2, '0');
    const da = m[3]!.padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }
  return null;
}

function guessVenueFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('martuni')) return "Martuni's";
  if (lower.includes('piano fight')) return 'Piano Fight';
  if (lower.includes('baobab')) return 'Bissap Baobab';
  return '';
}

export function BulkPerformanceImportDialog(props: {
  open: boolean;
  onClose: () => void;
  songs: EncoreSong[];
  googleAccessToken: string | null;
  spotifyLinked: boolean;
  onSaveSong: (song: EncoreSong) => Promise<void>;
  onSavePerformances: (rows: EncorePerformance[]) => Promise<void>;
}): ReactElement {
  const { open, onClose, songs, googleAccessToken, spotifyLinked, onSaveSong, onSavePerformances } = props;
  const { connectSpotify, spotifyConnectError, clearSpotifyConnectError } = useEncore();
  const clientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';

  const [step, setStep] = useState<Step>('folder');
  const [folderInput, setFolderInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkPerfRow[]>([]);
  const [libraryPickerRowId, setLibraryPickerRowId] = useState<string | null>(null);
  const [libraryPickQuery, setLibraryPickQuery] = useState('');
  const [songMatchRowId, setSongMatchRowId] = useState<string | null>(null);
  const [libraryPairFilter, setLibraryPairFilter] = useState<'all' | 'paired' | 'unpaired'>('all');

  const parsedFolderIdForBrowse =
    parseDriveFolderIdFromUrlOrId(folderInput) ??
    (/^\s*[^/]+\s*$/.test(folderInput) ? parseDriveFileIdFromUrlOrId(folderInput) : null);

  const reviewFullscreen = step === 'review';

  const reset = useCallback(() => {
    setStep('folder');
    setFolderInput('');
    setBusy(false);
    setMsg(null);
    setRows([]);
    setLibraryPickerRowId(null);
    setLibraryPickQuery('');
    setSongMatchRowId(null);
    setLibraryPairFilter('all');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  useEffect(() => {
    if (libraryPickerRowId) setLibraryPickQuery('');
  }, [libraryPickerRowId]);

  const libraryPickerIncoming = useMemo(() => {
    const r = rows.find((x) => x.id === libraryPickerRowId);
    return r ? bulkVideoIncomingSong(r) : null;
  }, [libraryPickerRowId, rows]);

  const songMatchInitialQuery = useMemo(() => {
    const r = rows.find((x) => x.id === songMatchRowId);
    if (!r) return '';
    const pathTail = r.parentPathHint
      ?.split('/')
      .map((s) => s.trim())
      .filter(Boolean)
      .pop();
    return buildSpotifyTrackSearchQuery({
      songTitle: fileBaseName(r.name),
      artistHint: pathTail || r.driveDescription?.trim().slice(0, 120) || r.venue.trim() || undefined,
    });
  }, [songMatchRowId, rows]);

  const importActiveCount = useMemo(() => rows.filter((r) => !r.skipRow).length, [rows]);
  const importBlockedReason = useMemo(() => {
    const active = rows.filter((r) => !r.skipRow);
    if (!active.length) return null;
    const unresolved = active.filter((r) => !rowHasSongResolution(r, songs));
    if (unresolved.length)
      return `${unresolved.length} included row(s) need a library song, Spotify match, or manual title and artist.`;
    return null;
  }, [rows, songs]);
  const pairedCount = useMemo(() => rows.filter((r) => rowPairedToLibrary(r, songs)).length, [rows, songs]);
  const unpairedCount = rows.length - pairedCount;

  const displayRows = useMemo(() => {
    let list = rows;
    if (libraryPairFilter === 'paired') list = list.filter((r) => rowPairedToLibrary(r, songs));
    else if (libraryPairFilter === 'unpaired') list = list.filter((r) => !rowPairedToLibrary(r, songs));
    return list;
  }, [rows, libraryPairFilter, songs]);

  const closeLibraryPicker = useCallback(() => {
    setLibraryPickerRowId(null);
    setLibraryPickQuery('');
  }, []);

  const scanFolder = useCallback(async () => {
    setMsg(null);
    const folderId = parseDriveFolderIdFromUrlOrId(folderInput) ?? parseDriveFileIdFromUrlOrId(folderInput);
    if (!folderId || !googleAccessToken) {
      setMsg('Paste a valid Google Drive folder URL or id (sign in to Google first).');
      return;
    }
    setBusy(true);
    try {
      const files = await driveCollectVideoFilesRecursive(googleAccessToken, folderId);
      if (!files.length) {
        setMsg(
          'No video files in that folder tree. If bulk import used to fail empty, sign in to Google once more (Account → Disconnect Google, then sign in) so Drive metadata access is granted.',
        );
        setRows([]);
        return;
      }
      const built: BulkPerfRow[] = files.map((f) => {
        const name = f.name ?? 'video';
        const idx = f.contentHints?.indexableText?.trim();
        const best = pickBestLibrarySongForBulkVideo(songs, {
          fileName: name,
          description: f.description,
          parentPathHint: f.parentPathHint,
          indexableText: idx,
        });
        const guessedSongId = best?.id ?? '';
        const matchHaystack = buildBulkVideoMatchText({
          fileName: name,
          description: f.description,
          parentPathHint: f.parentPathHint,
          indexableText: idx,
        });
        const dateGuess =
          guessDateFromName(name) ?? guessDateFromName(matchHaystack) ?? isoFromDriveTime(f.modifiedTime);
        return {
          id: f.id ?? crypto.randomUUID(),
          driveFileId: f.id ?? '',
          name,
          modifiedTime: f.modifiedTime,
          guessedSongId,
          venue: guessVenueFromName(matchHaystack),
          date: dateGuess,
          skipRow: undefined,
          driveDescription: f.description?.trim() || undefined,
          parentPathHint: f.parentPathHint,
          driveIndexableText: idx,
        };
      });
      setRows(built);
      setLibraryPairFilter('all');
      setStep('review');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [folderInput, googleAccessToken, songs]);

  const applyAll = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      const now = new Date().toISOString();
      const perf: EncorePerformance[] = [];
      for (const r of rows) {
        if (r.skipRow) continue;
        let songId = r.guessedSongId;
        if (r.newSongFromSpotify) {
          const ns = r.newSongFromSpotify;
          const song: EncoreSong = {
            id: crypto.randomUUID(),
            title: ns.title,
            artist: ns.artist,
            albumArtUrl: ns.albumArtUrl,
            spotifyTrackId: ns.spotifyTrackId,
            journalMarkdown: '',
            createdAt: now,
            updatedAt: now,
          };
          await onSaveSong(song);
          songId = song.id;
        } else if (r.newSongManual) {
          const song = encoreSongFromManualTitleArtist(r.newSongManual.title, r.newSongManual.artist, now);
          await onSaveSong(song);
          songId = song.id;
        }
        if (!songId) continue;
        perf.push({
          id: crypto.randomUUID(),
          songId,
          date: r.date,
          venueTag: r.venue.trim() || 'Venue',
          videoTargetDriveFileId: r.driveFileId,
          externalVideoUrl: undefined,
          notes: `Imported: ${r.name}`,
          createdAt: now,
          updatedAt: now,
        });
      }
      await onSavePerformances(perf);
      handleClose();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [rows, onSavePerformances, onSaveSong, handleClose]);

  const effectiveSong = (r: BulkPerfRow) => {
    if (r.newSongFromSpotify) {
      return {
        title: r.newSongFromSpotify.title,
        artist: r.newSongFromSpotify.artist,
        albumArtUrl: r.newSongFromSpotify.albumArtUrl,
      };
    }
    if (r.newSongManual) {
      return { title: r.newSongManual.title, artist: r.newSongManual.artist, albumArtUrl: undefined };
    }
    const id = r.guessedSongId;
    const s = songs.find((x) => x.id === id);
    return s ? { title: s.title, artist: s.artist, albumArtUrl: s.albumArtUrl } : null;
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullScreen={reviewFullscreen}
        fullWidth={!reviewFullscreen}
        maxWidth={reviewFullscreen ? false : 'md'}
        scroll="paper"
        disableEnforceFocus
        aria-labelledby="bulk-perf-import-title"
        slotProps={{
          paper: {
            sx: reviewFullscreen
              ? { m: 0, maxHeight: 'none', height: '100%', display: 'flex', flexDirection: 'column', maxWidth: '100%' }
              : {
                  m: { xs: 2, md: 2 },
                  maxHeight: { xs: 'calc(100% - 32px)', md: 'min(90vh, 960px)' },
                  maxWidth: '100%',
                },
          },
        }}
      >
        <DialogTitle id="bulk-perf-import-title" sx={{ flexShrink: 0 }}>
          {reviewFullscreen ? 'Review performance videos' : 'Bulk import performance videos'}
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
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }
              : { maxWidth: '100%', boxSizing: 'border-box' }
          }
        >
          {step === 'folder' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, maxWidth: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                Paste a Drive folder link or id. Encore walks that folder and all subfolders for video files, then guesses
                song, venue, and date using the file name, Drive description and folder path when available (Google does
                not expose Drive “AI summaries” on the public Files API). Review carefully on the next step before saving.
              </Typography>
              <TextField
                label="Drive folder URL or id"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', minHeight: 40 }}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!googleAccessToken}
                  sx={{ flexShrink: 0 }}
                  onClick={() => {
                    if (!googleAccessToken) return;
                    void openEncoreGoogleDrivePicker({
                      accessToken: googleAccessToken,
                      title: parsedFolderIdForBrowse ? 'Choose a subfolder' : 'Choose a folder',
                      parentFolderId: parsedFolderIdForBrowse,
                      selectFolder: true,
                      onPicked: (files) => {
                        const f = files[0];
                        if (!f?.id) return;
                        const looksLikeNonFolder =
                          Boolean(f.mimeType) && f.mimeType !== 'application/vnd.google-apps.folder';
                        if (looksLikeNonFolder) {
                          setMsg('Pick a folder, not a file.');
                          return;
                        }
                        setFolderInput(f.id);
                        setMsg(null);
                      },
                      onError: (m) => setMsg(m),
                    });
                  }}
                >
                  {parsedFolderIdForBrowse ? 'Pick subfolder in Drive' : 'Pick folder in Drive'}
                </Button>
                <Button
                  size="small"
                  variant="text"
                  disabled={!parsedFolderIdForBrowse || !googleAccessToken}
                  sx={{ flexShrink: 0 }}
                  {...(parsedFolderIdForBrowse && googleAccessToken
                    ? {
                        component: 'a' as const,
                        href: driveFolderWebUrl(parsedFolderIdForBrowse),
                        target: '_blank',
                        rel: 'noreferrer',
                      }
                    : {})}
                >
                  Open folder in browser
                </Button>
              </Box>
              {msg && (
                <Typography color="error" variant="body2">
                  {msg}
                </Typography>
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
                maxWidth: '100%',
                minWidth: 0,
              }}
            >
              <Stack spacing={1.25} sx={{ mb: 1.5, flexShrink: 0 }}>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                  <strong>{rows.length}</strong> videos · turn off <strong>Include</strong> to skip a row. Use filters to
                  focus rows that already map to your library vs ones that need a new song.
                </Typography>
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ display: 'block', color: 'text.secondary', letterSpacing: '0.08em', fontWeight: 700, mb: 0.5 }}
                  >
                    Library pairing
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.45 }}>
                    Paired rows use an existing Encore song (or a new song you set via Spotify / manual). Unpaired rows
                    still need a new song or a library pick.
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    color="primary"
                    value={libraryPairFilter}
                    exclusive
                    onChange={(_, v: 'all' | 'paired' | 'unpaired' | null) => {
                      if (v != null) setLibraryPairFilter(v);
                    }}
                    aria-label="Filter by library pairing"
                  >
                    <ToggleButton value="all">All ({rows.length})</ToggleButton>
                    <ToggleButton value="paired">Paired ({pairedCount})</ToggleButton>
                    <ToggleButton value="unpaired">Not paired ({unpairedCount})</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Stack>
              {libraryPairFilter !== 'all' ? (
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', flexShrink: 0 }}>
                  Showing {displayRows.length} of {rows.length} rows
                </Typography>
              ) : null}
              {spotifyConnectError ? (
                <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }} onClose={clearSpotifyConnectError}>
                  {spotifyConnectError}
                </Alert>
              ) : null}
              {importBlockedReason ? (
                <Alert severity="warning" sx={{ mb: 1.5, flexShrink: 0 }}>
                  {importBlockedReason}
                </Alert>
              ) : null}
              {msg && (
                <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }}>
                  {msg}
                </Alert>
              )}
              <TableContainer
                sx={{
                  flex: reviewFullscreen ? '1 1 auto' : undefined,
                  minHeight: reviewFullscreen ? 0 : undefined,
                  minWidth: 0,
                  maxWidth: '100%',
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
                      <TableCell sx={{ width: 56, minWidth: 56, maxWidth: 60 }}>Thumb</TableCell>
                      <TableCell sx={{ width: '24%', minWidth: 120 }}>Video</TableCell>
                      <TableCell sx={{ width: '36%', minWidth: 0 }}>Song</TableCell>
                      <TableCell sx={{ width: '18%', minWidth: 100 }}>Venue</TableCell>
                      <TableCell sx={{ width: '16%', minWidth: 168 }}>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayRows.map((r) => {
                      const paired = rowPairedToLibrary(r, songs);
                      const es = effectiveSong(r);
                      return (
                        <TableRow
                          key={r.id}
                          hover
                          sx={(t) => ({
                            opacity: r.skipRow ? 0.5 : 1,
                            ...(!paired && !r.skipRow
                              ? { boxShadow: `inset 3px 0 0 ${alpha(t.palette.primary.main, 0.42)}` }
                              : {}),
                          })}
                        >
                          <TableCell padding="checkbox" sx={{ verticalAlign: 'middle' }}>
                            <Tooltip title="Include this row when importing">
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
                                inputProps={{ 'aria-label': `Include ${r.name}` }}
                              />
                            </Tooltip>
                          </TableCell>
                          <TableCell sx={{ verticalAlign: 'top' }}>
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                overflow: 'hidden',
                                bgcolor: 'action.hover',
                                flexShrink: 0,
                              }}
                            >
                              <Box
                                component="img"
                                src={driveVideoThumbUrl(r.driveFileId)}
                                alt=""
                                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                loading="lazy"
                              />
                            </Box>
                          </TableCell>
                          <TableCell sx={{ minWidth: 0, wordBreak: 'break-word' }}>
                            <Typography variant="subtitle2" component="div" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
                              {r.name}
                            </Typography>
                            <Button
                              size="small"
                              href={`https://drive.google.com/file/d/${encodeURIComponent(r.driveFileId)}/view`}
                              target="_blank"
                              rel="noreferrer"
                              startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                              sx={{ mt: 0.5, p: 0, minWidth: 0, textTransform: 'none' }}
                            >
                              Open in Drive
                            </Button>
                          </TableCell>
                          <TableCell sx={{ minWidth: 0 }}>
                            <Stack spacing={1} alignItems="flex-start" sx={{ minWidth: 0, width: '100%' }}>
                              {es ? (
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
                                  <Avatar
                                    src={es.albumArtUrl}
                                    variant="rounded"
                                    alt=""
                                    sx={{ width: 40, height: 40, flexShrink: 0 }}
                                  />
                                  <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                                      {es.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                                      {es.artist}
                                    </Typography>
                                  </Box>
                                </Stack>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  Choose how to attach a song.
                                </Typography>
                              )}
                              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ width: '100%' }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<SwapHorizIcon sx={{ fontSize: 18 }} />}
                                  onClick={() => setLibraryPickerRowId(r.id)}
                                >
                                  Choose library song…
                                </Button>
                                <Button size="small" variant="outlined" onClick={() => setSongMatchRowId(r.id)}>
                                  Spotify / manual…
                                </Button>
                                {(r.newSongFromSpotify || r.newSongManual || r.guessedSongId) && (
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={() =>
                                      setRows((prev) =>
                                        prev.map((row) =>
                                          row.id === r.id
                                            ? {
                                                ...row,
                                                guessedSongId: '',
                                                newSongFromSpotify: undefined,
                                                newSongManual: undefined,
                                              }
                                            : row,
                                        ),
                                      )
                                    }
                                  >
                                    Clear song match
                                  </Button>
                                )}
                              </Stack>
                              {r.newSongFromSpotify ? (
                                <Chip size="small" color="primary" variant="outlined" label="New song from Spotify on import" />
                              ) : null}
                              {r.newSongManual ? (
                                <Chip size="small" color="secondary" variant="outlined" label="New manual song on import" />
                              ) : null}
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ minWidth: 0 }}>
                            <TextField
                              size="small"
                              fullWidth
                              value={r.venue}
                              onChange={(e) => {
                                const v = e.target.value;
                                setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, venue: v } : x)));
                              }}
                              InputLabelProps={{ shrink: true }}
                              label="Venue"
                            />
                          </TableCell>
                          <TableCell sx={{ minWidth: 168, maxWidth: 220 }}>
                            <TextField
                              size="small"
                              fullWidth
                              type="date"
                              value={r.date}
                              onChange={(e) => {
                                const v = e.target.value;
                                setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, date: v } : x)));
                              }}
                              InputLabelProps={{ shrink: true }}
                              label="Date"
                              sx={{
                                minWidth: 0,
                                '& .MuiInputBase-root': { minWidth: 0 },
                                '& input[type="date"]': { minWidth: '10.5rem', width: '100%' },
                              }}
                            />
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
        <DialogActions sx={{ flexShrink: 0, px: reviewFullscreen ? 2 : undefined, flexWrap: 'wrap', gap: 1 }}>
          {step === 'review' && (
            <Button
              onClick={() => {
                setStep('folder');
                setRows([]);
                setMsg(null);
                setLibraryPairFilter('all');
              }}
              disabled={busy}
            >
              Back
            </Button>
          )}
          <Button onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          {step === 'folder' ? (
            <Button variant="contained" onClick={() => void scanFolder()} disabled={busy}>
              {busy ? 'Scanning…' : 'Scan folder'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => void applyAll()}
              disabled={busy || importActiveCount === 0 || Boolean(importBlockedReason)}
            >
              {busy
                ? 'Saving…'
                : importActiveCount === 0
                  ? 'Nothing to import'
                  : importBlockedReason
                    ? 'Fix song matches'
                    : `Import ${importActiveCount} performance${importActiveCount === 1 ? '' : 's'}`}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <LibrarySongPickerDialog
        open={libraryPickerRowId != null}
        onClose={closeLibraryPicker}
        existingSongs={songs}
        incoming={libraryPickerIncoming}
        pickQuery={libraryPickQuery}
        onPickQueryChange={setLibraryPickQuery}
        linkedOnOtherRow={libraryPickerNeverOtherLinked}
        onSelect={(song) => {
          const id = libraryPickerRowId;
          if (!id) return;
          setRows((prev) =>
            prev.map((row) =>
              row.id === id
                ? {
                    ...row,
                    guessedSongId: song.id,
                    newSongFromSpotify: undefined,
                    newSongManual: undefined,
                  }
                : row,
            ),
          );
          closeLibraryPicker();
        }}
      />

      <BulkVideoSongMatchDialog
        open={songMatchRowId != null}
        onClose={() => setSongMatchRowId(null)}
        spotifyLinked={spotifyLinked}
        clientId={clientId}
        connectSpotify={() => void connectSpotify()}
        initialSearchQuery={songMatchInitialQuery}
        onPickSpotify={(track) => {
          const id = songMatchRowId;
          if (!id) return;
          setRows((prev) =>
            prev.map((row) =>
              row.id === id
                ? {
                    ...row,
                    guessedSongId: '',
                    newSongFromSpotify: {
                      spotifyTrackId: track.id,
                      title: track.name?.trim() || 'Untitled',
                      artist: track.artists.map((a) => a.name).join(', ').trim() || 'Unknown artist',
                      albumArtUrl: track.album?.images?.[0]?.url,
                    },
                    newSongManual: undefined,
                  }
                : row,
            ),
          );
        }}
        onPickManual={(title, artist) => {
          const id = songMatchRowId;
          if (!id) return;
          setRows((prev) =>
            prev.map((row) =>
              row.id === id
                ? {
                    ...row,
                    guessedSongId: '',
                    newSongManual: { title, artist },
                    newSongFromSpotify: undefined,
                  }
                : row,
            ),
          );
        }}
      />
    </>
  );
}
