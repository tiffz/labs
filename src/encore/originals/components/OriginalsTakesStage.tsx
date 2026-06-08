import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { DragDropFileUpload } from '../../../shared/components/DragDropFileUpload';
import { EncoreMediaLinkRow } from '../../ui/EncoreMediaLinkRow';
import { EncoreStaticResourceHoverCard } from '../../components/EncoreStreamingHoverCard';
import { useEncoreAuth } from '../../context/EncoreAuthContext';
import {
  encoreResourceDownloadDisabled,
  encoreResourceDownloadTargetFromTake,
  triggerEncoreResourceDownload,
} from '../../drive/encoreResourceDownload';
import { inferMediaMimeType } from '../../../shared/drive/inferMediaMimeType';
import { useEncoreOriginalsPlayback } from '../context/EncoreOriginalsPlaybackContext';
import type { EncoreOriginalSong, OriginalAudioTake } from '../types';
import { driveUploadFileResumable } from '../../drive/driveFetch';
import { ensureOriginalsDriveLayout } from '../drive/originalsSharded';
import { useEncoreDriveUploadDedup } from '../../context/EncoreDriveUploadDedupContext';
import {
  deleteOriginalTakeBlob,
  hasOriginalTakeBlob,
  originalTakeBlobKey,
  saveOriginalTakeBlob,
} from '../originalTakeLocalAudio';

const AUDIO_ACCEPT = 'audio/*,.mp3,.m4a,.wav,.webm';

export type OriginalsTakesStageProps = {
  song: EncoreOriginalSong;
  onChange: (next: EncoreOriginalSong) => void;
};

function takeIsPlayable(take: OriginalAudioTake, localAudioIds: ReadonlySet<string>): boolean {
  return Boolean(take.driveFileId?.trim()) || take.hasLocalAudio === true || localAudioIds.has(take.id);
}

async function uploadTakeToDrive(
  file: File,
  take: OriginalAudioTake,
  songTitle: string,
  googleAccessToken: string,
  uploadWithDuplicateCheck: ReturnType<typeof useEncoreDriveUploadDedup>['uploadWithDuplicateCheck'],
  registerUploadedDriveFile: ReturnType<typeof useEncoreDriveUploadDedup>['registerUploadedDriveFile'],
): Promise<string | null> {
  const indexLabel = `${songTitle.trim() || 'Original'} · Take`;
  return uploadWithDuplicateCheck({
    file,
    uploadNew: async () => {
      const layout = await ensureOriginalsDriveLayout(googleAccessToken);
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'webm';
      const name = `${take.id}.${ext ?? 'dat'}`;
      const created = await driveUploadFileResumable(
        googleAccessToken,
        file,
        [layout.audioFolderId],
        name,
      );
      await registerUploadedDriveFile(created.id, indexLabel);
      return created.id;
    },
    reuseExisting: async (id) => {
      await registerUploadedDriveFile(id, indexLabel);
      return id;
    },
  });
}

async function buildTakeFromFile(
  file: File,
  songId: string,
  googleAccessToken: string | null,
  songTitle: string,
  uploadWithDuplicateCheck: ReturnType<typeof useEncoreDriveUploadDedup>['uploadWithDuplicateCheck'],
  registerUploadedDriveFile: ReturnType<typeof useEncoreDriveUploadDedup>['registerUploadedDriveFile'],
): Promise<OriginalAudioTake> {
  const take: OriginalAudioTake = {
    id: crypto.randomUUID(),
    label: file.name,
    timestamp: Date.now(),
    source: 'imported',
    mimeType: inferMediaMimeType(file),
  };
  await saveOriginalTakeBlob(songId, take.id, file);
  take.hasLocalAudio = true;

  if (googleAccessToken) {
    try {
      const driveFileId = await uploadTakeToDrive(
        file,
        take,
        songTitle,
        googleAccessToken,
        uploadWithDuplicateCheck,
        registerUploadedDriveFile,
      );
      if (driveFileId) {
        take.driveFileId = driveFileId;
      }
    } catch {
      /* local cache still playable */
    }
  }
  return take;
}

