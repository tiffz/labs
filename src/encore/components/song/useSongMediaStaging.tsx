import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { LabsStagedUploadPanel } from '../../../shared/upload/LabsStagedUploadPanel';
import {
  stagedSourceName,
  type LabsReadyStagedUpload,
  type LabsStagedUploadInspection,
  type LabsStagedUploadSource,
} from '../../../shared/upload/stagedUploads';
import {
  useLabsStagedUploads,
  type LabsStagedUploadCommitResult,
} from '../../../shared/upload/useLabsStagedUploads';
import { fileMatchesAccept } from '../../../shared/utils/fileMatchesAccept';
import {
  SONG_MEDIA_SLOT_ACCEPT,
  SONG_MEDIA_SLOT_NOUN,
  SONG_MEDIA_UPLOAD_SLOTS,
  type SongMediaUploadSlot,
} from './songMediaUploadSlot';

type SongMediaStagePlan = { slot: SongMediaUploadSlot; file: File };

/**
 * The review step for song-page files (ADR 0030). A picker stages here with the slot it is for and
 * uploads on confirm; a drop (`saveToSlot`) uploads at once.
 *
 * `upload` is the hub's existing writer. It returns an error message, or `null` on success, so a
 * failed batch stays in the list with the reason instead of vanishing.
 */
export function useSongMediaStaging({
  signedIn,
  upload,
}: {
  signedIn: boolean;
  upload: (slot: SongMediaUploadSlot, files: File[]) => Promise<string | null>;
}): {
  stageToSlot: (slot: SongMediaUploadSlot, files: readonly File[]) => void;
  saveToSlot: (slot: SongMediaUploadSlot, files: readonly File[]) => void;
  panel: ReactElement;
} {
  const signedInRef = useRef(signedIn);
  useEffect(() => {
    signedInRef.current = signedIn;
  });
  /** Which slot each staged file is for (sources carry only the file). */
  const slotsRef = useRef(new WeakMap<File, SongMediaUploadSlot>());

  const inspect = useCallback(
    async (source: LabsStagedUploadSource): Promise<LabsStagedUploadInspection<SongMediaStagePlan>> => {
      if (source.kind !== 'file') return { ok: false, name: stagedSourceName(source), message: "That isn't a file." };
      const { file } = source;
      const slot = slotsRef.current.get(file) ?? 'misc';
      if (!fileMatchesAccept(file, SONG_MEDIA_SLOT_ACCEPT[slot])) {
        return { ok: false, name: file.name, message: `That file can't be a ${SONG_MEDIA_SLOT_NOUN[slot].toLowerCase()}.` };
      }
      const where = signedInRef.current ? 'Uploads to your Drive' : 'Signs you in, then uploads to your Drive';
      return {
        ok: true,
        name: file.name,
        mimeType: file.type || null,
        sizeBytes: file.size,
        outcome: `${SONG_MEDIA_SLOT_NOUN[slot]} · ${where}`,
        plan: { slot, file },
      };
    },
    [],
  );

  const staged = useLabsStagedUploads<SongMediaStagePlan>({ inspect });
  const [error, setError] = useState<string | null>(null);

  const stageToSlot = useCallback(
    (slot: SongMediaUploadSlot, files: readonly File[]) => {
      for (const file of files) slotsRef.current.set(file, slot);
      staged.stageFiles(files);
    },
    [staged],
  );

  const commit = useCallback(
    async (ready: LabsReadyStagedUpload<SongMediaStagePlan>[]): Promise<LabsStagedUploadCommitResult> => {
        const failed: LabsStagedUploadCommitResult['failed'] = [];
        // One upload per slot, in the hub's slot order, so each gets its own Drive folder and label.
        for (const slot of SONG_MEDIA_UPLOAD_SLOTS) {
          const items = ready.filter((item) => item.plan.slot === slot);
          if (items.length === 0) continue;
          const message = await upload(slot, items.map((item) => item.plan.file));
          if (message) for (const item of items) failed.push({ id: item.id, message });
        }
        return { failed };
    },
    [upload],
  );

  const onConfirm = useCallback(() => {
    setError(null);
    void staged.confirm(commit).catch(() => setError("Couldn't upload these. Check your connection and try again."));
  }, [staged, commit]);

  const { saveFiles } = staged;
  const saveToSlot = useCallback(
    (slot: SongMediaUploadSlot, files: readonly File[]) => {
      for (const file of files) slotsRef.current.set(file, slot);
      void saveFiles(files, commit);
    },
    [commit, saveFiles],
  );

  const panel = (
    <LabsStagedUploadPanel
      staged={staged}
      onConfirm={onConfirm}
      confirmLabel={(n) => (n === 1 ? 'Upload' : `Upload ${n} files`)}
      title="Files ready to upload"
      error={error}
    />
  );

  return { stageToSlot, saveToSlot, panel };
}
