import React, { useState, useRef, useEffect } from 'react';
import type { TimeSignature } from '../types';
import { RHYTHM_DATABASE } from '../data/rhythmDatabase';

interface RhythmPresetsProps {
  onSelectPreset: (notation: string, timeSignature: TimeSignature) => void;
  onImportDrumTab?: () => void;
}

const RhythmPresets: React.FC<RhythmPresetsProps> = ({ onSelectPreset, onImportDrumTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPreset = (notation: string, timeSignature: TimeSignature) => {
    onSelectPreset(notation, timeSignature);
    setIsOpen(false);
  };

  const handleImportDrumTab = () => {
    setIsOpen(false);
    onImportDrumTab?.();
  };

  return (
    <div className="rhythm-presets-dropdown" ref={dropdownRef}>
      <button
        className="load-rhythm-button"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        Load Rhythm ▼
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          {/* Preset Rhythms Section */}
          <div className="dropdown-section-header">Preset Rhythms</div>
          {Object.values(RHYTHM_DATABASE).map((rhythm) => (
            <button
              key={rhythm.name}
              className="dropdown-item"
              onClick={() => handleSelectPreset(rhythm.basePattern, rhythm.timeSignature)}
              type="button"
            >
              {rhythm.name} ({rhythm.timeSignature.numerator}/{rhythm.timeSignature.denominator})
            </button>
          ))}
          
          {/* Import Section */}
          {onImportDrumTab && (
            <>
              <div className="dropdown-section-header">Import</div>
              <button
                className="dropdown-item dropdown-item-action"
                onClick={handleImportDrumTab}
                type="button"
              >
                <span className="material-symbols-outlined dropdown-item-icon">upload</span>
                Import Drum Tab...
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RhythmPresets;
