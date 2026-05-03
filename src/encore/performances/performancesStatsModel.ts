import { ENCORE_ACCOMPANIMENT_TAGS, type EncoreAccompanimentTag, type EncorePerformance, type EncoreSong } from '../types';

export type PerformanceDashboardStats = {
  total: number;
  topVenues: [string, number][];
  mostPerformed: { song: EncoreSong | null; songId: string; count: number } | null;
  bestRecent: { perf: EncorePerformance; song: EncoreSong | null } | null;
  leastRecentlyPerformed: { perf: EncorePerformance; song: EncoreSong | null } | null;
  yearsDesc: [string, number][];
  perfThisYear: number;
  perfLastYear: number;
};

export type ExtendedPerformanceInsights = {
  monthKeys: string[];
  monthCounts: number[];
  monthLabels: string[];
  weekKeys: string[];
  weekCounts: number[];
  maxWeek: number;
  accompanimentCounts: { tag: EncoreAccompanimentTag | 'Other'; count: number }[];
  topSongsThisYear: { song: EncoreSong | null; count: number }[];
  topVenuesThree: [string, number][];
  stalestThree: { song: EncoreSong | null; perf: EncorePerformance }[];
  songsTouchedLast90d: number;
  distinctSongs: number;
  onlyOnceSongCount: number;
  calendarYear: number;
};

