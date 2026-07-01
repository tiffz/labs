import { encoreDb } from '../db/encoreDb';
import { defaultRepertoireExtrasRow } from './repertoireWire';

const MAX_DELETED_EXERCISE_RUN_TOMBSTONES = 500;

/** Record run ids the user cleared so union merge cannot resurrect them from another device. */
export async function recordDeletedExerciseRunIds(ids: readonly string[]): Promise<void> {
  const trimmed = ids.map((id) => id.trim()).filter(Boolean);
  if (!trimmed.length) return;
  const now = new Date().toISOString();
  const extras = (await encoreDb.repertoireExtras.get('default')) ?? defaultRepertoireExtrasRow(now);
  const merged = [...new Set([...(extras.deletedExerciseRunIds ?? []), ...trimmed])];
  const capped = merged.slice(-MAX_DELETED_EXERCISE_RUN_TOMBSTONES);
  await encoreDb.repertoireExtras.put({
    ...extras,
    deletedExerciseRunIds: capped,
    updatedAt: now,
  });
}

export function unionDeletedExerciseRunIds(
  local: string[] | undefined,
  remote: string[] | undefined,
): string[] | undefined {
  const merged = [...new Set([...(local ?? []), ...(remote ?? [])])];
  if (!merged.length) return undefined;
  return merged.slice(-MAX_DELETED_EXERCISE_RUN_TOMBSTONES);
}
