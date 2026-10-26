import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  canConfirmStagedUploads,
  readyStagedUploads,
  removeStagedUpload,
  resolveStagedUpload,
  stageSources,
  type LabsReadyStagedUpload,
  type LabsStagedUpload,
  type LabsStagedUploadInspection,
  type LabsStagedUploadSource,
} from './stagedUploads';

/** Items the app could not write. They stay in the list, marked with `message`, for the user to see. */
export type LabsStagedUploadCommitResult = { failed: { id: string; message: string }[] };

export type LabsStagedUploadsController<TPlan> = {
  items: LabsStagedUpload<TPlan>[];
  stageFiles: (files: readonly File[]) => void;
  stageLink: (url: string) => void;
  /** Stage a named group of files as one row (a folder, a collection). */
  stageBatch: (name: string, files: readonly File[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** True once every item is checked and at least one can be added. */
  canConfirm: boolean;
  /** True while `confirm` is running. */
  committing: boolean;
  /**
   * Hand the ready items to the app to write. Items leave the list only after `commit` resolves.
   * Items `commit` reports as failed stay, marked with the reason, and are not re-sent unless the
   * user confirms again. If `commit` throws, every item stays and the error propagates.
   */
  confirm: (
    commit: (ready: LabsReadyStagedUpload<TPlan>[]) => Promise<void | LabsStagedUploadCommitResult>,
  ) => Promise<void>;
};

const CHECK_FAILED = "Couldn't check this file. Remove it and try again.";

/**
 * React state for {@link ./stagedUploads}. `inspect` decides what each source will become; it must
 * not write anything, because the user has not confirmed yet.
 */
export function useLabsStagedUploads<TPlan>({
  inspect,
}: {
  inspect: (source: LabsStagedUploadSource) => Promise<LabsStagedUploadInspection<TPlan>>;
}): LabsStagedUploadsController<TPlan> {
  const [items, setItems] = useState<LabsStagedUpload<TPlan>[]>([]);
  const [committing, setCommitting] = useState(false);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });
  const inspectRef = useRef(inspect);
  useEffect(() => {
    inspectRef.current = inspect;
  });

  const stage = useCallback((sources: LabsStagedUploadSource[]) => {
    if (sources.length === 0) return;
    // Build the new rows here, not inside the state updater: React may run an updater later, and
    // the checks below need the ids now.
    const { added } = stageSources<TPlan>([], sources, () => crypto.randomUUID());
    setItems((current) => [...current, ...added]);
    for (const item of added) {
      void inspectRef
        .current(item.source)
        .catch((): LabsStagedUploadInspection<TPlan> => ({ ok: false, name: item.name, message: CHECK_FAILED }))
        .then((inspection) => setItems((current) => resolveStagedUpload(current, item.id, inspection)));
    }
  }, []);

  const stageFiles = useCallback(
    (files: readonly File[]) => stage(files.map((file) => ({ kind: 'file', file }) as const)),
    [stage],
  );
  const stageLink = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      if (trimmed) stage([{ kind: 'link', url: trimmed }]);
    },
    [stage],
  );
  const stageBatch = useCallback(
    (name: string, files: readonly File[]) => {
      if (files.length > 0) stage([{ kind: 'batch', name, files: [...files] }]);
    },
    [stage],
  );
  const remove = useCallback((id: string) => setItems((current) => removeStagedUpload(current, id)), []);
  const clear = useCallback(() => setItems([]), []);

  const confirm = useCallback(
    async (
      commit: (ready: LabsReadyStagedUpload<TPlan>[]) => Promise<void | LabsStagedUploadCommitResult>,
    ) => {
      const ready = readyStagedUploads(itemsRef.current);
      if (ready.length === 0) return;
      setCommitting(true);
      try {
        const result = await commit(ready);
        const failed = new Map((result?.failed ?? []).map((f) => [f.id, f.message] as const));
        const sent = new Set(ready.map((item) => item.id));
        setItems((current) =>
          current.flatMap((item): LabsStagedUpload<TPlan>[] => {
            const message = failed.get(item.id);
            if (message !== undefined) {
              return [{ id: item.id, source: item.source, status: 'rejected', name: item.name, message }];
            }
            // Earlier refusals go too: confirming means "add what can be added", and a list of
            // refusals left behind would read as unfinished work.
            if (sent.has(item.id) || item.status === 'rejected') return [];
            return [item];
          }),
        );
      } finally {
        setCommitting(false);
      }
    },
    [],
  );

  const canConfirm = useMemo(() => canConfirmStagedUploads(items), [items]);

  return { items, stageFiles, stageLink, stageBatch, remove, clear, canConfirm, committing, confirm };
}
