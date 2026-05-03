import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState, Fragment, type DragEvent, type ReactElement } from 'react';
import { driveGetFileMetadata, driveUploadFileResumable } from '../drive/driveFetch';
import { ensureEncoreDriveLayout } from '../drive/bootstrapFolders';
import { resolveDriveUploadFolderId, type DriveUploadFolderLayout } from '../drive/resolveDriveUploadFolder';
import { driveFileWebUrl, driveFolderWebUrl } from '../drive/driveWebUrls';
import { parseDriveFileIdFromUrlOrId } from '../drive/parseDriveFileUrl';
import { buildPerformanceVideoName, splitFileNameExtension } from '../drive/performanceVideoNaming';
import { suggestPerformanceVenueFromFile } from '../import/venueCatalogMatch';
import { guessIsoDateFromFreeText } from '../import/guessIsoDateFromFreeText';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
  encoreHairline,
} from '../theme/encoreUiTokens';
import { EncoreBrowseDriveButton } from '../ui/EncoreDriveSourceButtons';
import { useEncoreBlockingJobs } from '../context/EncoreBlockingJobContext';
import { useEncore } from '../context/EncoreContext';
import type { EncorePerformance } from '../types';
import { ENCORE_ACCOMPANIMENT_TAGS } from '../types';
import { parsePerformanceVideoInput } from '../utils/parsePerformanceVideoInput';
import { DragDropFileUpload } from '../../shared/components/DragDropFileUpload';
import { fileMatchesAccept } from '../../shared/utils/fileMatchesAccept';

function newPerformance(songId: string): EncorePerformance {
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  return {
    id: crypto.randomUUID(),
    songId,
    date: day,
    venueTag: '',
    createdAt: now,
    updatedAt: now,
  };
}

