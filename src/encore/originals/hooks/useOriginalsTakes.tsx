import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { DriveWriteFailure } from '../../../shared/drive/describeDriveWriteFailure';
import { useDriveBackupFailures } from './useDriveBackupFailures';
import { useEncoreAuth } from '../../context/EncoreAuthContext';
import { useEncoreDriveUploadDedup } from '../../context/EncoreDriveUploadDedupContext';
import {
  encoreResourceDownloadDisabled,
  encoreResourceDownloadTargetFromTake,
  triggerEncoreResourceDownload,
} from '../../drive/encoreResourceDownload';
import { driveFileWebUrl } from '../../drive/driveWebUrls';
import { inferMediaMimeType } from '../../../shared/drive/inferMediaMimeType';
import { useEncoreOriginalsPlayback } from '../context/EncoreOriginalsPlaybackContext';
import { buildLocalOriginalTake, uploadOriginalTakeToDrive } from '../originalTakeUpload';
import {
  deleteOriginalTakeBlob,
  hasOriginalTakeBlob,
  loadOriginalTakeBlob,
  originalTakeBlobKey,
  saveOriginalTakeBlob,
} from '../originalTakeLocalAudio';
import { ORIGINALS_DEMO_TAKE_AUDIO_ACCEPT } from '../originalsSongFileSlots';
import { preferredOriginalTake, type EncoreOriginalSong, type OriginalAudioTake } from '../types';

/**
 * Where a take's audio currently lives. Drives the one-line status under each take.
 *
 * `backup-failed` exists because the other three could not say the thing that mattered. A failed
 * Drive upload was caught and discarded, leaving the take as `local` — true, and indistinguishable
 * from "you are signed out, so of course it is only here". The take read as fine while sitting on
 * exactly one device, which is the one loss this app cannot undo.
 */
export type TakeStorageStatus = 'drive' | 'local' | 'backup-failed' | 'missing';

export type TakeDownloadProps = {
  onDownload: () => void | Promise<void>;
  downloadDisabled: boolean;
  downloadDisabledReason?: string;
};

/**
 * Everything a surface needs to render and mutate one original's demo takes.
 *
 * Extracted from `useOriginalsSongFilesPanel` so the focused Record-takes workspace and the dense
 * chip rows on Song view / Brainstorm share **one** implementation of add / replace / rename /
 * notes / preferred / remove. The previous split kept two parallel bodies in one 811-line hook,
 * which is how the take card and the chip row drifted apart in the first place.
 */
export type OriginalsTakesController = {
  takes: OriginalAudioTake[];
  preferredTakeId: string | null;
  /** True while any add/replace is in flight — render ONE aggregate status, not a spinner per row. */
  uploading: boolean;
  isPlaying: (takeId: string) => boolean;
  isPlayable: (take: OriginalAudioTake) => boolean;
  storageStatus: (take: OriginalAudioTake) => TakeStorageStatus;
  /** Why the last Drive backup attempt failed this session, or null. */
  backupFailure: (take: OriginalAudioTake) => DriveWriteFailure | null;
  /** Re-upload from the local copy. No-op unless signed in and not already backed up. */
  retryBackup: (takeId: string) => Promise<void>;
  driveOpenUrl: (take: OriginalAudioTake) => string | undefined;
  downloadProps: (take: OriginalAudioTake) => TakeDownloadProps | null;
  /** Play, or re-pick the file when the audio is not on this device. */
  play: (take: OriginalAudioTake) => void;
  setPreferred: (takeId: string) => void;
  rename: (takeId: string, label: string) => void;
  setNotes: (takeId: string, notes: string) => void;
  remove: (takeId: string) => void;
  addFiles: (files: File[]) => Promise<void>;
  openFilePicker: () => void;
  /** Hidden `<input type="file">` elements; render once inside the consuming surface. */
  hiddenInputs: ReactElement;
};

function patchSongTimestamp(song: EncoreOriginalSong): EncoreOriginalSong {
  return { ...song, updatedAt: new Date().toISOString() };
}

