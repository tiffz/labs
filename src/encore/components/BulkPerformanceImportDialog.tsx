/* eslint-disable react/prop-types -- MRT Cell / row props are typed via MRT_ColumnDef and TanStack Row, not PropTypes */
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LibraryMusicOutlinedIcon from '@mui/icons-material/LibraryMusicOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import SearchIcon from '@mui/icons-material/Search';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import { useEncoreBlockingJobs } from '../context/EncoreBlockingJobContext';
import { useEncore } from '../context/EncoreContext';
import { ensureEncoreDriveLayout } from '../drive/bootstrapFolders';
import { resolveDriveUploadFolderId, type DriveUploadFolderLayout } from '../drive/resolveDriveUploadFolder';
import { driveUploadFileResumable } from '../drive/driveFetch';
import { driveCollectVideoFilesRecursive } from '../drive/driveFolderWalk';
import { resolveDriveFolderFromUserInput } from '../drive/resolveDriveFolderFromUserInput';
import { DragDropFileUpload } from '../../shared/components/DragDropFileUpload';
import { encoreAppHref, isModifiedOrNonPrimaryClick } from '../routes/encoreAppHash';
import { parseEncoreFolderMetadata } from '../import/encoreFolderMetadata';
import { bestVenueFromCatalog } from '../import/venueCatalogMatch';
import {
  bulkImportEffectiveSkip,
  bulkPerfDuplicateIdsInBatch,
  bulkPerfDuplicateKind,
  bulkPerfLibraryDuplicateIds,
} from '../import/bulkImportDuplicateDetection';
import { findEncorePerformanceLinkingDriveFile } from '../import/bulkPerformanceDriveLinks';
import { performanceCalendarDateForBulkRow } from '../import/bulkPerformanceImportGuesses';
import {
  bulkVideoIncomingSong,
  buildBulkVideoMatchText,
  encoreSongFromManualTitleArtist,
  fileBaseName,
  pickBestLibrarySongForBulkVideo,
} from '../import/bulkPerformanceSong';
import { buildSpotifyTrackSearchQuery } from '../spotify/spotifyApi';
import {
  BULK_PERF_DEFAULT_SORTING,
  sortBulkPerfTableRows,
  type BulkPerfTableSort,
} from '../import/bulkPerformanceImportTableSort';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
} from '../theme/encoreUiTokens';
import type { EncoreAccompanimentTag, EncorePerformance, EncoreSong } from '../types';
import { encoreMrtBulkImportReviewOptions } from './encoreMrtTableDefaults';
import { EncoreDriveFolderPasteOrBrowseBlock } from '../ui/EncoreDriveFolderPasteOrBrowseBlock';
import { BulkVideoSongMatchDialog } from './BulkVideoSongMatchDialog';
import { LibrarySongPickerDialog } from './LibrarySongPickerDialog';
import { useDriveFileThumbnailSrc } from '../drive/useDriveFileThumbnailSrc';
import { driveFileThumbnailWebUrl } from '../utils/performanceVideoThumbnailUrl';

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
  /** From `Accompaniment - …` folder segments (deepest wins); applied when saving the performance. */
  folderAccompanimentTags?: EncoreAccompanimentTag[];
  /** `contentHints.indexableText` when Drive returns it. */
  driveIndexableText?: string;
  /**
   * Performance that already references this Drive file. Save updates that record (venue, date, song, notes)
   * instead of creating another performance for the same video.
   */
  linkedPerformanceId?: string;
  /**
   * Pending direct upload (drag-and-drop). Save uploads to Drive Performances folder first,
   * then creates the EncorePerformance with the resulting Drive file id.
   */
  pendingUploadFile?: File;
}

const libraryPickerNeverOtherLinked: (song: EncoreSong) => boolean = () => false;

function BulkImportDriveThumbCell({
  driveFileId,
  googleAccessToken,
}: {
  driveFileId: string;
  googleAccessToken: string | null;
}): ReactElement {
  const fallback = useMemo(() => driveFileThumbnailWebUrl(driveFileId, 320), [driveFileId]);
  const { src, swallowErrorTryFallback } = useDriveFileThumbnailSrc(driveFileId, googleAccessToken, fallback);
  const [dead, setDead] = useState(false);
  if (dead || !src) {
    return <Box sx={{ width: '100%', height: '100%', minHeight: 48, bgcolor: 'action.hover' }} aria-hidden />;
  }
  return (
    <Box
      component="img"
      src={src}
      alt=""
      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (!swallowErrorTryFallback()) setDead(true);
      }}
    />
  );
}

function effectiveSong(r: BulkPerfRow, songs: EncoreSong[]) {
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
}

function rowPairedToLibrary(
  row: BulkPerfRow,
  songs: EncoreSong[],
  performances: readonly EncorePerformance[],
): boolean {
  if (row.newSongFromSpotify || row.newSongManual) return false;
  if (row.guessedSongId && songs.some((s) => s.id === row.guessedSongId)) return true;
  if (row.linkedPerformanceId) {
    const p = performances.find((pp) => pp.id === row.linkedPerformanceId);
    return Boolean(p && songs.some((s) => s.id === p.songId));
  }
  return false;
}