function isoDateFromDriveModified(modifiedTime?: string): string | null {
  if (!modifiedTime) return null;
  const d = modifiedTime.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function isoDateFromDriveFileMeta(meta: { createdTime?: string; modifiedTime?: string }): string | null {
  return isoDateFromDriveModified(meta.createdTime) ?? isoDateFromDriveModified(meta.modifiedTime);
}

function isoDateFromFileLastModified(file: File): string {
  // Browsers do not expose a separate “created” timestamp for picked files; lastModified is the
  // best-available signal (export time for many camera clips). `0` is common for broken exports.
  try {
    const t = file.lastModified;
    if (!Number.isFinite(t) || t <= 0) {
      return new Date().toISOString().slice(0, 10);
    }
    return new Date(t).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function calendarDateFromStagedVideoFile(file: File): string {
  const fromName = guessIsoDateFromFreeText(file.name);
  if (fromName) return fromName;
  return isoDateFromFileLastModified(file);
}

const PERF_LOCAL_VIDEO_ACCEPT = 'video/*,.mp4,.mov,.m4v,.webm,.mkv';

type PerfDriveLinkFeedback =
  | null
  | { kind: 'loading' }
  | { kind: 'ok'; name: string }
  | { kind: 'folder' }
  | { kind: 'error'; message: string }
  | { kind: 'needs_signin' };

function isDriveFolderMetadata(meta: {
  mimeType?: string;
  shortcutDetails?: { targetMimeType?: string };
}): boolean {
  if (meta.mimeType === 'application/vnd.google-apps.folder') return true;
  return (
    meta.mimeType === 'application/vnd.google-apps.shortcut' &&
    meta.shortcutDetails?.targetMimeType === 'application/vnd.google-apps.folder'
  );
}

function normalizeDriveFileIdForCompare(raw: string | undefined | null): string {
  const t = raw?.trim();
  if (!t) return '';
  return parseDriveFileIdFromUrlOrId(t) ?? t;
}

export function PerformanceEditorDialog(props: {
  open: boolean;
  performance: EncorePerformance | null;
  songId: string;
  googleAccessToken: string | null;
  /** Distinct venue tags for autocomplete chips. */
  venueOptions: string[];
  onClose: () => void;
  onSave: (p: EncorePerformance) => Promise<void>;
  /** When set (edit mode only), shows a de-emphasized control to remove this row from the log (Drive files stay). */
  onDelete?: (id: string) => Promise<void>;
}): ReactElement {
  const { open, performance, songId, googleAccessToken, venueOptions, onClose, onSave, onDelete } = props;
  const { songs, repertoireExtras } = useEncore();
  const { withBlockingJob } = useEncoreBlockingJobs();
  const songForPerformance = useMemo(() => songs.find((s) => s.id === songId) ?? null, [songs, songId]);
  const [draft, setDraft] = useState<EncorePerformance>(newPerformance(songId));
  const [videoInput, setVideoInput] = useState('');
  const [shortcutMsg, setShortcutMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [driveUploadLayout, setDriveUploadLayout] = useState<DriveUploadFolderLayout | null>(null);
  /** Local file chosen via drag/drop; uploaded on Save using the current date / venue. */
  const [pendingLocalVideoFile, setPendingLocalVideoFile] = useState<File | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  /** Drive file id (normalized) tied to this row when the dialog opened — avoid overwriting the log date from Drive metadata on edit. */
  const initialDriveFileIdRef = useRef<string>('');
  const driveLookupGen = useRef(0);
  const perfDialogDragDepthRef = useRef(0);
  const [perfDialogDragOver, setPerfDialogDragOver] = useState(false);
  const [driveLinkFeedback, setDriveLinkFeedback] = useState<PerfDriveLinkFeedback>(null);

  const venueList = useMemo(() => [...new Set(venueOptions.map((v) => v.trim()).filter(Boolean))].sort(), [venueOptions]);

  const browseDriveVideoFileId = useMemo(() => {
    const fromInput = parseDriveFileIdFromUrlOrId(videoInput.trim());
    if (fromInput) return fromInput;
    const fromDraft = draft.videoTargetDriveFileId?.trim();
    return fromDraft ? parseDriveFileIdFromUrlOrId(fromDraft) : null;
  }, [videoInput, draft.videoTargetDriveFileId]);

  useEffect(() => {
    if (open) {
      const base = performance ? { ...performance } : newPerformance(songId);
      setDraft(base);
      initialDriveFileIdRef.current = normalizeDriveFileIdForCompare(base.videoTargetDriveFileId);
      const parts: string[] = [];
      if (base.externalVideoUrl) parts.push(base.externalVideoUrl);
      else if (base.videoTargetDriveFileId) parts.push(base.videoTargetDriveFileId);
      setVideoInput(parts.join(''));
      setShortcutMsg(null);
      setPendingLocalVideoFile(null);
      setRemoveConfirmOpen(false);
      setDriveLinkFeedback(null);
    }
  }, [open, performance, songId]);

  useEffect(() => {
    if (!open) {
      perfDialogDragDepthRef.current = 0;
      setPerfDialogDragOver(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !googleAccessToken) {
      setDriveUploadLayout(null);
      return;
    }
    let cancelled = false;
    void ensureEncoreDriveLayout(googleAccessToken)
      .then((layout) => {
        if (!cancelled) setDriveUploadLayout(layout);
      })
      .catch(() => {
        if (!cancelled) setDriveUploadLayout(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, googleAccessToken]);

  const performancesUploadFolderId = useMemo(
    () =>
      driveUploadLayout
        ? resolveDriveUploadFolderId('performances', driveUploadLayout, repertoireExtras.driveUploadFolderOverrides) ??
          null
        : null,
    [driveUploadLayout, repertoireExtras.driveUploadFolderOverrides],
  );

  const syncVideoFromInput = useCallback(async () => {
    const parsed = parsePerformanceVideoInput(videoInput);
    if (parsed.kind === 'youtube') {
      setDriveLinkFeedback(null);
      setPendingLocalVideoFile(null);
      setDraft((d) => ({
        ...d,
        externalVideoUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(parsed.videoId)}`,
        videoTargetDriveFileId: undefined,
      }));
      return;
    }
    if (parsed.kind === 'external') {
      setDriveLinkFeedback(null);
      setPendingLocalVideoFile(null);
      setDraft((d) => ({ ...d, externalVideoUrl: parsed.url, videoTargetDriveFileId: undefined }));
      return;
    }
    if (parsed.kind === 'drive-folder') {
      setPendingLocalVideoFile(null);
      setDriveLinkFeedback({ kind: 'folder' });
      setDraft((d) => ({ ...d, videoTargetDriveFileId: undefined, externalVideoUrl: undefined }));
      return;
    }
    if (parsed.kind === 'drive') {
      setPendingLocalVideoFile(null);
      const fileIdForMeta = parsed.fileId;
      const gen = ++driveLookupGen.current;
      const isNewDriveLink = fileIdForMeta !== initialDriveFileIdRef.current;
      const shouldSetDateFromDriveMeta = performance == null || isNewDriveLink;
      setDraft((d) => ({ ...d, videoTargetDriveFileId: fileIdForMeta, externalVideoUrl: undefined }));

      if (!googleAccessToken) {
        setDriveLinkFeedback({ kind: 'needs_signin' });
        return;
      }

      setDriveLinkFeedback({ kind: 'loading' });
      try {
        const meta = await driveGetFileMetadata(googleAccessToken, fileIdForMeta);
        if (gen !== driveLookupGen.current) return;
        if (isDriveFolderMetadata(meta)) {
          setDriveLinkFeedback({ kind: 'folder' });
          setDraft((d) => ({ ...d, videoTargetDriveFileId: undefined, externalVideoUrl: undefined }));
          return;
        }
        const displayName = meta.name?.trim() || 'Untitled';
        setDriveLinkFeedback({ kind: 'ok', name: displayName });
        const day = isoDateFromDriveFileMeta(meta);
        if (day && shouldSetDateFromDriveMeta) {
          setDraft((d) => {
            if (normalizeDriveFileIdForCompare(d.videoTargetDriveFileId) !== fileIdForMeta) return d;
            return { ...d, date: day };
          });
        }
        const guessedVenue = suggestPerformanceVenueFromFile(venueList, meta.name ?? '').trim();
        if (guessedVenue && shouldSetDateFromDriveMeta) {
          setDraft((d) => {
            if (normalizeDriveFileIdForCompare(d.videoTargetDriveFileId) !== fileIdForMeta) return d;
            return { ...d, venueTag: d.venueTag.trim() ? d.venueTag : guessedVenue };
          });
        }
      } catch {
        if (gen !== driveLookupGen.current) return;
        setDriveLinkFeedback({
          kind: 'error',
          message: 'Could not open this in Drive. Check the link and try again.',
        });
      }
      return;
    }
    if (parsed.kind === 'empty') {
      setDriveLinkFeedback(null);
      setDraft((d) => ({ ...d, externalVideoUrl: undefined, videoTargetDriveFileId: undefined }));
    }
  }, [videoInput, googleAccessToken, performance, venueList]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void syncVideoFromInput();
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, syncVideoFromInput]);

  const handleSave = async () => {
    const now = new Date().toISOString();
    let videoTargetDriveFileId = draft.videoTargetDriveFileId?.trim();
    let externalVideoUrl = draft.externalVideoUrl?.trim();

    if (pendingLocalVideoFile) {
      if (!googleAccessToken) {
        setShortcutMsg('Sign in with Google to upload the video from your device.');
        return;
      }
      setUploading(true);
      setShortcutMsg(null);
      try {
        await withBlockingJob('Uploading performance video…', async () => {
          const layout = await ensureEncoreDriveLayout(googleAccessToken);
          const parent =
            resolveDriveUploadFolderId('performances', layout, repertoireExtras.driveUploadFolderOverrides) ??
            layout.performancesFolderId;
          if (!parent?.trim()) {
            throw new Error('Performances folder is not ready yet.');
          }
          const { extension } = splitFileNameExtension(pendingLocalVideoFile.name);
          const venueForNaming = draft.venueTag.trim() || 'Venue';
          const desiredName = buildPerformanceVideoName(
            { date: draft.date, venueTag: venueForNaming },
            songForPerformance,
            extension,
          );
          const created = await driveUploadFileResumable(
            googleAccessToken,
            pendingLocalVideoFile,
            [parent.trim()],
            desiredName,
          );
          videoTargetDriveFileId = created.id;
          externalVideoUrl = undefined;
        });
      } catch (e) {
        setShortcutMsg(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const finalDraft: EncorePerformance = {
      ...draft,
      venueTag: draft.venueTag.trim() || 'Venue',
      date: draft.date,
      accompanimentTags: draft.accompanimentTags && draft.accompanimentTags.length > 0 ? draft.accompanimentTags : undefined,
      externalVideoUrl: externalVideoUrl || undefined,
      notes: draft.notes?.trim() || undefined,
      videoTargetDriveFileId: videoTargetDriveFileId || undefined,
      updatedAt: now,
      createdAt: draft.createdAt || now,
    };
    // savePerformance() in EncoreContext takes care of creating any missing shortcut
    // (for picked-from-Drive files) and renaming Drive files to the canonical name.
    await onSave(finalDraft);
    onClose();
  };

  const handleConfirmRemoveFromLog = async () => {
    if (!performance?.id || !onDelete) return;
    setRemoveSubmitting(true);
    try {
      await onDelete(performance.id);
      setRemoveConfirmOpen(false);
      onClose();
    } finally {
      setRemoveSubmitting(false);
    }
  };

  const stageLocalVideoFile = useCallback(
    (file: File | null) => {
      if (!file || !googleAccessToken) return;
      if (file.size <= 0) {
        setShortcutMsg('That file is empty (0 bytes). Pick a different video.');
        return;
      }
      setDriveLinkFeedback(null);
      setPendingLocalVideoFile(file);
      setVideoInput('');
      setDraft((d) => {
        const guessedVenue = suggestPerformanceVenueFromFile(venueList, file.name);
        const dateFromFile = calendarDateFromStagedVideoFile(file);
        return {
          ...d,
          externalVideoUrl: undefined,
          videoTargetDriveFileId: undefined,
          date: performance == null ? dateFromFile : d.date,
          venueTag: d.venueTag.trim() ? d.venueTag : guessedVenue || d.venueTag,
        };
      });
      setShortcutMsg(null);
    },
    [googleAccessToken, performance, venueList],
  );

  const handlePerfDialogPaperDragOver = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (!googleAccessToken || uploading) return;
      e.preventDefault();
      e.stopPropagation();
    },
    [googleAccessToken, uploading],
  );

  const handlePerfDialogPaperDragEnter = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (!googleAccessToken || uploading) return;
      e.preventDefault();
      e.stopPropagation();
      perfDialogDragDepthRef.current += 1;
      setPerfDialogDragOver(true);
    },
    [googleAccessToken, uploading],
  );

  const handlePerfDialogPaperDragLeave = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (!googleAccessToken || uploading) return;
      e.preventDefault();
      e.stopPropagation();
      perfDialogDragDepthRef.current = Math.max(0, perfDialogDragDepthRef.current - 1);
      if (perfDialogDragDepthRef.current === 0) setPerfDialogDragOver(false);
    },
    [googleAccessToken, uploading],
  );

  const handlePerfDialogPaperDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      if (!googleAccessToken || uploading) return;
      e.preventDefault();
      e.stopPropagation();
      perfDialogDragDepthRef.current = 0;
      setPerfDialogDragOver(false);
      const list = Array.from(e.dataTransfer.files);
      const first = list.find((f) => fileMatchesAccept(f, PERF_LOCAL_VIDEO_ACCEPT));
      if (first) stageLocalVideoFile(first);
    },
    [googleAccessToken, uploading, stageLocalVideoFile],
  );

  const shortcutSeverity = shortcutMsg?.startsWith('Upload failed:') ? 'error' : 'info';

  return (
    <Fragment>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        aria-labelledby="perf-editor-title"
        PaperProps={{
          onDragEnter: handlePerfDialogPaperDragEnter,
          onDragLeave: handlePerfDialogPaperDragLeave,
          onDragOver: handlePerfDialogPaperDragOver,
          onDrop: handlePerfDialogPaperDrop,
          sx: (theme) =>
            perfDialogDragOver && googleAccessToken && !uploading
              ? {
                  outline: `2px dashed ${theme.palette.primary.main}`,
                  outlineOffset: '-6px',
                }
              : {},
        }}
      >
        <DialogTitle id="perf-editor-title" sx={encoreDialogTitleSx}>
          {performance ? 'Edit performance' : 'Log performance'}
          {songForPerformance ? (
            <Typography
              component="div"
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, fontWeight: 600, lineHeight: 1.4 }}
            >
              {songForPerformance.title}
              {songForPerformance.artist ? (
                <>
                  {' '}
                  <Box component="span" sx={{ fontWeight: 500 }}>
                    · {songForPerformance.artist}
                  </Box>
                </>
              ) : null}
            </Typography>
          ) : null}
        </DialogTitle>
      <DialogContent sx={encoreDialogContentSx}>
        <Stack spacing={2.25}>
          <Paper
            variant="outlined"
            sx={(theme) => ({
              p: 2,
              borderRadius: 2,
              borderColor: encoreHairline,
              bgcolor: alpha(theme.palette.primary.main, 0.02),
            })}
          >
            <Stack spacing={1.25}>
              <TextField
                label="Video link"
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
                onBlur={() => void syncVideoFromInput()}
                fullWidth
                size="small"
                placeholder="URL, YouTube, or Drive file id"
              />
              {driveLinkFeedback?.kind === 'loading' ? (
                <Stack direction="row" alignItems="center" gap={1} sx={{ minHeight: 28 }}>
                  <CircularProgress size={14} />
                  <Typography variant="caption" color="text.secondary">
                    Checking Drive…
                  </Typography>
                </Stack>
              ) : null}
              {driveLinkFeedback?.kind === 'ok' && browseDriveVideoFileId ? (
                <Box
                  sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.75,
                    px: 1,
                    borderRadius: 1,
                    border: 1,
                    borderColor: alpha(theme.palette.success.main, 0.35),
                    bgcolor: alpha(theme.palette.success.main, 0.06),
                  })}
                >
                  <CheckCircleOutlineIcon color="success" sx={{ fontSize: 18, flexShrink: 0 }} aria-hidden />
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}
                    noWrap
                    title={driveLinkFeedback.name}
                  >
                    {driveLinkFeedback.name}
                  </Typography>
                  <Tooltip title="Open in Drive">
                    <IconButton
                      component="a"
                      href={driveFileWebUrl(browseDriveVideoFileId)}
                      target="_blank"
                      rel="noreferrer"
                      color="success"
                      size="small"
                      aria-label="Open in Drive"
                      sx={{ flexShrink: 0 }}
                    >
                      <OpenInNewIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : null}
              {driveLinkFeedback?.kind === 'folder' ? (
                <Alert severity="warning" variant="outlined" sx={{ py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}>
                  That’s a folder. Use a video file link.
                </Alert>
              ) : null}
              {driveLinkFeedback?.kind === 'needs_signin' ? (
                <Alert severity="info" variant="outlined" sx={{ py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}>
                  Sign in with Google to verify this file.
                </Alert>
              ) : null}
              {driveLinkFeedback?.kind === 'error' ? (
                <Alert severity="error" variant="outlined" sx={{ py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}>
                  {driveLinkFeedback.message}
                </Alert>
              ) : null}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                {browseDriveVideoFileId && driveLinkFeedback?.kind !== 'ok' ? (
                  <Button
                    size="small"
                    variant="outlined"
                    component="a"
                    href={driveFileWebUrl(browseDriveVideoFileId)}
                    target="_blank"
                    rel="noreferrer"
                    startIcon={<OpenInNewIcon sx={{ fontSize: 18 }} />}
                  >
                    Open in Drive
                  </Button>
                ) : null}
                <EncoreBrowseDriveButton
                  size="small"
                  signedIn={Boolean(googleAccessToken)}
                  fullWidth={!browseDriveVideoFileId || driveLinkFeedback?.kind === 'ok'}
                  onClick={() => {
                    if (!googleAccessToken || !performancesUploadFolderId) return;
                    window.open(driveFolderWebUrl(performancesUploadFolderId), '_blank', 'noopener,noreferrer');
                  }}
                  disabled={!performancesUploadFolderId}
                  sx={{
                    flex:
                      browseDriveVideoFileId && driveLinkFeedback?.kind !== 'ok' ? { sm: '1 1 0' } : undefined,
                    minWidth: 0,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Performances folder
                </EncoreBrowseDriveButton>
              </Stack>
              <DragDropFileUpload
                compact
                minHeight={48}
                multiple={false}
                disabled={!googleAccessToken || uploading}
                accept={PERF_LOCAL_VIDEO_ACCEPT}
                label={
                  uploading
                    ? 'Uploading…'
                    : pendingLocalVideoFile
                      ? pendingLocalVideoFile.name
                      : 'Video from device'
                }
                helperText={pendingLocalVideoFile && googleAccessToken ? 'Uploads when you save.' : undefined}
                ariaLabel="Add performance video from device"
                onFiles={(files) => stageLocalVideoFile(files[0] ?? null)}
              />
              {pendingLocalVideoFile && googleAccessToken ? (
                <Button
                  type="button"
                  size="small"
                  color="inherit"
                  onClick={() => {
                    setPendingLocalVideoFile(null);
                    setShortcutMsg(null);
                  }}
                  sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600 }}
                >
                  Remove file
                </Button>
              ) : null}
              {!googleAccessToken ? (
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                  Sign in with Google for Drive and device upload.
                </Typography>
              ) : !performancesUploadFolderId ? (
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                  Drive folders are still preparing. Paste a file link above, or try again shortly.
                </Typography>
              ) : null}
              {shortcutMsg ? (
                <Alert
                  severity={shortcutSeverity}
                  variant="outlined"
                  sx={{
                    borderColor: encoreHairline,
                    whiteSpace: 'pre-line',
                    py: 0.25,
                    '& .MuiAlert-message': { py: 0.5 },
                  }}
                >
                  {shortcutSeverity === 'error' ? shortcutMsg.replace(/^Upload failed:\s*/i, '') : shortcutMsg}
                </Alert>
              ) : null}
            </Stack>
          </Paper>

          <Stack spacing={2}>
            <TextField
              label="Date"
              type="date"
              value={draft.date}
              size="small"
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Box>
              <Typography component="p" variant="subtitle2" color="text.secondary" sx={{ mb: 1, mt: 0, fontWeight: 600 }}>
                Accompaniment
              </Typography>
              <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
                {ENCORE_ACCOMPANIMENT_TAGS.map((tag) => {
                  const active = (draft.accompanimentTags ?? []).includes(tag);
                  return (
                    <Chip
                      key={tag}
                      size="small"
                      label={tag}
                      clickable
                      color={active ? 'primary' : 'default'}
                      variant={active ? 'filled' : 'outlined'}
                      sx={{ height: 28, fontWeight: 600 }}
                      onClick={() => {
                        setDraft((d) => {
                          const cur = new Set(d.accompanimentTags ?? []);
                          if (cur.has(tag)) cur.delete(tag);
                          else cur.add(tag);
                          const next = ENCORE_ACCOMPANIMENT_TAGS.filter((t) => cur.has(t));
                          return { ...d, accompanimentTags: next.length ? next : undefined };
                        });
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>
            <Autocomplete
              freeSolo
              size="small"
              options={venueList}
              inputValue={draft.venueTag}
              onInputChange={(_, v) => setDraft((d) => ({ ...d, venueTag: v }))}
              renderInput={(params) => (
                <TextField {...params} label="Venue" placeholder="Type or choose" fullWidth />
              )}
            />
            <TextField
              label="Notes"
              value={draft.notes ?? ''}
              size="small"
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value || undefined }))}
              fullWidth
              multiline
              minRows={2}
              placeholder="Optional"
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          ...encoreDialogActionsSx,
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0, flexShrink: 0 }}>
          {performance && onDelete ? (
            <Button
              type="button"
              variant="text"
              color="error"
              size="small"
              startIcon={<DeleteOutlineIcon sx={{ fontSize: 18 }} />}
              onClick={() => setRemoveConfirmOpen(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                px: 0.5,
                '&:hover': {
                  bgcolor: (t) => `${t.palette.error.main}14`,
                },
              }}
            >
              Remove from log
            </Button>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexShrink: 0, ml: 'auto' }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} variant="contained" disabled={uploading}>
            Save
          </Button>
        </Stack>
      </DialogActions>
      </Dialog>

      <Dialog
        open={removeConfirmOpen}
        onClose={(_e, reason) => {
          if (removeSubmitting) return;
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') setRemoveConfirmOpen(false);
        }}
        maxWidth="xs"
        fullWidth
        aria-labelledby="perf-remove-title"
      >
        <DialogTitle id="perf-remove-title" sx={encoreDialogTitleSx}>
          Remove this performance?
        </DialogTitle>
        <DialogContent sx={encoreDialogContentSx}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
            {
              "This removes it from your log and clears Encore's links to the video or URL. Files in Google Drive are not deleted."
            }
          </Typography>
        </DialogContent>
        <DialogActions sx={encoreDialogActionsSx}>
          <Button onClick={() => setRemoveConfirmOpen(false)} disabled={removeSubmitting} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirmRemoveFromLog()}
            disabled={removeSubmitting}
            color="error"
            variant="contained"
          >
            Remove from log
          </Button>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
}
