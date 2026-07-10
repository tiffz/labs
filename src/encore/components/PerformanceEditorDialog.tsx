import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState, Fragment, type ReactElement } from 'react';
import { driveGetFileMetadata, driveUploadFileResumable } from '../drive/driveFetch';
import { useEncoreDriveUploadDedup } from '../context/EncoreDriveUploadDedupContext';
import { ensureEncoreDriveLayout } from '../drive/bootstrapFolders';
import { resolveDriveUploadFolderId } from '../drive/resolveDriveUploadFolder';
import { parseDriveFileIdFromUrlOrId } from '../drive/parseDriveFileUrl';
import { buildPerformanceVideoName, splitFileNameExtension } from '../drive/performanceVideoNaming';
import { suggestPerformanceVenueFromFile } from '../import/venueCatalogMatch';
import {
  calendarDateFromIsoTimestamp,
  guessIsoDateFromFreeText,
} from '../import/guessIsoDateFromFreeText';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
} from '../theme/encoreUiTokens';
import { useEncoreBlockingJobs } from '../context/EncoreBlockingJobContext';
import { useEncore } from '../context/EncoreContext';
import type { EncorePerformance } from '../types';
import { parsePerformanceVideoInput } from '../utils/parsePerformanceVideoInput';
import {
  getPrimaryPerformanceVideo,
  normalizeEncorePerformance,
  newPerformanceVideo,
  syncPerformanceLegacyVideoFields,
} from '../utils/performanceVideoModel';
import { PerformanceContextSummary } from './performance/PerformanceContextSummary';
import { PerformanceEditorSection, PERFORMANCE_EDITOR_SECTION_FIELD_SPACING } from './performance/PerformanceEditorSection';
import { PerformanceMetadataSection } from './performance/PerformanceMetadataSection';
import { PerformanceAddVideosPanel } from './performance/PerformanceAddVideosPanel';
import { filterAcceptedPerformanceVideoFiles } from './performance/filterAcceptedPerformanceVideoFiles';
import { PerformanceEditorVideoCard } from './performance/PerformanceEditorVideoCard';
import { PerformanceVideoCompactRow } from './performance/PerformanceVideoCompactRow';
import { isVideoLinkInputDirty, videoToLinkInput } from './performance/performanceVideoLinkInput';
import type { PerformanceAddVideoSourceStripProps } from './performance/PerformanceAddVideoSourceStrip';
import { PerformanceEditorVideosDropZone } from './performance/PerformanceEditorVideosDropZone';
import { setEncoreDropSurface } from './song/encoreDropSurface';

type PendingLinkVideo = {
  externalVideoUrl?: string;
  videoTargetDriveFileId?: string;
  videoShortcutDriveFileId?: string;
  displayName?: string;
};

function buildVideoLinkDrafts(videos: { id: string; externalVideoUrl?: string; videoTargetDriveFileId?: string; videoShortcutDriveFileId?: string }[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const video of videos) {
    map[video.id] = videoToLinkInput(video);
  }
  return map;
}

function newPerformance(songId: string): EncorePerformance {
  // ISO timestamps for createdAt/updatedAt are stored as instants and intentionally use UTC
  // (`toISOString`). The user-visible `date` field, however, is the **local calendar day** the
  // performance happened — slicing `YYYY-MM-DD` out of `toISOString()` would tip into tomorrow
  // any time the user logs an evening performance from a timezone west of UTC.
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    songId,
    date: calendarDateFromIsoTimestamp(),
    venueTag: '',
    createdAt: now,
    updatedAt: now,
  };
}

function isoDateFromDriveModified(modifiedTime?: string): string | null {
  if (!modifiedTime) return null;
  const trimmed = modifiedTime.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return calendarDateFromIsoTimestamp(trimmed);
}

