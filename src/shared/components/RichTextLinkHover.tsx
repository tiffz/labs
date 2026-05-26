import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState, type ReactElement, type RefObject } from 'react';
import { richTextLinkPreview } from '../utils/richTextContent';

const SHOW_DELAY_MS = 380;
const HIDE_DELAY_MS = 220;

function isSafeLinkHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || /^mailto:/i.test(href);
}

function openLinkHref(href: string): void {
  if (!isSafeLinkHref(href)) return;
  window.open(href, '_blank', 'noopener,noreferrer');
}

function anchorFromEventTarget(root: HTMLElement, target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest('a[href]');
  if (!anchor || !root.contains(anchor)) return null;
  const href = anchor.getAttribute('href')?.trim() ?? '';
  if (!href || !isSafeLinkHref(href)) return null;
  return anchor as HTMLAnchorElement;
}

export type RichTextLinkHoverState = {
  anchorEl: HTMLElement;
  href: string;
};

export type RichTextLinkHoverController = {
  hover: RichTextLinkHoverState | null;
  cancelPendingHide: () => void;
  scheduleHide: () => void;
  dismiss: () => void;
};

export function useRichTextLinkHover(
  editor: Editor | null,
  popoverRef: RefObject<HTMLDivElement | null>,
): RichTextLinkHoverController {
  const [hover, setHover] = useState<RichTextLinkHoverState | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeAnchorRef = useRef<HTMLAnchorElement | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const cancelPendingHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      activeAnchorRef.current = null;
      setHover(null);
    }, HIDE_DELAY_MS);
  }, []);

  const dismiss = useCallback(() => {
    clearTimers();
    activeAnchorRef.current = null;
    setHover(null);
  }, [clearTimers]);

  const scheduleShow = useCallback(
    (anchor: HTMLAnchorElement) => {
      const href = anchor.getAttribute('href')?.trim() ?? '';
      if (!href) return;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      activeAnchorRef.current = anchor;
      showTimerRef.current = setTimeout(() => {
        setHover({ anchorEl: anchor, href });
      }, SHOW_DELAY_MS);
    },
    [],
  );

  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom;

    const onPointerOver = (event: PointerEvent) => {
      const anchor = anchorFromEventTarget(root, event.target);
      if (anchor) scheduleShow(anchor);
    };

    const onPointerOut = (event: PointerEvent) => {
      const leaving = anchorFromEventTarget(root, event.target);
      if (!leaving) return;
      const entering = event.relatedTarget;
      if (entering instanceof Node) {
        if (leaving.contains(entering)) return;
        if (popoverRef.current?.contains(entering)) return;
        const enteringAnchor = anchorFromEventTarget(root, entering);
        if (enteringAnchor) {
          scheduleShow(enteringAnchor);
          return;
        }
      }
      scheduleHide();
    };

    root.addEventListener('pointerover', onPointerOver);
    root.addEventListener('pointerout', onPointerOut);
    return () => {
      root.removeEventListener('pointerover', onPointerOver);
      root.removeEventListener('pointerout', onPointerOut);
      clearTimers();
    };
  }, [clearTimers, editor, popoverRef, scheduleHide, scheduleShow]);

  return { hover, cancelPendingHide, scheduleHide, dismiss };
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

export function RichTextLinkHoverPopover({
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

export function selectLinkDomRange(editor: Editor, anchor: HTMLElement): void {
  try {
    const from = editor.view.posAtDOM(anchor, 0);
    const to = editor.view.posAtDOM(anchor, Math.max(0, anchor.childNodes.length));
    editor.chain().focus().setTextSelection({ from, to }).run();
  } catch {
    editor.chain().focus().run();
  }
}
