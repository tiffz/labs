import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { driveGetFileMetadata, driveUploadFileResumable } from '../drive/driveFetch';
import { ensureEncoreDriveLayout } from '../drive/bootstrapFolders';
import { driveFileWebUrl } from '../drive/driveWebUrls';
import { ENCORE_DRIVE_VIDEO_MIME_TYPES, openEncoreGoogleDrivePicker } from '../drive/googlePicker';
import { parseDriveFileIdFromUrlOrId } from '../drive/parseDriveFileUrl';
import { buildPerformanceVideoName, splitFileNameExtension } from '../drive/performanceVideoNaming';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
  encoreHairline,
  encoreMutedCaptionSx,
} from '../theme/encoreUiTokens';
import { SongPageSubheading } from '../ui/SongPageSection';
import { useEncore } from '../context/EncoreContext';
import type { EncorePerformance } from '../types';
import { ENCORE_ACCOMPANIMENT_TAGS } from '../types';
import { parsePerformanceVideoInput } from '../utils/parsePerformanceVideoInput';

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

function isoDateFromFileLastModified(file: File): string {
  try {
    return new Date(file.lastModified).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
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
}): React.ReactElement {
  const { open, performance, songId, googleAccessToken, venueOptions, onClose, onSave } = props;
  const { songs } = useEncore();
  const songForPerformance = useMemo(() => songs.find((s) => s.id === songId) ?? null, [songs, songId]);
  const [draft, setDraft] = useState<EncorePerformance>(newPerformance(songId));
  const [videoInput, setVideoInput] = useState('');
  const [shortcutMsg, setShortcutMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [performancesFolderId, setPerformancesFolderId] = useState<string | null>(null);

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
      const parts: string[] = [];
      if (base.externalVideoUrl) parts.push(base.externalVideoUrl);
      else if (base.videoTargetDriveFileId) parts.push(base.videoTargetDriveFileId);
      setVideoInput(parts.join(''));
      setShortcutMsg(null);
    }
  }, [open, performance, songId]);

  useEffect(() => {
    if (!open || !googleAccessToken) {
      setPerformancesFolderId(null);
      return;
    }
    let cancelled = false;
    void ensureEncoreDriveLayout(googleAccessToken)
      .then((layout) => {
        if (!cancelled) setPerformancesFolderId(layout.performancesFolderId);
      })
      .catch(() => {
        if (!cancelled) setPerformancesFolderId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, googleAccessToken]);

  const syncVideoFromInput = useCallback(async () => {
    const parsed = parsePerformanceVideoInput(videoInput);
    if (parsed.kind === 'youtube') {
      setDraft((d) => ({
        ...d,
        externalVideoUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(parsed.videoId)}`,
        videoTargetDriveFileId: undefined,
      }));
      return;
    }
    if (parsed.kind === 'external') {
      setDraft((d) => ({ ...d, externalVideoUrl: parsed.url, videoTargetDriveFileId: undefined }));
      return;
    }
    if (parsed.kind === 'drive' && googleAccessToken) {
      setDraft((d) => ({ ...d, videoTargetDriveFileId: parsed.fileId, externalVideoUrl: undefined }));
      try {
        const meta = await driveGetFileMetadata(googleAccessToken, parsed.fileId);
        const day = isoDateFromDriveModified(meta.modifiedTime);
        if (day) setDraft((d) => ({ ...d, date: day }));
      } catch {
        /* ignore */
      }
      return;
    }
    if (parsed.kind === 'empty') {
      setDraft((d) => ({ ...d, externalVideoUrl: undefined, videoTargetDriveFileId: undefined }));
    }
  }, [videoInput, googleAccessToken]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void syncVideoFromInput();
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, syncVideoFromInput]);

  const handleSave = async () => {
    const now = new Date().toISOString();
    const target = draft.videoTargetDriveFileId?.trim();
    const finalDraft: EncorePerformance = {
      ...draft,
      venueTag: draft.venueTag.trim() || 'Venue',
      date: draft.date,
      accompanimentTags: draft.accompanimentTags && draft.accompanimentTags.length > 0 ? draft.accompanimentTags : undefined,
      externalVideoUrl: draft.externalVideoUrl?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      videoTargetDriveFileId: target || undefined,
      updatedAt: now,
      createdAt: draft.createdAt || now,
    };
    // savePerformance() in EncoreContext takes care of creating any missing shortcut
    // (for picked-from-Drive files) and renaming Drive files to the canonical name.
    await onSave(finalDraft);
    onClose();
  };

  const onPickVideoFile = async (file: File | null) => {
    if (!file || !googleAccessToken) return;
    setUploading(true);
    setShortcutMsg(null);
    try {
      const layout = await ensureEncoreDriveLayout(googleAccessToken);
      const date = isoDateFromFileLastModified(file);
      const { extension } = splitFileNameExtension(file.name);
      const desiredName = buildPerformanceVideoName(
        { date, venueTag: draft.venueTag },
        songForPerformance,
        extension,
      );
      const created = await driveUploadFileResumable(
        googleAccessToken,
        file,
        [layout.performancesFolderId],
        desiredName,
      );
      setVideoInput(created.id);
      setDraft((d) => ({
        ...d,
        videoTargetDriveFileId: created.id,
        externalVideoUrl: undefined,
        date,
      }));
      setShortcutMsg('Uploaded to your Performances folder in Drive.');
    } catch (e) {
      setShortcutMsg(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploading(false);
    }
  };

  const shortcutSeverity = shortcutMsg?.startsWith('Upload failed:') ? 'error' : 'info';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="perf-editor-title">
      <DialogTitle id="perf-editor-title" sx={encoreDialogTitleSx}>
        {performance ? 'Edit performance' : 'Log performance'}
        {songForPerformance ? (
          <Typography component="div" variant="body2" color="text.secondary" sx={{ mt: 0.75, fontWeight: 600, lineHeight: 1.45 }}>
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
        <Stack spacing={2.5}>
          <Box>
            <SongPageSubheading sx={{ mt: 0, mb: 1.25 }}>
              Video
            </SongPageSubheading>
            <TextField
              label="Link or file id"
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              onBlur={() => void syncVideoFromInput()}
              fullWidth
              multiline
              minRows={2}
              placeholder="https://… or paste a Drive id"
              helperText="YouTube, Drive, another URL, or a Drive file id. Browse or upload below if you like."
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
              {browseDriveVideoFileId ? (
                <Button
                  size="medium"
                  variant="outlined"
                  component="a"
                  href={driveFileWebUrl(browseDriveVideoFileId)}
                  target="_blank"
                  rel="noreferrer"
                  startIcon={<OpenInNewIcon />}
                  sx={{ flex: { sm: '1 1 0' }, minWidth: 0 }}
                >
                  Open in Drive
                </Button>
              ) : null}
              <Button
                size="medium"
                variant="outlined"
                disabled={!googleAccessToken}
                fullWidth={!browseDriveVideoFileId}
                onClick={() => {
                  if (!googleAccessToken) return;
                  void openEncoreGoogleDrivePicker({
                    accessToken: googleAccessToken,
                    title: performancesFolderId ? 'Performances folder' : 'Google Drive',
                    parentFolderId: performancesFolderId,
                    mimeTypes: ENCORE_DRIVE_VIDEO_MIME_TYPES,
                    onPicked: (files) => {
                      const id = files[0]?.id;
                      if (!id) return;
                      setVideoInput(id);
                      setDraft((d) => ({ ...d, videoTargetDriveFileId: id, externalVideoUrl: undefined }));
                      void (async () => {
                        try {
                          const meta = await driveGetFileMetadata(googleAccessToken, id);
                          const day = isoDateFromDriveModified(meta.modifiedTime);
                          if (day) setDraft((d) => ({ ...d, date: day }));
                        } catch {
                          /* ignore */
                        }
                      })();
                      setShortcutMsg('Selected video from Google Drive.');
                    },
                    onError: (m) => setShortcutMsg(m),
                  });
                }}
                sx={{ flex: browseDriveVideoFileId ? { sm: '1 1 0' } : undefined, minWidth: 0 }}
              >
                {performancesFolderId ? 'Browse Performances' : 'Browse Drive'}
              </Button>
            </Stack>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              size="medium"
              startIcon={<UploadFileIcon />}
              disabled={!googleAccessToken || uploading}
              sx={{ mt: 1 }}
            >
              {uploading ? 'Uploading…' : 'Upload video from device'}
              <input
                type="file"
                hidden
                accept="video/*,.mp4,.mov,.m4v,.webm,.mkv"
                onChange={(e) => void onPickVideoFile(e.target.files?.[0] ?? null)}
              />
            </Button>
            {!googleAccessToken ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, lineHeight: 1.45 }}>
                Sign in with Google to browse Drive or upload into your Performances folder.
              </Typography>
            ) : null}
          </Box>

          <Divider sx={{ borderColor: encoreHairline }} />

          <Stack spacing={2}>
            <TextField
              label="Date"
              type="date"
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Box>
              <Typography component="p" variant="caption" sx={{ ...encoreMutedCaptionSx, mb: 1, m: 0 }}>
                Accompaniment
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
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
                      sx={{ height: 30, fontWeight: 600 }}
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
              options={venueList}
              inputValue={draft.venueTag}
              onInputChange={(_, v) => setDraft((d) => ({ ...d, venueTag: v }))}
              renderInput={(params) => (
                <TextField {...params} label="Venue" placeholder="Start typing or pick a past venue" fullWidth />
              )}
            />
            <TextField
              label="Notes"
              value={draft.notes ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value || undefined }))}
              fullWidth
              multiline
              minRows={2}
              placeholder="Optional"
            />
          </Stack>

          {shortcutMsg ? (
            <Alert severity={shortcutSeverity} variant="outlined" sx={{ borderColor: encoreHairline }}>
              {shortcutSeverity === 'error' ? shortcutMsg.replace(/^Upload failed:\s*/i, '') : shortcutMsg}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={encoreDialogActionsSx}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
