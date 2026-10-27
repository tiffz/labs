import { useCallback, useState, type ReactElement } from 'react';
import { LabsStagedUploadPanel } from '../../shared/upload/LabsStagedUploadPanel';
import type {
  LabsReadyStagedUpload,
  LabsStagedUploadInspection,
  LabsStagedUploadSource,
} from '../../shared/upload/stagedUploads';
import { useLabsStagedUploads } from '../../shared/upload/useLabsStagedUploads';

/** What one staged row becomes: a new collection, or photos added to an existing one. */
export type GestureStagePlan<TJob> =
  | { kind: 'new-collection'; job: TJob }
  | { kind: 'add-to-collection'; packId: string; packName: string; files: File[] };

const photos = (n: number) => `${n} photo${n === 1 ? '' : 's'}`;

/**
 * Gesture's review step (ADR 0030). A pick or drop is read into collections first (one per folder),
 * then each collection is ONE row: "Paris trip · New collection · 124 photos · 310 MB". Listing
 * hundreds of photos would bury the decision that matters, which is the collections. Nothing
 * uploads to Drive until "Upload".
 */
export function useGestureUploadStaging<TJob extends { files: File[] }>({
  jobName,
  enqueueJobs,
  addToCollectionNow,
}: {
  jobName: (job: TJob) => string;
  enqueueJobs: (jobs: TJob[]) => Promise<void> | void;
  addToCollectionNow: (packId: string, files: File[]) => Promise<void>;
}): {
  stageNewCollections: (jobs: TJob[]) => void;
  saveNewCollections: (jobs: TJob[]) => void;
  saveAddToCollection: (packId: string, packName: string, files: File[]) => void;
  panel: ReactElement;
} {
  // Plans are keyed by the batch's first file: staging copies the file array, but not the files,
  // and a file belongs to one batch.
  const [plans] = useState(() => new WeakMap<File, GestureStagePlan<TJob>>());

  const inspect = useCallback(
    async (source: LabsStagedUploadSource): Promise<LabsStagedUploadInspection<GestureStagePlan<TJob>>> => {
      if (source.kind !== 'batch') {
        return { ok: false, name: source.kind === 'file' ? source.file.name : source.url, message: 'Add photos as a collection.' };
      }
      const first = source.files[0];
      const plan = first ? plans.get(first) : undefined;
      if (!plan) return { ok: false, name: source.name, message: 'Pick these photos again.' };
      const bytes = source.files.reduce((sum, f) => sum + f.size, 0);
      const outcome =
        plan.kind === 'new-collection'
          ? `New collection · ${photos(source.files.length)}`
          : `Adds ${photos(source.files.length)} to "${plan.packName}"`;
      return { ok: true, name: source.name, mimeType: null, sizeBytes: bytes, outcome, plan };
    },
    [plans],
  );

  const staged = useLabsStagedUploads<GestureStagePlan<TJob>>({ inspect });
  const { stageBatch, saveBatch } = staged;

  const commit = useCallback(
    async (ready: LabsReadyStagedUpload<GestureStagePlan<TJob>>[]) => {
      const jobs = ready.flatMap((item) => (item.plan.kind === 'new-collection' ? [item.plan.job] : []));
      if (jobs.length > 0) await enqueueJobs(jobs);
      for (const item of ready) {
        if (item.plan.kind === 'add-to-collection') await addToCollectionNow(item.plan.packId, item.plan.files);
      }
    },
    [addToCollectionNow, enqueueJobs],
  );

  /** `save` true for a drop: it uploads at once (ADR 0030). A picker stages for confirm. */
  const newCollections = useCallback(
    (jobs: TJob[], save: boolean) => {
      for (const job of jobs) {
        const first = job.files[0];
        if (!first) continue;
        plans.set(first, { kind: 'new-collection', job });
        if (save) void saveBatch(jobName(job), job.files, commit);
        else stageBatch(jobName(job), job.files);
      }
    },
    [commit, jobName, plans, saveBatch, stageBatch],
  );
  const stageNewCollections = useCallback((jobs: TJob[]) => newCollections(jobs, false), [newCollections]);
  const saveNewCollections = useCallback((jobs: TJob[]) => newCollections(jobs, true), [newCollections]);

  /** Photos dropped onto a collection upload at once. */
  const saveAddToCollection = useCallback(
    (packId: string, packName: string, files: File[]) => {
      const first = files[0];
      if (!first) return;
      plans.set(first, { kind: 'add-to-collection', packId, packName, files });
      void saveBatch(packName, files, commit);
    },
    [commit, plans, saveBatch],
  );

  const onConfirm = useCallback(() => {
    void staged.confirm(commit);
  }, [commit, staged]);

  const total = staged.items.reduce((sum, item) => sum + (item.source.kind === 'batch' ? item.source.files.length : 0), 0);
  const panel = (
    <LabsStagedUploadPanel
      staged={staged}
      onConfirm={onConfirm}
      confirmLabel={() => (total === 1 ? 'Upload 1 photo' : `Upload ${total} photos`)}
      title="Photos ready to upload"
      itemNoun="collection"
      sx={{ mb: 2 }}
    />
  );

  return { stageNewCollections, saveNewCollections, saveAddToCollection, panel };
}