export function buildPerformanceDashboardStats(
  performances: EncorePerformance[],
  songById: Map<string, EncoreSong>,
  normalizeVenue: (tag: string) => string,
): PerformanceDashboardStats | null {
  if (performances.length === 0) return null;
  const bySong = new Map<string, number>();
  const byVenue = new Map<string, number>();
  const byYear = new Map<string, number>();
  for (const p of performances) {
    bySong.set(p.songId, (bySong.get(p.songId) ?? 0) + 1);
    const v = normalizeVenue(p.venueTag);
    byVenue.set(v, (byVenue.get(v) ?? 0) + 1);
    const y = p.date.slice(0, 4);
    if (/^\d{4}$/.test(y)) byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }
  const topVenues = [...byVenue.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const rankedSongs = [...bySong.entries()]
    .map(([songId, count]) => ({ song: songById.get(songId) ?? null, songId, count }))
    .sort((a, b) => b.count - a.count);
  const mostPerformed = rankedSongs[0] ?? null;
  let bestRecent: { perf: EncorePerformance; song: EncoreSong | null } | null = null;
  for (const p of performances) {
    const song = songById.get(p.songId) ?? null;
    if (!bestRecent || p.date > bestRecent.perf.date) bestRecent = { perf: p, song };
  }
  const lastPerfBySong = new Map<string, EncorePerformance>();
  for (const p of performances) {
    const cur = lastPerfBySong.get(p.songId);
    if (!cur || p.date > cur.date) lastPerfBySong.set(p.songId, p);
  }
  let leastRecentlyPerformed: { perf: EncorePerformance; song: EncoreSong | null } | null = null;
  for (const p of lastPerfBySong.values()) {
    const song = songById.get(p.songId) ?? null;
    if (!leastRecentlyPerformed || p.date < leastRecentlyPerformed.perf.date) {
      leastRecentlyPerformed = { perf: p, song };
    }
  }
  const yearsDesc = [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const yNow = new Date().getFullYear();
  return {
    total: performances.length,
    topVenues,
    mostPerformed,
    bestRecent,
    leastRecentlyPerformed,
    yearsDesc,
    perfThisYear: byYear.get(String(yNow)) ?? 0,
    perfLastYear: byYear.get(String(yNow - 1)) ?? 0,
  };
}

export type BuildExtendedPerformanceInsightsOptions = {
  /**
   * When set, “this year” rankings, {@link ExtendedPerformanceInsights.calendarYear}, the monthly
   * series, and weekly buckets align to this calendar year (Jan–Dec / weeks in that year) instead
   * of “now” and trailing windows. Use when drilling into a single year on the insights surface.
   */
  focusCalendarYear?: number;
};

export function buildExtendedPerformanceInsights(
  performances: EncorePerformance[],
  songById: Map<string, EncoreSong>,
  stats: PerformanceDashboardStats,
  options?: BuildExtendedPerformanceInsightsOptions,
): ExtendedPerformanceInsights {
  const now = new Date();
  const focusY = options?.focusCalendarYear;
  const calendarYear = focusY ?? now.getFullYear();
  const yKey = String(calendarYear);

  const monthMap = new Map<string, number>();
  const weekMap = new Map<string, number>();
  const accMap = new Map<string, number>();
  const thisYearBySong = new Map<string, number>();
  const lastPerfBySong = new Map<string, EncorePerformance>();

  const addMonth = (d: Date) => {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(k, (monthMap.get(k) ?? 0) + 1);
  };
  const weekStart = (d: Date) => {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = x.getUTCDay() || 7;
    if (day !== 1) x.setUTCDate(x.getUTCDate() - (day - 1));
    return x.toISOString().slice(0, 10);
  };

  for (const p of performances) {
    const t = `${p.date}T12:00:00`;
    const d = new Date(t);
    if (!Number.isFinite(d.getTime())) continue;
    addMonth(d);
    const wk = weekStart(d);
    weekMap.set(wk, (weekMap.get(wk) ?? 0) + 1);
    const tags = p.accompanimentTags ?? [];
    if (tags.length === 0) accMap.set('Other', (accMap.get('Other') ?? 0) + 1);
    else for (const tag of tags) accMap.set(tag, (accMap.get(tag) ?? 0) + 1);
    if (p.date.startsWith(yKey)) {
      thisYearBySong.set(p.songId, (thisYearBySong.get(p.songId) ?? 0) + 1);
    }
    const cur = lastPerfBySong.get(p.songId);
    if (!cur || p.date > cur.date) lastPerfBySong.set(p.songId, p);
  }

  const monthKeys: string[] = [];
  const monthLabels: string[] = [];
  if (focusY != null) {
    for (let m = 0; m < 12; m++) {
      const d = new Date(focusY, m, 1);
      monthKeys.push(`${focusY}-${String(m + 1).padStart(2, '0')}`);
      monthLabels.push(d.toLocaleDateString(undefined, { month: 'short' }));
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthKeys.push(k);
      monthLabels.push(d.toLocaleDateString(undefined, { month: 'short' }));
    }
  }
  const monthCounts = monthKeys.map((k) => monthMap.get(k) ?? 0);

  const weekKeys: string[] = [];
  if (focusY != null) {
    const seen = new Set<string>();
    for (const p of performances) {
      if (!p.date.startsWith(String(focusY))) continue;
      const d = new Date(`${p.date}T12:00:00`);
      if (!Number.isFinite(d.getTime())) continue;
      const wk = weekStart(d);
      if (!seen.has(wk)) {
        seen.add(wk);
        weekKeys.push(wk);
      }
    }
    weekKeys.sort();
  } else {
    const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 51; i >= 0; i--) {
      const d = new Date(anchor);
      d.setDate(d.getDate() - i * 7);
      weekKeys.push(weekStart(d));
    }
  }
  const weekCounts = weekKeys.map((k) => weekMap.get(k) ?? 0);
  const maxWeek = Math.max(1, ...weekCounts);

  const accompanimentCounts: ExtendedPerformanceInsights['accompanimentCounts'] = [];
  for (const tag of ENCORE_ACCOMPANIMENT_TAGS) {
    const c = accMap.get(tag) ?? 0;
    if (c) accompanimentCounts.push({ tag, count: c });
  }
  const otherC = accMap.get('Other') ?? 0;
  if (otherC) accompanimentCounts.push({ tag: 'Other', count: otherC });
  accompanimentCounts.sort((a, b) => b.count - a.count);

  const topSongsThisYear = [...thisYearBySong.entries()]
    .map(([songId, count]) => ({ song: songById.get(songId) ?? null, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const stalestThree = [...lastPerfBySong.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
    .map((perf) => ({ song: songById.get(perf.songId) ?? null, perf }));

  const ninetyAgo = new Date(now);
  ninetyAgo.setDate(ninetyAgo.getDate() - 90);
  const cut = ninetyAgo.toISOString().slice(0, 10);
  const songsTouchedLast90d =
    focusY != null
      ? lastPerfBySong.size
      : [...lastPerfBySong.values()].filter((p) => p.date >= cut).length;

  const bySongCount = new Map<string, number>();
  for (const p of performances) bySongCount.set(p.songId, (bySongCount.get(p.songId) ?? 0) + 1);
  const onlyOnceSongCount = [...bySongCount.values()].filter((n) => n === 1).length;

  return {
    monthKeys,
    monthCounts,
    monthLabels,
    weekKeys,
    weekCounts,
    maxWeek,
    accompanimentCounts,
    topSongsThisYear,
    topVenuesThree: stats.topVenues.slice(0, 3),
    stalestThree,
    songsTouchedLast90d,
    distinctSongs: lastPerfBySong.size,
    onlyOnceSongCount,
    calendarYear,
  };
}

/** Rank songs by how many performances appear in `performances` (all-time style, any date). */
export function buildTopSongsByPerformanceCount(
  performances: EncorePerformance[],
  songById: Map<string, EncoreSong>,
  limit: number,
): { song: EncoreSong | null; count: number }[] {
  if (performances.length === 0 || limit <= 0) return [];
  const bySong = new Map<string, number>();
  for (const p of performances) {
    bySong.set(p.songId, (bySong.get(p.songId) ?? 0) + 1);
  }
  return [...bySong.entries()]
    .map(([songId, count]) => ({ song: songById.get(songId) ?? null, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