/** Included row has a concrete song path (library id exists, or new song from Spotify / manual, or linked performance). */
function rowHasSongResolution(
  row: BulkPerfRow,
  songs: EncoreSong[],
  performances: readonly EncorePerformance[],
): boolean {
  if (row.newSongFromSpotify || row.newSongManual) return true;
  if (row.guessedSongId && songs.some((s) => s.id === row.guessedSongId)) return true;
  if (row.linkedPerformanceId) {
    const p = performances.find((pp) => pp.id === row.linkedPerformanceId);
    return Boolean(p && songs.some((s) => s.id === p.songId));
  }
  return false;
}

function guessVenueFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('martuni')) return "Martuni's";
  if (lower.includes('piano fight')) return 'Piano Fight';
  if (lower.includes('baobab')) return 'Bissap Baobab';
  return '';
}

function bulkRowSearchBlob(row: BulkPerfRow, songs: EncoreSong[]): string {
  const bits = [row.name, row.venue, row.date];
  const es = effectiveSong(row, songs);
  if (es) {
    bits.push(es.title, es.artist);
  }
  if (row.linkedPerformanceId) bits.push('already', 'encore', 'existing');
  return bits.join(' ').toLowerCase();
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
  const { connectSpotify, spotifyConnectError, clearSpotifyConnectError, performances, repertoireExtras } = useEncore();
  const { withBlockingJob } = useEncoreBlockingJobs();
  const { withBatch } = useLabsUndo();
  const clientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';
  const theme = useTheme();

  const [step, setStep] = useState<Step>('folder');
  const [folderInput, setFolderInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkPerfRow[]>([]);
  const [driveUploadLayout, setDriveUploadLayout] = useState<DriveUploadFolderLayout | null>(null);
  const [libraryPickerRowId, setLibraryPickerRowId] = useState<string | null>(null);
  const [libraryPickQuery, setLibraryPickQuery] = useState('');
  const [songMatchRowId, setSongMatchRowId] = useState<string | null>(null);
  const [libraryPairFilter, setLibraryPairFilter] = useState<'all' | 'paired' | 'unpaired'>('all');
  const [tableQuery, setTableQuery] = useState('');
  const [tableSorting, setTableSorting] = useState<BulkPerfTableSort[]>(BULK_PERF_DEFAULT_SORTING);
  const [orderLockActive, setOrderLockActive] = useState(false);
  const lockedRowOrderRef = useRef<string[] | null>(null);
  const sortedDataRef = useRef<BulkPerfRow[]>([]);
  const blurScheduleRef = useRef(0);
  const tableFocusRootRef = useRef<HTMLDivElement | null>(null);

  const reviewFullscreen = step === 'review';

  const performancesUploadFolderId = useMemo(
    () =>
      driveUploadLayout
        ? resolveDriveUploadFolderId('performances', driveUploadLayout, repertoireExtras.driveUploadFolderOverrides) ??
          null
        : null,
    [driveUploadLayout, repertoireExtras.driveUploadFolderOverrides],
  );

  const reset = useCallback(() => {
    setStep('folder');
    setFolderInput('');
    setBusy(false);
    setMsg(null);
    setScanNote(null);
    setRows([]);
    setLibraryPickerRowId(null);
    setLibraryPickQuery('');
    setSongMatchRowId(null);
    setLibraryPairFilter('all');
    setTableQuery('');
    setTableSorting(BULK_PERF_DEFAULT_SORTING);
    lockedRowOrderRef.current = null;
    setOrderLockActive(false);
    window.clearTimeout(blurScheduleRef.current);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  useEffect(() => {
    if (libraryPickerRowId) setLibraryPickQuery('');
  }, [libraryPickerRowId]);

  /* Lazy-resolve Encore Drive layout so direct uploads have a resolved parent folder. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open || !googleAccessToken || driveUploadLayout) return;
      try {
        const layout = await ensureEncoreDriveLayout(googleAccessToken);
        if (!cancelled) setDriveUploadLayout(layout);
      } catch {
        /* non-fatal — surfaces as an error on save if the user attempts a direct upload. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, googleAccessToken, driveUploadLayout]);

  const buildLocalUploadRow = useCallback(
    (file: File): BulkPerfRow => {
      const matchHaystack = buildBulkVideoMatchText({ fileName: file.name });
      const best = pickBestLibrarySongForBulkVideo(songs, { fileName: file.name });
      const catalogVenue = bestVenueFromCatalog(repertoireExtras.venueCatalog, { fileName: file.name });
      const dateGuess = performanceCalendarDateForBulkRow({ fileName: file.name, matchHaystack });
      return {
        id: crypto.randomUUID(),
        driveFileId: '',
        name: file.name,
        modifiedTime: undefined,
        guessedSongId: best?.id ?? '',
        venue: catalogVenue || guessVenueFromName(matchHaystack),
        date: dateGuess,
        skipRow: undefined,
        pendingUploadFile: file,
      };
    },
    [songs, repertoireExtras.venueCatalog],
  );

  const handleLocalFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const newRows = files.map(buildLocalUploadRow);
      setRows((prev) => {
        /* Dedupe by name + size against existing pending uploads (avoid double-add). */
        const seen = new Set(
          prev
            .filter((r) => r.pendingUploadFile)
            .map((r) => `${r.name}::${r.pendingUploadFile?.size ?? 0}::${r.pendingUploadFile?.lastModified ?? 0}`),
        );
        const filtered = newRows.filter(
          (r) => !seen.has(`${r.name}::${r.pendingUploadFile?.size ?? 0}::${r.pendingUploadFile?.lastModified ?? 0}`),
        );
        return [...prev, ...filtered];
      });
      setMsg(null);
      setStep('review');
    },
    [buildLocalUploadRow],
  );

  const venueOptions = useMemo(() => {
    const s = new Set<string>();
    for (const v of repertoireExtras.venueCatalog) {
      const t = v.trim();
      if (t) s.add(t);
    }
    for (const p of performances) {
      const v = p.venueTag?.trim();
      if (v) s.add(v);
    }
    for (const preset of ["Martuni's", 'Piano Fight', 'Bissap Baobab']) {
      s.add(preset);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [performances, repertoireExtras.venueCatalog]);

  const libraryPickerIncoming = useMemo(() => {
    const r = rows.find((x) => x.id === libraryPickerRowId);
    return r ? bulkVideoIncomingSong(r) : null;
  }, [libraryPickerRowId, rows]);

  const songMatchInitialQuery = useMemo(() => {
    const r = rows.find((x) => x.id === songMatchRowId);
    if (!r) return '';
    const residual = parseEncoreFolderMetadata(r.parentPathHint ?? '').residualPathHint;
    const pathTail = residual
      ?.split('/')
      .map((s) => s.trim())
      .filter(Boolean)
      .pop();
    return buildSpotifyTrackSearchQuery({
      songTitle: fileBaseName(r.name),
      artistHint: pathTail || r.driveDescription?.trim().slice(0, 120) || r.venue.trim() || undefined,
    });
  }, [songMatchRowId, rows]);

  const perfBatchDupIds = useMemo(() => bulkPerfDuplicateIdsInBatch(rows), [rows]);
  const perfLibraryDupIds = useMemo(() => bulkPerfLibraryDuplicateIds(rows, performances), [rows, performances]);

  const perfRowExcluded = useCallback(
    (r: BulkPerfRow) => {
      const isDup = perfBatchDupIds.has(r.id) || perfLibraryDupIds.has(r.id);
      return bulkImportEffectiveSkip(r.skipRow, isDup);
    },
    [perfBatchDupIds, perfLibraryDupIds],
  );

  const perfDuplicateSkippedCount = useMemo(
    () =>
      rows.filter(
        (r) =>
          perfRowExcluded(r) && (perfBatchDupIds.has(r.id) || perfLibraryDupIds.has(r.id)),
      ).length,
    [rows, perfRowExcluded, perfBatchDupIds, perfLibraryDupIds],
  );

  const importActiveCount = useMemo(() => rows.filter((r) => !perfRowExcluded(r)).length, [rows, perfRowExcluded]);
  const importBlockedReason = useMemo(() => {
    const active = rows.filter((r) => !perfRowExcluded(r));
    if (!active.length) return null;
    const unresolved = active.filter((r) => !rowHasSongResolution(r, songs, performances));
    if (unresolved.length)
      return `${unresolved.length} included row(s) need a library song, Spotify match, or manual title and artist.`;
    return null;
  }, [rows, songs, performances, perfRowExcluded]);

  const linkedIncludedCount = useMemo(
    () => rows.filter((r) => !perfRowExcluded(r) && r.linkedPerformanceId).length,
    [rows, perfRowExcluded],
  );

  const pairedCount = useMemo(
    () => rows.filter((r) => rowPairedToLibrary(r, songs, performances)).length,
    [rows, songs, performances],
  );
  const unpairedCount = rows.length - pairedCount;

  const displayRows = useMemo(() => {
    let list = rows;
    if (libraryPairFilter === 'paired') list = list.filter((r) => rowPairedToLibrary(r, songs, performances));
    else if (libraryPairFilter === 'unpaired') list = list.filter((r) => !rowPairedToLibrary(r, songs, performances));
    return list;
  }, [rows, libraryPairFilter, songs, performances]);

  const tableRows = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    if (!q) return displayRows;
    return displayRows.filter((r) => bulkRowSearchBlob(r, songs).includes(q));
  }, [displayRows, tableQuery, songs]);

  const sortedData = useMemo(() => sortBulkPerfTableRows(tableRows, tableSorting), [tableRows, tableSorting]);

  useLayoutEffect(() => {
    sortedDataRef.current = sortedData;
  }, [sortedData]);

  const displayData = useMemo(() => {
    if (orderLockActive && lockedRowOrderRef.current) {
      const byId = new Map(tableRows.map((r) => [r.id, r]));
      return lockedRowOrderRef.current.map((id) => byId.get(id)).filter((x): x is BulkPerfRow => Boolean(x));
    }
    return sortedData;
  }, [orderLockActive, sortedData, tableRows]);

  const beginEditStabilize = useCallback(() => {
    if (!lockedRowOrderRef.current) {
      lockedRowOrderRef.current = sortedDataRef.current.map((r) => r.id);
    }
    setOrderLockActive(true);
  }, []);

  const scheduleEndEditStabilize = useCallback(() => {
    window.clearTimeout(blurScheduleRef.current);
    blurScheduleRef.current = window.setTimeout(() => {
      const root = tableFocusRootRef.current;
      if (root?.contains(document.activeElement)) return;
      lockedRowOrderRef.current = null;
      setOrderLockActive(false);
    }, 160);
  }, []);

  useEffect(() => {
    lockedRowOrderRef.current = null;
    setOrderLockActive(false);
    window.clearTimeout(blurScheduleRef.current);
  }, [libraryPairFilter, tableQuery]);

  const closeLibraryPicker = useCallback(() => {
    setLibraryPickerRowId(null);
    setLibraryPickQuery('');
  }, []);

  const scanFolder = useCallback(async () => {
    setMsg(null);
    setScanNote(null);
    if (!googleAccessToken) {
      setMsg('Paste a valid Google Drive folder URL or id (sign in to Google first).');
      return;
    }
    const resolved = await resolveDriveFolderFromUserInput(googleAccessToken, folderInput);
    if (!resolved.ok) {
      setMsg(resolved.message);
      return;
    }
    const folderId = resolved.id;
    setBusy(true);
    try {
      await withBlockingJob('Scanning Drive for videos…', async () => {
        const files = await driveCollectVideoFilesRecursive(googleAccessToken, folderId);
        if (!files.length) {
          setMsg(
            'No video files in that folder tree. If bulk import used to fail empty, sign in to Google once more (Account → Disconnect Google, then sign in) so Drive metadata access is granted.',
          );
          setRows([]);
          return;
        }
        const seenIds = new Set<string>();
        const uniqueFiles = files.filter((f) => {
          const id = f.id ?? '';
          if (!id || seenIds.has(id)) return false;
          seenIds.add(id);
          return true;
        });
        if (uniqueFiles.length < files.length) {
          setScanNote(`Skipped ${files.length - uniqueFiles.length} duplicate file id(s) in the scan (same Drive file listed more than once).`);
        }
        const built: BulkPerfRow[] = uniqueFiles.map((f) => {
          const name = f.name ?? 'video';
          const idx = f.contentHints?.indexableText?.trim();
          const folderMeta = parseEncoreFolderMetadata(f.parentPathHint ?? '');
          const pathForMatch =
            folderMeta.residualPathHint.trim().length > 0 ? folderMeta.residualPathHint.trim() : undefined;
          const best = pickBestLibrarySongForBulkVideo(songs, {
            fileName: name,
            description: f.description,
            parentPathHint: pathForMatch,
            indexableText: idx,
          });
          const matchHaystack = buildBulkVideoMatchText({
            fileName: name,
            description: f.description,
            parentPathHint: pathForMatch,
            indexableText: idx,
          });
          const linked = findEncorePerformanceLinkingDriveFile(performances, f.id);
          const guessedSongId = linked?.songId ?? best?.id ?? '';
          const dateGuess = performanceCalendarDateForBulkRow({
            fileName: name,
            matchHaystack,
            driveCreatedTime: f.createdTime,
            driveModifiedTime: f.modifiedTime,
          });
          const catalogVenue = bestVenueFromCatalog(repertoireExtras.venueCatalog, {
            fileName: name,
            parentPathHint: pathForMatch,
          });
          const folderAcc = folderMeta.accompaniment;
          return {
            id: f.id ?? crypto.randomUUID(),
            driveFileId: f.id ?? '',
            name,
            modifiedTime: f.modifiedTime,
            guessedSongId,
            venue: folderMeta.venue?.trim() || catalogVenue || guessVenueFromName(matchHaystack),
            date: folderMeta.date ?? dateGuess,
            skipRow: undefined,
            driveDescription: f.description?.trim() || undefined,
            parentPathHint: f.parentPathHint,
            driveIndexableText: idx,
            linkedPerformanceId: linked?.id,
            folderAccompanimentTags: folderAcc && folderAcc.length > 0 ? folderAcc : undefined,
          };
        });
        setRows(built);
        setLibraryPairFilter('all');
        setTableQuery('');
        setTableSorting(BULK_PERF_DEFAULT_SORTING);
        lockedRowOrderRef.current = null;
        setOrderLockActive(false);
        setStep('review');
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [folderInput, googleAccessToken, songs, performances, repertoireExtras.venueCatalog, withBlockingJob]);

  const applyAll = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      const totalRows = rows.length;
      let rowStep = 0;
      await withBlockingJob('Importing performances…', async (setBlockingProgress) => {
        await withBatch(async () => {
        const now = new Date().toISOString();
        const perf: EncorePerformance[] = [];
        for (const r of rows) {
          if (perfRowExcluded(r)) {
            rowStep += 1;
            setBlockingProgress(totalRows ? rowStep / totalRows : null);
            continue;
          }
          const folderMeta = parseEncoreFolderMetadata(r.parentPathHint ?? '');
          let songId = r.guessedSongId;
          if (r.newSongFromSpotify) {
            const ns = r.newSongFromSpotify;
            const song: EncoreSong = {
              id: crypto.randomUUID(),
              title: ns.title,
              artist: ns.artist?.trim() || folderMeta.artist?.trim() || 'Unknown artist',
              albumArtUrl: ns.albumArtUrl,
              spotifyTrackId: ns.spotifyTrackId,
              journalMarkdown: '',
              createdAt: now,
              updatedAt: now,
              ...(folderMeta.performanceKey?.trim() ? { performanceKey: folderMeta.performanceKey.trim() } : {}),
              ...(folderMeta.tags?.length ? { tags: folderMeta.tags } : {}),
            };
            await onSaveSong(song);
            songId = song.id;
          } else if (r.newSongManual) {
            const song = encoreSongFromManualTitleArtist(
              r.newSongManual.title,
              r.newSongManual.artist.trim() || folderMeta.artist?.trim() || '',
              now,
            );
            const withFolder: EncoreSong = {
              ...song,
              ...(folderMeta.performanceKey?.trim() ? { performanceKey: folderMeta.performanceKey.trim() } : {}),
              ...(folderMeta.tags?.length ? { tags: folderMeta.tags } : {}),
            };
            await onSaveSong(withFolder);
            songId = withFolder.id;
          }
          if (!songId && r.linkedPerformanceId) {
            const prev = performances.find((p) => p.id === r.linkedPerformanceId);
            songId = prev?.songId ?? '';
          }
          if (!songId) {
            rowStep += 1;
            setBlockingProgress(totalRows ? rowStep / totalRows : null);
            continue;
          }

          let videoFileId = r.driveFileId;
          if (r.pendingUploadFile) {
            if (!googleAccessToken) {
              throw new Error('Sign in to Google to upload videos.');
            }
            if (!performancesUploadFolderId) {
              throw new Error('Drive Performances folder is not ready yet — try again in a moment.');
            }
            const created = await driveUploadFileResumable(
              googleAccessToken,
              r.pendingUploadFile,
              [performancesUploadFolderId],
            );
            videoFileId = created.id;
          }

          if (r.linkedPerformanceId) {
            const prev = performances.find((p) => p.id === r.linkedPerformanceId);
            if (!prev) {
              rowStep += 1;
              setBlockingProgress(totalRows ? rowStep / totalRows : null);
              continue;
            }
            const importLine = `Imported: ${r.name}`;
            const nextNotes = prev.notes?.includes(importLine)
              ? prev.notes
              : [prev.notes?.trim(), importLine].filter(Boolean).join('\n');
            perf.push({
              ...prev,
              songId,
              date: r.date,
              venueTag: r.venue.trim() || 'Venue',
              notes: nextNotes,
              videoTargetDriveFileId: videoFileId || prev.videoTargetDriveFileId,
              ...(r.folderAccompanimentTags?.length
                ? { accompanimentTags: r.folderAccompanimentTags }
                : {}),
              updatedAt: now,
            });
            rowStep += 1;
            setBlockingProgress(totalRows ? rowStep / totalRows : null);
            continue;
          }

          perf.push({
            id: crypto.randomUUID(),
            songId,
            date: r.date,
            venueTag: r.venue.trim() || 'Venue',
            videoTargetDriveFileId: videoFileId || undefined,
            externalVideoUrl: undefined,
            notes: `Imported: ${r.name}`,
            ...(r.folderAccompanimentTags?.length
              ? { accompanimentTags: r.folderAccompanimentTags }
              : {}),
            createdAt: now,
            updatedAt: now,
          });
          rowStep += 1;
          setBlockingProgress(totalRows ? rowStep / totalRows : null);
        }
        await onSavePerformances(perf);
        handleClose();
        });
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [
    rows,
    performances,
    onSavePerformances,
    onSaveSong,
    handleClose,
    googleAccessToken,
    performancesUploadFolderId,
    perfRowExcluded,
    withBlockingJob,
    withBatch,
  ]);

  const columns = useMemo<MRT_ColumnDef<BulkPerfRow>[]>(
    () => [
      {
        id: 'include',
        header: '',
        size: 44,
        enableColumnFilter: false,
        enableSorting: false,
        Cell: ({ row }) => {
          const r = row.original;
          const excluded = perfRowExcluded(r);
          return (
            <Checkbox
              size="small"
              checked={!excluded}
              onChange={(e) => {
                const wantIncluded = e.target.checked;
                setRows((prev) =>
                  prev.map((row) => {
                    if (row.id !== r.id) return row;
                    const isDup = perfBatchDupIds.has(row.id) || perfLibraryDupIds.has(row.id);
                    if (wantIncluded) {
                      return { ...row, skipRow: isDup ? false : undefined };
                    }
                    return { ...row, skipRow: true };
                  }),
                );
              }}
              inputProps={{ 'aria-label': `Include ${r.name} when saving` }}
            />
          );
        },
      },
      {
        id: 'thumb',
        header: 'Thumb',
        size: 56,
        enableColumnFilter: false,
        enableSorting: false,
        Cell: ({ row }) => (
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
            <BulkImportDriveThumbCell driveFileId={row.original.driveFileId} googleAccessToken={googleAccessToken} />
          </Box>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Video',
        minSize: 140,
        Cell: ({ row }) => {
          const r = row.original;
          return (
            <Stack spacing={0.5} alignItems="flex-start" sx={{ minWidth: 0, py: 0.25 }}>
              <Typography variant="subtitle2" component="div" sx={{ fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>
                {r.name}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                {r.linkedPerformanceId ? (
                  <Chip size="small" color="info" variant="outlined" label="Already in Encore" sx={{ height: 22 }} />
                ) : null}
                {(() => {
                  const kind = bulkPerfDuplicateKind(r.id, perfBatchDupIds, perfLibraryDupIds);
                  if (!kind) return null;
                  const label =
                    kind === 'both'
                      ? 'Dup + in library'
                      : kind === 'batch'
                        ? 'Duplicate in list'
                        : 'Already imported';
                  return (
                    <Tooltip title="Excluded from save by default. Check the row to include anyway.">
                      <Chip size="small" label={label} color="warning" variant="outlined" sx={{ height: 22, fontWeight: 600 }} />
                    </Tooltip>
                  );
                })()}
                <Tooltip title="Open in Google Drive">
                  <IconButton
                    component={Link}
                    href={`https://drive.google.com/file/d/${encodeURIComponent(r.driveFileId)}/view`}
                    target="_blank"
                    rel="noreferrer"
                    size="small"
                    aria-label={`Open ${r.name} in Drive`}
                    sx={{ ml: r.linkedPerformanceId ? 0 : -0.5 }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          );
        },
      },
      {
        id: 'song',
        header: 'Song',
        minSize: 220,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => {
          const r = row.original;
          const es = effectiveSong(r, songs);
          return (
            <Stack spacing={0.75} alignItems="flex-start" sx={{ minWidth: 0, width: '100%', py: 0.25 }}>
              {es ? (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
                  <Avatar src={es.albumArtUrl} variant="rounded" alt="" sx={{ width: 36, height: 36, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word', lineHeight: 1.35 }}>
                      {es.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                      {es.artist}
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Attach a song
                </Typography>
              )}
              <Stack direction="row" flexWrap="wrap" gap={0.25} alignItems="center" sx={{ width: '100%' }}>
                <Tooltip title="Pick from library">
                  <IconButton size="small" aria-label="Pick song from library" onClick={() => setLibraryPickerRowId(r.id)}>
                    <LibraryMusicOutlinedIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Spotify or manual title">
                  <IconButton size="small" aria-label="Match with Spotify or manual title" onClick={() => setSongMatchRowId(r.id)}>
                    <QueueMusicIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
                {(r.newSongFromSpotify || r.newSongManual || r.guessedSongId) && (
                  <Tooltip title="Clear song match">
                    <IconButton
                      size="small"
                      aria-label="Clear song match"
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
                      <HighlightOffOutlinedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
              {r.newSongFromSpotify ? (
                <Chip size="small" color="primary" variant="outlined" label="New Spotify song on save" sx={{ height: 22 }} />
              ) : null}
              {r.newSongManual ? (
                <Chip size="small" color="secondary" variant="outlined" label="New manual song on save" sx={{ height: 22 }} />
              ) : null}
            </Stack>
          );
        },
      },
      {
        accessorKey: 'venue',
        header: 'Venue',
        minSize: 140,
        enableSorting: false,
        Cell: ({ row }) => {
          const r = row.original;
          return (
            <Autocomplete
              freeSolo
              size="small"
              options={venueOptions}
              value={r.venue}
              onInputChange={(_, v) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, venue: v } : x)))}
              onChange={(_, v) => {
                const next = typeof v === 'string' ? v : (v ?? '');
                setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, venue: next } : x)));
              }}
              slotProps={{
                popper: {
                  disablePortal: true,
                  sx: { zIndex: (t) => t.zIndex.modal + 2 },
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Venue"
                  onFocus={beginEditStabilize}
                  onBlur={scheduleEndEditStabilize}
                  inputProps={{ ...params.inputProps, 'aria-label': 'Venue' }}
                />
              )}
              sx={{
                maxWidth: '100%',
                minWidth: 0,
                '& .MuiAutocomplete-inputRoot': { flexWrap: 'nowrap' },
              }}
            />
          );
        },
      },
      {
        accessorKey: 'date',
        header: 'Date',
        size: 168,
        sortingFn: 'alphanumeric',
        Cell: ({ row }) => {
          const r = row.original;
          return (
            <TextField
              size="small"
              fullWidth
              type="date"
              value={r.date}
              onChange={(e) => {
                const v = e.target.value;
                setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, date: v } : x)));
              }}
              onFocus={beginEditStabilize}
              onBlur={scheduleEndEditStabilize}
              inputProps={{ 'aria-label': 'Performance date' }}
              sx={{
                minWidth: 0,
                '& .MuiInputBase-root': { minWidth: 0 },
                '& input[type="date"]': { minWidth: '10.5rem', width: '100%' },
              }}
            />
          );
        },
      },
    ],
    [perfRowExcluded, perfBatchDupIds, perfLibraryDupIds, songs, venueOptions, beginEditStabilize, scheduleEndEditStabilize, googleAccessToken],
  );

  const table = useMaterialReactTable({
    columns,
    data: displayData,
    getRowId: (row) => row.id,
    ...encoreMrtBulkImportReviewOptions<BulkPerfRow>(),
    manualSorting: true,
    onSortingChange: (updater) => {
      setTableSorting((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    },
    state: {
      sorting: tableSorting,
    },
    enableSorting: !orderLockActive,
    mrtTheme: { baseBackgroundColor: theme.palette.background.paper },
    muiTableHeadCellProps: {
      sx: {
        bgcolor: 'background.paper',
        zIndex: 2,
        fontWeight: 600,
        fontSize: '0.6875rem',
        letterSpacing: '0.02em',
        textTransform: 'none',
        color: 'text.secondary',
        py: 0.45,
        px: 1,
        minWidth: 0,
        borderBottom: 1,
        borderBottomColor: 'divider',
      },
    },
    muiTableBodyCellProps: {
      sx: {
        verticalAlign: 'middle',
        py: 0.5,
        px: 1,
        minWidth: 0,
        overflow: 'hidden',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      },
    },
    muiTableBodyRowProps: ({ row }) => {
      const r = row.original;
      const paired = rowPairedToLibrary(r, songs, performances);
      const ex = perfRowExcluded(r);
      return {
        sx: (t) => ({
          opacity: ex ? 0.5 : 1,
          ...(!paired && !ex ? { boxShadow: `inset 3px 0 0 ${alpha(t.palette.primary.main, 0.42)}` } : {}),
        }),
      };
    },
    muiTableProps: {
      sx: {
        tableLayout: 'fixed',
        width: '100%',
        minWidth: 0,
      },
    },
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '100%',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        backgroundImage: 'none',
        overflow: 'hidden',
      },
    },
    muiTableContainerProps: {
      sx: {
        flex: '1 1 auto',
        minHeight: 0,
        minWidth: 0,
        maxWidth: '100%',
        overflowX: 'hidden',
        overflowY: 'auto',
      },
    },
    muiBottomToolbarProps: {
      sx: {
        minHeight: 44,
        py: 0.25,
        px: 1,
        maxWidth: '100%',
        flexShrink: 0,
        '& .MuiTablePagination-root': { overflow: 'hidden', maxWidth: '100%' },
        '& .MuiTablePagination-toolbar': {
          minHeight: 36,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          gap: 0.5,
        },
      },
    },
  });

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
              ? {
                  m: 0,
                  maxHeight: 'none',
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  maxWidth: '100%',
                  // Paper defaults to overflowY: auto without overflowX hidden, so wide table + toolbar
                  // can add a viewport-level horizontal scrollbar. Keep X clipped; scroll inside the table shell.
                  overflowX: 'hidden',
                  overflowY: 'hidden',
                }
              : {
                  m: { xs: 2, md: 2 },
                  maxHeight: { xs: 'calc(100% - 32px)', md: 'min(90vh, 960px)' },
                  maxWidth: '100%',
                  overflowX: 'hidden',
                },
          },
        }}
      >
        <DialogTitle
          id="bulk-perf-import-title"
          sx={{
            ...encoreDialogTitleSx,
            flexShrink: 0,
            ...(reviewFullscreen ? { py: 1, px: 2, fontSize: '1rem' } : {}),
          }}
        >
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
              : { ...encoreDialogContentSx, maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }
          }
        >
          {step === 'folder' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1, maxWidth: '100%' }}>
              <Alert severity="info" sx={{ py: 0.75 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                  For recommended video file names (and import order), see the{' '}
                  <Link
                    href={encoreAppHref({ kind: 'help' })}
                    variant="body2"
                    onClick={(e) => {
                      if (!isModifiedOrNonPrimaryClick(e)) onClose();
                    }}
                  >
                    Import guide
                  </Link>
                  .
                </Typography>
              </Alert>
              <DragDropFileUpload
                label="Drop performance videos here or click to choose"
                helperText="We'll guess song, venue, and date from the file name, then upload to your Drive Performances folder on save."
                accept="video/*,.mp4,.mov,.m4v,.webm,.mkv,.mpeg,.mpg,.avi"
                onFiles={handleLocalFiles}
                disabled={busy}
                minHeight={140}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 0.5 }}>
                <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  OR
                </Typography>
                <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
              </Box>

              <EncoreDriveFolderPasteOrBrowseBlock
                value={folderInput}
                onChange={(v) => {
                  setFolderInput(v);
                  setMsg(null);
                }}
                googleAccessToken={googleAccessToken}
                disabled={busy}
                description={
                  <Stack direction="row" alignItems="flex-start" gap={0.5}>
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1, lineHeight: 1.45 }}>
                      Paste a Drive folder link or id. We scan subfolders for videos and guess song, venue, and date from
                      the file name, path, and description.
                    </Typography>
                    <Tooltip
                      title="Dates: text in the file name wins; otherwise we use Drive created time, then last modified, in your local calendar. Google does not expose camera “recorded at” in the Files API, so putting the performance date in the file name is the most reliable signal."
                      placement="left"
                      enterDelay={200}
                    >
                      <IconButton size="small" aria-label="How bulk import guesses dates" sx={{ color: 'text.secondary', mt: -0.25 }}>
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
                primaryAction={
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => void scanFolder()}
                    disabled={busy || !folderInput.trim() || !googleAccessToken}
                  >
                    Scan folder
                  </Button>
                }
              />
              {msg ? <Alert severity="warning" sx={{ whiteSpace: 'pre-line' }}>{msg}</Alert> : null}
              {busy ? <LinearProgress /> : null}
            </Box>
          )}
          {step === 'review' && (
            <Box
              sx={{
                flex: reviewFullscreen ? '1 1 auto' : undefined,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                pt: reviewFullscreen ? 0 : 1,
                maxWidth: '100%',
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  flexShrink: 0,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 1,
                  rowGap: 0.5,
                  columnGap: 1,
                  mb: 0.5,
                }}
              >
                <TextField
                  size="small"
                  placeholder="Search…"
                  value={tableQuery}
                  onChange={(e) => setTableQuery(e.target.value)}
                  sx={{ flex: '1 1 160px', minWidth: 0, maxWidth: { xs: '100%', sm: 360 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" aria-hidden />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{ 'aria-label': 'Search imported videos' }}
                />
                <Tooltip
                  title={`Paired: song resolved (library, Spotify/manual, or existing performance for this file). Unpaired: still need a match. Counts: all ${rows.length}, paired ${pairedCount}, unpaired ${unpairedCount}.`}
                  placement="top"
                >
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
                    <ToggleButton value="all">All</ToggleButton>
                    <ToggleButton value="paired">Paired</ToggleButton>
                    <ToggleButton value="unpaired">Unpaired</ToggleButton>
                  </ToggleButtonGroup>
                </Tooltip>
              </Box>
              {orderLockActive ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, flexShrink: 0 }}>
                  Row order stays fixed while you edit date or venue.
                </Typography>
              ) : null}
              {linkedIncludedCount > 0 ? (
                <Typography variant="caption" color="info.main" sx={{ display: 'block', mb: 0.25, flexShrink: 0, lineHeight: 1.35 }}>
                  {linkedIncludedCount} row{linkedIncludedCount === 1 ? '' : 's'} already in Encore (save updates them).
                </Typography>
              ) : null}
              {perfDuplicateSkippedCount > 0 ? (
                <Typography
                  variant="caption"
                  color="warning.main"
                  sx={{ display: 'block', mb: 0.25, flexShrink: 0, lineHeight: 1.35 }}
                >
                  {perfDuplicateSkippedCount} duplicate row{perfDuplicateSkippedCount === 1 ? '' : 's'} skipped — enable the
                  checkbox on a row to import it anyway.
                </Typography>
              ) : null}
              <Stack spacing={0.5} sx={{ mb: 0.5, flexShrink: 0 }}>
                {scanNote ? (
                  <Alert
                    severity="info"
                    sx={{ py: 0.25, px: 1, '& .MuiAlert-icon': { py: 0.25 }, '& .MuiAlert-message': { py: 0.25 } }}
                    onClose={() => setScanNote(null)}
                  >
                    {scanNote}
                  </Alert>
                ) : null}
                {spotifyConnectError ? (
                  <Alert
                    severity="error"
                    sx={{ py: 0.25, px: 1, '& .MuiAlert-icon': { py: 0.25 }, '& .MuiAlert-message': { py: 0.25 } }}
                    onClose={clearSpotifyConnectError}
                  >
                    {spotifyConnectError}
                  </Alert>
                ) : null}
                {importBlockedReason ? (
                  <Alert
                    severity="warning"
                    sx={{ py: 0.25, px: 1, '& .MuiAlert-icon': { py: 0.25 }, '& .MuiAlert-message': { py: 0.25 } }}
                  >
                    {importBlockedReason}
                  </Alert>
                ) : null}
                {msg ? (
                  <Alert severity="error" sx={{ py: 0.25, px: 1, '& .MuiAlert-icon': { py: 0.25 }, '& .MuiAlert-message': { py: 0.25 } }}>
                    {msg}
                  </Alert>
                ) : null}
              </Stack>
              <Box
                ref={tableFocusRootRef}
                sx={{ flex: 1, minHeight: 0, minWidth: 0, maxWidth: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <MaterialReactTable table={table} />
              </Box>
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
            <Button
              onClick={() => {
                setStep('folder');
                setRows([]);
                setMsg(null);
                setScanNote(null);
                setLibraryPairFilter('all');
                setTableQuery('');
                setTableSorting(BULK_PERF_DEFAULT_SORTING);
                lockedRowOrderRef.current = null;
                setOrderLockActive(false);
                window.clearTimeout(blurScheduleRef.current);
              }}
              disabled={busy}
            >
              Back
            </Button>
          )}
          <Button onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          {step === 'folder' ? null : (
            <Button
              variant="contained"
              onClick={() => void applyAll()}
              disabled={busy || importActiveCount === 0 || Boolean(importBlockedReason)}
            >
              {busy
                ? 'Saving…'
                : importActiveCount === 0
                  ? 'Nothing to save'
                  : importBlockedReason
                    ? 'Fix song matches'
                    : `Save ${importActiveCount} row${importActiveCount === 1 ? '' : 's'}`}
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
