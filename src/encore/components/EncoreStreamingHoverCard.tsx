import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip, { tooltipClasses, type TooltipProps } from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { fetchSpotifyTrack } from '../spotify/spotifyApi';
import type { EncoreMediaSource } from '../types';

/**
 * Streaming sources this hover card can resolve metadata for. A subset of
 * {@link EncoreMediaSource} (drive links don't have a streaming preview API).
 */
export type EncoreStreamingHoverCardKind = Extract<EncoreMediaSource, 'spotify' | 'youtube'>;

type ResolvedMeta = {
  title: string;
  subtitle: string;
};

const spotifyMetaCache = new Map<string, ResolvedMeta>();
const youtubeMetaCache = new Map<string, ResolvedMeta>();

async function fetchYoutubeOembedMeta(watchUrl: string): Promise<ResolvedMeta | null> {
  const cached = youtubeMetaCache.get(watchUrl);
  if (cached) return cached;
  try {
    const u = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`;
    const res = await fetch(u, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { title?: string; author_name?: string };
    const title = typeof j.title === 'string' ? j.title.trim() : '';
    if (!title) return null;
    const subtitle =
      typeof j.author_name === 'string' && j.author_name.trim() ? j.author_name.trim() : 'YouTube';
    const meta = { title, subtitle };
    youtubeMetaCache.set(watchUrl, meta);
    return meta;
  } catch {
    return null;
  }
}

async function fetchSpotifyTrackMeta(
  clientId: string,
  spotifyLinked: boolean,
  trackId: string,
): Promise<ResolvedMeta | null> {
  const key = trackId.trim();
  if (!key) return null;
  const cached = spotifyMetaCache.get(key);
  if (cached) return cached;
  if (!spotifyLinked || !clientId) return null;
  try {
    const token = await ensureSpotifyAccessToken(clientId);
    if (!token) return null;
    const t = await fetchSpotifyTrack(token, key);
    const artists = t.artists?.map((a) => a.name).filter(Boolean).join(', ') ?? '';
    const title = t.name?.trim() || 'Spotify track';
    const meta = { title, subtitle: artists || 'Spotify' };
    spotifyMetaCache.set(key, meta);
    return meta;
  } catch {
    return null;
  }
}

/**
 * Tooltip styled as a small card. We piggyback on MUI's Tooltip rather than rolling our own
 * Popover-based hover behavior because Tooltip ships a pixel-perfect "interactive zone" between
 * the trigger and the floating content (the transparent margin captures mouse events) and well-
 * tuned `enterNextDelay`/`leaveDelay` semantics. The previous Popover-based card had visible
 * open/close races whenever the popover content height changed (lazy meta fetch) or the user
 * crossed the trigger→paper boundary, which read as the "flashing" the user reported.
 */
const HoverCardTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    boxShadow: theme.shadows[3],
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: Number(theme.shape.borderRadius) * 1.5,
    padding: theme.spacing(0.875, 1.25),
    maxWidth: 320,
    fontSize: theme.typography.body2.fontSize,
  },
}));

export type EncoreStreamingHoverCardProps = {
  kind: EncoreStreamingHoverCardKind;
  spotifyTrackId?: string | null;
  youtubeWatchUrl?: string | null;
  /** When set (e.g. song title/artist), shown until remote metadata resolves. */
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  clientId: string;
  spotifyLinked: boolean;
  children: ReactNode;
};

/**
 * Wraps a Spotify or YouTube media control; on hover, opens a small card with
 * resolved track/video title and artist/channel when available.
 *
 * Uses MUI Tooltip under the hood. Tooltip handles the mouse-tracking edge cases (interactive
 * trigger→content bridge, focus retention, leave debounce) that a hand-rolled Popover would have
 * to reimplement. We keep the resolved `meta` in component state across open/close cycles so a
 * re-hover after the user briefly leaves does not flash a fallback frame before the cached value
 * paints back in.
 */
export function EncoreStreamingHoverCard(props: EncoreStreamingHoverCardProps): ReactElement {
  const {
    kind,
    spotifyTrackId,
    youtubeWatchUrl,
    fallbackTitle = '',
    fallbackSubtitle = '',
    clientId,
    spotifyLinked,
    children,
  } = props;

  // Seed meta from the module cache synchronously so the very first open paints with the cached
  // value (no fallback flash). Subsequent re-hovers also avoid the brief loading frame.
  const cacheKey =
    kind === 'spotify'
      ? (spotifyTrackId?.trim() ?? '')
      : kind === 'youtube'
        ? (youtubeWatchUrl?.trim() ?? '')
        : '';
  const cachedAtMount: ResolvedMeta | null = cacheKey
    ? (kind === 'spotify'
        ? spotifyMetaCache.get(cacheKey)
        : youtubeMetaCache.get(cacheKey)) ?? null
    : null;
  const [meta, setMeta] = useState<ResolvedMeta | null>(cachedAtMount);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const track = spotifyTrackId?.trim() ?? '';
    const ytUrl = youtubeWatchUrl?.trim() ?? '';
    let cancelled = false;

    if (kind === 'youtube' && ytUrl) {
      const cached = youtubeMetaCache.get(ytUrl);
      if (cached) {
        setMeta(cached);
        return;
      }
      setLoading(true);
      void (async () => {
        const m = await fetchYoutubeOembedMeta(ytUrl);
        if (cancelled) return;
        setMeta(m);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }

    if (kind === 'spotify' && track) {
      const cached = spotifyMetaCache.get(track);
      if (cached) {
        setMeta(cached);
        return;
      }
      setLoading(true);
      void (async () => {
        const m = await fetchSpotifyTrackMeta(clientId, spotifyLinked, track);
        if (cancelled) return;
        setMeta(m);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }

    return undefined;
  }, [open, kind, spotifyTrackId, youtubeWatchUrl, clientId, spotifyLinked]);

  const title = meta?.title?.trim() || fallbackTitle.trim() || (kind === 'spotify' ? 'Spotify track' : 'YouTube video');
  const subtitle = meta?.subtitle?.trim() || fallbackSubtitle.trim();

  const tooltipContent = (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      {loading && !meta ? <CircularProgress size={16} sx={{ mt: 0.25, flexShrink: 0 }} /> : null}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.35, wordBreak: 'break-word' }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.4 }}>
            {subtitle}
          </Typography>
        ) : null}
        {!subtitle && !loading && kind === 'spotify' && !spotifyLinked ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.4 }}>
            Connect Spotify to load track details.
          </Typography>
        ) : null}
      </Box>
    </Box>
  );

  return (
    <HoverCardTooltip
      title={tooltipContent}
      placement="bottom-start"
      arrow={false}
      enterDelay={280}
      enterNextDelay={120}
      leaveDelay={140}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      // Tooltip's default `disableInteractive` is false, so the mouse can move from trigger into
      // the tooltip without closing it. Keeping it interactive is what makes this read as a hover
      // *card* rather than a pure tooltip.
      disableInteractive={false}
      slotProps={{
        popper: {
          modifiers: [
            // Stable vertical offset; Tooltip's default 14px gap can leave the cursor briefly in
            // dead space between the trigger and the content. 4px keeps a hairline gap (so the
            // shadow reads) while staying inside Tooltip's invisible bridge.
            { name: 'offset', options: { offset: [0, 4] } },
          ],
          sx: {
            // Render above modal-priority content (e.g. EncoreAudioResourceNotesWrapper popover).
            zIndex: (z) => z.zIndex.modal + 25,
          },
        },
      }}
    >
      {/* Tooltip needs a single ref-forwarding child. Wrapping span keeps the trigger
          inline-aligned with the surrounding caption row. */}
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          maxWidth: '100%',
          verticalAlign: 'middle',
          borderRadius: 1,
        }}
      >
        {children}
      </Box>
    </HoverCardTooltip>
  );
}
