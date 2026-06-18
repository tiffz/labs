/**
 * Generic tombstone list helpers for portfolio Drive apps (union by id, cap, newest wins).
 */

export type LabsPortfolioTombstone = {
  id: string;
  removedAt: string;
};

export function normalizePortfolioTombstones(
  tombstones: readonly LabsPortfolioTombstone[],
  max: number,
): LabsPortfolioTombstone[] {
  const byId = new Map<string, LabsPortfolioTombstone>();
  for (const t of tombstones) {
    if (!t?.id?.trim() || typeof t.removedAt !== 'string') continue;
    const existing = byId.get(t.id);
    if (!existing || existing.removedAt < t.removedAt) {
      byId.set(t.id, { id: t.id, removedAt: t.removedAt });
    }
  }
  const list = Array.from(byId.values());
  list.sort((a, b) => (a.removedAt > b.removedAt ? -1 : a.removedAt < b.removedAt ? 1 : 0));
  if (list.length > max) list.length = max;
  return list;
}

export function mergePortfolioTombstoneLists(
  local: readonly LabsPortfolioTombstone[],
  remote: readonly LabsPortfolioTombstone[],
  max: number,
): LabsPortfolioTombstone[] {
  return normalizePortfolioTombstones([...local, ...remote], max);
}

export function portfolioTombstoneIdSet(tombstones: readonly LabsPortfolioTombstone[]): ReadonlySet<string> {
  return new Set(tombstones.map((t) => t.id));
}
