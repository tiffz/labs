import { DriveHttpError } from './driveFetchErrors';

/**
 * Run a sidecar download batch so one dead blob cannot pause a whole library's sync.
 *
 * Every `downloadSidecars` implementation awaited each item inside a bare loop. One trashed or
 * permission-changed blob throws a 404, the loop aborts, the exception propagates into the merge,
 * and every *later* item in the batch is never fetched — a single dead PDF stalls the rest of the
 * library, on every subsequent sync, with no message naming the file.
 *
 * Tolerating a missing item is safe: the sidecar is already gone from Drive, and skipping it leaves
 * local data untouched. Tolerating an AUTH or RATE-LIMIT failure is not — every remaining item will
 * fail the same way, and grinding through hundreds of them is exactly the API-abuse pattern
 * `driveRequestGovernor` exists to prevent. So those still stop the batch.
 */
export interface SidecarBatchOutcome {
  attempted: number;
  succeeded: number;
  /** Labels of items whose sidecar is gone from Drive. Skipped, not failed. */
  missing: string[];
}

function statusOf(error: unknown): number | null {
  if (error instanceof DriveHttpError) return error.status;
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : null;
}

/** The sidecar is gone from Drive: trashed, deleted, or no longer visible to this app. */
export function isMissingSidecarError(error: unknown): boolean {
  const status = statusOf(error);
  return status === 404 || status === 410;
}

/**
 * Continuing would fail identically for every remaining item, so stopping is the correct response.
 * 401/403 need a fresh token or consent; 429 and 5xx need backoff, not several hundred more calls.
 */
export function isBatchStoppingSidecarError(error: unknown): boolean {
  const status = statusOf(error);
  if (status == null) return true; // Unknown failure — do not guess that it is per-item.
  if (status === 401 || status === 403 || status === 429) return true;
  return status >= 500;
}

export async function runSidecarBatch<T>(
  items: readonly T[],
  run: (item: T, index: number) => Promise<void>,
  options: { labelOf: (item: T) => string },
): Promise<SidecarBatchOutcome> {
  const outcome: SidecarBatchOutcome = { attempted: 0, succeeded: 0, missing: [] };

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!;
    outcome.attempted += 1;
    try {
      await run(item, i);
      outcome.succeeded += 1;
    } catch (error) {
      if (isMissingSidecarError(error)) {
        outcome.missing.push(options.labelOf(item));
        continue;
      }
      if (isBatchStoppingSidecarError(error)) throw error;
      outcome.missing.push(options.labelOf(item));
    }
  }

  return outcome;
}

/** User-facing line naming what could not be fetched, or null when everything landed. */
export function formatMissingSidecarsMessage(outcome: SidecarBatchOutcome): string | null {
  if (outcome.missing.length === 0) return null;
  const count = outcome.missing.length;
  const noun = count === 1 ? 'file' : 'files';
  const named = outcome.missing.slice(0, 3).join(', ');
  const more = count > 3 ? ` and ${count - 3} more` : '';
  return `${count} ${noun} could not be downloaded from Drive (${named}${more}). They may have been deleted there.`;
}
