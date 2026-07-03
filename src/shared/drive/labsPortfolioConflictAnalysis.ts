/**
 * Shared row-level conflict analysis for Labs Drive sync (ADR 0020).
 *
 * Divergence (cloud newer + local edits) is not a user conflict. Prompt only when
 * `needsReview.length > 0` — same stable id edited on both sides since the last sync
 * baseline and auto-merge would drop non-empty content.
 */

/** Milliseconds since epoch (portfolio apps) or comparable numeric clocks. */
export type LabsPortfolioClock = number;

export type LabsPortfolioRowConflictClass =
  | 'inSync'
  | 'localOnly'
  | 'remoteOnly'
  | 'bothEdited';

export interface LabsPortfolioConflictRow {
  id: string;
  label: string;
  /** App-defined entity kind (`song`, `comic`, `pack`, …). */
  kind: string;
  localUpdatedAt?: LabsPortfolioClock;
  remoteUpdatedAt?: LabsPortfolioClock;
  /** Human-readable stakes, e.g. "12 sections here · 8 on Drive". */
  stakesSummary?: string;
}

export interface LabsPortfolioConflictAnalysis {
  localOnly: LabsPortfolioConflictRow[];
  remoteOnly: LabsPortfolioConflictRow[];
  /** Both sides edited; auto-merge is safe (non-destructive). */
  autoResolved: LabsPortfolioConflictRow[];
  /** Both sides edited and auto-merge would drop non-empty content — user must choose. */
  needsReview: LabsPortfolioConflictRow[];
}

export type LabsPortfolioRowClock = {
  id: string;
  updatedAt: LabsPortfolioClock;
  label?: string;
  kind?: string;
};

/**
 * Classify a single entity by whether local and/or remote moved past the last sync baselines.
 * Mirrors Encore's `classifyRow` (ISO clocks there; numeric ms here).
 */
export function classifyPortfolioRow(
  local: LabsPortfolioRowClock | undefined,
  remote: LabsPortfolioRowClock | undefined,
  lastSyncedLocalMax: LabsPortfolioClock,
  lastRemoteSeen: LabsPortfolioClock,
): LabsPortfolioRowConflictClass {
  if (!local && !remote) return 'inSync';
  if (local && !remote) return local.updatedAt > lastSyncedLocalMax ? 'localOnly' : 'inSync';
  if (!local && remote) return remote.updatedAt > lastRemoteSeen ? 'remoteOnly' : 'inSync';
  if (local!.updatedAt === remote!.updatedAt) return 'inSync';
  const localChanged = local!.updatedAt > lastSyncedLocalMax;
  const remoteChanged = remote!.updatedAt > lastRemoteSeen;
  if (localChanged && remoteChanged) return 'bothEdited';
  if (localChanged) return 'localOnly';
  if (remoteChanged) return 'remoteOnly';
  return 'inSync';
}

export type AnalyzePortfolioRowsOptions = {
  lastSyncedLocalMax: LabsPortfolioClock;
  lastRemoteSeen: LabsPortfolioClock;
  localRows: readonly LabsPortfolioRowClock[];
  remoteRows: readonly LabsPortfolioRowClock[];
  defaultKind?: string;
  /**
   * When both sides edited the same id, return true if auto-merge is safe (no content loss).
   * Default: treat all `bothEdited` as auto-resolvable (union merge apps).
   */
  isAutoResolvable?: (local: LabsPortfolioRowClock, remote: LabsPortfolioRowClock) => boolean;
  /** Optional stakes line for review rows. */
  summarizeStakes?: (local: LabsPortfolioRowClock, remote: LabsPortfolioRowClock) => string | undefined;
};

function toConflictRow(
  local: LabsPortfolioRowClock | undefined,
  remote: LabsPortfolioRowClock | undefined,
  defaultKind: string,
  stakesSummary?: string,
): LabsPortfolioConflictRow {
  const id = local?.id ?? remote?.id ?? '';
  const label = local?.label?.trim() || remote?.label?.trim() || id;
  const kind = local?.kind ?? remote?.kind ?? defaultKind;
  return {
    id,
    label,
    kind,
    localUpdatedAt: local?.updatedAt,
    remoteUpdatedAt: remote?.updatedAt,
    stakesSummary,
  };
}

/**
 * Build a full conflict analysis for two maps of entities keyed by stable id.
 */
export function analyzePortfolioRows(options: AnalyzePortfolioRowsOptions): LabsPortfolioConflictAnalysis {
  const {
    lastSyncedLocalMax,
    lastRemoteSeen,
    localRows,
    remoteRows,
    defaultKind = 'item',
    isAutoResolvable = () => true,
    summarizeStakes,
  } = options;

  const localById = new Map(localRows.map((r) => [r.id, r] as const));
  const remoteById = new Map(remoteRows.map((r) => [r.id, r] as const));
  const ids = new Set([...localById.keys(), ...remoteById.keys()]);

  const localOnly: LabsPortfolioConflictRow[] = [];
  const remoteOnly: LabsPortfolioConflictRow[] = [];
  const autoResolved: LabsPortfolioConflictRow[] = [];
  const needsReview: LabsPortfolioConflictRow[] = [];

  for (const id of ids) {
    const local = localById.get(id);
    const remote = remoteById.get(id);
    const cls = classifyPortfolioRow(local, remote, lastSyncedLocalMax, lastRemoteSeen);
    if (cls === 'inSync') continue;
    if (cls === 'localOnly') {
      localOnly.push(toConflictRow(local, remote, defaultKind));
      continue;
    }
    if (cls === 'remoteOnly') {
      remoteOnly.push(toConflictRow(local, remote, defaultKind));
      continue;
    }
    // bothEdited
    const stakes =
      local && remote && summarizeStakes ? summarizeStakes(local, remote) : undefined;
    const row = toConflictRow(local, remote, defaultKind, stakes);
    if (local && remote && isAutoResolvable(local, remote)) {
      autoResolved.push(row);
    } else {
      needsReview.push(row);
    }
  }

  return { localOnly, remoteOnly, autoResolved, needsReview };
}

/** True when the user must resolve at least one row before sync continues. */
export function shouldBlockSyncForConflict(analysis: LabsPortfolioConflictAnalysis): boolean {
  return analysis.needsReview.length > 0;
}

/** Parse an ISO timestamp to ms; returns 0 when missing/invalid. */
export function labsPortfolioClockFromIso(iso: string | undefined | null): LabsPortfolioClock {
  const t = (iso ?? '').trim();
  if (!t) return 0;
  const ms = Date.parse(t);
  return Number.isFinite(ms) ? ms : 0;
}
