import { useCallback, useEffect, useState } from 'react';
import { isKeyboardShortcutsHelpEvent } from './labsKeyboardShortcutLabels';

type UseLabsKeyboardShortcutsHelpOptions = {
  /** When false, the listener is not attached (e.g. modal already open elsewhere). */
  enabled?: boolean;
};

function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
    return true;
  }
  if (target.isContentEditable) return true;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

/**
 * Opens keyboard shortcuts help on Ctrl/Cmd + ? (and Shift+/ on US layouts).
 * Also opens on ? alone when focus is not in a text field (GitHub-style).
 */
export function useLabsKeyboardShortcutsHelp(
  options: UseLabsKeyboardShortcutsHelpOptions = {},
): { open: boolean; setOpen: (open: boolean) => void; openShortcuts: () => void } {
  const { enabled = true } = options;
  const [open, setOpen] = useState(false);
  const openShortcuts = useCallback(() => setOpen(true), []);

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isKeyboardShortcutsHelpEvent(event)) return;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod && isEditableShortcutTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enabled]);

  return { open, setOpen, openShortcuts };
}
