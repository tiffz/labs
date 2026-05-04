/**
 * MRT display column ids — selection first, row actions last, spacer after actions when present.
 * TanStack column ordering: any leaf id missing from controlled `columnOrder` is appended last after
 * merging (ColumnOrdering `_getOrderColumnsFn`), so callers must list display columns explicitly.
 */
export const MRT_ROW_SELECT_COL = 'mrt-row-select';
export const MRT_ROW_ACTIONS_COL = 'mrt-row-actions';
export const MRT_ROW_SPACER_COL = 'mrt-row-spacer';

/** Legacy Performances table used a data column `id: 'actions'`; prefs may still list it. */
export const LEGACY_MRT_ACTIONS_DATA_COL = 'actions';

export function normalizeEncoreMrtColumnOrder(order: string[]): string[] {
  const hasSelect = order.includes(MRT_ROW_SELECT_COL);
  const hasActions = order.includes(MRT_ROW_ACTIONS_COL);
  const hasSpacer = order.includes(MRT_ROW_SPACER_COL);
  const core = order.filter(
    (id) => id !== MRT_ROW_SELECT_COL && id !== MRT_ROW_ACTIONS_COL && id !== MRT_ROW_SPACER_COL,
  );
  const next: string[] = [];
  if (hasSelect) next.push(MRT_ROW_SELECT_COL);
  next.push(...core);
  if (hasActions) next.push(MRT_ROW_ACTIONS_COL);
  if (hasSpacer) next.push(MRT_ROW_SPACER_COL);
  return next;
}

export function withEncoreMrtTrailingSpacer(order: string[]): string[] {
  return order.includes(MRT_ROW_SPACER_COL) ? order : [...order, MRT_ROW_SPACER_COL];
}

/**
 * When `enableRowActions` is true, controlled `columnOrder` must include `mrt-row-actions` or
 * TanStack appends that leaf column at the end after merging (see ColumnOrdering `_getOrderColumnsFn`),
 * which can destabilize neighboring display columns.
 */
export function ensureEncoreMrtRowActionsInOrder(order: string[]): string[] {
  if (order.includes(MRT_ROW_ACTIONS_COL)) return order;
  const spacerIdx = order.indexOf(MRT_ROW_SPACER_COL);
  if (spacerIdx >= 0) {
    const next = [...order];
    next.splice(spacerIdx, 0, MRT_ROW_ACTIONS_COL);
    return next;
  }
  return [...order, MRT_ROW_ACTIONS_COL];
}

/**
 * TanStack treats `mrt-row-select` like any other leaf: if it is missing from controlled
 * `columnOrder`, it is appended last. Force a single leading selection column when row selection
 * is enabled.
 */
export function ensureEncoreMrtSelectLeading(order: string[]): string[] {
  const sans = order.filter((id) => id !== MRT_ROW_SELECT_COL);
  return [MRT_ROW_SELECT_COL, ...sans];
}

/** Remap legacy `actions` data column id to MRT's `mrt-row-actions` display column; dedupe actions. */
export function migrateEncoreMrtColumnOrderIds(order: string[]): string[] {
  const out: string[] = [];
  let actionsSeen = false;
  for (const raw of order) {
    const id = raw === LEGACY_MRT_ACTIONS_DATA_COL ? MRT_ROW_ACTIONS_COL : raw;
    if (id === MRT_ROW_ACTIONS_COL) {
      if (actionsSeen) continue;
      actionsSeen = true;
    }
    out.push(id);
  }
  return out;
}

export function migrateEncoreMrtColumnVisibility(vis: Record<string, boolean>): Record<string, boolean> {
  const next = { ...vis };
  if (Object.prototype.hasOwnProperty.call(next, LEGACY_MRT_ACTIONS_DATA_COL)) {
    if (!Object.prototype.hasOwnProperty.call(next, MRT_ROW_ACTIONS_COL)) {
      next[MRT_ROW_ACTIONS_COL] = next[LEGACY_MRT_ACTIONS_DATA_COL]!;
    }
    delete next[LEGACY_MRT_ACTIONS_DATA_COL];
  }
  return next;
}
