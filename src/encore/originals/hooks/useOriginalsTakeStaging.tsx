import { useCallback, useRef, useState, type MutableRefObject, type ReactElement } from 'react';
import type { DriveFileImportPlan } from '../../../shared/drive/importDriveFile';
import { inferMediaMimeType } from '../../../shared/drive/inferMediaMimeType';
import { LabsStagedUploadPanel } from '../../../shared/upload/LabsStagedUploadPanel';
import type { LabsStagedUploadInspection, LabsStagedUploadSource } from '../../../shared/upload/stagedUploads';
import {
  useLabsStagedUploads,
  type LabsStagedUploadCommitResult,
} from '../../../shared/upload/useLabsStagedUploads';
import { ensureDriveCopyAccessToken } from '../../drive/driveReadonlyAccess';
import { checkOriginalTakeDriveLink, commitOriginalTakeDriveLink } from '../originalTakeDriveImport';
import { isOriginalsTakeMediaFile } from '../originalsSongFileDrag';
import type { EncoreOriginalSong } from '../types';

/** What a staged take becomes on confirm. */
type TakeStagePlan =
  | { kind: 'new-file'; file: File }
  | { kind: 'replace-file'; file: File; takeId: string }
  | { kind: 'drive'; plan: DriveFileImportPlan };

const takeCount = (n: number) => (n === 1 ? 'Add take' : `Add ${n} takes`);

function patchSongTimestamp(song: EncoreOriginalSong): EncoreOriginalSong {
  return { ...song, updatedAt: new Date().toISOString() };
}

/**
 * The review step for takes (ADR 0030). Every way a take comes in (file picker, drop, pasted Drive
 * link, re-picking a missing take's audio) is staged here, checked without writing, and handed to
 * the take controller's writers only when the user confirms in `stagedPanel`.
 */
export function useOriginalsTakeStaging({
  songRef,
  applySong,
  readOnly,
  googleAccessToken,
  addFiles,
  replaceTakeFile,
  setUploading,
}: {
  songRef: MutableRefObject<EncoreOriginalSong>;
  applySong: (next: EncoreOriginalSong) => void;
  readOnly: boolean;
  googleAccessToken: string | null;
  addFiles: (files: File[]) => Promise<void>;
  replaceTakeFile: (takeId: string, file: File) => Promise<void>;
  setUploading: (uploading: boolean) => void;
}): {
  stageFiles: (files: readonly File[]) => void;
  stageLink: (url: string) => void;
  stagedPanel: ReactElement;
  hasStaged: boolean;
  /** Tag a file from the "choose the audio again" picker with the take it replaces. */
  markReplacement: (file: File, takeId: string) => void;
} {
  /** Commit one checked Drive link. Called only from the staged panel's confirm. */
  const addDriveTake = useCallback(
    async (plan: DriveFileImportPlan): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (readOnly || !googleAccessToken) {
        return { ok: false, message: 'Sign in with Google to add a take from Drive.' };
      }
      const songId = songRef.current.id;
      const result = await commitOriginalTakeDriveLink(plan, {
        accessToken: googleAccessToken,
        requestReadAccess: ensureDriveCopyAccessToken,
      });
      if (!result.ok) return result;
      // Re-read after the await: a copy can take a while, and the user may have added, removed or
      // left the song meanwhile. Appending to a stale snapshot would drop their edits.
      const cur = songRef.current;
      if (cur.id !== songId) {
        return { ok: false, message: 'The song changed before the take was added. Try again.' };
      }
      applySong(
        patchSongTimestamp({
          ...cur,
          takes: [...cur.takes, result.take],
          mainTakeId: cur.mainTakeId ?? result.take.id,
        }),
      );
      return { ok: true };
    },
    [applySong, googleAccessToken, readOnly, songRef],
  );

  /*
   * Every way in (file picker, drop, pasted link, re-picking a missing take's audio) only stages.
   * The replace picker tags its file here so `inspect` knows which take it is for.
   */
  const replaceTargetsRef = useRef(new WeakMap<File, string>());

  const inspect = useCallback(
    async (source: LabsStagedUploadSource): Promise<LabsStagedUploadInspection<TakeStagePlan>> => {
      if (source.kind === 'file') {
        const { file } = source;
        if (!isOriginalsTakeMediaFile(file)) {
          return { ok: false, name: file.name, message: "That file isn't an audio or video file." };
        }
        const where = googleAccessToken ? 'Saved here and backed up to Drive' : 'Saved on this device';
        const takeId = replaceTargetsRef.current.get(file);
        const target = takeId ? songRef.current.takes.find((t) => t.id === takeId) : undefined;
        return {
          ok: true,
          name: file.name,
          mimeType: inferMediaMimeType(file),
          sizeBytes: file.size,
          outcome: target ? `Replaces the audio for ${target.label}` : where,
          plan: target ? { kind: 'replace-file', file, takeId: target.id } : { kind: 'new-file', file },
        };
      }
      if (source.kind === 'batch') {
        return { ok: false, name: source.name, message: 'Add takes one file at a time.' };
      }
      if (!googleAccessToken) {
        return { ok: false, name: source.url, message: 'Sign in with Google to add a take from Drive.' };
      }
      const checked = await checkOriginalTakeDriveLink(source.url, {
        accessToken: googleAccessToken,
        existingTakes: songRef.current.takes,
      });
      if (!checked.ok) return checked;
      return {
        ok: true,
        name: checked.plan.name,
        mimeType: checked.plan.mimeType,
        sizeBytes: null,
        outcome: checked.outcome,
        plan: { kind: 'drive', plan: checked.plan },
      };
    },
    [googleAccessToken, songRef],
  );

  const staged = useLabsStagedUploads<TakeStagePlan>({ inspect });
  const [stagedError, setStagedError] = useState<string | null>(null);

  const confirmStaged = useCallback(() => {
    setStagedError(null);
    void staged
      .confirm(async (ready): Promise<LabsStagedUploadCommitResult> => {
        const failed: LabsStagedUploadCommitResult['failed'] = [];
        setUploading(true);
        try {
          const newFiles = ready.flatMap((item) => (item.plan.kind === 'new-file' ? [item.plan.file] : []));
          if (newFiles.length > 0) await addFiles(newFiles);
          for (const item of ready) {
            if (item.plan.kind === 'replace-file') {
              await replaceTakeFile(item.plan.takeId, item.plan.file);
            } else if (item.plan.kind === 'drive') {
              const result = await addDriveTake(item.plan.plan);
              if (!result.ok) failed.push({ id: item.id, message: result.message });
            }
          }
        } finally {
          setUploading(false);
        }
        return { failed };
      })
      .catch(() => {
        setStagedError("Couldn't add these. Check your connection and try again.");
      });
  }, [addDriveTake, addFiles, replaceTakeFile, setUploading, staged]);


  const stagedPanel = (
    <LabsStagedUploadPanel
      staged={staged}
      onConfirm={confirmStaged}
      confirmLabel={takeCount}
      title="Takes ready to add"
      error={stagedError}
    />
  );

  const markReplacement = useCallback((file: File, takeId: string) => {
    replaceTargetsRef.current.set(file, takeId);
  }, []);

  return {
    stageFiles: staged.stageFiles,
    stageLink: staged.stageLink,
    stagedPanel,
    hasStaged: staged.items.length > 0,
    markReplacement,
  };
}
