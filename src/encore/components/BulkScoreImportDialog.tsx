/* eslint-disable react/prop-types -- MRT Cell render props are typed via MRT_ColumnDef, not PropTypes */
import CloseIcon from '@mui/icons-material/Close';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import LibraryMusicOutlinedIcon from '@mui/icons-material/LibraryMusicOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
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
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import { useEncoreBlockingJobs } from '../context/EncoreBlockingJobContext';
import { useEncore } from '../context/EncoreContext';
import { ensureEncoreDriveLayout } from '../drive/bootstrapFolders';
import { resolveDriveUploadFolderId, type DriveUploadFolderLayout } from '../drive/resolveDriveUploadFolder';
import { driveCollectScoreFilesRecursive } from '../drive/driveFolderWalk';
import { driveUploadFileResumable } from '../drive/driveFetch';
import { driveFileWebUrl } from '../drive/driveWebUrls';
import { resolveDriveFolderFromUserInput } from '../drive/resolveDriveFolderFromUserInput';
import { encoreAppHref, isModifiedOrNonPrimaryClick } from '../routes/encoreAppHash';
import { parseEncoreFolderMetadata } from '../import/encoreFolderMetadata';
import { parseScoreFilename, type ParsedScoreFilename } from '../import/parseScoreFilename';
import { pickLibrarySongForScore } from '../import/pickLibrarySongForScore';
import { readScoreFileMetadata } from '../import/readScoreFileMetadata';
import {
  bulkImportEffectiveSkip,
  bulkScoreDuplicateIdsInBatch,
  bulkScoreDuplicateKind,
  bulkScoreLibraryDuplicateIds,
} from '../import/bulkImportDuplicateDetection';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
} from '../theme/encoreUiTokens';
import type { EncoreSong } from '../types';
import { addSongAttachment } from '../utils/songAttachments';
import { encoreMrtBulkImportReviewOptions } from './encoreMrtTableDefaults';
import { LibrarySongPickerDialog } from './LibrarySongPickerDialog';
import { DragDropFileUpload } from '../../shared/components/DragDropFileUpload';
import { EncoreDriveFolderPasteOrBrowseBlock } from '../ui/EncoreDriveFolderPasteOrBrowseBlock';

type SourceKind = 'upload' | 'drive';

interface BulkScoreRow {
  id: string;
  source: SourceKind;
  /** When source = upload: the local File pending upload. */
  file?: File;
  /** When source = drive: the existing Drive file id (will be linked, not re-uploaded). */
  driveFileId?: string;
  driveWebViewLink?: string;
  /** Display filename (with extension). */
  name: string;
  /** Folder breadcrumb (drive source only). */
  parentPathHint?: string;
  parsed: ParsedScoreFilename;
  /** Auto-paired song id; '' = unmatched. */
  guessedSongId: string;
  /** Apply parsed key to song.performanceKey on save (only if song key is empty and we have a parsed key). */
  applyKey: boolean;
  /** When true, row is skipped on import. */
  skipRow?: boolean;
}

const SCORE_FILE_ACCEPT = 'application/pdf,.pdf,application/vnd.recordare.musicxml+xml,.musicxml,.mxl,audio/midi,.mid,.midi,.xml';

const bulkScoreReviewTitleSx: SxProps<Theme> = {
  ...encoreDialogTitleSx,
  flexShrink: 0,
  py: 1,
  px: 2,
  fontSize: '1rem',
};

export interface BulkScoreImportDialogProps {
  open: boolean;
  onClose: () => void;
  songs: EncoreSong[];
  onSaveSong: (s: EncoreSong) => Promise<void>;
}

function defaultRowFromParsed(parsed: ParsedScoreFilename): { applyKey: boolean } {
  return { applyKey: Boolean(parsed.key) };
}

