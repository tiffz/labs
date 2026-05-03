/**
 * Performance insights — lifetime-first stats with optional drill-down by calendar year.
 */
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ScheduleIcon from '@mui/icons-material/Schedule';
import StarIcon from '@mui/icons-material/Star';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent, type ReactElement, type ReactNode } from 'react';
import type { EncorePerformance, EncoreSong } from '../types';
import { encoreAppHref } from '../routes/encoreAppHash';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../theme/encoreM3Layout';
import { encoreMaxWidthPage, encoreShadowSurface } from '../theme/encoreUiTokens';
import {
  buildExtendedPerformanceInsights,
  buildPerformanceDashboardStats,
  buildTopSongsByPerformanceCount,
  type ExtendedPerformanceInsights,
  type PerformanceDashboardStats,
} from '../performances/performancesStatsModel';

export type PerformancesWrappedScreenProps = {
  /** First name or display name fragment for possessive hero copy */
  performerDisplayName: string;
  stats: PerformanceDashboardStats;
  extended: ExtendedPerformanceInsights;
  performances: EncorePerformance[];
  songById: Map<string, EncoreSong>;
  normalizeVenue: (tag: string) => string;
  onOpenSong: (songId: string, e?: ReactMouseEvent) => void;
  onFocusYear: (year: string) => void;
  onFocusVenue: (venue: string) => void;
  onAddPerformance: () => void;
  /**
   * Under Performances → Insights tab: skip duplicate max-width shell and tighten hero top spacing
   * so the page header + tabs above can own vertical rhythm.
   */
  embedded?: boolean;
};

function Section(props: { children: ReactNode; bleed?: boolean }): ReactElement {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 3, md: 4 },
        px: encoreScreenPaddingX,
        ...(props.bleed ? {} : {}),
      }}
    >
      <Box sx={{ maxWidth: 920, mx: 'auto' }}>{props.children}</Box>
    </Box>
  );
}

function SectionTitle(props: { kicker?: string; title: string; subtitle?: string }): ReactElement {
  return (
    <Stack spacing={0.5} sx={{ mb: 2.5 }}>
      {props.kicker ? (
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {props.kicker}
        </Typography>
      ) : null}
      <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
        {props.title}
      </Typography>
      {props.subtitle ? (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, maxWidth: 640 }}>
          {props.subtitle}
        </Typography>
      ) : null}
    </Stack>
  );
}

function WideSparkline(props: { values: number[]; labels: string[]; color: string }): ReactElement {
  const { values, labels, color } = props;
  if (values.length === 0) return <Box sx={{ height: 120 }} />;
  const max = Math.max(1, ...values);
  const w = 640;
  const h = 140;
  const denom = Math.max(1, values.length - 1);
  const pts = values.map((v, i) => {
    const x = (i / denom) * w;
    const y = h - (v / max) * (h - 16) - 8;
    return `${x},${y}`;
  });
  const labelEvery = Math.max(1, Math.floor(values.length / 6));
  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <svg width={w} height={h + 28} viewBox={`0 0 ${w} ${h + 28}`} aria-hidden style={{ display: 'block', maxWidth: '100%' }}>
        <defs>
          <linearGradient id="wrapSpark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          fill="url(#wrapSpark)"
          points={`0,${h} ${pts.join(' ')} ${w},${h}`}
        />
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts.join(' ')} />
        {values.map((v, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={(i / denom) * w} y={h + 22} textAnchor="middle" fill="currentColor" fontSize="11" opacity="0.6">
              {labels[i] ?? ''}
            </text>
          ) : null,
        )}
      </svg>
    </Box>
  );
}

