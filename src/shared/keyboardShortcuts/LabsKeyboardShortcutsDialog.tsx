import { useEffect, useRef, type ReactElement } from 'react';
import { formatShortcutKeyToken } from './labsKeyboardShortcutLabels';
import type { LabsKeyboardShortcutSection, LabsKeyboardShortcutsTheme } from './types';
import './labsKeyboardShortcuts.css';

export type LabsKeyboardShortcutsDialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  sections: readonly LabsKeyboardShortcutSection[];
  theme?: LabsKeyboardShortcutsTheme;
};

export default function LabsKeyboardShortcutsDialog({
  open,
  onClose,
  title = 'Keyboard shortcuts',
  sections,
  theme = 'default',
}: LabsKeyboardShortcutsDialogProps): ReactElement | null {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    overlayRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      className={['labs-kbd-shortcuts-overlay', `labs-kbd-shortcuts-overlay--${theme}`].join(' ')}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      role="presentation"
    >
      <div
        className="labs-kbd-shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="labs-kbd-shortcuts-title"
      >
        <header className="labs-kbd-shortcuts-header">
          <h2 id="labs-kbd-shortcuts-title" className="labs-kbd-shortcuts-title">
            {title}
          </h2>
          <button type="button" className="labs-kbd-shortcuts-close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>
        <div className="labs-kbd-shortcuts-body">
          {sections.map((section) => (
            <section key={section.title} className="labs-kbd-shortcuts-section">
              <h3 className="labs-kbd-shortcuts-section-title">{section.title}</h3>
              <ul className="labs-kbd-shortcuts-list">
                {section.shortcuts.map((entry) => (
                  <li key={entry.id} className="labs-kbd-shortcuts-item">
                    <span className="labs-kbd-shortcuts-label">{entry.label}</span>
                    <span className="labs-kbd-shortcuts-keys" aria-label={entry.label}>
                      {entry.keys.map((token, index) => (
                        <span key={`${entry.id}-${token}-${index}`} className="labs-kbd-shortcuts-key-group">
                          {index > 0 ? <span className="labs-kbd-shortcuts-plus">+</span> : null}
                          <kbd className="labs-kbd-shortcuts-kbd">{formatShortcutKeyToken(token)}</kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
