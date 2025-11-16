import React, { useState, useRef, useEffect } from 'react';
import type { TimeSignature } from '../types';
import { RHYTHM_DATABASE } from '../data/rhythmDatabase';

interface RhythmPresetsProps {
  onSelectPreset: (notation: string, timeSignature: TimeSignature) => void;
}

const RhythmPresets: React.FC<RhythmPresetsProps> = ({ onSelectPreset }) => {
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
        </div>
      )}
    </div>
  );
};

export default RhythmPresets;

