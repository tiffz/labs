import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { PracticeResourcesPanel } from '../../components/song/PracticeResourcesPanel';
import type { PracticeResourceGroup } from '../../components/song/practiceResourceGroups';
import { EncoreResourceLinksPanel } from '../../components/EncoreResourceLinksPanel';
import { EncoreMediaLinkRow } from '../../ui/EncoreMediaLinkRow';
import { EncoreStaticResourceHoverCard } from '../../components/EncoreStreamingHoverCard';
import { useEncoreAuth } from '../../context/EncoreAuthContext';
import { useEncoreDriveUploadDedup } from '../../context/EncoreDriveUploadDedupContext';
import {
  encoreResourceDownloadDisabled,
  encoreResourceDownloadTargetFromTake,
  triggerEncoreResourceDownload,
} from '../../drive/encoreResourceDownload';
import { uploadOriginalSongReference } from '../originalsReferenceUpload';
import { inferMediaMimeType } from '../../../shared/drive/inferMediaMimeType';
import {
  addResourceFromUrl,
  createResourceFromLocalFile,
} from '../../repertoire/encoreResourceLinks';
import { scheduleEncoreResourceLabelEnrichment } from '../../repertoire/encoreResourceLinkMeta';
import { extractFirstUrlFromDataTransfer } from '../../components/song/songMediaUrlDrop';
import { shouldEncoreMediaHubHighlightDrag } from '../../components/song/encoreDropSurface';
import { encoreMediaHubAddButtonSx, practiceResourceChipFieldSx } from '../../theme/encoreUiTokens';
import type { EncoreMiscResource } from '../../types';
import { useEncoreOriginalsPlayback } from '../context/EncoreOriginalsPlaybackContext';
import {
  buildOriginalTakeFromFile,
  uploadOriginalTakeToDrive,
} from '../originalTakeUpload';
import {
  deleteOriginalTakeBlob,
  hasOriginalTakeBlob,
  originalTakeBlobKey,
  saveOriginalTakeBlob,
} from '../originalTakeLocalAudio';
import {
  eligibleOriginalsSlotsForDragDataTransfer,
  originalsFileDragRelevant,
} from '../originalsSongFileDrag';
import {
  ORIGINALS_BRAINSTORM_FILE_ACCEPT,
  ORIGINALS_DEMO_TAKE_AUDIO_ACCEPT,
  ORIGINALS_REFERENCE_FILE_ACCEPT,
  ORIGINALS_SONG_FILE_SLOT_META,
  type OriginalsSongFileSlot,
} from '../originalsSongFileSlots';
import { preferredOriginalTake, type EncoreOriginalSong, type OriginalAudioTake } from '../types';
import { OriginalsBrainstormDocChip } from '../components/OriginalsBrainstormDocChip';

export type OriginalsSongFilesPanelProps = {
  song: EncoreOriginalSong;
  onChange: (next: EncoreOriginalSong) => void;
  readOnly?: boolean;
  /** Opens the built-in Encore brainstorm doc editor. */
  onOpenBrainstorm?: () => void;
};

function takeIsPlayable(take: OriginalAudioTake, localAudioIds: ReadonlySet<string>): boolean {
  return Boolean(take.driveFileId?.trim()) || take.hasLocalAudio === true || localAudioIds.has(take.id);
}

function patchSongTimestamp(song: EncoreOriginalSong): EncoreOriginalSong {
  return { ...song, updatedAt: new Date().toISOString() };
}

function appendBrainstormResource(song: EncoreOriginalSong, resource: EncoreMiscResource): EncoreOriginalSong {
  const cur = song.brainstormResources ?? [];
  if (cur.some((r) => r.id === resource.id)) return song;
  return patchSongTimestamp({
    ...song,
    brainstormResources: [...cur, resource],
  });
}