export function useOriginalsTakes({
  song,
  onChange,
  readOnly = false,
}: {
  song: EncoreOriginalSong;
  onChange: (next: EncoreOriginalSong) => void;
  readOnly?: boolean;
}): OriginalsTakesController {
  const { googleAccessToken } = useEncoreAuth();
  const { uploadWithDuplicateCheck, registerUploadedDriveFile } = useEncoreDriveUploadDedup();
  const { playTake, isPlayingTake, stopPlayback } = useEncoreOriginalsPlayback();

  const [uploading, setUploading] = useState(false);
  const [localAudioIds, setLocalAudioIds] = useState<Set<string>>(() => new Set());
  const backupFailures = useDriveBackupFailures();
  const { record: recordBackupFailure, clear: clearBackupFailure } = backupFailures;
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTakeIdRef = useRef<string | null>(null);
  const takeFileInputRef = useRef<HTMLInputElement>(null);

  const songRef = useRef(song);
  // Effect, not render phase: a render-phase ref write is a React Compiler correctness error.
  // `songRef.current` is only read inside async take mutations (never during render), and the
  // optimistic write below still wins until the next commit, so semantics are unchanged.
  useEffect(() => {
    songRef.current = song;
  });

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
          if (t.hasLocalAudio || (await hasOriginalTakeBlob(song.id, t.id))) found.add(t.id);
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
      applySong(
        patchSongTimestamp({
          ...songRef.current,
          takes: songRef.current.takes.map((t) => (t.id === takeId ? { ...t, ...patch } : t)),
        }),
      );
    },
    [applySong],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || readOnly) return;
      setUploading(true);
      try {
        // Local-first: save each take's blob and persist its metadata BEFORE the slow
        // resumable Drive upload. A refresh mid-upload can no longer lose a take — its
        // blob + song row are already durable. Drive is a background enrichment that
        // patches in the `driveFileId` when it lands. Do not reorder (see originalTakeUpload.ts).
        const songId = songRef.current.id;
        const pairs = await Promise.all(
          files.map(async (file) => ({ file, take: await buildLocalOriginalTake(file, songId) })),
        );
        const newTakes = pairs.map((p) => p.take);
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

        if (googleAccessToken) {
          const songTitle = songRef.current.title;
          await Promise.all(
            pairs.map(async ({ file, take }) => {
              try {
                const driveFileId = await uploadOriginalTakeToDrive(
                  file,
                  take,
                  songTitle,
                  googleAccessToken,
                  uploadWithDuplicateCheck,
                  registerUploadedDriveFile,
                );
                if (driveFileId) {
                  updateTake(take.id, { driveFileId });
                  clearBackupFailure(take.id);
                }
              } catch (error) {
                // Safe locally, but "safe on one device" is not what backup means.
                recordBackupFailure(take.id, error);
              }
            }),
          );
        }
      } finally {
        setUploading(false);
      }
    },
    [
      applySong,
      googleAccessToken,
      readOnly,
      registerUploadedDriveFile,
      updateTake,
      uploadWithDuplicateCheck,
      recordBackupFailure,
      clearBackupFailure,
    ],
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
              if (driveFileId) {
                patch.driveFileId = driveFileId;
                clearBackupFailure(takeId);
              }
            } catch (error) {
              recordBackupFailure(takeId, error);
            }
          }
        }
        updateTake(takeId, patch);
      } finally {
        setUploading(false);
      }
    },
    [
      googleAccessToken,
      readOnly,
      registerUploadedDriveFile,
      updateTake,
      uploadWithDuplicateCheck,
      recordBackupFailure,
      clearBackupFailure,
    ],
  );

  const isPlayable = useCallback(
    (take: OriginalAudioTake) =>
      Boolean(take.driveFileId?.trim()) || take.hasLocalAudio === true || localAudioIds.has(take.id),
    [localAudioIds],
  );

  const storageStatus = useCallback(
    (take: OriginalAudioTake): TakeStorageStatus => {
      if (take.driveFileId?.trim()) return 'drive';
      const here = take.hasLocalAudio || localAudioIds.has(take.id);
      if (here && backupFailures.get(take.id)) return 'backup-failed';
      return here ? 'local' : 'missing';
    },
    [localAudioIds, backupFailures],
  );

  const backupFailure = useCallback(
    (take: OriginalAudioTake): DriveWriteFailure | null => backupFailures.get(take.id),
    [backupFailures],
  );

  /**
   * Re-attempt one take's Drive backup from the copy already on this device.
   *
   * No re-picking the file: the bytes are in `originalTakeBlobs`, which is precisely why the take
   * stayed playable after the upload failed. Offered only when `describeDriveWriteFailure` says a
   * retry could plausibly succeed — a full Drive or an expired sign-in needs the user to act first,
   * and a button that cannot work just teaches them the button does not work.
   */
  const retryBackup = useCallback(
    async (takeId: string) => {
      if (!googleAccessToken || readOnly) return;
      const song = songRef.current;
      const take = song.takes.find((t) => t.id === takeId);
      if (!take || take.driveFileId?.trim()) return;

      const stored = await loadOriginalTakeBlob(originalTakeBlobKey(song.id, takeId));
      if (!stored) {
        recordBackupFailure(
          takeId,
          new Error('The audio for this take is no longer on this device.'),
        );
        return;
      }

      const file = new File([stored.blob], take.label?.trim() || 'Take', {
        type: stored.mimeType || 'audio/mpeg',
      });
      try {
        const driveFileId = await uploadOriginalTakeToDrive(
          file,
          take,
          song.title,
          googleAccessToken,
          uploadWithDuplicateCheck,
          registerUploadedDriveFile,
        );
        if (driveFileId) {
          updateTake(takeId, { driveFileId });
          clearBackupFailure(takeId);
        }
      } catch (error) {
        recordBackupFailure(takeId, error);
      }
    },
    [
      googleAccessToken,
      readOnly,
      uploadWithDuplicateCheck,
      registerUploadedDriveFile,
      updateTake,
      recordBackupFailure,
      clearBackupFailure,
    ],
  );

  const play = useCallback(
    (take: OriginalAudioTake) => {
      if (!isPlayable(take)) {
        replaceTakeIdRef.current = take.id;
        replaceInputRef.current?.click();
        return;
      }
      playTake({
        songId: songRef.current.id,
        songTitle: songRef.current.title,
        takeId: take.id,
        takeLabel: take.label,
        driveFileId: take.driveFileId,
        localTakeKey: originalTakeBlobKey(songRef.current.id, take.id),
        mimeType: take.mimeType,
      });
    },
    [isPlayable, playTake],
  );

  const setPreferred = useCallback(
    (takeId: string) => {
      if (readOnly) return;
      applySong(patchSongTimestamp({ ...songRef.current, mainTakeId: takeId }));
    },
    [applySong, readOnly],
  );

  const rename = useCallback(
    (takeId: string, label: string) => {
      if (readOnly) return;
      const trimmed = label.trim();
      const current = songRef.current.takes.find((t) => t.id === takeId);
      updateTake(takeId, { label: trimmed || current?.label || takeId });
    },
    [readOnly, updateTake],
  );

  const setNotes = useCallback(
    (takeId: string, notes: string) => {
      if (readOnly) return;
      updateTake(takeId, { notes: notes.trim() || undefined });
    },
    [readOnly, updateTake],
  );

  const remove = useCallback(
    (takeId: string) => {
      if (readOnly) return;
      if (isPlayingTake(songRef.current.id, takeId)) stopPlayback();
      void deleteOriginalTakeBlob(songRef.current.id, takeId);
      const remaining = songRef.current.takes.filter((t) => t.id !== takeId);
      applySong(
        patchSongTimestamp({
          ...songRef.current,
          takes: remaining,
          mainTakeId:
            songRef.current.mainTakeId === takeId
              ? (remaining[0]?.id ?? null)
              : songRef.current.mainTakeId,
        }),
      );
    },
    [applySong, isPlayingTake, readOnly, stopPlayback],
  );

  const driveOpenUrl = useCallback(
    (take: OriginalAudioTake) => (take.driveFileId ? driveFileWebUrl(take.driveFileId) : undefined),
    [],
  );

  const downloadProps = useCallback(
    (take: OriginalAudioTake): TakeDownloadProps | null => {
      const target = encoreResourceDownloadTargetFromTake(take);
      if (!target) return null;
      const gate = encoreResourceDownloadDisabled({ driveFileId: take.driveFileId }, googleAccessToken);
      return {
        onDownload: () => triggerEncoreResourceDownload(target, googleAccessToken),
        downloadDisabled: gate.disabled,
        downloadDisabledReason: gate.reason,
      };
    },
    [googleAccessToken],
  );

  const openFilePicker = useCallback(() => {
    takeFileInputRef.current?.click();
  }, []);

  const isPlaying = useCallback(
    (takeId: string) => isPlayingTake(songRef.current.id, takeId),
    [isPlayingTake],
  );

  const hiddenInputs = useMemo(
    () => (
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
            if (files.length > 0) void addFiles(files);
          }}
        />
      </>
    ),
    [addFiles, replaceTakeFile],
  );

  const preferred = preferredOriginalTake(song);

  return {
    takes: song.takes,
    preferredTakeId: preferred?.id ?? null,
    uploading,
    isPlaying,
    isPlayable,
    storageStatus,
    backupFailure,
    retryBackup,
    driveOpenUrl,
    downloadProps,
    play,
    setPreferred,
    rename,
    setNotes,
    remove,
    addFiles,
    openFilePicker,
    hiddenInputs,
  };
}
