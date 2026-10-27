/**
 * Merge for pen names, series and accounts (gallery envelope `identities`).
 *
 * Rows are retired, never deleted, so a union by id loses nothing and needs no delete records:
 * a row one side lacks is simply new. Same-id rows merge field by field from the policy maps
 * below. Every field is `lww` today (the newer edit wins), but the maps are typed against each
 * entity, so adding a field is a compile error until someone decides how it merges (ADR 0019).
 */
import type { LyreflyAccount, LyreflyIdentities, LyreflyPersona, LyreflySeries } from '../types';

/** Per-field merge disposition. Only last-writer-wins so far; add a case when a field needs more. */
type MergePolicy = 'lww';

const PERSONA_MERGE_POLICY = {
  id: 'lww',
  name: 'lww',
  retiredAt: 'lww',
  updatedAt: 'lww',
} satisfies Record<keyof LyreflyPersona, MergePolicy>;

const SERIES_MERGE_POLICY = {
  id: 'lww',
  title: 'lww',
  retiredAt: 'lww',
  updatedAt: 'lww',
} satisfies Record<keyof LyreflySeries, MergePolicy>;

const ACCOUNT_MERGE_POLICY = {
  id: 'lww',
  platform: 'lww',
  handle: 'lww',
  url: 'lww',
  owner: 'lww',
  retiredAt: 'lww',
  updatedAt: 'lww',
} satisfies Record<keyof LyreflyAccount, MergePolicy>;

type IdentityRow = { id: string; updatedAt: string };

function mergeRow<T extends IdentityRow>(policy: Record<keyof T, MergePolicy>, local: T, remote: T): T {
  const newer = remote.updatedAt > local.updatedAt ? remote : local;
  const merged = {} as T;
  for (const key of Object.keys(policy) as (keyof T)[]) {
    // 'lww': the newer row's value, including a cleared one (a bring-back clears `retiredAt`).
    if (key in newer) merged[key] = newer[key];
  }
  return merged;
}

function mergeRows<T extends IdentityRow>(
  policy: Record<keyof T, MergePolicy>,
  local: readonly T[],
  remote: readonly T[],
): T[] {
  const byId = new Map(local.map((row) => [row.id, row] as const));
  for (const row of remote) {
    const prev = byId.get(row.id);
    byId.set(row.id, prev ? mergeRow(policy, prev, row) : row);
  }
  return [...byId.values()];
}

export const EMPTY_LYREFLY_IDENTITIES: LyreflyIdentities = { personas: [], series: [], accounts: [] };

export function mergeLyreflyIdentities(
  local: LyreflyIdentities | undefined,
  remote: LyreflyIdentities | undefined,
): LyreflyIdentities {
  const l = local ?? EMPTY_LYREFLY_IDENTITIES;
  const r = remote ?? EMPTY_LYREFLY_IDENTITIES;
  return {
    personas: mergeRows(PERSONA_MERGE_POLICY, l.personas, r.personas),
    series: mergeRows(SERIES_MERGE_POLICY, l.series, r.series),
    accounts: mergeRows(ACCOUNT_MERGE_POLICY, l.accounts, r.accounts),
  };
}

export function lyreflyIdentitiesAreEmpty(identities: LyreflyIdentities | undefined): boolean {
  return (
    !identities ||
    (identities.personas.length === 0 && identities.series.length === 0 && identities.accounts.length === 0)
  );
}
