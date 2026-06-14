import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { RefObject, ReactElement } from 'react';
import { richTextLinkPreview } from '../utils/richTextContent';
import type { RichTextLinkHoverState } from './useRichTextLinkHover';

function isSafeLinkHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || /^mailto:/i.test(href);
}

function openLinkHref(href: string): void {
  if (!isSafeLinkHref(href)) return;
  window.open(href, '_blank', 'noopener,noreferrer');
}

export type RichTextLinkHoverPopoverProps = {
  hover: RichTextLinkHoverState | null;
  popoverRef: RefObject<HTMLDivElement | null>;
  readOnly: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onPopoverEnter?: () => void;
  onPopoverLeave?: () => void;
};

export default function RichTextLinkHoverPopover({
  hover,
  popoverRef,
  readOnly,
  onClose,
  onEdit,
  onPopoverEnter,
  onPopoverLeave,
}: RichTextLinkHoverPopoverProps): ReactElement {
  const preview = hover ? richTextLinkPreview(hover.href) : null;

  return (
    <Popover
      open={Boolean(hover && preview)}
      anchorEl={hover?.anchorEl ?? null}
      onClose={onClose}
      disableRestoreFocus
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          ref: popoverRef,
          elevation: 3,
          onMouseEnter: onPopoverEnter,
          onMouseLeave: onPopoverLeave,
          sx: (theme) => ({
            p: 1.25,
            maxWidth: 360,
            border: 1,
            borderColor: theme.palette.divider,
            borderRadius: `${Number(theme.shape.borderRadius) * 1.5}px`,
          }),
        },
      }}
      sx={{ pointerEvents: 'none' }}
      disableAutoFocus
    >
      {preview ? (
        <Stack spacing={1} sx={{ pointerEvents: 'auto' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {preview.title}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', wordBreak: 'break-all', lineHeight: 1.45, mt: 0.25 }}
            >
              {preview.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant="contained"
              startIcon={<OpenInNewIcon fontSize="small" />}
              onClick={() => openLinkHref(preview.href)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Open link
            </Button>
            {!readOnly && onEdit ? (
              <Button size="small" variant="text" onClick={onEdit} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Edit
              </Button>
            ) : null}
          </Stack>
          {!readOnly ? (
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
              Tip: ⌘-click or Ctrl-click the link text to open without using this card.
            </Typography>
          ) : null}
        </Stack>
      ) : null}
    </Popover>
  );
}
