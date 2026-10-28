import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  canConfirmStagedUploads,
  readyStagedUploads,
  removeStagedUpload,
  resolveStagedUpload,
  stagedUploadsAwaitConfirm,
  stageSources,
  updateStagedUploadPlan,
  updateStagedUploadPlans,
  type LabsReadyStagedUpload,
  type LabsStagedUpload,
  type LabsStagedUploadInspection,
  type LabsStagedUploadSource,
} from './stagedUploads';

/** Items the app could not write. They stay in the list, marked with `message`, for the user to see. */
export type LabsStagedUploadCommitResult = { failed: { id: string; message: string }[] };

export type LabsStagedUploadCommit<TPlan> = (
  ready: LabsReadyStagedUpload<TPlan>[],
) => Promise<void | LabsStagedUploadCommitResult>;

export type LabsStagedUploadsController<TPlan> = {
  items: LabsStagedUpload<TPlan>[];
  stageFiles: (files: readonly File[]) => void;
  stageLink: (url: string) => void;
  /** Stage a named group of files as one row (a folder, a collection). */
  stageBatch: (name: string, files: readonly File[]) => void;
  /**
   * Dropped files: check them and save the usable ones at once, with no confirm (the drop is the
   * confirmation). Refused or failed files stay listed with the reason. Picked files and pasted
   * links still go through `stageFiles` / `stageLink` and wait for `confirm`.
   */
  saveFiles: (files: readonly File[], commit: LabsStagedUploadCommit<TPlan>) => Promise<void>;
  /** A dropped folder, saved at once as one row. */
  saveBatch: (name: string, files: readonly File[], commit: LabsStagedUploadCommit<TPlan>) => Promise<void>;
  /** Edit a ready item's plan, for surfaces that let the user adjust each row before confirming. */
  updatePlan: (id: string, update: (plan: TPlan) => TPlan) => void;
  /** Edit every ready item's plan at once. Runs on the latest items, so it never misses one just checked. */
  updatePlans: (update: (plan: TPlan) => TPlan) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** True while a picked or pasted item waits for the confirm button. */
  awaitingConfirm: boolean;
  /** True once every item is checked and at least one can be added. */
  canConfirm: boolean;
  /** True while `confirm` is running. */
  committing: boolean;
  /**
   * Hand the ready items to the app to write. Items leave the list only after `commit` resolves.
   * Items `commit` reports as failed stay, marked with the reason, and are not re-sent unless the
   * user confirms again. If `commit` throws, every item stays and the error propagates.
   */
  confirm: (commit: LabsStagedUploadCommit<TPlan>) => Promise<void>;
};

const CHECK_FAILED = "Couldn't check this file. Remove it and try again.";
const SAVE_FAILED = "Couldn't save this file. Check your connection and try again.";

/**
 * React state for {@link ./stagedUploads}. `inspect` decides what each source will become; it must
 * not write anything, because the user has not confirmed yet.
 */
