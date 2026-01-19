/* eslint-disable react/prop-types */
import React, { memo, useCallback } from 'react';
import type { ZineMode } from '../types';

interface ModeToggleProps {
  mode: ZineMode;
  onModeChange: (mode: ZineMode) => void;
  compact?: boolean;
}

const ModeToggle: React.FC<ModeToggleProps> = memo(({ mode, onModeChange }) => {
  const handleMinizine = useCallback(() => onModeChange('minizine'), [onModeChange]);
  const handleBooklet = useCallback(() => onModeChange('booklet'), [onModeChange]);

  return (
    <div className="mode-toggle">
      <button
        onClick={handleMinizine}
        className={`mode-toggle-btn ${mode === 'minizine' ? 'active' : ''}`}
        aria-pressed={mode === 'minizine'}
      >
        <span className="mode-icon">📄</span>
        <span>Minizine</span>
      </button>
      <button
        onClick={handleBooklet}
        className={`mode-toggle-btn ${mode === 'booklet' ? 'active' : ''}`}
        aria-pressed={mode === 'booklet'}
      >
        <span className="mode-icon">📚</span>
        <span>Booklet</span>
      </button>
    </div>
  );
});

ModeToggle.displayName = 'ModeToggle';

export default ModeToggle;
