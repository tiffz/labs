/**
 * When true, Encore/Labs app-level undo should not run so the browser or widget can handle ⌘Z / Ctrl+Z
 * (e.g. text field typing undo).
 */
export function isLabsUndoHotkeySuppressedTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const el = target;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  // MUI Select / Autocomplete focus can land on a div with combobox role
  if (el.getAttribute('role') === 'textbox' || el.closest('[role="textbox"]')) return true;
  if (el.closest('[data-labs-undo-breakout="true"]')) return true;
  return false;
}