export function useLabsStagedUploads<TPlan>({
  inspect,
  retryFailed = false,
}: {
  inspect: (source: LabsStagedUploadSource) => Promise<LabsStagedUploadInspection<TPlan>>;
  /**
   * Keep an item that failed to save as ready, with `error`, so the next confirm retries it. For
   * review tables, where a row holds edits (a song pairing, a date) that a refusal would throw away.
   * Otherwise a failed item turns into a refusal and is not sent again.
   */
  retryFailed?: boolean;
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

  // Ids the user removed. A drop being saved checks this before writing, because `items` in a
  // closure would still hold the row.
  const removedRef = useRef(new Set<string>());

  /** Adds rows and checks each; resolves with the rows as checked. */
  const stage = useCallback((sources: LabsStagedUploadSource[], autoSave = false) => {
    // Build the new rows here, not inside the state updater: React may run an updater later, and
    // the checks below need the ids now.
    const { added } = stageSources<TPlan>([], sources, () => crypto.randomUUID(), { autoSave });
    if (added.length === 0) return Promise.resolve([]);
    setItems((current) => [...current, ...added]);
    return Promise.all(
      added.map((item) =>
        inspectRef
          .current(item.source)
          .catch((): LabsStagedUploadInspection<TPlan> => ({ ok: false, name: item.name, message: CHECK_FAILED }))
          .then((inspection) => {
            setItems((current) => resolveStagedUpload(current, item.id, inspection));
            return resolveStagedUpload([item], item.id, inspection)[0]!;
          }),
      ),
    );
  }, []);

  /**
   * Write `ready` and settle the list: written rows leave, failed rows stay with the reason. With
   * `clearRejected`, earlier refusals go too.
   */
  const settle = useCallback(
    async (ready: LabsReadyStagedUpload<TPlan>[], commit: LabsStagedUploadCommit<TPlan>, clearRejected: boolean) => {
      const result = await commit(ready);
      const failed = new Map((result?.failed ?? []).map((f) => [f.id, f.message] as const));
      const sent = new Set(ready.map((item) => item.id));
      setItems((current) =>
        current.flatMap((item): LabsStagedUpload<TPlan>[] => {
          const message = failed.get(item.id);
          if (message !== undefined) {
            if (retryFailed && item.status === 'ready') return [{ ...item, error: message }];
            return [{ id: item.id, source: item.source, autoSave: item.autoSave, status: 'rejected', name: item.name, message }];
          }
          if (sent.has(item.id) || (clearRejected && item.status === 'rejected')) return [];
          return [item];
        }),
      );
    },
    [retryFailed],
  );

  const stageFiles = useCallback(
    (files: readonly File[]) => void stage(files.map((file) => ({ kind: 'file', file }) as const)),
    [stage],
  );
  const stageLink = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      if (trimmed) void stage([{ kind: 'link', url: trimmed }]);
    },
    [stage],
  );
  const stageBatch = useCallback(
    (name: string, files: readonly File[]) => {
      if (files.length > 0) void stage([{ kind: 'batch', name, files: [...files] }]);
    },
    [stage],
  );

  const save = useCallback(
    async (sources: LabsStagedUploadSource[], commit: LabsStagedUploadCommit<TPlan>) => {
      const checked = await stage(sources, true);
      const ready = readyStagedUploads(checked).filter((item) => !removedRef.current.has(item.id));
      if (ready.length === 0) return;
      try {
        // Refusals from this drop stay: the user never saw a list, so the row is the only place
        // that says why a file did not arrive.
        await settle(ready, commit, false);
      } catch {
        const ids = new Set(ready.map((item) => item.id));
        setItems((current) =>
          current.map((item) =>
            ids.has(item.id)
              ? { id: item.id, source: item.source, autoSave: true, status: 'rejected', name: item.name, message: SAVE_FAILED }
              : item,
          ),
        );
      }
    },
    [stage, settle],
  );
  const saveFiles = useCallback(
    (files: readonly File[], commit: LabsStagedUploadCommit<TPlan>) =>
      save(files.map((file) => ({ kind: 'file', file }) as const), commit),
    [save],
  );
  const saveBatch = useCallback(
    async (name: string, files: readonly File[], commit: LabsStagedUploadCommit<TPlan>) => {
      if (files.length > 0) await save([{ kind: 'batch', name, files: [...files] }], commit);
    },
    [save],
  );

  const updatePlan = useCallback((id: string, update: (plan: TPlan) => TPlan) => {
    setItems((current) => updateStagedUploadPlan(current, id, update));
  }, []);

  const updatePlans = useCallback((update: (plan: TPlan) => TPlan) => {
    setItems((current) => updateStagedUploadPlans(current, update));
  }, []);

  const remove = useCallback((id: string) => {
    removedRef.current.add(id);
    setItems((current) => removeStagedUpload(current, id));
  }, []);
  const clear = useCallback(() => {
    for (const item of itemsRef.current) removedRef.current.add(item.id);
    setItems([]);
  }, []);

  const confirm = useCallback(
    async (commit: LabsStagedUploadCommit<TPlan>) => {
      // Dropped rows are already being saved by `save`; confirm only sends what waited for it.
      const ready = readyStagedUploads(itemsRef.current).filter((item) => !item.autoSave);
      if (ready.length === 0) return;
      setCommitting(true);
      try {
        // Earlier refusals go too: confirming means "add what can be added", and a list of
        // refusals left behind would read as unfinished work.
        await settle(ready, commit, true);
      } finally {
        setCommitting(false);
      }
    },
    [settle],
  );

  const canConfirm = useMemo(() => canConfirmStagedUploads(items), [items]);
  const awaitingConfirm = useMemo(() => stagedUploadsAwaitConfirm(items), [items]);

  return {
    items,
    stageFiles,
    stageLink,
    stageBatch,
    saveFiles,
    saveBatch,
    updatePlan,
    updatePlans,
    remove,
    clear,
    awaitingConfirm,
    canConfirm,
    committing,
    confirm,
  };
}
