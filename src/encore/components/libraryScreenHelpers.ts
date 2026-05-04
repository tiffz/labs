import type { MRT_ColumnDef } from 'material-react-table';
import type { EncorePerformance, EncoreSong } from '../types';
import { effectiveSongAttachments } from '../utils/songAttachments';
import {
  ensureEncoreMrtRowActionsInOrder,
  ensureEncoreMrtSelectLeading,
  MRT_ROW_SELECT_COL,
  normalizeEncoreMrtColumnOrder,
  withEncoreMrtTrailingSpacer,
} from './encoreMrtColumnOrder';

export type RepertoireViewMode = 'table' | 'grid';

export const REPERTOIRE_FILTER_EMPTY: Record<string, string[]> = {
  performed: [],
  practicing: [],
  venue: [],
  tags: [],
  artist: [],
  perfKey: [],
  assetRefs: [],
  assetBacking: [],
  assetSpotify: [],
  assetCharts: [],
  assetTakes: [],
  milestoneWhich: [],
  milestoneNotDone: [],
  milestoneDoneMin: [],
  milestoneDoneMax: [],
};

/** Columns that should be visible when missing from saved prefs (older installs). MRT uses `false` = hidden. */
export const REP_COLUMN_VISIBLE_BY_DEFAULT_IF_ABSENT = {
  lastIso: true,
} as const satisfies Record<string, boolean>;

/** New resource columns: hidden until the user shows them (merged into prefs on load). MRT uses `false` = hidden. */
export const REP_COLUMN_HIDDEN_BY_DEFAULT = {
  refTracks: false,
  backingTracks: false,
  spotifySource: false,
  songCharts: false,
  songTakes: false,
} as const satisfies Record<string, boolean>;

export function mergeRepertoireColumnVisibility(
  saved: Record<string, boolean> | undefined,
): Record<string, boolean> {
  const vis = { ...(saved ?? {}) };
  for (const [k, v] of Object.entries(REP_COLUMN_VISIBLE_BY_DEFAULT_IF_ABSENT)) {
    if (!(k in vis)) vis[k] = v;
  }
  for (const [k, v] of Object.entries(REP_COLUMN_HIDDEN_BY_DEFAULT)) {
    if (!(k in vis)) vis[k] = v;
  }
  return vis;
}

export function countReferenceTracks(s: EncoreSong): number {
  return s.referenceLinks?.length ?? 0;
}

export function countBackingTracks(s: EncoreSong): number {
  return s.backingLinks?.length ?? 0;
}

export function countChartAttachments(s: EncoreSong): number {
  return effectiveSongAttachments(s).filter((a) => a.kind === 'chart').length;
}

export function countTakeAttachments(s: EncoreSong): number {
  return effectiveSongAttachments(s).filter((a) => a.kind === 'recording').length;
}

export function songHasSpotifySource(s: EncoreSong): boolean {
  return Boolean(s.spotifyTrackId?.trim());
}

export function normalizeVenueTag(tag: string): string {
  return tag.trim() || 'Venue';
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return '–';
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function mrtColumnId<T extends Record<string, unknown>>(c: MRT_ColumnDef<T>): string {
  if (c.id) return c.id;
  if (typeof c.accessorKey === 'string') return c.accessorKey;
  if (c.accessorKey != null) return String(c.accessorKey);
  return '';
}

/** Match `state.columnOrder` so TanStack functional updaters see the same base as MRT. */
export function repertoireColumnOrderForMrt(
  viewMode: RepertoireViewMode,
  repColOrder: string[] | undefined,
  repDefaultColumnOrder: string[],
): string[] {
  const base = repColOrder ?? repDefaultColumnOrder;
  if (viewMode !== 'table') {
    return withEncoreMrtTrailingSpacer(
      normalizeEncoreMrtColumnOrder(
        ensureEncoreMrtRowActionsInOrder(base.filter((id) => id !== MRT_ROW_SELECT_COL)),
      ),
    );
  }
  const withSelect = base.includes(MRT_ROW_SELECT_COL) ? base : [MRT_ROW_SELECT_COL, ...base];
  const withActions = ensureEncoreMrtRowActionsInOrder(withSelect);
  const normalized = normalizeEncoreMrtColumnOrder(withActions);
  return withEncoreMrtTrailingSpacer(ensureEncoreMrtSelectLeading(normalized));
}

/**
 * Search predicate keyed off a precomputed `perfBySong` map (the screen already builds it for
 * the venue / "performed" filters). The legacy version filtered the global `performances` array
 * for every song on every keystroke — O(songs × performances). This O(songsPerformances) version
 * stays linear in the row's own performance list.
 */
export function songMatchesSearch(
  song: EncoreSong,
  query: string,
  perfBySong: ReadonlyMap<string, ReadonlyArray<EncorePerformance>>,
): boolean {
  const t = query.trim().toLowerCase();
  if (!t) return true;
  if (song.title.toLowerCase().includes(t) || song.artist.toLowerCase().includes(t)) return true;
  const songPerfs = perfBySong.get(song.id);
  if (songPerfs) {
    for (const p of songPerfs) {
      if (normalizeVenueTag(p.venueTag).toLowerCase().includes(t)) return true;
      if (p.date.toLowerCase().includes(t)) return true;
    }
  }
  if ((song.performanceKey ?? '').toLowerCase().includes(t)) return true;
  if (song.tags && song.tags.some((tag) => tag.toLowerCase().includes(t))) return true;
  return false;
}

export function songMatchesAnySelectedTag(song: EncoreSong, selectedTags: string[]): boolean {
  if (!selectedTags.length) return true;
  const songTags = song.tags ?? [];
  const lower = (t: string) => t.trim().toLowerCase();
  const songLower = new Set(songTags.map((t) => lower(t)));
  return selectedTags.some((t) => songLower.has(lower(t)));
}
