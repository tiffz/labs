import { createContext } from 'react';

export type LabsKeyboardShortcutsHostContextValue = {
  openShortcuts: () => void;
};

export const LabsKeyboardShortcutsHostContext =
  createContext<LabsKeyboardShortcutsHostContextValue | null>(null);
