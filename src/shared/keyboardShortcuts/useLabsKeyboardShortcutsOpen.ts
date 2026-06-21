import { useContext } from 'react';
import { LabsKeyboardShortcutsHostContext } from './LabsKeyboardShortcutsHostContext';

export function useLabsKeyboardShortcutsOpen(): (() => void) | null {
  return useContext(LabsKeyboardShortcutsHostContext)?.openShortcuts ?? null;
}