export function OriginalsTakesStage({ song, onChange }: OriginalsTakesStageProps): ReactElement {
  const { googleAccessToken } = useEncoreAuth();
  const { uploadWithDuplicateCheck, registerUploadedDriveFile } = useEncoreDriveUploadDedup();
  const { playTake, isPlayingTake, stopPlayback } = useEncoreOriginalsPlayback();
  const [uploading, setUploading] = useState(false);
  const [localAudioIds, setLocalAudioIds] = useState<Set<string>>(() => new Set());
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTakeIdRef = useRef<string | null>(null);

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

  const updateTake = useCallback(
    (takeId: string, patch: Partial<OriginalAudioTake>) => {
      onChange({
        ...song,
        takes: song.takes.map((t) => (t.id === takeId ? { ...t, ...patch } : t)),
      });
    },
    [onChange, song],
  );

  const replaceTakeFile = useCallback(
    async (takeId: string, file: File) => {
      setUploading(true);
      try {
        await saveOriginalTakeBlob(song.id, takeId, file);
        setLocalAudioIds((prev) => new Set(prev).add(takeId));
        const patch: Partial<OriginalAudioTake> = {
          label: file.name,
          mimeType: inferMediaMimeType(file),
          hasLocalAudio: true,
        };
        if (googleAccessToken) {
          const take = song.takes.find((t) => t.id === takeId);
          if (take) {
            try {
              const driveFileId = await uploadTakeToDrive(
                file,
                take,
                song.title,
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
    [googleAccessToken, registerUploadedDriveFile, song.id, song.takes, song.title, updateTake, uploadWithDuplicateCheck],
  );

  const addTakes = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploading(true);
      try {
        const newTakes = await Promise.all(
          files.map((file) =>
            buildTakeFromFile(
              file,
              song.id,
              googleAccessToken,
              song.title,
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
        onChange({
          ...song,
          takes: [...song.takes, ...newTakes],
          mainTakeId: song.mainTakeId ?? newTakes[0]?.id ?? null,
        });
      } finally {
        setUploading(false);
      }
    },
    [googleAccessToken, onChange, registerUploadedDriveFile, song, uploadWithDuplicateCheck],
  );

  const hasTakes = song.takes.length > 0;

  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
      <input
        ref={replaceInputRef}
        type="file"
        accept={AUDIO_ACCEPT}
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
      <DragDropFileUpload
        accept={AUDIO_ACCEPT}
        compact={hasTakes}
        multiple
        disabled={uploading}
        label={hasTakes ? 'Add take' : 'Upload takes'}
        helperText={hasTakes ? undefined : 'Drop one or more audio files'}
        onFiles={(files: File[]) => {
          void addTakes(files);
        }}
      />
      {hasTakes ? (
        <Stack spacing={0.75} alignItems="flex-start">
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Takes
          </Typography>
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
                onMakePrimary={() => onChange({ ...song, mainTakeId: t.id })}
                onRemove={() => {
                  if (isPlayingTake(song.id, t.id)) stopPlayback();
                  void deleteOriginalTakeBlob(song.id, t.id);
                  onChange({
                    ...song,
                    takes: song.takes.filter((x) => x.id !== t.id),
                    mainTakeId:
                      song.mainTakeId === t.id ? (song.takes.find((x) => x.id !== t.id)?.id ?? null) : song.mainTakeId,
                  });
                }}
              />
            );
            const downloadTarget = encoreResourceDownloadTargetFromTake(t);
            const downloadGate = encoreResourceDownloadDisabled(
              { driveFileId: t.driveFileId },
              googleAccessToken,
            );
            return (
              <EncoreStaticResourceHoverCard
                key={t.id}
                title={t.label}
                subtitle="Take"
                editNickname={t.label}
                onEditNicknameChange={(value) => updateTake(t.id, { label: value.trim() || t.label })}
                resourceNotes={t.notes ?? ''}
                onResourceNotesChange={(value) => updateTake(t.id, { notes: value.trim() || undefined })}
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
                  playable
                    ? undefined
                    : 'Choose the audio file again to enable playback on this device'
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
        </Stack>
      ) : null}
    </Stack>
  );
}
