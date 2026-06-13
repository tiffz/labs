import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { ReactElement } from 'react';

/** Canonical primary-video star copy — keep tooltips and aria-labels aligned. */
export const PERFORMANCE_VIDEO_PRIMARY_COPY = {
  active: 'Primary video',
  promote: 'Make primary video',
  /** Shorter label for editor action rows (pairs with {@link PERFORMANCE_VIDEO_PRIMARY_COPY.active}). */
  promoteShort: 'Make primary',
} as const;

const editorPrimaryRowButtonSx = {
  textTransform: 'none',
  fontWeight: 600,
  px: 0.75,
  ml: -0.75,
  minWidth: 0,
  fontSize: '0.8125rem',
  lineHeight: 1.75,
  letterSpacing: 0,
  '& .MuiButton-startIcon': {
    marginRight: 0.625,
    marginLeft: 0,
  },
  '& .MuiButton-startIcon > *:nth-of-type(1)': {
    fontSize: 16,
  },
} as const;

export type PerformanceVideoPrimaryRowActionProps = {
  isPrimary: boolean;
  onSetPrimary?: () => void;
  disabled?: boolean;
};

/**
 * Editor-card primary control — filled star + "Primary video" or outline star + "Make primary".
 * Same slot and button styling so promote vs active read as one concept.
 */
export function PerformanceVideoPrimaryRowAction(
  props: PerformanceVideoPrimaryRowActionProps,
): ReactElement | null {
  const { isPrimary, onSetPrimary, disabled } = props;

  if (isPrimary) {
    return (
      <Button
        component="span"
        role="status"
        size="small"
        variant="text"
        color="inherit"
        disableRipple
        tabIndex={-1}
        startIcon={<StarIcon />}
        sx={{ ...editorPrimaryRowButtonSx, color: 'text.secondary', cursor: 'default' }}
        aria-label={PERFORMANCE_VIDEO_PRIMARY_COPY.active}
      >
        {PERFORMANCE_VIDEO_PRIMARY_COPY.active}
      </Button>
    );
  }

  if (!onSetPrimary) return null;

  return (
    <Button
      type="button"
      size="small"
      variant="text"
      color="inherit"
      disabled={disabled}
      onClick={onSetPrimary}
      startIcon={<StarBorderIcon />}
      sx={editorPrimaryRowButtonSx}
      aria-label={PERFORMANCE_VIDEO_PRIMARY_COPY.promote}
    >
      {PERFORMANCE_VIDEO_PRIMARY_COPY.promoteShort}
    </Button>
  );
}

export type PerformanceVideoPrimaryStarProps = {
  isPrimary: boolean;
  /** When set and not primary, renders an empty-star promote control. */
  onMakePrimary?: () => void;
  iconSize?: number;
};

/** Filled star (read-only) or empty star button — matches {@link EncoreMediaLinkRow} density. */
export function PerformanceVideoPrimaryStar(props: PerformanceVideoPrimaryStarProps): ReactElement | null {
  const { isPrimary, onMakePrimary, iconSize = 14 } = props;

  if (isPrimary) {
    return (
      <Tooltip title={PERFORMANCE_VIDEO_PRIMARY_COPY.active}>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
          <StarIcon sx={{ fontSize: iconSize, color: 'text.primary' }} aria-hidden />
        </Box>
      </Tooltip>
    );
  }

  if (!onMakePrimary) return null;

  return (
    <Tooltip title={PERFORMANCE_VIDEO_PRIMARY_COPY.promote}>
      <IconButton
        size="small"
        aria-label={PERFORMANCE_VIDEO_PRIMARY_COPY.promote}
        onClick={onMakePrimary}
        sx={{
          color: 'text.secondary',
          flexShrink: 0,
          p: 0.25,
          '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
        }}
      >
        <StarBorderIcon sx={{ fontSize: iconSize + 1 }} />
      </IconButton>
    </Tooltip>
  );
}
