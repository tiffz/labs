import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useMemo, type ReactElement, type ReactNode } from 'react';
import type { EncoreMediaLink, EncoreMediaSource } from '../types';
import { GoogleDriveBrandIcon, SpotifyBrandIcon, YouTubeBrandIcon } from '../components/EncoreBrandIcon';
import { useYoutubeOembedForMediaChip } from '../youtube/useYoutubeOembedForMediaChip';
import {
  formatMediaLinkCaption,
  formatMediaLinkShortCaption,
  truncateMediaLinkCaption,
  youtubeWatchUrlFromMediaLink,
} from './encoreMediaLinkFormat';
import { encoreMediaLinkRowSx } from '../theme/encoreUiTokens';
import { stanzaPracticeHrefFromEncoreMediaLink } from '../youtube/stanzaPracticeOpenUrl';

/**
 * Which "primary" facet the row belongs to. Drives:
 *   - the active-star tooltip ("Primary reference" / "Primary backing" / "Primary chart")
 *   - the "make primary" affordance tooltip + aria-label ("Make primary reference", etc.)
 */
export type EncoreMediaLinkRowSlot = 'reference' | 'backing' | 'chart';

const PRIMARY_COPY: Record<EncoreMediaLinkRowSlot, { active: string; promote: string }> = {
  reference: { active: 'Primary reference', promote: 'Make primary reference' },
  backing: { active: 'Primary backing', promote: 'Make primary backing' },
  chart: { active: 'Primary chart', promote: 'Make primary chart' },
};

const REMOVE_COPY: Record<EncoreMediaLinkRowSlot, string> = {
  reference: 'Remove reference',
  backing: 'Remove backing track',
  chart: 'Remove chart',
};

const iconBtnSx = {
  color: 'text.secondary',
  flexShrink: 0,
  p: 0.375,
  boxSizing: 'border-box' as const,
  '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
} as const;

export type EncoreMediaLinkRowProps = {
  /** Optional source override; when omitted, we use `link.source` (when given). */
  source?: EncoreMediaSource;
  /** Whole media link record; used for caption/url formatting. Omit when rendering chart attachments etc. */
  link?: EncoreMediaLink;
  /** Override caption when no `link` is supplied (e.g. chart attachments). */
  caption?: string;
  /** Long caption used for the title attribute (hover tooltip). */
  fullCaption?: string;
  /** Slot the row sits in; controls primary tooltip + aria-label copy. */
  slot: EncoreMediaLinkRowSlot;
  /** Whether the row is currently the primary in its slot. */
  isPrimary: boolean;
  /** Callback when the user clicks the empty star (promote to primary). Omit to hide the affordance. */
  onMakePrimary?: () => void;
  /** External open URL; renders an "Open" icon button when non-empty. */
  openUrl?: string;
  /** aria-label for the open icon (defaults to a generic source-derived label). */
  openAriaLabel?: string;
  /** Callback to remove the link/attachment. Omit to hide the affordance. */
  onRemove?: () => void;
  /** Optional trailing slot content (e.g. song info source marker). Inserted before the actions. */
  trailing?: ReactNode;
  /**
   * Wraps only the icon + caption strip (opens `openUrl` when set). Trailing info, primary star,
   * and row actions are outside this wrapper so they stay right-aligned in the chip shell.
   */
  hoverStripWrapper?: (strip: ReactElement) => ReactElement;
  /** When set, overrides Drive-backed Stanza `/stanza/` link. Default: reference and backing slots only (not chart sheets). */
  stanzaPracticeAllowDrive?: boolean;
  /** When true, no outer chip border (parent supplies a single shell around row + notes). */
  embedded?: boolean;
};

/**
 * Single row primitive for media links across SongPage / PracticeScreen / GuestShareView /
 * PlaylistImportDialog. Renders icon + caption as a flexible left strip, with trailing info,
 * primary state, Stanza, make-primary, and remove actions grouped and pinned to the right edge
 * of the chip (consistent padding from the shell). Wraps callers' `EncoreStreamingHoverCard`
 * by being a leaf — the hover card sits around this row.
 */
