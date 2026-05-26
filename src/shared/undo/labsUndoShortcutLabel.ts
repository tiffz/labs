/** Platform-appropriate label for Labs app-level undo/redo tooltips. */
export function labsUndoShortcutLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl+Z';
  return /Mac|iPhone|iPad/i.test(navigator.platform) ? '⌘Z' : 'Ctrl+Z';
}

export function labsRedoShortcutLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl+Shift+Z';
  return /Mac|iPhone|iPad/i.test(navigator.platform) ? '⌘⇧Z' : 'Ctrl+Shift+Z';
}