function YearComparator(props: {
  yearsDesc: [string, number][];
  performances: EncorePerformance[];
  songById: Map<string, EncoreSong>;
  normalizeVenue: (tag: string) => string;
  onFocusYear: (y: string) => void;
}): ReactElement {
  const { yearsDesc, performances, songById, normalizeVenue, onFocusYear } = props;
  const years = useMemo(() => {
    const ys = yearsDesc.map(([y]) => y).filter((y) => /^\d{4}$/.test(y));
    const cy = String(new Date().getFullYear());
    return ys.length ? ys : [cy];
  }, [yearsDesc]);
  const [a, setA] = useState(() => years[0] ?? String(new Date().getFullYear()));
  const [b, setB] = useState(() => years[1] ?? years[0] ?? String(new Date().getFullYear() - 1));

  useEffect(() => {
    setA((prev) => (years.includes(prev) ? prev : years[0]));
    setB((prev) => (years.includes(prev) ? prev : years[Math.min(1, years.length - 1)] ?? years[0]));
  }, [years]);

  const metrics = useMemo(() => {
    const countFor = (y: string) => performances.filter((p) => p.date.startsWith(y)).length;
    const topSongFor = (y: string) => {
      const m = new Map<string, number>();
      for (const p of performances) {
        if (!p.date.startsWith(y)) continue;
        m.set(p.songId, (m.get(p.songId) ?? 0) + 1);
      }
      const best = [...m.entries()].sort((x, y) => y[1] - x[1])[0];
      if (!best) return null;
      return { song: songById.get(best[0]) ?? null, count: best[1] };
    };
    const topVenueFor = (y: string) => {
      const m = new Map<string, number>();
      for (const p of performances) {
        if (!p.date.startsWith(y)) continue;
        const v = normalizeVenue(p.venueTag);
        m.set(v, (m.get(v) ?? 0) + 1);
      }
      const best = [...m.entries()].sort((x, y) => y[1] - x[1])[0];
      return best ? { name: best[0], count: best[1] } : null;
    };
    return { countFor, topSongFor, topVenueFor };
  }, [performances, songById, normalizeVenue]);

  const ca = metrics.countFor(a);
  const cb = metrics.countFor(b);
  const ta = metrics.topSongFor(a);
  const tb = metrics.topSongFor(b);
  const va = metrics.topVenueFor(a);
  const vb = metrics.topVenueFor(b);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <FormControl size="small" fullWidth>
          <InputLabel id="wrap-cmp-a">Year A</InputLabel>
          <Select labelId="wrap-cmp-a" label="Year A" value={a} onChange={(e) => setA(String(e.target.value))}>
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel id="wrap-cmp-b">Year B</InputLabel>
          <Select labelId="wrap-cmp-b" label="Year B" value={b} onChange={(e) => setB(String(e.target.value))}>
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {[a, b].map((y, idx) => {
          const c = idx === 0 ? ca : cb;
          const t = idx === 0 ? ta : tb;
          const v = idx === 0 ? va : vb;
          return (
            <Card
              key={y}
              elevation={0}
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
                borderColor: (t) => alpha(t.palette.primary.main, 0.12),
              }}
            >
              <Button size="small" onClick={() => onFocusYear(y)} sx={{ mb: 1, fontWeight: 800, fontSize: '1rem' }}>
                {y}
              </Button>
              <Typography variant="h3" sx={{ fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {c}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                performances logged
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                Top song
              </Typography>
              <Button
                variant="text"
                disabled={!t?.song}
                component={t?.song ? 'a' : 'button'}
                href={t?.song ? encoreAppHref({ kind: 'song', id: t.song.id }) : undefined}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', px: 0, fontWeight: 700 }}
              >
                {t?.song?.title ?? '–'} {t ? `· ${t.count}×` : ''}
              </Button>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 1.5, mb: 0.5 }}>
                Top venue
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {v ? `${v.name} · ${v.count}` : '–'}
              </Typography>
            </Card>
          );
        })}
      </Box>
    </Stack>
  );
}