function isoDateFromDriveFileMeta(meta: { createdTime?: string; modifiedTime?: string }): string | null {
  return isoDateFromDriveModified(meta.createdTime) ?? isoDateFromDriveModified(meta.modifiedTime);
}

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
  /**
   * File handed in by the parent on open — typically a video the user dragged onto the song
   * page's performances section. The dialog stages it the same way `DragDropFileUpload`
   * would; identity comparison guards against re-staging on unrelated re-renders, so callers
   * can keep the prop set across renders without worry.
   */
  initialLocalVideoFile?: File | null;
  /** When true (edit mode), metadata fields stay read-only and saves append videos only. */
  addVideoMode?: boolean;
  onClose: () => void;
  onSave: (p: EncorePerformance) => Promise<void>;
  /** When set (edit mode only), shows a de-emphasized control to remove this row from the log (Drive files stay). */
  onDelete?: (id: string) => Promise<void>;
}): ReactElement {
  const {
    open,
    performance,
    songId,
    googleAccessToken,
    venueOptions,
    initialLocalVideoFile,
    addVideoMode = false,
    onClose,
    onSave,
    onDelete,
  } = props;
  const { songs, repertoireExtras } = useEncore();
  const { withBlockingJob } = useEncoreBlockingJobs();
  const { uploadWithDuplicateCheck, registerUploadedDriveFile } = useEncoreDriveUploadDedup();
  const songForPerformance = useMemo(() => songs.find((s) => s.id === songId) ?? null, [songs, songId]);
  const [draft, setDraft] = useState<EncorePerformance>(newPerformance(songId));
  const [videoInput, setVideoInput] = useState('');
  const [shortcutMsg, setShortcutMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  /** Device clips queued for upload on save (log + add-video). */
  const [pendingLocalVideoFiles, setPendingLocalVideoFiles] = useState<File[]>([]);
  /** Staged link (YouTube / Drive) for add-video mode — appended on save only. */
  const [pendingLinkVideo, setPendingLinkVideo] = useState<PendingLinkVideo | null>(null);
  /** Per saved-video link field values while editing a performance. */
  const [videoLinkDrafts, setVideoLinkDrafts] = useState<Record<string, string>>({});
  /** When set, drive link feedback is shown on that saved video row only. */
  const [inlineLinkFeedbackVideoId, setInlineLinkFeedbackVideoId] = useState<string | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  /** Drive file id (normalized) tied to this row when the dialog opened — avoid overwriting the log date from Drive metadata on edit. */
  const initialDriveFileIdRef = useRef<string>('');
  const driveLookupGen = useRef(0);
  const [driveLinkFeedback, setDriveLinkFeedback] = useState<PerfDriveLinkFeedback>(null);
  const metadataLocked = Boolean(performance && addVideoMode);

  const venueList = useMemo(() => [...new Set(venueOptions.map((v) => v.trim()).filter(Boolean))].sort(), [venueOptions]);

  const browseDriveVideoFileId = useMemo(() => {
    const fromInput = parseDriveFileIdFromUrlOrId(videoInput.trim());
    if (fromInput) return fromInput;
    const fromDraft = draft.videoTargetDriveFileId?.trim();
    return fromDraft ? parseDriveFileIdFromUrlOrId(fromDraft) : null;
  }, [videoInput, draft.videoTargetDriveFileId]);

  useEffect(() => {
    if (open) {
      const base = normalizeEncorePerformance(performance ? { ...performance } : newPerformance(songId));
      setDraft(base);
      const primary = base.videos?.find((v) => v.id === base.primaryVideoId) ?? base.videos?.[0];
      initialDriveFileIdRef.current = normalizeDriveFileIdForCompare(primary?.videoTargetDriveFileId);
      if (addVideoMode) {
        setVideoLinkDrafts({});
      } else {
        setVideoLinkDrafts(buildVideoLinkDrafts(base.videos ?? []));
      }
      setVideoInput('');
      setShortcutMsg(null);
      setPendingLocalVideoFiles([]);
      setPendingLinkVideo(null);
      setInlineLinkFeedbackVideoId(null);
      setRemoveConfirmOpen(false);
      setDriveLinkFeedback(null);
    }
  }, [open, performance, songId, initialLocalVideoFile, addVideoMode]);

  useEffect(() => {
    if (open) {
      setEncoreDropSurface('performance-modal');
      return () => setEncoreDropSurface(null);
    }
    setEncoreDropSurface(null);
  }, [open]);

  const applyLinkedVideo = useCallback(
    (
      fields: {
        externalVideoUrl?: string;
        videoTargetDriveFileId?: string;
        videoShortcutDriveFileId?: string;
      },
      opts?: { targetVideoId?: string; appendNew?: boolean },
    ) => {
      setDraft((d) => {
        const normalized = normalizeEncorePerformance(d);
        const existing = [...(normalized.videos ?? [])];
        if (metadataLocked || opts?.appendNew) {
          const appended = newPerformanceVideo({
            externalVideoUrl: fields.externalVideoUrl,
            videoTargetDriveFileId: fields.videoTargetDriveFileId,
            videoShortcutDriveFileId: fields.videoShortcutDriveFileId,
          });
          return syncPerformanceLegacyVideoFields({
            ...d,
            videos: [...existing, appended],
            primaryVideoId: normalized.primaryVideoId ?? existing[0]?.id ?? appended.id,
          });
        }
        if (opts?.targetVideoId) {
          const idx = existing.findIndex((v) => v.id === opts.targetVideoId);
          if (idx >= 0) {
            const nextVideos = [...existing];
            nextVideos[idx] = {
              ...nextVideos[idx]!,
              externalVideoUrl: fields.externalVideoUrl,
              videoTargetDriveFileId: fields.videoTargetDriveFileId,
              videoShortcutDriveFileId: fields.videoShortcutDriveFileId,
            };
            return syncPerformanceLegacyVideoFields({
              ...d,
              videos: nextVideos,
              primaryVideoId: normalized.primaryVideoId ?? nextVideos[0]?.id,
            });
          }
        }
        const primaryId = normalized.primaryVideoId ?? existing[0]?.id;
        if (primaryId) {
          const idx = existing.findIndex((v) => v.id === primaryId);
          const updated = {
            ...(idx >= 0 ? existing[idx]! : existing[0]!),
            externalVideoUrl: fields.externalVideoUrl,
            videoTargetDriveFileId: fields.videoTargetDriveFileId,
            videoShortcutDriveFileId: fields.videoShortcutDriveFileId,
          };
          const nextVideos = [...existing];
          if (idx >= 0) nextVideos[idx] = updated;
          else if (nextVideos[0]) nextVideos[0] = updated;
          return syncPerformanceLegacyVideoFields({ ...d, videos: nextVideos, primaryVideoId: primaryId });
        }
        const created = newPerformanceVideo(fields);
        return syncPerformanceLegacyVideoFields({
          ...d,
          videos: [created],
          primaryVideoId: created.id,
        });
      });
    },
    [metadataLocked],
  );

  type SyncVideoLinkOpts = {
    targetVideoId?: string;
    appendNew?: boolean;
    feedbackVideoId?: string | null;
    finishEditor?: boolean;
  };

  const syncVideoLinkInput = useCallback(
    async (input: string, opts?: SyncVideoLinkOpts) => {
      const existingVideoCount = normalizeEncorePerformance(draft).videos?.length ?? 0;
      const linkApplyOpts = metadataLocked
        ? ({ appendNew: true } as const)
        : opts?.targetVideoId
          ? ({ targetVideoId: opts.targetVideoId } as const)
          : opts?.appendNew || existingVideoCount > 0
            ? ({ appendNew: true } as const)
            : undefined;

      const applyFeedback = (feedback: PerfDriveLinkFeedback) => {
        if (opts?.feedbackVideoId) {
          setInlineLinkFeedbackVideoId(opts.feedbackVideoId);
        } else if (opts?.feedbackVideoId === null) {
          setInlineLinkFeedbackVideoId(null);
        }
        setDriveLinkFeedback(feedback);
      };

      const clearAddPanelLink = () => {
        setVideoInput('');
        setDriveLinkFeedback(null);
        setInlineLinkFeedbackVideoId(null);
      };

      const parsed = parsePerformanceVideoInput(input);
      if (parsed.kind === 'youtube') {
        applyFeedback(null);
        setPendingLocalVideoFiles([]);
        if (metadataLocked) {
          setPendingLinkVideo({
            externalVideoUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(parsed.videoId)}`,
            displayName: 'YouTube video',
          });
          setVideoInput('');
          setDriveLinkFeedback(null);
          return;
        }
        applyLinkedVideo(
          {
            externalVideoUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(parsed.videoId)}`,
            videoTargetDriveFileId: undefined,
            videoShortcutDriveFileId: undefined,
          },
          linkApplyOpts,
        );
        if (linkApplyOpts?.appendNew && opts?.finishEditor !== false) clearAddPanelLink();
        return;
      }
      if (parsed.kind === 'external') {
        applyFeedback(null);
        setPendingLocalVideoFiles([]);
        if (metadataLocked) {
          setPendingLinkVideo({ externalVideoUrl: parsed.url, displayName: 'External video' });
          setVideoInput('');
          setDriveLinkFeedback(null);
          return;
        }
        applyLinkedVideo(
          { externalVideoUrl: parsed.url, videoTargetDriveFileId: undefined, videoShortcutDriveFileId: undefined },
          linkApplyOpts,
        );
        if (linkApplyOpts?.appendNew && opts?.finishEditor !== false) clearAddPanelLink();
        return;
      }
      if (parsed.kind === 'drive-folder') {
        setPendingLocalVideoFiles([]);
        applyFeedback({ kind: 'folder' });
        return;
      }
      if (parsed.kind === 'drive') {
        setPendingLocalVideoFiles([]);
        const fileIdForMeta = parsed.fileId;
        const gen = ++driveLookupGen.current;
        const isNewDriveLink = fileIdForMeta !== initialDriveFileIdRef.current;
        const shouldSetDateFromDriveMeta = !metadataLocked && (performance == null || isNewDriveLink);
        if (!metadataLocked) {
          applyLinkedVideo(
            { videoTargetDriveFileId: fileIdForMeta, externalVideoUrl: undefined, videoShortcutDriveFileId: undefined },
            linkApplyOpts,
          );
        }

        if (!googleAccessToken) {
          if (metadataLocked) {
            setPendingLinkVideo({ videoTargetDriveFileId: fileIdForMeta, displayName: 'Drive video' });
          }
          applyFeedback({ kind: 'needs_signin' });
          return;
        }

        applyFeedback({ kind: 'loading' });
        try {
          const meta = await driveGetFileMetadata(googleAccessToken, fileIdForMeta);
          if (gen !== driveLookupGen.current) return;
          if (isDriveFolderMetadata(meta)) {
            applyFeedback({ kind: 'folder' });
            return;
          }
          const displayName = meta.name?.trim() || 'Untitled';
          applyFeedback({ kind: 'ok', name: displayName });
          if (metadataLocked) {
            setPendingLinkVideo({
              videoTargetDriveFileId: fileIdForMeta,
              displayName,
            });
            setVideoInput('');
            return;
          }
          if (linkApplyOpts?.appendNew && opts?.finishEditor !== false) clearAddPanelLink();
          const day = isoDateFromDriveFileMeta(meta);
          if (day && shouldSetDateFromDriveMeta) {
            setDraft((d) => ({ ...d, date: day }));
          }
          const guessedVenue = suggestPerformanceVenueFromFile(venueList, meta.name ?? '').trim();
          if (guessedVenue && shouldSetDateFromDriveMeta) {
            setDraft((d) => ({
              ...d,
              venueTag: d.venueTag.trim() ? d.venueTag : guessedVenue,
            }));
          }
        } catch {
          if (gen !== driveLookupGen.current) return;
          applyFeedback({
            kind: 'error',
            message: 'Could not open this in Drive. Check the link and try again.',
          });
        }
        return;
      }
      if (parsed.kind === 'empty') {
        applyFeedback(null);
        if (metadataLocked) {
          setPendingLinkVideo(null);
          return;
        }
        if (opts?.targetVideoId) {
          applyLinkedVideo(
            { externalVideoUrl: undefined, videoTargetDriveFileId: undefined, videoShortcutDriveFileId: undefined },
            { targetVideoId: opts.targetVideoId },
          );
          return;
        }
        if (existingVideoCount > 0 || performance) return;
        setDraft((d) =>
          syncPerformanceLegacyVideoFields({
            ...d,
            externalVideoUrl: undefined,
            videoTargetDriveFileId: undefined,
            videoShortcutDriveFileId: undefined,
            videos: undefined,
            primaryVideoId: undefined,
          }),
        );
      }
    },
    [googleAccessToken, performance, venueList, applyLinkedVideo, metadataLocked, draft],
  );

  const syncVideoFromInput = useCallback(
    () => syncVideoLinkInput(videoInput, { feedbackVideoId: null }),
    [syncVideoLinkInput, videoInput],
  );

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
    let videos = [...(normalizeEncorePerformance(draft).videos ?? [])];
    let primaryVideoId = draft.primaryVideoId ?? videos[0]?.id;

    if (metadataLocked && pendingLocalVideoFiles.length === 0 && !pendingLinkVideo) {
      setShortcutMsg('Choose a video before saving.');
      return;
    }

    const deviceFilesToUpload = [...pendingLocalVideoFiles];

    if (deviceFilesToUpload.length > 0) {
      if (!googleAccessToken) {
        setShortcutMsg('Sign in with Google to upload the video from your device.');
        return;
      }
      setUploading(true);
      setShortcutMsg(null);
      try {
        await withBlockingJob('Uploading performance video…', async (setProgress) => {
          setProgress(0);
          const layout = await ensureEncoreDriveLayout(googleAccessToken);
          const parent =
            resolveDriveUploadFolderId('performances', layout, repertoireExtras.driveUploadFolderOverrides) ??
            layout.performancesFolderId;
          if (!parent?.trim()) {
            throw new Error('Performances folder is not ready yet.');
          }
          const venueForNaming = draft.venueTag.trim() || 'Venue';
          const perfLabel = `${draft.venueTag.trim() || 'Venue'} · Video`;
          const fileCount = deviceFilesToUpload.length;

          for (let fileIndex = 0; fileIndex < fileCount; fileIndex += 1) {
            const file = deviceFilesToUpload[fileIndex]!;
            const { extension } = splitFileNameExtension(file.name);
            const desiredName = buildPerformanceVideoName(
              { date: draft.date, venueTag: venueForNaming },
              songForPerformance,
              extension,
            );
            const uploadedId = await uploadWithDuplicateCheck({
              file,
              uploadNew: async () => {
                const created = await driveUploadFileResumable(
                  googleAccessToken,
                  file,
                  [parent.trim()],
                  desiredName,
                  {
                    onProgress: ({ bytesSent, bytesTotal }) => {
                      const fileFrac = bytesTotal > 0 ? bytesSent / bytesTotal : 0;
                      setProgress((fileIndex + fileFrac) / fileCount);
                    },
                  },
                );
                await registerUploadedDriveFile(created.id, perfLabel);
                return created.id;
              },
              reuseExisting: async (driveFileId) => {
                await registerUploadedDriveFile(driveFileId, perfLabel);
                return driveFileId;
              },
            });
            if (!uploadedId) {
              setUploading(false);
              return;
            }
            setProgress((fileIndex + 1) / fileCount);
            const uploadedVideo = newPerformanceVideo({ videoTargetDriveFileId: uploadedId });
            if (videos.length === 0) {
              videos = [uploadedVideo];
              primaryVideoId = uploadedVideo.id;
            } else {
              videos = [...videos, uploadedVideo];
              primaryVideoId = primaryVideoId ?? videos[0]?.id;
            }
          }
          setProgress(1);
        });
      } catch (e) {
        setShortcutMsg(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
        setUploading(false);
        return;
      }
      setUploading(false);
    } else if (pendingLinkVideo) {
      videos = [...videos, newPerformanceVideo(pendingLinkVideo)];
      primaryVideoId = primaryVideoId ?? videos[0]?.id;
    }

    const withVideos: EncorePerformance = syncPerformanceLegacyVideoFields({
      ...draft,
      venueTag: draft.venueTag.trim() || 'Venue',
      date: draft.date,
      accompanimentTags:
        draft.accompanimentTags && draft.accompanimentTags.length > 0 ? draft.accompanimentTags : undefined,
      notes: draft.notes?.trim() || undefined,
      videos: videos.length > 0 ? videos : undefined,
      primaryVideoId: primaryVideoId || undefined,
      updatedAt: now,
      createdAt: draft.createdAt || now,
    });
    await onSave(withVideos);
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

  const appendLocalVideoFiles = useCallback(
    (files: File[]) => {
      if (!googleAccessToken || files.length === 0) return;
      const valid = files.filter((file) => file.size > 0);
      if (valid.length < files.length) {
        setShortcutMsg('That file is empty (0 bytes). Pick a different video.');
        return;
      }
      setDriveLinkFeedback(null);
      setPendingLinkVideo(null);
      setVideoInput('');
      setPendingLocalVideoFiles((prev) => {
        if (!metadataLocked && prev.length === 0 && valid[0]) {
          const file = valid[0];
          setDraft((d) => {
            const guessedVenue = suggestPerformanceVenueFromFile(venueList, file.name);
            const dateFromFileName = performance == null ? guessIsoDateFromFreeText(file.name) : null;
            return {
              ...d,
              date: dateFromFileName ?? d.date,
              venueTag: d.venueTag.trim() ? d.venueTag : guessedVenue || d.venueTag,
            };
          });
        }
        return [...prev, ...valid];
      });
      setShortcutMsg(null);
    },
    [googleAccessToken, performance, venueList, metadataLocked],
  );

  /**
   * Pick up a file the parent staged on our behalf — typically a video dragged onto the song
   * page's performances section. We track the last-consumed File identity so unrelated parent
   * re-renders that keep the same prop value don't re-stage and clobber the user's edits.
   * Cleared on close so the next open with a fresh file always re-stages.
   */
  const consumedInitialFileRef = useRef<File | null>(null);
  useEffect(() => {
    if (!open) {
      consumedInitialFileRef.current = null;
      return;
    }
    if (!initialLocalVideoFile) return;
    if (consumedInitialFileRef.current === initialLocalVideoFile) return;
    consumedInitialFileRef.current = initialLocalVideoFile;
    appendLocalVideoFiles([initialLocalVideoFile]);
  }, [open, initialLocalVideoFile, appendLocalVideoFiles]);

  const draftVideos = useMemo(() => normalizeEncorePerformance(draft).videos ?? [], [draft]);
  const primaryVideo = useMemo(() => getPrimaryPerformanceVideo(draft), [draft]);

  const handleRemoveDeviceFileAt = useCallback((index: number) => {
    setPendingLocalVideoFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemovePendingLinkVideo = useCallback(() => {
    setPendingLinkVideo(null);
    setVideoInput('');
    setDriveLinkFeedback(null);
  }, []);

  const handleKeepExistingVideo = useCallback(() => {
    setPendingLocalVideoFiles([]);
    setPendingLinkVideo(null);
    setDriveLinkFeedback(null);
    const primary = getPrimaryPerformanceVideo(draft);
    setVideoInput(primary ? videoToLinkInput(primary) : '');
  }, [draft]);

  const handleInlineVideoLinkBlur = useCallback(
    (videoId: string) => {
      void syncVideoLinkInput(videoLinkDrafts[videoId] ?? '', {
        targetVideoId: videoId,
        feedbackVideoId: videoId,
      });
    },
    [syncVideoLinkInput, videoLinkDrafts],
  );

  const handleRevertInlineVideoLink = useCallback(
    (video: { id: string; externalVideoUrl?: string; videoTargetDriveFileId?: string; videoShortcutDriveFileId?: string }) => {
      setVideoLinkDrafts((prev) => ({ ...prev, [video.id]: videoToLinkInput(video) }));
      setInlineLinkFeedbackVideoId((current) => {
        if (current === video.id) setDriveLinkFeedback(null);
        return current === video.id ? null : current;
      });
    },
    [],
  );

  const routeDroppedVideoFiles = useCallback(
    (files: File[]) => {
      if (!googleAccessToken) {
        setShortcutMsg('Sign in with Google to upload the video from your device.');
        return;
      }
      const accepted = filterAcceptedPerformanceVideoFiles(files);
      if (accepted.length === 0) return;
      appendLocalVideoFiles(accepted);
    },
    [googleAccessToken, appendLocalVideoFiles],
  );

  const videoDropEnabled = Boolean(open && googleAccessToken && !uploading);

  const stagedLinkLabel =
    pendingLinkVideo?.displayName ??
    (driveLinkFeedback?.kind === 'ok' ? driveLinkFeedback.name : null) ??
    (videoInput.trim() || null);

  const isEditingSavedPerformance = Boolean(performance && !metadataLocked);
  const primaryVideoIdInDraft = draft.primaryVideoId ?? draftVideos[0]?.id;

  const addVideoSourceStrip: PerformanceAddVideoSourceStripProps = useMemo(
    () => ({
      videoInput,
      onVideoInputChange: setVideoInput,
      onVideoInputBlur: () => void syncVideoFromInput(),
      driveLinkFeedback,
      browseDriveVideoFileId,
      onPickFiles: routeDroppedVideoFiles,
      pickerDisabled: !googleAccessToken || uploading,
      uploading,
      hasQueuedVideos:
        draftVideos.length > 0 || pendingLocalVideoFiles.length > 0 || Boolean(pendingLinkVideo),
    }),
    [
      videoInput,
      syncVideoFromInput,
      driveLinkFeedback,
      browseDriveVideoFileId,
      routeDroppedVideoFiles,
      googleAccessToken,
      uploading,
      draftVideos.length,
      pendingLocalVideoFiles.length,
      pendingLinkVideo,
    ],
  );

  const pendingLinkRows = useMemo(
    () =>
      metadataLocked && pendingLinkVideo
        ? [
            {
              id: 'pending-link',
              label: stagedLinkLabel ?? 'Linked video',
              onRemove: handleRemovePendingLinkVideo,
            },
          ]
        : [],
    [metadataLocked, pendingLinkVideo, stagedLinkLabel, handleRemovePendingLinkVideo],
  );

  const buildInlineLinkProps = useCallback(
    (video: (typeof draftVideos)[number]) => ({
      value: videoLinkDrafts[video.id] ?? videoToLinkInput(video),
      onChange: (value: string) => setVideoLinkDrafts((prev) => ({ ...prev, [video.id]: value })),
      onBlur: () => handleInlineVideoLinkBlur(video.id),
      onRevert: () => handleRevertInlineVideoLink(video),
      showRevert: isVideoLinkInputDirty(video, videoLinkDrafts[video.id] ?? videoToLinkInput(video)),
      driveLinkFeedback: inlineLinkFeedbackVideoId === video.id ? driveLinkFeedback : null,
      browseDriveVideoFileId:
        parseDriveFileIdFromUrlOrId((videoLinkDrafts[video.id] ?? '').trim()) ??
        parseDriveFileIdFromUrlOrId(video.videoTargetDriveFileId ?? '') ??
        parseDriveFileIdFromUrlOrId(video.videoShortcutDriveFileId ?? ''),
      disabled: uploading,
    }),
    [
      videoLinkDrafts,
      handleInlineVideoLinkBlur,
      handleRevertInlineVideoLink,
      inlineLinkFeedbackVideoId,
      driveLinkFeedback,
      uploading,
    ],
  );

  const handleRemoveSavedVideo = useCallback(
    (videoId: string) => {
      setVideoLinkDrafts((prev) => {
        const next = { ...prev };
        delete next[videoId];
        return next;
      });
      if (inlineLinkFeedbackVideoId === videoId) {
        setInlineLinkFeedbackVideoId(null);
        setDriveLinkFeedback(null);
      }
      setDraft((d) => {
        const normalized = normalizeEncorePerformance(d);
        const nextVideos = (normalized.videos ?? []).filter((v) => v.id !== videoId);
        const nextPrimary =
          d.primaryVideoId === videoId ? nextVideos[0]?.id : d.primaryVideoId ?? nextVideos[0]?.id;
        return syncPerformanceLegacyVideoFields({
          ...d,
          videos: nextVideos.length > 0 ? nextVideos : undefined,
          primaryVideoId: nextPrimary,
          externalVideoUrl: undefined,
          videoTargetDriveFileId: undefined,
          videoShortcutDriveFileId: undefined,
        });
      });
    },
    [inlineLinkFeedbackVideoId],
  );

  const renderVideoStack = (opts: { hideSavedVideos?: boolean }) => (
    <Stack spacing={PERFORMANCE_EDITOR_SECTION_FIELD_SPACING}>
      {!opts.hideSavedVideos
        ? draftVideos.map((video) =>
            isEditingSavedPerformance ? (
              <PerformanceEditorVideoCard
                key={video.id}
                video={video}
                performanceShell={draft}
                isPrimary={video.id === primaryVideoIdInDraft}
                googleAccessToken={googleAccessToken}
                inlineLink={buildInlineLinkProps(video)}
                uploading={uploading}
                playbackActive={open}
                onSetPrimary={
                  draftVideos.length > 1
                    ? () => setDraft((d) => syncPerformanceLegacyVideoFields({ ...d, primaryVideoId: video.id }))
                    : undefined
                }
                onRemove={() => handleRemoveSavedVideo(video.id)}
              />
            ) : (
              <PerformanceVideoCompactRow
                key={video.id}
                video={video}
                performanceShell={draft}
                isPrimary={video.id === primaryVideoIdInDraft}
                googleAccessToken={googleAccessToken}
                onSetPrimary={
                  draftVideos.length > 1
                    ? () => setDraft((d) => syncPerformanceLegacyVideoFields({ ...d, primaryVideoId: video.id }))
                    : undefined
                }
                onRemove={() => handleRemoveSavedVideo(video.id)}
              />
            ),
          )
        : null}
      <PerformanceAddVideosPanel
        deviceFiles={pendingLocalVideoFiles}
        linkRows={pendingLinkRows}
        uploading={uploading}
        onRemoveDeviceFileAt={handleRemoveDeviceFileAt}
        sourceStrip={addVideoSourceStrip}
        playbackActive={open}
        onKeepExistingVideo={
          primaryVideo && !metadataLocked && pendingLocalVideoFiles.length === 1
            ? handleKeepExistingVideo
            : undefined
        }
      />
    </Stack>
  );

  const shortcutSeverity = shortcutMsg?.startsWith('Upload failed:') ? 'error' : 'info';

  return (
    <Fragment>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        aria-labelledby="perf-editor-title"
      >
        <DialogTitle id="perf-editor-title" sx={encoreDialogTitleSx}>
          {metadataLocked ? 'Add video to performance' : performance ? 'Edit performance' : 'Log performance'}
          {songForPerformance && !metadataLocked ? (
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
        <Stack spacing={2.5}>
          {metadataLocked && performance ? (
            <>
              <PerformanceContextSummary
                performance={performance}
                googleAccessToken={googleAccessToken}
                song={
                  songForPerformance
                    ? {
                        title: songForPerformance.title,
                        artist: songForPerformance.artist,
                        albumArtUrl: songForPerformance.albumArtUrl,
                      }
                    : null
                }
              />
              <PerformanceEditorSection title="Video" caption="Drop a file anywhere below, or add from the panel.">
                <PerformanceEditorVideosDropZone
                  enabled={videoDropEnabled}
                  onDropVideos={routeDroppedVideoFiles}
                  dropHint="Drop to add video"
                >
                  {renderVideoStack({ hideSavedVideos: true })}
                </PerformanceEditorVideosDropZone>
              </PerformanceEditorSection>
            </>
          ) : (
            <>
              <PerformanceEditorSection
                title="Performance details"
                caption="When and where you played this song."
              >
                <PerformanceMetadataSection
                  draft={draft}
                  venueList={venueList}
                  onChange={(next) => setDraft(next)}
                />
              </PerformanceEditorSection>
              <PerformanceEditorSection
                title="Videos"
                caption={
                  isEditingSavedPerformance
                    ? 'Saved clips upload on save. Drop a file anywhere below to add more.'
                    : 'Drop a file anywhere below, or add from the panel.'
                }
              >
                <PerformanceEditorVideosDropZone
                  enabled={videoDropEnabled}
                  onDropVideos={routeDroppedVideoFiles}
                  dropHint="Drop to add video"
                >
                  {renderVideoStack({})}
                </PerformanceEditorVideosDropZone>
              </PerformanceEditorSection>
            </>
          )}
          {shortcutMsg ? (
            <Alert
              severity={shortcutSeverity}
              variant="outlined"
              sx={{ whiteSpace: 'pre-line', py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}
            >
              {shortcutSeverity === 'error' ? shortcutMsg.replace(/^Upload failed:\s*/i, '') : shortcutMsg}
            </Alert>
          ) : null}
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
          {performance && onDelete && !metadataLocked ? (
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
            {metadataLocked ? 'Add video' : 'Save'}
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