/** Opens Drive viewer or a local blob URL so the user can skim the score before importing. */
function ScoreFilePreviewLink(props: {
  fileName: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  file?: File;
}): ReactElement | null {
  const { fileName, driveFileId, driveWebViewLink, file } = props;
  const trimmedId = driveFileId?.trim();
  const driveHref = trimmedId ? driveWebViewLink?.trim() || driveFileWebUrl(trimmedId) : '';
  const objectUrl = useMemo(() => {
    if (driveHref || !file) return null;
    return URL.createObjectURL(file);
  }, [driveHref, file]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const href = driveHref || objectUrl || '';
  if (!href) return null;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      variant="caption"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.35,
        mt: 0.35,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
      aria-label={`Preview ${fileName} in a new tab`}
    >
      Preview in new tab
      <OpenInNewIcon sx={{ fontSize: 14 }} aria-hidden />
    </Link>
  );
}

export function BulkScoreImportDialog(props: BulkScoreImportDialogProps): ReactElement {
  const { open, onClose, songs, onSaveSong } = props;
  const theme = useTheme();
  const { googleAccessToken, repertoireExtras } = useEncore();
  const { withBlockingJob } = useEncoreBlockingJobs();
  const { withBatch } = useLabsUndo();

  const [step, setStep] = useState<'source' | 'review'>('source');
  const [folderInput, setFolderInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkScoreRow[]>([]);
  const [driveUploadLayout, setDriveUploadLayout] = useState<DriveUploadFolderLayout | null>(null);
  const [pickerOpenForRowId, setPickerOpenForRowId] = useState<string | null>(null);
  const [pickQuery, setPickQuery] = useState('');
  const [tableQuery, setTableQuery] = useState('');
  const [libraryPairFilter, setLibraryPairFilter] = useState<'all' | 'paired' | 'unpaired'>('all');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  /* Reset state when reopened. */
  useEffect(() => {
    if (!open) {
      setStep('source');
      setFolderInput('');
      setMsg(null);
      setRows([]);
      setBusy(false);
      setProgress(null);
      setPickerOpenForRowId(null);
      setPickQuery('');
      setTableQuery('');
      setLibraryPairFilter('all');
    }
  }, [open]);

  /* Resolve charts upload parent lazily so direct uploads have a target. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open || !googleAccessToken || driveUploadLayout) return;
      try {
        const layout = await ensureEncoreDriveLayout(googleAccessToken);
        if (!cancelled) setDriveUploadLayout(layout);
      } catch {
        /* non-fatal — direct upload path will surface a helpful error on save. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, googleAccessToken, driveUploadLayout]);

  const chartsUploadFolderId = useMemo(
    () =>
      driveUploadLayout
        ? resolveDriveUploadFolderId('charts', driveUploadLayout, repertoireExtras.driveUploadFolderOverrides) ?? null
        : null,
    [driveUploadLayout, repertoireExtras.driveUploadFolderOverrides],
  );

  const buildRowFromUploadFile = useCallback(
    (file: File): BulkScoreRow => {
      const parsed = parseScoreFilename(file.name);
      const guess = pickLibrarySongForScore(songs, parsed);
      const defaults = defaultRowFromParsed(parsed);
      return {
        id: crypto.randomUUID(),
        source: 'upload',
        file,
        name: file.name,
        parsed,
        guessedSongId: guess?.id ?? '',
        applyKey: defaults.applyKey,
      };
    },
    [songs],
  );

  const buildRowFromDriveFile = useCallback(
    (f: { id?: string; name?: string; parentPathHint?: string; webViewLink?: string }): BulkScoreRow => {
      const name = f.name ?? 'score';
      const folderMeta = parseEncoreFolderMetadata(f.parentPathHint ?? '');
      const parsed0 = parseScoreFilename(name);
      const parsed: ParsedScoreFilename = {
        ...parsed0,
        artist: parsed0.artist || folderMeta.artist,
        key: parsed0.key || folderMeta.performanceKey,
      };
      const guess = pickLibrarySongForScore(songs, parsed);
      const defaults = defaultRowFromParsed(parsed);
      return {
        id: f.id ?? crypto.randomUUID(),
        source: 'drive',
        driveFileId: f.id,
        driveWebViewLink: f.webViewLink,
        name,
        parentPathHint: f.parentPathHint,
        parsed,
        guessedSongId: guess?.id ?? '',
        applyKey: defaults.applyKey,
      };
    },
    [songs],
  );

  const handleLocalFiles = useCallback(
    (files: File[]) => {
      const newRows = files.map(buildRowFromUploadFile);
      setRows((prev) => {
        /* dedupe by name+size to avoid double-add when the user picks twice. */
        const seen = new Set(
          prev.filter((r) => r.source === 'upload').map((r) => `${r.name}::${r.file?.size ?? 0}::${r.file?.lastModified ?? 0}`),
        );
        const filtered = newRows.filter((r) => !seen.has(`${r.name}::${r.file?.size ?? 0}::${r.file?.lastModified ?? 0}`));
        return [...prev, ...filtered];
      });
      if (newRows.length > 0) {
        setMsg(null);
        setStep('review');
        /* Best-effort: read PDF / MusicXML metadata in the background and
           supplement filename-derived fields when they're missing. We never
           overwrite values the filename parser already produced — the
           filename is a more reliable source for MusicNotes/Tunescribers. */
        for (const r of newRows) {
          if (!r.file) continue;
          void readScoreFileMetadata(r.file).then((meta) => {
            if (!meta || (!meta.title && !meta.artist && !meta.key)) return;
            setRows((prev) => prev.map((row) => {
              if (row.id !== r.id) return row;
              const parsed = row.parsed;
              const enriched: ParsedScoreFilename = {
                ...parsed,
                title: parsed.title || meta.title || parsed.title,
                artist: parsed.artist || meta.artist || parsed.artist,
                key: parsed.key || meta.key || parsed.key,
                base: parsed.base,
                raw: parsed.raw,
              };
              /* Re-pair if title/artist enrichment changes the picture. */
              const repick = pickLibrarySongForScore(songs, enriched);
              return {
                ...row,
                parsed: enriched,
                guessedSongId: row.guessedSongId || (repick?.id ?? ''),
                applyKey: row.applyKey || Boolean(meta.key),
              };
            }));
          });
        }
      }
    },
    [buildRowFromUploadFile, songs],
  );

  const scanFolder = useCallback(async () => {
    setMsg(null);
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
      await withBlockingJob('Scanning Drive for scores…', async () => {
        const files = await driveCollectScoreFilesRecursive(googleAccessToken, folderId);
        if (!files.length) {
          setMsg('No PDF / MusicXML / MIDI files in that folder tree.');
          return;
        }
        const built = files.map((f) => buildRowFromDriveFile(f));
        setRows((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...built.filter((r) => !seen.has(r.id))];
        });
        setStep('review');
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [folderInput, googleAccessToken, buildRowFromDriveFile, withBlockingJob]);

  const updateRow = useCallback((id: string, patch: Partial<BulkScoreRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (libraryPairFilter === 'paired') {
      list = list.filter((r) => Boolean(r.guessedSongId?.trim()));
    } else if (libraryPairFilter === 'unpaired') {
      list = list.filter((r) => !r.guessedSongId?.trim());
    }
    const q = tableQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      if (r.name.toLowerCase().includes(q)) return true;
      if (r.parsed.title.toLowerCase().includes(q)) return true;
      if (r.parsed.artist?.toLowerCase().includes(q)) return true;
      const song = r.guessedSongId ? songs.find((s) => s.id === r.guessedSongId) : null;
      if (song && (song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [rows, tableQuery, songs, libraryPairFilter]);

  const scoreBatchDupIds = useMemo(() => bulkScoreDuplicateIdsInBatch(rows), [rows]);
  const scoreLibraryDupIds = useMemo(() => bulkScoreLibraryDuplicateIds(rows, songs), [rows, songs]);

  const scoreRowExcluded = useCallback(
    (r: BulkScoreRow) => {
      const isDup = scoreBatchDupIds.has(r.id) || scoreLibraryDupIds.has(r.id);
      return bulkImportEffectiveSkip(r.skipRow, isDup);
    },
    [scoreBatchDupIds, scoreLibraryDupIds],
  );

  const duplicateExcludedCount = useMemo(
    () =>
      rows.filter(
        (r) =>
          scoreRowExcluded(r) && (scoreBatchDupIds.has(r.id) || scoreLibraryDupIds.has(r.id)),
      ).length,
    [rows, scoreRowExcluded, scoreBatchDupIds, scoreLibraryDupIds],
  );

  const matchedCount = useMemo(
    () => rows.filter((r) => r.guessedSongId && !scoreRowExcluded(r)).length,
    [rows, scoreRowExcluded],
  );
  const unmatchedCount = useMemo(
    () => rows.filter((r) => !r.guessedSongId && !scoreRowExcluded(r)).length,
    [rows, scoreRowExcluded],
  );

  const pairedTotalCount = useMemo(() => rows.filter((r) => Boolean(r.guessedSongId?.trim())).length, [rows]);
  const unpairedTotalCount = useMemo(() => rows.filter((r) => !r.guessedSongId?.trim()).length, [rows]);

  const songById = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);

  const incomingForPicker = useMemo<EncoreSong | null>(() => {
    if (!pickerOpenForRowId) return null;
    const r = rows.find((x) => x.id === pickerOpenForRowId);
    if (!r) return null;
    const now = new Date().toISOString();
    return {
      id: r.id,
      title: r.parsed.title,
      artist: r.parsed.artist ?? '',
      journalMarkdown: '',
      createdAt: now,
      updatedAt: now,
    };
  }, [pickerOpenForRowId, rows]);

  const linkedOnOtherRow = useCallback(
    (s: EncoreSong) => rows.some((r) => r.id !== pickerOpenForRowId && r.guessedSongId === s.id),
    [rows, pickerOpenForRowId],
  );

  const columns = useMemo<MRT_ColumnDef<BulkScoreRow>[]>(
    () => [
      {
        id: 'include',
        header: '',
        size: 44,
        enableSorting: false,
        Cell: ({ row }) => {
          const r = row.original;
          const excluded = scoreRowExcluded(r);
          return (
            <Checkbox
              size="small"
              checked={!excluded}
              onChange={(e) => {
                const wantIncluded = e.target.checked;
                const isDup = scoreBatchDupIds.has(r.id) || scoreLibraryDupIds.has(r.id);
                if (wantIncluded) {
                  updateRow(r.id, { skipRow: isDup ? false : undefined });
                } else {
                  updateRow(r.id, { skipRow: true });
                }
              }}
              inputProps={{ 'aria-label': `Include ${r.name} when importing` }}
            />
          );
        },
      },
      {
        accessorKey: 'name',
        header: 'File',
        size: 380,
        minSize: 260,
        Cell: ({ row }) => {
          const r = row.original;
          const kind = bulkScoreDuplicateKind(r.id, scoreBatchDupIds, scoreLibraryDupIds);
          return (
            <Stack
              spacing={0.75}
              alignItems="flex-start"
              justifyContent="center"
              sx={{ minWidth: 0, width: '100%', py: 0.5, minHeight: 56 }}
            >
              <Stack direction="row" gap={0.75} alignItems="flex-start" sx={{ minWidth: 0, width: '100%' }}>
                {r.source === 'upload' ? (
                  <UploadFileOutlinedIcon fontSize="small" sx={{ color: 'primary.main', flexShrink: 0, mt: 0.2 }} aria-hidden />
                ) : (
                  <FolderOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0, mt: 0.2 }} aria-hidden />
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    component="div"
                    sx={{
                      fontWeight: 600,
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      whiteSpace: 'normal',
                    }}
                  >
                    {r.name}
                  </Typography>
                  <ScoreFilePreviewLink
                    fileName={r.name}
                    driveFileId={r.driveFileId}
                    driveWebViewLink={r.driveWebViewLink}
                    file={r.file}
                  />
                </Box>
              </Stack>
              {r.parentPathHint ? (
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, wordBreak: 'break-word', pl: 3 }}>
                  {r.parentPathHint}
                </Typography>
              ) : null}
              {kind ? (
                <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap" useFlexGap sx={{ pl: 0.25 }}>
                  <Tooltip title="Excluded from import by default. Check the row to include anyway.">
                    <Chip
                      size="small"
                      label={
                        kind === 'both'
                          ? 'Dup + already on song'
                          : kind === 'batch'
                            ? 'Duplicate in list'
                            : 'Already on song'
                      }
                      variant="outlined"
                      color="warning"
                      sx={{ height: 22, fontWeight: 600 }}
                    />
                  </Tooltip>
                </Stack>
              ) : null}
            </Stack>
          );
        },
      },
      {
        id: 'key',
        header: 'Key',
        size: 188,
        minSize: 152,
        enableSorting: false,
        Cell: ({ row }) => {
          const r = row.original;
          if (!r.parsed.key) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 56 }}>
                <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                  –
                </Typography>
              </Box>
            );
          }
          const song = r.guessedSongId ? songById.get(r.guessedSongId) : null;
          const songHasKey = Boolean(song?.performanceKey?.trim());
          const wouldOverwrite =
            songHasKey && song?.performanceKey?.trim().toLowerCase() !== r.parsed.key.toLowerCase();
          return (
            <Stack gap={1.25} justifyContent="center" sx={{ minWidth: 0, maxWidth: '100%', py: 0.5, minHeight: 56 }}>
              <Chip size="small" label={r.parsed.key} variant="outlined" sx={{ height: 22, fontWeight: 600, alignSelf: 'flex-start' }} />
              {song ? (
                <Stack direction="row" alignItems="flex-start" gap={0.75} sx={{ minWidth: 0, mt: 0.25 }}>
                  <Checkbox
                    size="small"
                    sx={{ p: 0.25, alignSelf: 'flex-start' }}
                    checked={r.applyKey}
                    onChange={(e) => updateRow(r.id, { applyKey: e.target.checked })}
                    inputProps={{ 'aria-label': 'Apply parsed key to song' }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45, minWidth: 0, pt: 0.5 }}>
                    {wouldOverwrite ? 'Overwrite song key' : songHasKey ? 'Already set' : 'Apply to song'}
                  </Typography>
                </Stack>
              ) : null}
            </Stack>
          );
        },
      },
      {
        id: 'match',
        header: 'Library song',
        size: 320,
        minSize: 240,
        enableSorting: false,
        Cell: ({ row }) => {
          const r = row.original;
          const song = r.guessedSongId ? songById.get(r.guessedSongId) : null;
          return (
            <Stack
              spacing={1.25}
              alignItems="stretch"
              justifyContent="center"
              sx={{ minWidth: 0, width: '100%', py: 0.5, minHeight: 56 }}
            >
              {song ? (
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
                  <Avatar src={song.albumArtUrl} variant="rounded" alt="" sx={{ width: 40, height: 40, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.4 }}
                    >
                      {song.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.25, wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.45 }}
                    >
                      {song.artist}
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'flex-start' }}>
                  Attach a song
                </Typography>
              )}
              <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center" sx={{ pt: 0.25 }}>
                <Tooltip title="Pick from library">
                  <IconButton
                    size="small"
                    aria-label="Pick song from library"
                    onClick={() => {
                      setPickerOpenForRowId(r.id);
                      setPickQuery('');
                    }}
                  >
                    <LibraryMusicOutlinedIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
                {song ? (
                  <Tooltip title="Clear song match">
                    <IconButton
                      size="small"
                      aria-label="Clear song match"
                      onClick={() => updateRow(r.id, { guessedSongId: '' })}
                    >
                      <HighlightOffOutlinedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Stack>
            </Stack>
          );
        },
      },
    ],
    [songById, updateRow, scoreBatchDupIds, scoreLibraryDupIds, scoreRowExcluded],
  );

  const table = useMaterialReactTable({
    columns,
    data: filteredRows,
    getRowId: (r) => r.id,
    ...encoreMrtBulkImportReviewOptions<BulkScoreRow>(),
    /** Wider columns absorb spare dialog width; `grid-no-grow` leaves dead space between tracks. */
    layoutMode: 'semantic',
    initialState: {
      density: 'comfortable',
      pagination: { pageIndex: 0, pageSize: 100 },
    },
    enableGlobalFilter: false,
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
        py: 1.125,
        px: 1.25,
        minWidth: 0,
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        whiteSpace: 'normal',
      },
    },
    muiTableBodyRowProps: ({ row }) => ({
      sx: (t) => ({
        opacity: scoreRowExcluded(row.original) ? 0.5 : 1,
        transition: 'opacity 160ms',
        ...(row.original.guessedSongId || scoreRowExcluded(row.original)
          ? {}
          : { boxShadow: `inset 3px 0 0 ${alpha(t.palette.primary.main, 0.42)}` }),
      }),
    }),
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

  const applyAll = useCallback(async () => {
    if (rows.length === 0) return;
    setBusy(true);
    setMsg(null);
    setProgress({ done: 0, total: rows.length });
    try {
      await withBlockingJob('Importing scores…', async (setBlockingProgress) => {
        await withBatch(async () => {
          const now = new Date().toISOString();
          let done = 0;
          for (const r of rows) {
            if (scoreRowExcluded(r)) {
              done += 1;
              setProgress({ done, total: rows.length });
              setBlockingProgress(rows.length ? done / rows.length : null);
              continue;
            }
            if (!r.guessedSongId) {
              done += 1;
              setProgress({ done, total: rows.length });
              setBlockingProgress(rows.length ? done / rows.length : null);
              continue;
            }
            const targetSong = songById.get(r.guessedSongId);
            if (!targetSong) {
              done += 1;
              setProgress({ done, total: rows.length });
              setBlockingProgress(rows.length ? done / rows.length : null);
              continue;
            }
            let driveFileId = r.driveFileId ?? '';
            if (r.source === 'upload' && r.file) {
              if (!googleAccessToken) {
                throw new Error('Sign in to Google to upload score files.');
              }
              if (!chartsUploadFolderId) {
                throw new Error('Drive charts folder is not ready yet. Try again in a moment.');
              }
              const created = await driveUploadFileResumable(googleAccessToken, r.file, [chartsUploadFolderId]);
              driveFileId = created.id;
            }
            if (!driveFileId) {
              done += 1;
              setProgress({ done, total: rows.length });
              setBlockingProgress(rows.length ? done / rows.length : null);
              continue;
            }
            let updated = addSongAttachment(targetSong, {
              kind: 'chart',
              driveFileId,
              label: r.name,
            });
            if (r.applyKey && r.parsed.key) {
              updated = { ...updated, performanceKey: r.parsed.key, updatedAt: now };
            } else {
              updated = { ...updated, updatedAt: now };
            }
            const folderMeta = parseEncoreFolderMetadata(r.parentPathHint ?? '');
            if (folderMeta.tags?.length) {
              const merged = [...(updated.tags ?? [])];
              for (const t of folderMeta.tags) {
                if (!merged.some((x) => x.toLowerCase() === t.toLowerCase())) merged.push(t);
              }
              updated = { ...updated, tags: merged, updatedAt: now };
            }
            await onSaveSong(updated);
            done += 1;
            setProgress({ done, total: rows.length });
            setBlockingProgress(rows.length ? done / rows.length : null);
          }
        });
        onClose();
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [
    rows,
    songById,
    googleAccessToken,
    chartsUploadFolderId,
    onSaveSong,
    onClose,
    scoreRowExcluded,
    withBlockingJob,
    withBatch,
  ]);

  const reviewFullscreen = step === 'review';

  return (
    <>
      <Dialog
        open={open}
        onClose={busy ? undefined : onClose}
        fullScreen={reviewFullscreen}
        fullWidth={!reviewFullscreen}
        maxWidth={reviewFullscreen ? false : 'lg'}
        scroll="paper"
        disableEnforceFocus
        aria-labelledby="bulk-score-import-title"
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
          id="bulk-score-import-title"
          sx={reviewFullscreen ? bulkScoreReviewTitleSx : { ...encoreDialogTitleSx, flexShrink: 0 }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="span" variant={reviewFullscreen ? 'subtitle1' : 'h6'} sx={{ fontWeight: 700, display: 'block' }}>
                {reviewFullscreen ? 'Review score imports' : 'Bulk import scores'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                {step === 'source'
                  ? 'Drag and drop PDFs / MusicXML / MIDI, or scan a Drive folder.'
                  : `${rows.length} files · ${matchedCount} paired · ${unmatchedCount} unmatched${
                      duplicateExcludedCount > 0
                        ? ` · ${duplicateExcludedCount} duplicate${duplicateExcludedCount === 1 ? '' : 's'} skipped`
                        : ''
                    }`}
              </Typography>
            </Box>
            <IconButton aria-label="Close" onClick={onClose} disabled={busy}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent
          dividers={!reviewFullscreen}
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
              : {
                  ...encoreDialogContentSx,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  overflowX: 'hidden',
                }
          }
        >
          {step === 'source' ? (
            <>
              <Alert severity="info" sx={{ py: 0.75 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                  For how Encore reads MusicNotes-style names and how it saves charts in Drive, see the{' '}
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
                label="Drop score files here or click to choose"
                helperText="PDF, MusicXML (.xml / .musicxml / .mxl), and MIDI accepted. Each file is matched to your library using its file name."
                accept={SCORE_FILE_ACCEPT}
                onFiles={handleLocalFiles}
                disabled={busy}
                minHeight={180}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
                description="Already have a folder of scores in Drive? Paste a link or open Drive in your browser, then paste the folder URL here; subfolders are scanned too."
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
            </>
          ) : (
            <Stack gap={1.5} sx={{ flex: '1 1 auto', minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  flexShrink: 0,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 1,
                  rowGap: 0.5,
                  columnGap: 1,
                }}
              >
                <TextField
                  size="small"
                  placeholder="Filter rows…"
                  value={tableQuery}
                  onChange={(e) => setTableQuery(e.target.value)}
                  sx={{ flex: '1 1 160px', minWidth: 0, maxWidth: { xs: '100%', sm: 360 } }}
                  inputProps={{ 'aria-label': 'Filter score import rows' }}
                />
                <Tooltip
                  title={`Paired: a library song is selected for the file. Unpaired: still need a match. Counts: all ${rows.length}, paired ${pairedTotalCount}, unpaired ${unpairedTotalCount}.`}
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
                    <ToggleButton value="paired">Paired ({pairedTotalCount})</ToggleButton>
                    <ToggleButton value="unpaired">Unpaired ({unpairedTotalCount})</ToggleButton>
                  </ToggleButtonGroup>
                </Tooltip>
                <Button size="small" variant="outlined" onClick={() => setStep('source')} disabled={busy}>
                  Add more
                </Button>
              </Box>
              {progress ? (
                <Stack gap={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Importing {progress.done} / {progress.total}…
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0}
                  />
                </Stack>
              ) : null}
              {msg ? <Alert severity="warning" sx={{ whiteSpace: 'pre-line' }}>{msg}</Alert> : null}
              <Box sx={{ flex: '1 1 auto', minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <MaterialReactTable table={table} />
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={encoreDialogActionsSx}>
          <Button onClick={onClose} disabled={busy} color="inherit">
            Cancel
          </Button>
          {step === 'review' ? (
            <Button
              onClick={applyAll}
              variant="contained"
              disabled={busy || matchedCount === 0}
            >
              Import {matchedCount} score{matchedCount === 1 ? '' : 's'}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <LibrarySongPickerDialog
        open={Boolean(pickerOpenForRowId)}
        onClose={() => setPickerOpenForRowId(null)}
        existingSongs={songs}
        incoming={incomingForPicker}
        pickQuery={pickQuery}
        onPickQueryChange={setPickQuery}
        onSelect={(song) => {
          if (pickerOpenForRowId) updateRow(pickerOpenForRowId, { guessedSongId: song.id });
          setPickerOpenForRowId(null);
          setPickQuery('');
        }}
        linkedOnOtherRow={linkedOnOtherRow}
        emptyLibraryHint="Add a song from the Library before importing scores."
      />
    </>
  );
}
