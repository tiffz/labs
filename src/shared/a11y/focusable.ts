/** Focusable elements for menu/disclosure keyboard support. */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.closest('[inert]') && element.tabIndex !== -1,
  );
}

export function focusFirstFocusable(root: ParentNode | null | undefined): boolean {
  if (!root) return false;
  const first = getFocusableElements(root)[0];
  if (!first) return false;
  first.focus();
  return true;
}

export function handleMenuListKeyDown(
  event: React.KeyboardEvent,
  items: HTMLElement[],
  opts?: { onEscape?: () => void; orientation?: 'vertical' | 'horizontal' },
): void {
  if (items.length === 0) return;
  const orientation = opts?.orientation ?? 'vertical';
  const current = document.activeElement;
  const index = items.indexOf(current as HTMLElement);
  const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
  const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';

  if (event.key === nextKey) {
    event.preventDefault();
    const nextIndex = index < 0 ? 0 : Math.min(index + 1, items.length - 1);
    items[nextIndex]?.focus();
    return;
  }
  if (event.key === prevKey) {
    event.preventDefault();
    const nextIndex = index < 0 ? items.length - 1 : Math.max(index - 1, 0);
    items[nextIndex]?.focus();
    return;
  }
  if (event.key === 'Home') {
    event.preventDefault();
    items[0]?.focus();
    return;
  }
  if (event.key === 'End') {
    event.preventDefault();
    items[items.length - 1]?.focus();
    return;
  }
  if (event.key === 'Escape') {
    opts?.onEscape?.();
  }
}