export function EncoreMediaLinkRow(props: EncoreMediaLinkRowProps): ReactElement {
  const {
    link,
    source: sourceProp,
    caption,
    fullCaption,
    slot,
    isPrimary,
    onMakePrimary,
    openUrl,
    openAriaLabel,
    onRemove,
    trailing,
    hoverStripWrapper,
    stanzaPracticeAllowDrive,
    embedded = false,
  } = props;
  const source = sourceProp ?? link?.source;
  const youtubeWatchUrlForChip =
    caption === undefined &&
    link &&
    link.source === 'youtube' &&
    !link.label?.trim() &&
    link.youtubeVideoId?.trim()
      ? youtubeWatchUrlFromMediaLink(link)
      : null;

  const { title: ytOembedTitle, suppressStanzaPractice } = useYoutubeOembedForMediaChip(youtubeWatchUrlForChip);

  const resolvedCaption = useMemo(
    () =>
      caption ??
      (link
        ? link.source === 'youtube' && !link.label?.trim() && ytOembedTitle?.trim()
          ? truncateMediaLinkCaption(ytOembedTitle.trim(), 26)
          : formatMediaLinkShortCaption(link)
        : ''),
    [caption, link, ytOembedTitle],
  );

  const resolvedFull = useMemo(
    () =>
      fullCaption ??
      (link
        ? link.source === 'youtube' && !link.label?.trim() && ytOembedTitle?.trim()
          ? ytOembedTitle.trim()
          : formatMediaLinkCaption(link)
        : resolvedCaption),
    [fullCaption, link, ytOembedTitle, resolvedCaption],
  );
  const primaryCopy = PRIMARY_COPY[slot];
  const removeCopy = REMOVE_COPY[slot];

  const stanzaPracticeAllowDriveEffective =
    stanzaPracticeAllowDrive ?? (slot === 'reference' || slot === 'backing');

  const stanzaHref = useMemo(() => {
    const base = stanzaPracticeHrefFromEncoreMediaLink(link, {
      allowDriveAudio: stanzaPracticeAllowDriveEffective,
    });
    if (base == null) return null;
    if (link?.source === 'youtube' && suppressStanzaPractice) return null;
    return base;
  }, [link, stanzaPracticeAllowDriveEffective, suppressStanzaPractice]);

  const stanzaTooltip =
    stanzaHref == null
      ? ''
      : link?.source === 'youtube'
        ? 'Practice this video in Stanza (Segno)'
        : 'Open in Stanza (Segno) to practice. Use Upload audio for Drive files.';

  /*
   * The icon + caption strip is the row's primary "open the resource" affordance: when an
   * `openUrl` is supplied we render it as an `<a>` link so a single click opens the asset
   * directly (Spotify/YouTube/Drive). Previously the strip was non-interactive and the user
   * had to click a separate external-link icon — an extra click for the most common action.
   * The dedicated "Open" icon button is intentionally dropped to avoid duplicating affordances.
   */
  const stripBaseSx = {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    minWidth: 0,
    flex: '1 1 0%',
    maxWidth: '100%',
    color: 'inherit',
    textDecoration: 'none',
  } as const;
  const stripLinkSx = {
    ...stripBaseSx,
    cursor: 'pointer',
    borderRadius: 0.75,
    transition: 'background-color 120ms ease, color 120ms ease',
    '&:hover .EncoreMediaLinkRowCaption, &:focus-visible .EncoreMediaLinkRowCaption': {
      color: 'primary.main',
      textDecoration: 'underline',
    },
    '&:focus-visible': {
      outline: '2px solid',
      outlineColor: 'primary.main',
      outlineOffset: 2,
    },
  } as const;

  const stripBody = (
    <>
      {source === 'spotify' ? (
        <SpotifyBrandIcon sx={{ fontSize: 15, flexShrink: 0, opacity: 0.88 }} aria-hidden />
      ) : source === 'youtube' ? (
        <YouTubeBrandIcon sx={{ fontSize: 15, flexShrink: 0, opacity: 0.88 }} aria-hidden />
      ) : source === 'drive' ? (
        <GoogleDriveBrandIcon sx={{ fontSize: 15, flexShrink: 0, opacity: 0.88 }} aria-hidden />
      ) : null}
      <Typography
        className="EncoreMediaLinkRowCaption"
        variant="caption"
        noWrap
        sx={{
          minWidth: 0,
          flex: '1 1 0%',
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: 'text.primary',
        }}
        title={resolvedFull}
      >
        {resolvedCaption}
      </Typography>
    </>
  );

  const stripInner = openUrl ? (
    <Box
      component="a"
      href={openUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={openAriaLabel ?? 'Open link'}
      sx={stripLinkSx}
    >
      {stripBody}
    </Box>
  ) : (
    <Box sx={stripBaseSx}>{stripBody}</Box>
  );

  const wrappedStrip = hoverStripWrapper ? hoverStripWrapper(stripInner) : stripInner;

  const showActionsCluster =
    Boolean(trailing) ||
    isPrimary ||
    stanzaHref != null ||
    (!isPrimary && onMakePrimary) ||
    Boolean(onRemove);

  const actionsCluster = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        gap: 0.125,
        pl: 0.5,
        boxSizing: 'border-box',
      }}
    >
      {trailing}
      {isPrimary ? (
        <Tooltip title={primaryCopy.active}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
            <StarIcon sx={{ fontSize: 15, color: 'text.primary' }} aria-hidden />
          </Box>
        </Tooltip>
      ) : null}
      {stanzaHref ? (
        <Tooltip title={stanzaTooltip}>
          <IconButton
            component="a"
            href={stanzaHref}
            size="small"
            aria-label="Open practice in Stanza (Segno)"
            sx={iconBtnSx}
          >
            <OpenInNewIcon sx={{ fontSize: 17 }} aria-hidden />
          </IconButton>
        </Tooltip>
      ) : null}
      {!isPrimary && onMakePrimary ? (
        <Tooltip title={primaryCopy.promote}>
          <IconButton
            size="small"
            aria-label={primaryCopy.promote}
            onClick={onMakePrimary}
            sx={iconBtnSx}
          >
            <StarBorderIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      ) : null}
      {onRemove ? (
        <Tooltip title={removeCopy}>
          <span>
            <IconButton
              size="small"
              aria-label={removeCopy}
              onClick={onRemove}
              sx={iconBtnSx}
            >
              <CloseIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
    </Box>
  );

  return (
    <Box
      sx={(t: Theme) => ({
        ...encoreMediaLinkRowSx(t, isPrimary, { embedded }),
        display: embedded ? 'flex' : 'inline-flex',
        width: embedded ? '100%' : 'auto',
        alignItems: 'center',
        alignSelf: embedded ? 'stretch' : undefined,
        maxWidth: '100%',
        flexWrap: 'nowrap',
        columnGap: 0,
      })}
    >
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>{wrappedStrip}</Box>
      {showActionsCluster ? actionsCluster : null}
    </Box>
  );
}
