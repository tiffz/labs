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

/** Documented Color Sight practice shortcuts (see PracticePhase keyboard handlers). */
export function sightKeyboardShortcutSections(): LabsKeyboardShortcutSection[] {
  return [
    {
      title: 'Practice',
      shortcuts: [
        { id: 'pick-left', label: 'Pick left swatch or side', keys: ['ArrowLeft'] },
        { id: 'pick-right', label: 'Pick right swatch or side', keys: ['ArrowRight'] },
        { id: 'submit-enter', label: 'Submit match or continue after feedback', keys: ['Enter'] },
        { id: 'submit-space', label: 'Submit match or continue (alternate)', keys: ['Space'] },
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

/** Stanza — shared undo stack plus section editing shortcuts. */
export function stanzaKeyboardShortcutSections(): LabsKeyboardShortcutSection[] {
  return [
    labsCommonEditingShortcutSection(),
    {
      title: 'Sections',
      shortcuts: [
        { id: 'split-playhead', label: 'Split at playhead', keys: ['M'] },
        {
          id: 'delete-boundary',
          label: 'Delete boundary at selected section start',
          keys: ['Delete'],
        },
      ],
    },
    labsCommonHelpShortcutSection(),
  ];
}

/** Zine Box — library CRUD undo via LabsUndoProvider. */
export function zineboxKeyboardShortcutSections(): LabsKeyboardShortcutSection[] {
  return [
    labsCommonEditingShortcutSection(),
    {
      title: 'Reader',
      shortcuts: [
        { id: 'page-prev', label: 'Previous page', keys: ['ArrowLeft'] },
        { id: 'page-next', label: 'Next page', keys: ['ArrowRight'] },
      ],
    },
    labsCommonHelpShortcutSection(),
  ];
}

/** The Gesture Room — collections CRUD undo via LabsUndoProvider. */
export function gestureKeyboardShortcutSections(): LabsKeyboardShortcutSection[] {
  return [
    labsCommonEditingShortcutSection(),
    {
      title: 'Session',
      shortcuts: [
        { id: 'pause-resume', label: 'Pause or resume timer', keys: ['Space'] },
        { id: 'mark-done', label: 'Mark drawing done', keys: ['Enter'] },
        { id: 'skip', label: 'Skip to next photo', keys: ['ArrowRight'] },
        { id: 'back', label: 'Back to previous photo', keys: ['ArrowLeft'] },
        { id: 'exit', label: 'End session', keys: ['Esc'] },
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
  'sight',
  'scales',
  'cats',
  'corp',
  'gesture',
  'piano',
  'chords',
  'zinebox',
] as const;

export function keyboardShortcutsAuditStatus(): Record<
  (typeof KEYBOARD_SHORTCUTS_AUDIT_APPS)[number],
  'documented' | 'partial' | 'pending'
> {
  return {
    words: 'documented',
    drums: 'documented',
    stanza: 'documented',
    encore: 'documented',
    sight: 'documented',
    scales: 'partial',
    cats: 'pending',
    corp: 'pending',
    gesture: 'documented',
    piano: 'pending',
    chords: 'pending',
    zinebox: 'documented',
  };
}
