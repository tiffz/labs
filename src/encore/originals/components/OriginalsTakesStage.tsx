import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useState, type ReactElement } from 'react';
import { DragDropFileUpload } from '../../../shared/components/DragDropFileUpload';
import { EncoreMediaLinkRow } from '../../ui/EncoreMediaLinkRow';
import { EncoreStaticResourceHoverCard } from '../../components/EncoreStreamingHoverCard';
import { useEncoreAuth } from '../../context/EncoreAuthContext';
import {
  encoreResourceDownloadDisabled,
  encoreResourceDownloadTargetFromTake,
  triggerEncoreResourceDownload,
} from '../../drive/encoreResourceDownload';
import { useEncoreOriginalsPlayback } from '../context/EncoreOriginalsPlaybackContext';
import type { EncoreOriginalSong, OriginalAudioTake } from '../types';
import { driveUploadFileResumable } from '../../drive/driveFetch';
import { ensureOriginalsDriveLayout } from '../drive/originalsSharded';
import { useEncoreDriveUploadDedup } from '../../context/EncoreDriveUploadDedupContext';

const AUDIO_ACCEPT = 'audio/*,.mp3,.m4a,.wav,.webm';

export type OriginalsTakesStageProps = {
  song: EncoreOriginalSong;
  onChange: (next: EncoreOriginalSong) => void;
};

async function buildTakeFromFile(
  file: File,
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
    mimeType: file.type,
  };
  if (googleAccessToken) {
    try {
      const indexLabel = `${songTitle.trim() || 'Original'} · Take`;
      const driveFileId = await uploadWithDuplicateCheck({
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
      if (driveFileId) {
        take.driveFileId = driveFileId;
        take.mimeType = file.type || 'audio/mpeg';
      }
    } catch {
      /* metadata only */
    }
  }
  return take;
}

export function OriginalsTakesStage({ song, onChange }: OriginalsTakesStageProps): ReactElement {
  const { googleAccessToken } = useEncoreAuth();
  const { uploadWithDuplicateCheck, registerUploadedDriveFile } = useEncoreDriveUploadDedup();
  const { playTake, isPlayingTake, stopPlayback } = useEncoreOriginalsPlayback();
  const [uploading, setUploading] = useState(false);

  const updateTake = useCallback(
    (takeId: string, patch: Partial<OriginalAudioTake>) => {
      onChange({
        ...song,
        takes: song.takes.map((t) => (t.id === takeId ? { ...t, ...patch } : t)),
      });
    },
    [onChange, song],
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
              googleAccessToken,
              song.title,
              uploadWithDuplicateCheck,
              registerUploadedDriveFile,
            ),
          ),
        );
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
                onPlay={
                  t.driveFileId
                    ? () =>
                        playTake({
                          songId: song.id,
                          songTitle: song.title,
                          takeId: t.id,
                          takeLabel: t.label,
                          driveFileId: t.driveFileId!,
                          mimeType: t.mimeType,
                        })
                    : undefined
                }
                isPlaying={isPlayingTake(song.id, t.id)}
                playDisabled={!t.driveFileId}
                playDisabledReason={!t.driveFileId ? 'Sign in to Google to play in Encore' : undefined}
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
