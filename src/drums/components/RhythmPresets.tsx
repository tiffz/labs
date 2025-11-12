import React, { useState, useRef, useEffect } from 'react';
import type { TimeSignature } from '../types';

interface RhythmPreset {
  name: string;
  notation: string;
  timeSignature: TimeSignature;
}

const RHYTHM_PRESETS: RhythmPreset[] = [
  {
    name: 'Maqsum (4/4)',
    notation: 'D-T-__K-D---T---',
    timeSignature: { numerator: 4, denominator: 4 },
  },
  {
    name: 'Saeidi (4/4)',
    notation: 'D-T-__D-D---T---',
    timeSignature: { numerator: 4, denominator: 4 },
  },
  {
    name: 'Baladi (4/4)',
    notation: 'D-D-__T-D---T---',
    timeSignature: { numerator: 4, denominator: 4 },
  },
  {
    name: 'Ayoub (2/4)',
    notation: 'D--KD-T-',
    timeSignature: { numerator: 2, denominator: 4 },
  },
];

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

  const handleSelectPreset = (preset: RhythmPreset) => {
    onSelectPreset(preset.notation, preset.timeSignature);
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
          {RHYTHM_PRESETS.map((preset) => (
            <button
              key={preset.name}
              className="dropdown-item"
              onClick={() => handleSelectPreset(preset)}
              type="button"
            >
              {preset.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RhythmPresets;

