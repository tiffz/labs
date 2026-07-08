/**
 * Material Design–style keyboard shortcuts help (`Ctrl/Cmd + ?`).
 *
 * ## Agent checklist
 * - When adding a **user-facing keyboard shortcut** to any Labs app, register it in that app's
 *   `*KeyboardShortcutSections()` helper (or add a new helper here) and wire
 *   {@link LabsKeyboardShortcutsDialog} + {@link useLabsKeyboardShortcutsHelp}.
 * - Reuse {@link labsUndoRedoShortcutEntries} when the app mounts {@link LabsUndoProvider}.
 * - Theme the dialog with `theme="words" | "drums" | "encore" | …` so kbd chips match the app.
 * - Update {@link keyboardShortcutsAuditStatus} when an app moves from partial → documented.
 */

export { default as LabsKeyboardShortcutsDialog } from './LabsKeyboardShortcutsDialog';
export { LabsKeyboardShortcutsHost } from './LabsKeyboardShortcutsHost';
export { useLabsKeyboardShortcutsOpen } from './useLabsKeyboardShortcutsOpen';
export { useLabsKeyboardShortcutsHelp } from './useLabsKeyboardShortcutsHelp';
export {
  drumsKeyboardShortcutSections,
  encoreKeyboardShortcutSections,
  keyboardShortcutsAuditStatus,
  KEYBOARD_SHORTCUTS_AUDIT_APPS,
  labsCommonEditingShortcutSection,
  labsCommonHelpShortcutSection,
  labsKeyboardShortcutsHelpEntry,
  labsUndoRedoShortcutEntries,
  sightKeyboardShortcutSections,
  stanzaKeyboardShortcutSections,
  wordsKeyboardShortcutSections,
} from './commonShortcuts';
export {
  formatShortcutKeyToken,
  isKeyboardShortcutsHelpEvent,
  labsIsMacPlatform,
  labsModifierKeyLabel,
} from './labsKeyboardShortcutLabels';
export type {
  LabsKeyboardShortcutEntry,
  LabsKeyboardShortcutSection,
  LabsKeyboardShortcutsTheme,
} from './types';
