/**
 * Option chip component for displaying and editing chord generation options
 * Similar to GeneratedChip but adapted for chord controls
 */

import React, { useState, useRef, useEffect } from 'react';

interface OptionChipProps {
  label: string;
  value: string;
  isLocked: boolean;
  tooltip?: string;
  options?: Array<{ value: string; label: string }>;
  onEdit?: () => void;
  onSelect?: (value: string) => void;
  onLockToggle: () => void;
  onRandomize?: () => void;
}

const OptionChip: React.FC<OptionChipProps> = ({
  label,
  value,
  isLocked,
  tooltip,
  options,
  onEdit,
  onSelect,
  onLockToggle,
  onRandomize,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleChipClick = () => {
    if (options && onSelect) {
      setShowDropdown(!showDropdown);
    } else if (onEdit) {
      onEdit();
    }
  };

  return (
    <div className="option-chip-row">
      <span className="option-chip-label">{label}:</span>
      <div className="option-chip-container" ref={containerRef}>
        <button
          className={`option-chip ${isLocked ? 'locked' : ''} ${showDropdown ? 'dropdown-open' : ''}`}
          onClick={handleChipClick}
          onMouseEnter={() => tooltip && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          title={tooltip}
        >
          <span className="option-chip-value">{value}</span>
          <div className="option-chip-actions">
            {onRandomize && (
              <button
                className="option-chip-dice"
                onClick={(e) => {
                  e.stopPropagation();
                  onRandomize();
                }}
                title="Randomize this option"
                aria-label="Randomize"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="14"
                  viewBox="0 -960 960 960"
                  width="14"
                  fill="currentColor"
                >
                  <path d="M220-160q-24 0-42-18t-18-42v-520q0-24 18-42t42-18h520q24 0 42 18t18 42v520q0 24-18 42t-42 18H220Zm0-60h520v-520H220v520Zm170-110q21 0 35.5-14.5T440-380q0-21-14.5-35.5T390-430q-21 0-35.5 14.5T340-380q0 21 14.5 35.5T390-330Zm180 0q21 0 35.5-14.5T620-380q0-21-14.5-35.5T570-430q-21 0-35.5 14.5T520-380q0 21 14.5 35.5T570-330ZM390-510q21 0 35.5-14.5T440-560q0-21-14.5-35.5T390-610q-21 0-35.5 14.5T340-560q0 21 14.5 35.5T390-510Zm180 0q21 0 35.5-14.5T620-560q0-21-14.5-35.5T570-610q-21 0-35.5 14.5T520-560q0 21 14.5 35.5T570-510ZM220-740v520-520Z" />
                </svg>
              </button>
            )}
            <button
              className="option-chip-lock"
              onClick={(e) => {
                e.stopPropagation();
                onLockToggle();
              }}
              title={isLocked ? 'Unlock to allow randomization' : 'Lock to prevent randomization'}
              aria-label={isLocked ? 'Unlock' : 'Lock'}
            >
              <span className="material-symbols-outlined">
                {isLocked ? 'lock' : 'lock_open'}
              </span>
            </button>
          </div>
        </button>
        {showDropdown && options && (
          <div className="option-chip-dropdown">
            {options.map((option) => (
              <button
                key={option.value}
                className={`option-chip-dropdown-item ${option.value === value ? 'selected' : ''}`}
                onClick={() => {
                  if (onSelect) {
                    onSelect(option.value);
                  }
                  setShowDropdown(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
        {showTooltip && tooltip && !showDropdown && (
          <div className="option-chip-tooltip">
            {tooltip}
          </div>
        )}
      </div>
    </div>
  );
};

export default OptionChip;
