import type { LabsBlockingJobHandle } from './LabsBlockingJobContext';

export type BlockingJobItemProgress = {
  current: number;
  total: number;
  /** e.g. Importing, Uploading, Merging */
  verb?: string;
  /** Optional trailing context (filename, folder name) */
  detail?: string;
};

/** Update blocking-job label + determinate bar for counted work (imports, uploads, batches). */
export function reportBlockingJobItemProgress(
  job: Pick<LabsBlockingJobHandle, 'updateLabel' | 'updateProgress'>,
  { current, total, verb = 'Importing', detail }: BlockingJobItemProgress,
): void {
  const detailSuffix = detail ? ` ${detail}` : '';
  job.updateLabel(`${verb} ${current} of ${total}…${detailSuffix}`);
  if (total > 0) {
    job.updateProgress(Math.min(1, Math.max(0, current / total)));
  }
}

/** Human-readable counts for snackbar caption under the progress bar. */
export function formatBlockingJobItemProgressCaption(label: string): string | null {
  const match = label.match(/(\d+)\s+of\s+(\d+)/i);
  if (!match) return null;
  const current = Number.parseInt(match[1] ?? '0', 10);
  const total = Number.parseInt(match[2] ?? '0', 10);
  if (total <= 0 || current < 0 || current > total) return null;
  const remaining = total - current;
  if (remaining > 0) {
    return `${current} of ${total} complete · ${remaining} remaining`;
  }
  return `${total} of ${total} complete`;
}
