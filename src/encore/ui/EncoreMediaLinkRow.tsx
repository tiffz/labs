import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
  /** Optional trailing slot content (e.g. "Catalog" badge). Inserted before the actions. */
  trailing?: ReactNode;
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
  } = props;
  const source = sourceProp ?? link?.source;
  const resolvedCaption = caption ?? (link ? formatMediaLinkShortCaption(link) : '');
  const resolvedFull = fullCaption ?? (link ? formatMediaLinkCaption(link) : resolvedCaption);
  const primaryCopy = PRIMARY_COPY[slot];
  const removeCopy = REMOVE_COPY[slot];

  return (
    <Box sx={(t: Theme) => encoreMediaLinkRowSx(t, isPrimary)}>
      {source === 'spotify' ? (
        <SpotifyBrandIcon sx={{ fontSize: 15, flexShrink: 0, opacity: 0.88 }} aria-hidden />
      ) : source === 'youtube' ? (
        <YouTubeBrandIcon sx={{ fontSize: 15, flexShrink: 0, opacity: 0.88 }} aria-hidden />
      ) : null}
      <Typography
        variant="caption"
        noWrap
        sx={{
          maxWidth: { xs: 160, sm: 320 },
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
      ) : onMakePrimary ? (
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
      {openUrl ? (
        <Tooltip title="Open">
          <IconButton
            size="small"
            component="a"
            href={openUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={openAriaLabel ?? 'Open link'}
            sx={{ ...iconBtnSx, p: 0.35 }}
          >
            <OpenInNewIcon sx={{ fontSize: 15 }} />
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
