import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { ReactElement, ReactNode } from 'react';
import type { EncoreMediaLink, EncoreMediaSource } from '../types';
import { SpotifyBrandIcon, YouTubeBrandIcon } from '../components/EncoreBrandIcon';
import {
  formatMediaLinkCaption,
  formatMediaLinkShortCaption,
} from './encoreMediaLinkFormat';
import { encoreMediaLinkRowSx } from '../theme/encoreUiTokens';

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
  p: 0.25,
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
   * Wraps only the icon + caption + trailing strip (not star/open/remove). Use with
   * {@link EncoreStreamingHoverCard} so interactive buttons do not sit inside the hover anchor.
   */
  hoverStripWrapper?: (strip: ReactElement) => ReactElement;
  /** When true, no outer chip border (parent supplies a single shell around row + notes). */
  embedded?: boolean;
};

/**
 * Single row primitive for media links across SongPage / PracticeScreen / GuestShareView /
 * PlaylistImportDialog. Renders icon + caption + optional primary star + open + remove,
 * using shared spacing, border and primary-state tokens. Wraps callers' `EncoreStreamingHoverCard`
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
    embedded = false,
  } = props;
  const source = sourceProp ?? link?.source;
  const resolvedCaption = caption ?? (link ? formatMediaLinkShortCaption(link) : '');
  const resolvedFull = fullCaption ?? (link ? formatMediaLinkCaption(link) : resolvedCaption);
  const primaryCopy = PRIMARY_COPY[slot];
  const removeCopy = REMOVE_COPY[slot];

  /*
   * The icon + caption strip is the row's primary "open the resource" affordance: when an
   * `openUrl` is supplied we render it as an `<a>` link so a single click opens the asset
   * directly (Spotify/YouTube/Drive). Previously the strip was non-interactive and the user
   * had to click a separate external-link icon — an extra click for the most common action.
   * The dedicated "Open" icon button is intentionally dropped to avoid duplicating affordances.
   */
  const stripBaseSx = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.5,
    minWidth: 0,
    flex: '1 1 auto',
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
      ) : null}
      <Typography
        className="EncoreMediaLinkRowCaption"
        variant="caption"
        noWrap
        sx={{
          maxWidth: { xs: 140, sm: 220 },
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: 'text.primary',
        }}
        title={resolvedFull}
      >
        {resolvedCaption}
      </Typography>
      {trailing}
      {isPrimary ? (
        <Tooltip title={primaryCopy.active}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
            <StarIcon sx={{ fontSize: 15, color: 'text.primary' }} aria-hidden />
          </Box>
        </Tooltip>
      ) : null}
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

  return (
    <Box
      sx={(t: Theme) => ({
        ...encoreMediaLinkRowSx(t, isPrimary, { embedded }),
        display: 'inline-flex',
        alignItems: 'center',
        maxWidth: embedded ? 'min(100%, 280px)' : '100%',
        flexWrap: 'nowrap',
        gap: 0.25,
        pr: hoverStripWrapper ? 0.375 : undefined,
      })}
    >
      {wrappedStrip}
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
        <Tooltip title="Remove">
          <span>
            <IconButton
              size="small"
              aria-label={removeCopy}
              onClick={onRemove}
              sx={iconBtnSx}
            >
              <DeleteOutlineIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
    </Box>
  );
}