export function PerformancesWrappedScreen(props: PerformancesWrappedScreenProps): ReactElement {
  const {
    performerDisplayName,
    stats: lifetimeStats,
    extended: lifetimeExtended,
    performances,
    songById,
    normalizeVenue,
    onOpenSong,
    onFocusYear,
    onFocusVenue,
    onAddPerformance,
    embedded = false,
  } = props;
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const cy = lifetimeExtended.calendarYear;

  const [yearScope, setYearScope] = useState<'all' | string>('all');

  const possessive = (() => {
    const base = performerDisplayName.trim();
    if (!base) return 'Your';
    return base.endsWith('s') ? `${base}'` : `${base}'s`;
  })();

  const yearChoices = useMemo(
    () => lifetimeStats.yearsDesc.map(([y]) => y).filter((y) => /^\d{4}$/.test(y)),
    [lifetimeStats.yearsDesc],
  );

  useEffect(() => {
    if (yearScope !== 'all' && !yearChoices.includes(yearScope)) {
      setYearScope('all');
    }
  }, [yearChoices, yearScope]);

  const { activeStats, activeExtended, isAllTime } = useMemo(() => {
    if (yearScope === 'all') {
      return {
        activeStats: lifetimeStats,
        activeExtended: lifetimeExtended,
        isAllTime: true,
      };
    }
    const sp = performances.filter((p) => p.date.startsWith(yearScope));
    const st = buildPerformanceDashboardStats(sp, songById, normalizeVenue);
    if (!st) {
      return {
        activeStats: lifetimeStats,
        activeExtended: lifetimeExtended,
        isAllTime: true,
      };
    }
    const ex = buildExtendedPerformanceInsights(sp, songById, st, {
      focusCalendarYear: Number(yearScope),
    });
    return {
      activeStats: st,
      activeExtended: ex,
      isAllTime: false,
    };
  }, [yearScope, performances, songById, normalizeVenue, lifetimeStats, lifetimeExtended]);

  const topSongsAllTime = useMemo(
    () => buildTopSongsByPerformanceCount(performances, songById, 24),
    [performances, songById],
  );

  const chipSx = {
    cursor: 'pointer' as const,
    fontWeight: 600,
    borderRadius: 2,
    py: 1.5,
    px: 1.25,
    height: 'auto',
    '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'center' },
  };

  return (
    <Box
      sx={
        embedded
          ? { pb: { xs: 6, md: 8 }, width: '100%' }
          : { ...encoreMaxWidthPage, pb: { xs: 6, md: 8 } }
      }
    >
      {/* Summary header — lifetime-first, utility density */}
      <Box
        sx={{
          pt: embedded ? { xs: 1.5, sm: 2 } : encorePagePaddingTop,
          pb: { xs: 3, md: 3.5 },
          px: encoreScreenPaddingX,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Stack spacing={2.5} sx={{ maxWidth: 920, mx: 'auto' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
            justifyContent="space-between"
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                {possessive} performance insights
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.55, maxWidth: 520 }}>
                Lifetime totals by default. Pick a year to zoom in; charts and rankings follow that scope.
              </Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: 200, flexShrink: 0 }} id="encore-perf-insights-scope">
              <InputLabel id="encore-perf-insights-scope-label">Scope</InputLabel>
              <Select
                labelId="encore-perf-insights-scope-label"
                label="Scope"
                value={yearScope}
                onChange={(e) => setYearScope(String(e.target.value))}
              >
                <MenuItem value="all">All time</MenuItem>
                {yearChoices.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: isAllTime ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {isAllTime ? 'All-time performances' : `Performances in ${yearScope}`}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', mt: 0.5, lineHeight: 1.2 }}>
                {activeStats.total}
              </Typography>
              {!isAllTime ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Lifetime total: <strong>{lifetimeStats.total}</strong>
                </Typography>
              ) : null}
            </Card>
            {isAllTime ? (
              <>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Calendar {cy} (Jan–Dec)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', mt: 0.5, lineHeight: 1.2 }}>
                    {lifetimeStats.perfThisYear}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    vs {cy - 1}: <strong>{lifetimeStats.perfLastYear}</strong>
                  </Typography>
                </Card>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Repertoire reach
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', mt: 0.5, lineHeight: 1.2 }}>
                    {lifetimeExtended.distinctSongs}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Different songs with at least one logged show
                  </Typography>
                </Card>
              </>
            ) : (
              <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Songs in {yearScope}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', mt: 0.5, lineHeight: 1.2 }}>
                  {activeExtended.distinctSongs}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Distinct titles performed at least once this year
                </Typography>
              </Card>
            )}
          </Box>

          <Button variant="contained" size="medium" onClick={onAddPerformance} sx={{ alignSelf: 'flex-start', fontWeight: 700 }}>
            Log a performance
          </Button>
        </Stack>
      </Box>

      {/* Story */}
      <Section>
        <SectionTitle
          kicker="Summary"
          title={isAllTime ? 'At a glance' : `${yearScope} in a nutshell`}
        />
        <Typography variant="body1" sx={{ fontWeight: 500, lineHeight: 1.65 }}>
          {isAllTime ? (
            <>
              You have logged{' '}
              <Box component="strong" sx={{ color: 'primary.main' }}>
                {activeStats.total}
              </Box>{' '}
              performances all time
              {activeStats.mostPerformed?.song ? (
                <>
                  . You have returned to{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={(e) => onOpenSong(activeStats.mostPerformed!.song!.id, e)}
                    sx={{ fontWeight: 700, fontSize: 'inherit', verticalAlign: 'baseline' }}
                  >
                    {activeStats.mostPerformed.song.title}
                  </Link>{' '}
                  most often ({activeStats.mostPerformed.count}×).
                </>
              ) : null}{' '}
              {activeStats.bestRecent?.song ? (
                <>
                  Your most recent logged show was{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={(e) => onOpenSong(activeStats.bestRecent!.song!.id, e)}
                    sx={{ fontWeight: 700 }}
                  >
                    {activeStats.bestRecent.song.title}
                  </Link>{' '}
                  on {activeStats.bestRecent.perf.date}.
                </>
              ) : null}{' '}
              {activeStats.leastRecentlyPerformed?.song ? (
                <>
                  The song you have gone longest without performing is{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={(e) => onOpenSong(activeStats.leastRecentlyPerformed!.song!.id, e)}
                    sx={{ fontWeight: 700 }}
                  >
                    {activeStats.leastRecentlyPerformed.song.title}
                  </Link>{' '}
                  (last {activeStats.leastRecentlyPerformed.perf.date}).
                </>
              ) : null}
            </>
          ) : (
            <>
              In {yearScope} you logged{' '}
              <Box component="strong" sx={{ color: 'primary.main' }}>
                {activeStats.total}
              </Box>{' '}
              performances
              {activeStats.mostPerformed?.song ? (
                <>
                  . Most often played:{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={(e) => onOpenSong(activeStats.mostPerformed!.song!.id, e)}
                    sx={{ fontWeight: 700 }}
                  >
                    {activeStats.mostPerformed.song.title}
                  </Link>{' '}
                  ({activeStats.mostPerformed.count}×).
                </>
              ) : null}
            </>
          )}
        </Typography>
      </Section>

      <Divider />

      <Section>
        <SectionTitle
          kicker="Cadence"
          title={isAllTime ? 'Last twelve months' : `Months in ${yearScope}`}
          subtitle={
            isAllTime
              ? 'Rolling year through today, month by month.'
              : 'January through December for the selected year.'
          }
        />
        <WideSparkline values={activeExtended.monthCounts} labels={activeExtended.monthLabels} color={primary} />
      </Section>

      <Divider />

      <Section>
        <SectionTitle kicker="Momentum" title={isAllTime ? 'Pace and depth' : `${yearScope} vs your lifetime`} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: 2, border: 1, borderColor: 'divider', boxShadow: encoreShadowSurface }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, color: 'primary.main' }}>
              <TrendingUpIcon fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {isAllTime ? 'Calendar-year pace' : 'This scope'}
              </Typography>
            </Stack>
            {isAllTime ? (
              <>
                <Typography variant="body2" sx={{ lineHeight: 1.65 }} color="text.secondary">
                  <strong>{lifetimeStats.perfThisYear}</strong> performances so far in {cy},{' '}
                  <strong>{lifetimeStats.perfLastYear}</strong> in {cy - 1}. Counts use full calendar years (Jan–Dec).
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.65, mt: 1.5 }} color="text.secondary">
                  Last 90 days: <strong>{lifetimeExtended.songsTouchedLast90d}</strong> songs with a new show, out of{' '}
                  <strong>{lifetimeExtended.distinctSongs}</strong> you have ever logged.
                </Typography>
              </>
            ) : (
              <Typography variant="body2" sx={{ lineHeight: 1.65 }} color="text.secondary">
                {yearScope} represents{' '}
                <strong>{Math.round((activeStats.total / Math.max(1, lifetimeStats.total)) * 100)}%</strong> of your lifetime
                performances ({activeStats.total} of {lifetimeStats.total}).
              </Typography>
            )}
          </Card>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: 2, border: 1, borderColor: 'divider', boxShadow: encoreShadowSurface }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, color: 'primary.main' }}>
              <StarIcon fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Repertoire detail
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ lineHeight: 1.65 }} color="text.secondary">
              <strong>{activeExtended.onlyOnceSongCount}</strong> {isAllTime ? 'songs' : 'songs in this year'} with exactly one
              performance {isAllTime ? 'logged (your “tried it once” set).' : 'in this year.'}
            </Typography>
            {activeStats.leastRecentlyPerformed?.song ? (
              <Button
                variant="outlined"
                size="small"
                onClick={(e) => onOpenSong(activeStats.leastRecentlyPerformed!.song!.id, e)}
                sx={{ mt: 1.5, fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
              >
                Revival pick: {activeStats.leastRecentlyPerformed.song.title}
              </Button>
            ) : null}
          </Card>
        </Box>
      </Section>

      <Divider />

      <Section>
        <SectionTitle
          kicker="Spotlights"
          title="Three lenses"
          subtitle="Most played, latest show, and longest gap for your current scope."
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {(
            [
              {
                label: 'Most played',
                icon: <StarIcon sx={{ fontSize: 32 }} />,
                song: activeStats.mostPerformed?.song,
                sub: activeStats.mostPerformed ? `${activeStats.mostPerformed.count}×` : undefined,
              },
              {
                label: 'Latest in scope',
                icon: <ScheduleIcon sx={{ fontSize: 32 }} />,
                song: activeStats.bestRecent?.song,
                sub: activeStats.bestRecent
                  ? `${activeStats.bestRecent.perf.date} · ${normalizeVenue(activeStats.bestRecent.perf.venueTag)}`
                  : undefined,
              },
              {
                label: 'Longest quiet',
                icon: <MusicNoteIcon sx={{ fontSize: 32 }} />,
                song: activeStats.leastRecentlyPerformed?.song,
                sub: activeStats.leastRecentlyPerformed
                  ? `Last ${activeStats.leastRecentlyPerformed.perf.date}`
                  : undefined,
              },
            ] as const
          ).map((block) => (
            <Card
              key={block.label}
              elevation={0}
              sx={{
                p: 2.25,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                boxShadow: encoreShadowSurface,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                minHeight: 200,
              }}
            >
              <Box sx={{ color: 'primary.main' }}>{block.icon}</Box>
              <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {block.label}
              </Typography>
              <Button
                variant="text"
                disabled={!block.song}
                onClick={(e) => block.song && onOpenSong(block.song.id, e)}
                sx={{ fontWeight: 700, fontSize: '1rem', textTransform: 'none', lineHeight: 1.35 }}
              >
                {block.song?.title ?? '–'}
              </Button>
              {block.sub ? (
                <Typography variant="caption" color="text.secondary">
                  {block.sub}
                </Typography>
              ) : null}
            </Card>
          ))}
        </Box>
      </Section>

      <Divider />

      <Section>
        <SectionTitle
          kicker={isAllTime ? 'All time' : yearScope}
          title={isAllTime ? 'Top songs (all performances)' : `Top songs in ${yearScope}`}
          subtitle={
            isAllTime
              ? 'Ranked by total performance count across every year.'
              : 'Ranked by performance count in this year (calendar).'
          }
        />
        <Stack spacing={1.25}>
          {(isAllTime ? topSongsAllTime : activeExtended.topSongsThisYear).length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              {isAllTime ? 'No performances yet.' : 'No performances in this calendar slice yet.'}
            </Typography>
          ) : (
            (isAllTime ? topSongsAllTime : activeExtended.topSongsThisYear).map((row, i) => (
              <Card
                key={row.song?.id ?? i}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 800, color: 'primary.main', fontVariantNumeric: 'tabular-nums', width: 32 }}
                  >
                    {i + 1}
                  </Typography>
                  <Button
                    variant="text"
                    disabled={!row.song}
                    onClick={(e) => row.song && onOpenSong(row.song.id, e)}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.95rem', minWidth: 0, flex: 1, justifyContent: 'flex-start' }}
                  >
                    {row.song?.title ?? '–'}
                  </Button>
                </Stack>
                <Chip label={`${row.count}×`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
              </Card>
            ))
          )}
        </Stack>
      </Section>

      <Divider />

      <Section>
        <SectionTitle
          kicker="Venues"
          title={isAllTime ? 'Where you perform most' : `Venues in ${yearScope}`}
          subtitle="Tap a chip to filter your Activity list."
        />
        <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap sx={{ mt: 0.5 }}>
          {activeStats.topVenues.map(([name, count]) => (
            <Chip
              key={name}
              label={`${name} · ${count}`}
              onClick={() => onFocusVenue(name)}
              color="primary"
              variant="outlined"
              size="small"
              sx={chipSx}
            />
          ))}
        </Stack>
      </Section>

      <Divider />

      <Section>
        <SectionTitle
          kicker="Years"
          title="Drill into a year"
          subtitle="Opens the same year in the Scope control above. Use Activity to filter the full table."
        />
        <Stack spacing={1} sx={{ position: 'relative', pl: 2, mt: 0.5 }}>
          <Box
            sx={{
              position: 'absolute',
              left: 10,
              top: 8,
              bottom: 8,
              width: 3,
              borderRadius: 2,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.2),
            }}
          />
          {lifetimeStats.yearsDesc.slice(0, 16).map(([y, c]) => (
            <Stack key={y} direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: yearScope === y ? 'primary.main' : 'action.selected',
                  flexShrink: 0,
                  zIndex: 1,
                }}
              />
              <Button
                variant="text"
                size="small"
                onClick={() => setYearScope(y)}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                {y}: {c} performances
              </Button>
              <Link
                component="button"
                type="button"
                variant="caption"
                onClick={() => onFocusYear(y)}
                sx={{ fontWeight: 600 }}
              >
                Filter Activity
              </Link>
            </Stack>
          ))}
        </Stack>
      </Section>

      <Divider />

      <Section>
        <SectionTitle
          kicker="Accompaniment"
          title="How you accompany yourself"
          subtitle="Share of performances in this scope that include each tag (multi-tagged shows count toward each)."
        />
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {activeExtended.accompanimentCounts.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              No tags in this scope. Add them on performance rows.
            </Typography>
          ) : (
            activeExtended.accompanimentCounts.map(({ tag, count }) => {
              const denom = Math.max(1, activeStats.total);
              const pct = Math.round((count / denom) * 100);
              return (
                <Box key={tag}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {tag}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {count} · {pct}%
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', overflow: 'hidden' }}>
                    <Box sx={{ width: `${pct}%`, height: 1, bgcolor: 'primary.main', borderRadius: 4 }} />
                  </Box>
                </Box>
              );
            })
          )}
        </Stack>
      </Section>

      <Divider />

      <Section>
        <SectionTitle
          kicker="Weeks"
          title={isAllTime ? 'Last ~12 months by week' : `Weeks with shows in ${yearScope}`}
          subtitle={
            isAllTime ? 'Darker = more performances that week.' : 'Weeks that had at least one performance in this year.'
          }
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(24px, 1fr))',
            gap: 0.5,
            maxWidth: 560,
          }}
        >
          {activeExtended.weekCounts.map((c, i) => {
            const intensity = activeExtended.maxWeek ? c / activeExtended.maxWeek : 0;
            return (
              <Box
                key={activeExtended.weekKeys[i] ?? i}
                title={`${activeExtended.weekKeys[i]}: ${c} performances`}
                sx={{
                  aspectRatio: '1',
                  borderRadius: 0.75,
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.08 + intensity * 0.42),
                  border: 1,
                  borderColor: 'divider',
                }}
              />
            );
          })}
        </Box>
      </Section>

      {isAllTime ? (
        <>
          <Divider />
          <Section>
            <SectionTitle kicker="Compare" title="Any two years" subtitle="Side-by-side counts, top song, and venue." />
            <Box sx={{ mt: 1 }}>
              <YearComparator
                yearsDesc={lifetimeStats.yearsDesc}
                performances={performances}
                songById={songById}
                normalizeVenue={normalizeVenue}
                onFocusYear={onFocusYear}
              />
            </Box>
          </Section>
        </>
      ) : null}

      <Divider />

      <Section>
        <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Log the next one
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 520 }}>
            Short on time? Log a row while it is fresh; your totals update as soon as you save.
          </Typography>
          <Button variant="contained" onClick={onAddPerformance} sx={{ fontWeight: 700 }}>
            Add performance
          </Button>
        </Card>
      </Section>
    </Box>
  );
}
