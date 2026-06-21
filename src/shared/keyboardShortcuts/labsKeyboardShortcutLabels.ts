/** Platform modifier label for keyboard help (`Cmd` on macOS, `Ctrl` elsewhere). */
export function labsModifierKeyLabel(): string {
  if (typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')) {
    return 'Cmd';
  }
  return 'Ctrl';
}

export function labsIsMacPlatform(): boolean {
  return typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
}

const KEY_LABELS: Record<string, string> = {
  shift: 'Shift',
  alt: labsIsMacPlatform() ? 'Option' : 'Alt',
  space: 'Space',
  escape: 'Esc',
  enter: 'Enter',
  delete: 'Delete',
  backspace: 'Backspace',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  '?': '?',
  click: 'Click',
};

/** Material Design–style display label for a shortcut token. */
export function formatShortcutKeyToken(token: string): string {
  const normalized = token.trim().toLowerCase();
  if (normalized === 'mod') return labsModifierKeyLabel();
  if (KEY_LABELS[normalized]) return KEY_LABELS[normalized];
  if (normalized.length === 1) return token.toUpperCase();
  return token;
}

/** Returns true when the event matches the keyboard shortcuts help chord. */
export function isKeyboardShortcutsHelpEvent(event: KeyboardEvent): boolean {
  if (event.repeat || event.altKey) return false;

  const mod = event.metaKey || event.ctrlKey;
  const slashKey = event.key === '/' || event.code === 'Slash';

  // Mod+? / Mod+Shift+/ / Mod+/ (common on US layouts; Cursor/IDE may steal Mod+?)
  if (mod && (event.key === '?' || slashKey)) {
    return true;
  }

  // GitHub-style: ? alone (Shift+/) when focus is not in a text field
  if (!mod && event.key === '?') {
    return true;
  }

  return false;
}
