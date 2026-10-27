import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { LabsStagedUploadPanel } from './LabsStagedUploadPanel';
import { stagedSourceName, type LabsStagedUploadInspection, type LabsStagedUploadSource } from './stagedUploads';
import {
  useLabsStagedUploads,
  type LabsStagedUploadCommit,
  type LabsStagedUploadCommitResult,
} from './useLabsStagedUploads';

export type LabsStagedFileUploadsOptions = {
  /** Which files this surface takes. Others are listed with `rejectMessage` and never saved. */
  accepts?: (file: File) => boolean;
  rejectMessage?: string;
  /** One short line saying where the file goes ("Uploads to your Drive"). */
  outcome: string | ((file: File) => string);
  /**
   * When set, every file is refused with this message: the surface cannot save anything right now
   * (signed out, say). Better than accepting a file it would lose.
   */
  unavailable?: string | null;
  /** Save one file. Throw to mark that file failed; the others still save. */
  onCommit?: (file: File) => Promise<void>;
  /**
   * Save every ready file in one call, for writers that work on a batch (ordering new pages, say).
   * Throwing marks them all failed. Use this or `onCommit`.
   */
  onCommitAll?: (files: File[]) => Promise<void>;
  /** Plain-language reason for a failed file. Never show raw HTTP text. */
  describeError?: (error: unknown) => string;
  confirmLabel: (count: number) => string;
  title?: string;
};

const DEFAULT_REJECT = "That file type isn't supported here.";
const DEFAULT_ERROR = "Couldn't save this file. Check your connection and try again.";

/**
 * The common case of ADR 0030: files in, one function saves each. Pass `stageFiles` to the file
 * picker, `saveFiles` to the drop zone, and render `panel` where the files will land.
 */
export function useLabsStagedFileUploads(options: LabsStagedFileUploadsOptions): {
  stageFiles: (files: readonly File[]) => void;
  /** For drops: saves the usable files at once, no confirm. */
  saveFiles: (files: readonly File[]) => void;
  panel: ReactElement;
  /** True while picked files wait for confirm; hide the surface's own "Add …" trigger then. */
  hasStaged: boolean;
} {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const inspect = useCallback(async (source: LabsStagedUploadSource): Promise<LabsStagedUploadInspection<File>> => {
    const { accepts, rejectMessage, outcome, unavailable } = optionsRef.current;
    if (source.kind !== 'file') return { ok: false, name: stagedSourceName(source), message: DEFAULT_REJECT };
    const { file } = source;
    if (unavailable) return { ok: false, name: file.name, message: unavailable };
    if (accepts && !accepts(file)) return { ok: false, name: file.name, message: rejectMessage ?? DEFAULT_REJECT };
    return {
      ok: true,
      name: file.name,
      mimeType: file.type || null,
      sizeBytes: file.size,
      outcome: typeof outcome === 'function' ? outcome(file) : outcome,
      plan: file,
    };
  }, []);

  const staged = useLabsStagedUploads<File>({ inspect });
  const [error, setError] = useState<string | null>(null);

  const commit = useCallback<LabsStagedUploadCommit<File>>(
    async (ready): Promise<LabsStagedUploadCommitResult> => {
        const { onCommit, onCommitAll, describeError } = optionsRef.current;
        const failed: LabsStagedUploadCommitResult['failed'] = [];
        if (onCommitAll) {
          try {
            await onCommitAll(ready.map((item) => item.plan));
          } catch (e) {
            const message = describeError ? describeError(e) : DEFAULT_ERROR;
            for (const item of ready) failed.push({ id: item.id, message });
          }
          return { failed };
        }
        if (!onCommit) return { failed };
        for (const item of ready) {
          try {
            await onCommit(item.plan);
          } catch (e) {
            failed.push({ id: item.id, message: describeError ? describeError(e) : DEFAULT_ERROR });
          }
        }
        return { failed };
    },
    [],
  );

  const onConfirm = useCallback(() => {
    setError(null);
    void staged.confirm(commit).catch(() => setError(DEFAULT_ERROR));
  }, [staged, commit]);

  const { saveFiles: saveStaged } = staged;
  const saveFiles = useCallback((files: readonly File[]) => void saveStaged(files, commit), [saveStaged, commit]);

  const panel = (
    <LabsStagedUploadPanel
      staged={staged}
      onConfirm={onConfirm}
      confirmLabel={options.confirmLabel}
      title={options.title}
      error={error}
    />
  );

  return { stageFiles: staged.stageFiles, saveFiles, panel, hasStaged: staged.awaitingConfirm };
}
