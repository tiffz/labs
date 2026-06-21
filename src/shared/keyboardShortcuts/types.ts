export type LabsKeyboardShortcutEntry = {
  /** Stable id for tests and docs. */
  id: string;
  /** Human label shown in the help dialog. */
  label: string;
  /** Ordered key tokens, e.g. ['mod', 'Z'] or ['Space']. */
  keys: readonly string[];
};

export type LabsKeyboardShortcutSection = {
  title: string;
  shortcuts: readonly LabsKeyboardShortcutEntry[];
};

export type LabsKeyboardShortcutsTheme = 'default' | 'words' | 'drums' | 'encore' | 'stanza';
