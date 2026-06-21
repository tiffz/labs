import type { LabsKeyboardShortcutEntry, LabsKeyboardShortcutSection } from './types';
import { labsIsMacPlatform } from './labsKeyboardShortcutLabels';

/** Shared undo / redo entries for apps using {@link LabsUndoProvider}. */
export function labsUndoRedoShortcutEntries(): LabsKeyboardShortcutEntry[] {
  const mod = 'mod';
  if (labsIsMacPlatform()) {
    return [
      { id: 'undo', label: 'Undo', keys: [mod, 'Z'] },
      { id: 'redo', label: 'Redo', keys: [mod, 'Shift', 'Z'] },
    ];
  }
  return [
    { id: 'undo', label: 'Undo', keys: [mod, 'Z'] },
    { id: 'redo', label: 'Redo', keys: [mod, 'Y'] },
  ];
}

export function labsKeyboardShortcutsHelpEntry(): LabsKeyboardShortcutEntry {
  return {
    id: 'shortcuts-help',
    label: 'Keyboard shortcuts',
    keys: ['mod', '?'],
  };
}

export function labsCommonEditingShortcutSection(): LabsKeyboardShortcutSection {
  return {
    title: 'Editing',
    shortcuts: [...labsUndoRedoShortcutEntries()],
  };
}

export function labsCommonHelpShortcutSection(): LabsKeyboardShortcutSection {
  return {
    title: 'Help',
    shortcuts: [labsKeyboardShortcutsHelpEntry()],
  };
}

/** Words in Rhythm — documented shortcuts (hotkey-only undo/redo via shared provider). */
export function wordsKeyboardShortcutSections(): LabsKeyboardShortcutSection[] {
  return [
    labsCommonEditingShortcutSection(),
    {
      title: 'Playback',
      shortcuts: [{ id: 'play-stop', label: 'Play or stop', keys: ['Space'] }],
    },
    {
      title: 'Menus',
      shortcuts: [{ id: 'close-menus', label: 'Close open menus', keys: ['Esc'] }],
    },
    labsCommonHelpShortcutSection(),
  ];
}

/** Drums — mirrors existing in-app shortcuts. */
export function drumsKeyboardShortcutSections(): LabsKeyboardShortcutSection[] {
  return [
    labsCommonEditingShortcutSection(),
    {
      title: 'Playback & rhythm',
      shortcuts: [
        { id: 'play-stop', label: 'Play / stop', keys: ['Space'] },
        { id: 'randomize', label: 'Randomize rhythm', keys: ['R'] },
      ],
    },
    {
      title: 'Notation',
      shortcuts: [
        { id: 'copy', label: 'Copy selected notation', keys: ['mod', 'C'] },
        { id: 'extend-selection', label: 'Extend selection to note', keys: ['Shift', 'Click'] },
      ],
    },
    labsCommonHelpShortcutSection(),
  ];
}

/** Encore — undo/redo via LabsUndoProvider; originals chord paint shortcuts. */
export function encoreKeyboardShortcutSections(): LabsKeyboardShortcutSection[] {
  return [
    labsCommonEditingShortcutSection(),
    {
      title: 'Originals editor',
      shortcuts: [
        { id: 'clear-chord-arm', label: 'Clear armed chord or selection', keys: ['Esc'] },
        { id: 'delete-chord', label: 'Delete selected chord', keys: ['Delete'] },
      ],
    },
    labsCommonHelpShortcutSection(),
  ];
}

/** Audit note: add app-specific sections here as shortcuts are documented. */
export const KEYBOARD_SHORTCUTS_AUDIT_APPS = [
  'words',
  'drums',
  'stanza',
  'encore',
  'scales',
  'cats',
  'corp',
  'gesture',
  'piano',
  'chords',
] as const;

export function keyboardShortcutsAuditStatus(): Record<
  (typeof KEYBOARD_SHORTCUTS_AUDIT_APPS)[number],
  'documented' | 'partial' | 'pending'
> {
  return {
    words: 'documented',
    drums: 'documented',
    stanza: 'partial',
    encore: 'partial',
    scales: 'partial',
    cats: 'pending',
    corp: 'pending',
    gesture: 'pending',
    piano: 'pending',
    chords: 'pending',
  };
}
