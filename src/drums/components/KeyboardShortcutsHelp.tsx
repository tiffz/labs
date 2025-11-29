import React from 'react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Detect platform for modifier key display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKeyText = isMac ? 'Cmd' : 'Ctrl';

  return (
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div className="keyboard-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button
            className="keyboard-shortcuts-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="keyboard-shortcuts-content">
          <div className="keyboard-shortcut-item">
            <div className="keyboard-shortcut-keys">
              <kbd>{modKeyText}</kbd>
              <span>+</span>
              <kbd>Z</kbd>
            </div>
            <div className="keyboard-shortcut-description">Undo</div>
          </div>
          <div className="keyboard-shortcut-item">
            <div className="keyboard-shortcut-keys">
              <kbd>{modKeyText}</kbd>
              <span>+</span>
              <kbd>{isMac ? 'Shift' : 'Y'}</kbd>
              {isMac && <span>+</span>}
              {isMac && <kbd>Z</kbd>}
            </div>
            <div className="keyboard-shortcut-description">Redo</div>
          </div>
          <div className="keyboard-shortcut-item">
            <div className="keyboard-shortcut-keys">
              <kbd>R</kbd>
            </div>
            <div className="keyboard-shortcut-description">Randomize rhythm</div>
          </div>
          <div className="keyboard-shortcut-item">
            <div className="keyboard-shortcut-keys">
              <kbd>Space</kbd>
            </div>
            <div className="keyboard-shortcut-description">Play / Stop</div>
          </div>
          <div className="keyboard-shortcut-item">
            <div className="keyboard-shortcut-keys">
              <kbd>?</kbd>
            </div>
            <div className="keyboard-shortcut-description">Show this help</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;