export function useOriginalsSongFilesPanel({
  song,
  onChange,
  readOnly = false,
  onOpenBrainstorm,
}: Pick<OriginalsSongFilesPanelProps, 'song' | 'onChange' | 'readOnly' | 'onOpenBrainstorm'>): {
  panel: ReactElement;
  resourceGroups: PracticeResourceGroup[];
} {
  const { googleAccessToken } = useEncoreAuth();
  const { uploadWithDuplicateCheck, registerUploadedDriveFile } = useEncoreDriveUploadDedup();
  const { playTake, isPlayingTake, stopPlayback } = useEncoreOriginalsPlayback();

  const [uploading, setUploading] = useState(false);
  const [refsUploading, setRefsUploading] = useState(false);
  const [localAudioIds, setLocalAudioIds] = useState<Set<string>>(() => new Set());
  const [fileDragActive, setFileDragActive] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<OriginalsSongFileSlot | null>(null);
  const [eligibleSlots, setEligibleSlots] = useState<Set<OriginalsSongFileSlot> | null>(null);
  const fileDragDepthRef = useRef(0);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTakeIdRef = useRef<string | null>(null);
  const takeFileInputRef = useRef<HTMLInputElement>(null);

  const songRef = useRef(song);
  songRef.current = song;

  const applySong = useCallback(
    (next: EncoreOriginalSong) => {
      songRef.current = next;
      onChange(next);
    },
    [onChange],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const found = new Set<string>();
      await Promise.all(
        song.takes.map(async (t) => {
          if (t.hasLocalAudio || (await hasOriginalTakeBlob(song.id, t.id))) {
            found.add(t.id);
          }
        }),
      );
      if (!cancelled) setLocalAudioIds(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [song.id, song.takes]);

  useEffect(() => {
    if (readOnly) {
      fileDragDepthRef.current = 0;
      setFileDragActive(false);
      setHoveredSlot(null);
      setEligibleSlots(null);
      return;
    }
    const onEnter = (e: DragEvent) => {
      if (!shouldEncoreMediaHubHighlightDrag()) return;
      if (!originalsFileDragRelevant(e.dataTransfer)) return;
      e.preventDefault();
      fileDragDepthRef.current += 1;
      setFileDragActive(true);
      setEligibleSlots(eligibleOriginalsSlotsForDragDataTransfer(e.dataTransfer));
    };
    const onLeave = () => {
      fileDragDepthRef.current = Math.max(0, fileDragDepthRef.current - 1);
      if (fileDragDepthRef.current === 0) {
        setFileDragActive(false);
        setHoveredSlot(null);
        setEligibleSlots(null);
      }
    };
    const onEnd = () => {
      fileDragDepthRef.current = 0;
      setFileDragActive(false);
      setHoveredSlot(null);
      setEligibleSlots(null);
    };
    const onDrop = (e: DragEvent) => {
      if (!originalsFileDragRelevant(e.dataTransfer)) return;
      onEnd();
    };
    const onDragOver = (e: DragEvent) => {
      if (!shouldEncoreMediaHubHighlightDrag()) return;
      if (originalsFileDragRelevant(e.dataTransfer)) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
      }
    };
    document.addEventListener('dragenter', onEnter);
    document.addEventListener('dragleave', onLeave);
    document.addEventListener('dragend', onEnd);
    document.addEventListener('drop', onDrop, true);
    document.addEventListener('dragover', onDragOver);
    return () => {
      document.removeEventListener('dragenter', onEnter);
      document.removeEventListener('dragleave', onLeave);
      document.removeEventListener('dragend', onEnd);
      document.removeEventListener('drop', onDrop, true);
      document.removeEventListener('dragover', onDragOver);
    };
  }, [readOnly]);

  const updateTake = useCallback(
    (takeId: string, patch: Partial<OriginalAudioTake>) => {
      applySong(
        patchSongTimestamp({
          ...songRef.current,
          takes: songRef.current.takes.map((t) => (t.id === takeId ? { ...t, ...patch } : t)),
        }),
      );
    },
    [applySong],
  );

  const addTakes = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || readOnly) return;
      setUploading(true);
      try {
        const newTakes = await Promise.all(
          files.map((file) =>
            buildOriginalTakeFromFile(
              file,
              songRef.current.id,
              googleAccessToken,
              songRef.current.title,
              uploadWithDuplicateCheck,
              registerUploadedDriveFile,
            ),
          ),
        );
        setLocalAudioIds((prev) => {
          const next = new Set(prev);
          for (const t of newTakes) next.add(t.id);
          return next;
        });
        const cur = songRef.current;
        applySong(
          patchSongTimestamp({
            ...cur,
            takes: [...cur.takes, ...newTakes],
            mainTakeId: cur.mainTakeId ?? newTakes[0]?.id ?? null,
          }),
        );
      } finally {
        setUploading(false);
      }
    },
    [applySong, googleAccessToken, readOnly, registerUploadedDriveFile, uploadWithDuplicateCheck],
  );

  const replaceTakeFile = useCallback(
    async (takeId: string, file: File) => {
      if (readOnly) return;
      setUploading(true);
      try {
        await saveOriginalTakeBlob(songRef.current.id, takeId, file);
        setLocalAudioIds((prev) => new Set(prev).add(takeId));
        const patch: Partial<OriginalAudioTake> = {
          label: file.name,
          mimeType: inferMediaMimeType(file),
          hasLocalAudio: true,
        };
        if (googleAccessToken) {
          const take = songRef.current.takes.find((t) => t.id === takeId);
          if (take) {
            try {
              const driveFileId = await uploadOriginalTakeToDrive(
                file,
                take,
                songRef.current.title,
                googleAccessToken,
                uploadWithDuplicateCheck,
                registerUploadedDriveFile,
              );
              if (driveFileId) patch.driveFileId = driveFileId;
            } catch {
              /* keep local playback */
            }
          }
        }
        updateTake(takeId, patch);
      } finally {
        setUploading(false);
      }
    },
    [googleAccessToken, readOnly, registerUploadedDriveFile, updateTake, uploadWithDuplicateCheck],
  );

  const uploadReferenceFile = useCallback(
    async (file: File) => {
      if (readOnly) return;
      const next = await uploadOriginalSongReference(songRef.current, file, {
        googleAccessToken,
        uploadWithDuplicateCheck,
        registerUploadedDriveFile,
      });
      applySong(next);
    },
    [applySong, googleAccessToken, readOnly, registerUploadedDriveFile, uploadWithDuplicateCheck],
  );

  const uploadReferenceFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setRefsUploading(true);
      try {
        for (const file of files) {
          await uploadReferenceFile(file);
        }
      } finally {
        setRefsUploading(false);
      }
    },
    [uploadReferenceFile],
  );

  const uploadBrainstormFiles = useCallback(
    (files: File[]) => {
      if (readOnly || files.length === 0) return;
      let next = songRef.current;
      for (const file of files) {
        next = appendBrainstormResource(next, createResourceFromLocalFile(file));
      }
      applySong(next);
    },
    [applySong, readOnly],
  );

  const uploadFilesToSlot = useCallback(
    async (slot: OriginalsSongFileSlot, files: File[]) => {
      const list = files.filter(Boolean);
      if (list.length === 0 || readOnly) return;
      switch (slot) {
        case 'demoTakes':
          await addTakes(list);
          break;
        case 'references':
          await uploadReferenceFiles(list);
          break;
        case 'brainstormRefs':
          uploadBrainstormFiles(list);
          break;
      }
    },
    [addTakes, readOnly, uploadBrainstormFiles, uploadReferenceFiles],
  );

  const addReferenceLink = useCallback(
    (url: string, label: string) => {
      if (readOnly) return;
      const cur = songRef.current.songReferences ?? [];
      const added = addResourceFromUrl(cur, url, label || undefined);
      if (!added) return;
      applySong(patchSongTimestamp({ ...songRef.current, songReferences: added.next }));
      if (!label.trim()) {
        scheduleEncoreResourceLabelEnrichment(url, added.added.id, () => songRef.current.songReferences ?? [], (next) =>
          applySong(patchSongTimestamp({ ...songRef.current, songReferences: next })),
        );
      }
    },
    [applySong, readOnly],
  );

  const addBrainstormLink = useCallback(
    (url: string, label: string) => {
      if (readOnly) return;
      const cur = songRef.current.brainstormResources ?? [];
      const added = addResourceFromUrl(cur, url, label || undefined);
      if (!added) return;
      applySong(patchSongTimestamp({ ...songRef.current, brainstormResources: added.next }));
      if (!label.trim()) {
        scheduleEncoreResourceLabelEnrichment(
          url,
          added.added.id,
          () => songRef.current.brainstormResources ?? [],
          (next) => applySong(patchSongTimestamp({ ...songRef.current, brainstormResources: next })),
        );
      }
    },
    [applySong, readOnly],
  );

  const applyUrlToSlot = useCallback(
    (slot: OriginalsSongFileSlot, url: string) => {
      if (slot === 'demoTakes') return;
      if (slot === 'references') addReferenceLink(url, '');
      else addBrainstormLink(url, '');
    },
    [addBrainstormLink, addReferenceLink],
  );

  const onMediaSlotDragOver = useCallback(
    (slot: OriginalsSongFileSlot, e: ReactDragEvent<HTMLElement>) => {
      if (!originalsFileDragRelevant(e.dataTransfer)) return;
      if (eligibleSlots && !eligibleSlots.has(slot)) return;
      e.preventDefault();
      e.stopPropagation();
      setHoveredSlot(slot);
    },
    [eligibleSlots],
  );

  const onMediaSlotDragEnter = useCallback(
    (slot: OriginalsSongFileSlot, e: ReactDragEvent<HTMLElement>) => {
      if (!originalsFileDragRelevant(e.dataTransfer)) return;
      if (eligibleSlots && !eligibleSlots.has(slot)) return;
      e.preventDefault();
      setHoveredSlot(slot);
    },
    [eligibleSlots],
  );

  const onMediaSlotDragLeave = useCallback((slot: OriginalsSongFileSlot, e: ReactDragEvent<HTMLElement>) => {
    if (!originalsFileDragRelevant(e.dataTransfer)) return;
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;
    setHoveredSlot((h) => (h === slot ? null : h));
  }, []);

  const onMediaSlotDrop = useCallback(
    (slot: OriginalsSongFileSlot, e: ReactDragEvent<HTMLElement>) => {
      if (eligibleSlots && !eligibleSlots.has(slot)) return;
      if (e.dataTransfer.types.includes('Files')) {
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        void uploadFilesToSlot(slot, files);
        return;
      }
      const url = extractFirstUrlFromDataTransfer(e.dataTransfer);
      if (!url) return;
      e.preventDefault();
      e.stopPropagation();
      applyUrlToSlot(slot, url);
    },
    [applyUrlToSlot, eligibleSlots, uploadFilesToSlot],
  );

  const fileDrop = useMemo(
    () =>
      readOnly
        ? undefined
        : {
            globalFileDragActive: fileDragActive,
            hoveredSlot,
            eligibleSlots,
            onMediaSlotDragEnter,
            onMediaSlotDragLeave,
            onMediaSlotDragOver,
            onMediaSlotDrop,
          },
    [
      readOnly,
      fileDragActive,
      hoveredSlot,
      eligibleSlots,
      onMediaSlotDragEnter,
      onMediaSlotDragLeave,
      onMediaSlotDragOver,
      onMediaSlotDrop,
    ],
  );

  const hiddenInputs = (
    <>
      <input
        ref={replaceInputRef}
        type="file"
        accept={ORIGINALS_DEMO_TAKE_AUDIO_ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          const takeId = replaceTakeIdRef.current;
          replaceTakeIdRef.current = null;
          if (!file || !takeId) return;
          void replaceTakeFile(takeId, file);
        }}
      />
      <input
        ref={takeFileInputRef}
        type="file"
        accept={ORIGINALS_DEMO_TAKE_AUDIO_ACCEPT}
        hidden
        multiple
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          e.target.value = '';
          if (files.length > 0) void addTakes(files);
        }}
      />
    </>
  );

  const demoTakesBody: ReactNode = (
    <>
      <Stack direction="row" flexWrap="wrap" alignItems="center" useFlexGap sx={(t) => practiceResourceChipFieldSx(t)}>
        {song.takes.map((t) => {
          const playable = takeIsPlayable(t, localAudioIds);
          const openUrl = t.driveFileId
            ? `https://drive.google.com/file/d/${encodeURIComponent(t.driveFileId)}/view`
            : undefined;
          const row = (
            <EncoreMediaLinkRow
              slot="reference"
              isPrimary={song.mainTakeId === t.id}
              caption={t.label}
              openUrl={openUrl}
              openAriaLabel={`Open ${t.label}`}
              onMakePrimary={
                readOnly
                  ? undefined
                  : () => applySong(patchSongTimestamp({ ...songRef.current, mainTakeId: t.id }))
              }
              onRemove={
                readOnly
                  ? undefined
                  : () => {
                      if (isPlayingTake(song.id, t.id)) stopPlayback();
                      void deleteOriginalTakeBlob(song.id, t.id);
                      const remaining = songRef.current.takes.filter((x) => x.id !== t.id);
                      applySong(
                        patchSongTimestamp({
                          ...songRef.current,
                          takes: remaining,
                          mainTakeId:
                            songRef.current.mainTakeId === t.id
                              ? (remaining[0]?.id ?? null)
                              : songRef.current.mainTakeId,
                        }),
                      );
                    }
              }
            />
          );
          const downloadTarget = encoreResourceDownloadTargetFromTake(t);
          const downloadGate = encoreResourceDownloadDisabled({ driveFileId: t.driveFileId }, googleAccessToken);
          return (
            <EncoreStaticResourceHoverCard
              key={t.id}
              title={t.label}
              subtitle="Take"
              editNickname={readOnly ? undefined : t.label}
              onEditNicknameChange={
                readOnly ? undefined : (value) => updateTake(t.id, { label: value.trim() || t.label })
              }
              resourceNotes={t.notes ?? ''}
              onResourceNotesChange={
                readOnly ? undefined : (value) => updateTake(t.id, { notes: value.trim() || undefined })
              }
              onPlay={() => {
                if (!playable) {
                  replaceTakeIdRef.current = t.id;
                  replaceInputRef.current?.click();
                  return;
                }
                playTake({
                  songId: song.id,
                  songTitle: song.title,
                  takeId: t.id,
                  takeLabel: t.label,
                  driveFileId: t.driveFileId,
                  localTakeKey: originalTakeBlobKey(song.id, t.id),
                  mimeType: t.mimeType,
                });
              }}
              isPlaying={isPlayingTake(song.id, t.id)}
              playDisabled={false}
              playDisabledReason={
                playable ? undefined : 'Choose the audio file again to enable playback on this device'
              }
              {...(downloadTarget
                ? {
                    onDownload: () => triggerEncoreResourceDownload(downloadTarget, googleAccessToken),
                    downloadDisabled: downloadGate.disabled,
                    downloadDisabledReason: downloadGate.reason,
                  }
                : {})}
            >
              {row}
            </EncoreStaticResourceHoverCard>
          );
        })}
        {!readOnly ? (
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            disabled={uploading}
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            onClick={() => takeFileInputRef.current?.click()}
            sx={(t) => encoreMediaHubAddButtonSx(t)}
          >
            Add take
          </Button>
        ) : null}
      </Stack>
    </>
  );

  const referencesBody: ReactNode = (
    <EncoreResourceLinksPanel
      layout="practice-list"
      className="encore-originals-song-references"
      resources={song.songReferences ?? []}
      onChange={(next) => applySong(patchSongTimestamp({ ...songRef.current, songReferences: next }))}
      onAddLink={addReferenceLink}
      onUploadFiles={uploadReferenceFiles}
      emptyHint="Charts, PDFs, and other files you reference while writing or recording."
      addButtonLabel="Add reference"
      fileAccept={ORIGINALS_REFERENCE_FILE_ACCEPT}
      driveUploading={refsUploading}
      canUploadToDrive={Boolean(googleAccessToken)}
      readOnly={readOnly}
    />
  );

  const brainstormDocChip = (
    <OriginalsBrainstormDocChip song={song} onOpen={onOpenBrainstorm ?? (() => {})} />
  );

  const brainstormBody: ReactNode = (
    <EncoreResourceLinksPanel
      layout="practice-list"
      className="encore-originals-brainstorm-resources"
      resources={song.brainstormResources ?? []}
      onChange={(next) => applySong(patchSongTimestamp({ ...songRef.current, brainstormResources: next }))}
      onAddLink={addBrainstormLink}
      onUploadFiles={uploadBrainstormFiles}
      emptyHint="Links and files you use while writing."
      addButtonLabel="Add reference"
      fileAccept={ORIGINALS_BRAINSTORM_FILE_ACCEPT}
      canUploadToDrive={false}
      readOnly={readOnly}
      prepend={brainstormDocChip}
    />
  );

  const preferred = preferredOriginalTake(song);

  const resourceGroups: PracticeResourceGroup[] = [
    {
      id: 'demoTakes',
      anchorId: ORIGINALS_SONG_FILE_SLOT_META.demoTakes.anchorId,
      title: ORIGINALS_SONG_FILE_SLOT_META.demoTakes.title,
      subheader: ORIGINALS_SONG_FILE_SLOT_META.demoTakes.subheader,
      itemCount: song.takes.length,
      primarySummary: preferred?.label ?? null,
      body: demoTakesBody,
    },
    {
      id: 'references',
      anchorId: ORIGINALS_SONG_FILE_SLOT_META.references.anchorId,
      title: ORIGINALS_SONG_FILE_SLOT_META.references.title,
      subheader: ORIGINALS_SONG_FILE_SLOT_META.references.subheader,
      itemCount: song.songReferences?.length ?? 0,
      body: referencesBody,
    },
    {
      id: 'brainstormRefs',
      anchorId: ORIGINALS_SONG_FILE_SLOT_META.brainstormRefs.anchorId,
      title: ORIGINALS_SONG_FILE_SLOT_META.brainstormRefs.title,
      subheader: ORIGINALS_SONG_FILE_SLOT_META.brainstormRefs.subheader,
      itemCount: (song.brainstormResources?.length ?? 0) + 1,
      body: brainstormBody,
    },
  ];

  const panel = (
    <>
      {hiddenInputs}
      <PracticeResourcesPanel<OriginalsSongFileSlot>
        groups={resourceGroups}
        fileDrop={fileDrop}
        ariaLabel="Song files"
      />
    </>
  );

  return { panel, resourceGroups };
}
