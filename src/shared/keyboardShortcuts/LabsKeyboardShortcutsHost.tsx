import { useMemo, type ReactElement, type ReactNode } from 'react';
import LabsKeyboardShortcutsDialog from './LabsKeyboardShortcutsDialog';
import { LabsKeyboardShortcutsHostContext } from './LabsKeyboardShortcutsHostContext';
import type { LabsKeyboardShortcutSection, LabsKeyboardShortcutsTheme } from './types';
import { useLabsKeyboardShortcutsHelp } from './useLabsKeyboardShortcutsHelp';

export type LabsKeyboardShortcutsHostProps = {
  sections: readonly LabsKeyboardShortcutSection[] | (() => readonly LabsKeyboardShortcutSection[]);
  theme?: LabsKeyboardShortcutsTheme;
  title?: string;
  children?: ReactNode;
};

/** Mount once per app shell — wires Ctrl/Cmd+? (and ? when not typing) plus optional menu triggers. */
export function LabsKeyboardShortcutsHost({
  sections,
  theme = 'default',
  title,
  children,
}: LabsKeyboardShortcutsHostProps): ReactElement {
  const { open, setOpen, openShortcuts } = useLabsKeyboardShortcutsHelp();
  const resolvedSections = useMemo(
    () => (typeof sections === 'function' ? sections() : sections),
    [sections],
  );
  const contextValue = useMemo(() => ({ openShortcuts }), [openShortcuts]);

  return (
    <LabsKeyboardShortcutsHostContext.Provider value={contextValue}>
      {children}
      <LabsKeyboardShortcutsDialog
        open={open}
        onClose={() => setOpen(false)}
        sections={resolvedSections}
        theme={theme}
        title={title}
      />
    </LabsKeyboardShortcutsHostContext.Provider>
  );
}
