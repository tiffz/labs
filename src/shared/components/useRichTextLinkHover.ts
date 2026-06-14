import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

const SHOW_DELAY_MS = 380;
const HIDE_DELAY_MS = 220;

function isSafeLinkHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || /^mailto:/i.test(href);
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

  const scheduleShow = useCallback((anchor: HTMLAnchorElement) => {
    const href = anchor.getAttribute('href')?.trim() ?? '';
    if (!href) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    activeAnchorRef.current = anchor;
    showTimerRef.current = setTimeout(() => {
      setHover({ anchorEl: anchor, href });
    }, SHOW_DELAY_MS);
  }, []);

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

export function selectLinkDomRange(editor: Editor, anchor: HTMLElement): void {
  try {
    const from = editor.view.posAtDOM(anchor, 0);
    const to = editor.view.posAtDOM(anchor, Math.max(0, anchor.childNodes.length));
    editor.chain().focus().setTextSelection({ from, to }).run();
  } catch {
    editor.chain().focus().run();
  }
}
