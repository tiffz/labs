import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPerformanceVideoShortcut } from '../drive/performanceShortcut';
import { driveGetFileMetadata, driveUploadFileResumable } from '../drive/driveFetch';
import { ensureEncoreDriveLayout } from '../drive/bootstrapFolders';
import { driveFileWebUrl } from '../drive/driveWebUrls';
import { ENCORE_DRIVE_VIDEO_MIME_TYPES, openEncoreGoogleDrivePicker } from '../drive/googlePicker';
import { parseDriveFileIdFromUrlOrId } from '../drive/parseDriveFileUrl';
import type { EncorePerformance } from '../types';
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
    let videoShortcutDriveFileId = draft.videoShortcutDriveFileId;
    const target = draft.videoTargetDriveFileId?.trim();
    if (target && googleAccessToken && !videoShortcutDriveFileId) {
      try {
        const name = `Performance ${draft.date} ${draft.venueTag || 'video'}`.slice(0, 120);
        videoShortcutDriveFileId = await createPerformanceVideoShortcut(googleAccessToken, target, name);
        setShortcutMsg('Created a shortcut in your Encore_App/Performances folder.');
      } catch (e) {
        setShortcutMsg(
          `Shortcut not created (${e instanceof Error ? e.message : String(e)}). Performance will still be saved.`,
        );
      }
    }
    await onSave({
      ...draft,
      venueTag: draft.venueTag.trim() || 'Venue',
      date: draft.date,
      videoTargetDriveFileId: target || undefined,
      videoShortcutDriveFileId,
      externalVideoUrl: draft.externalVideoUrl?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      updatedAt: now,
      createdAt: draft.createdAt || now,
    });
    onClose();
  };

  const onPickVideoFile = async (file: File | null) => {
    if (!file || !googleAccessToken) return;
    setUploading(true);
    setShortcutMsg(null);
    try {
      const layout = await ensureEncoreDriveLayout(googleAccessToken);
      const created = await driveUploadFileResumable(googleAccessToken, file, [layout.performancesFolderId]);
      setVideoInput(created.id);
      setDraft((d) => ({
        ...d,
        videoTargetDriveFileId: created.id,
        externalVideoUrl: undefined,
        date: isoDateFromFileLastModified(file),
      }));
      setShortcutMsg('Uploaded to your Performances folder in Drive.');
    } catch (e) {
      setShortcutMsg(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="perf-editor-title">
      <DialogTitle id="perf-editor-title">{performance ? 'Edit performance' : 'Log performance'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Video (YouTube link, Drive link, other URL, or Drive file id)"
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            onBlur={() => void syncVideoFromInput()}
            fullWidth
            multiline
            minRows={2}
            helperText="Paste a link or id, or upload a file from your device."
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {browseDriveVideoFileId ? (
              <Button
                size="small"
                variant="outlined"
                component="a"
                href={driveFileWebUrl(browseDriveVideoFileId)}
                target="_blank"
                rel="noreferrer"
                startIcon={<OpenInNewIcon />}
              >
                Open Drive file
              </Button>
            ) : null}
            <Button
              size="small"
              variant="outlined"
              disabled={!googleAccessToken}
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
            >
              {performancesFolderId ? 'Browse Performances in Drive' : 'Browse My Drive'}
            </Button>
          </Box>
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />} disabled={!googleAccessToken || uploading}>
            {uploading ? 'Uploading…' : 'Upload video file'}
            <input
              type="file"
              hidden
              accept="video/*,.mp4,.mov,.m4v,.webm,.mkv"
              onChange={(e) => void onPickVideoFile(e.target.files?.[0] ?? null)}
            />
          </Button>
          <TextField
            label="Date"
            type="date"
            value={draft.date}
            onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
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
          />
          {shortcutMsg && (
            <Typography variant="caption" color="text.secondary">
              {shortcutMsg}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => void handleSave()} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
