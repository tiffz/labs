/**
 * Option chip component for displaying and editing chord generation options
 * Similar to GeneratedChip but adapted for chord controls
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import AppTooltip from '../../shared/components/AppTooltip';
import DiceIcon from '../../shared/components/DiceIcon';

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
  inlineEdit?: boolean; // If true, show inline input instead of modal
  onInlineChange?: (value: string) => void; // Called when inline input changes
  inlineType?: 'text' | 'number'; // Type of inline input
  inlineMin?: number; // Min value for number input
  inlineMax?: number; // Max value for number input
  hideLabel?: boolean; // If true, don't render the label
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
  inlineEdit = false,
  onInlineChange,
  inlineType = 'text',
  inlineMin,
  inlineMax,
  hideLabel = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [suppressChipTooltip, setSuppressChipTooltip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInlineSave = useCallback(() => {
    if (onInlineChange && editValue !== value) {
      onInlineChange(editValue);
    }
    setIsEditing(false);
  }, [onInlineChange, editValue, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        if (isEditing) {
          handleInlineSave();
        }
      }
    };

    if (showDropdown || isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown, isEditing, handleInlineSave]);

  useEffect(() => {
    // Update edit value when value prop changes (but not while editing)
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  useEffect(() => {
    // Focus input when entering edit mode
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleInlineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInlineSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const handleChipClick = () => {
    if (inlineEdit && !isLocked) {
      setIsEditing(true);
    } else if (options && onSelect) {
      setShowDropdown(!showDropdown);
    } else if (onEdit) {
      onEdit();
    }
  };

  return (
    <div className="option-chip-row">
      {!hideLabel && <span className="option-chip-label">{label}:</span>}
      <div className="option-chip-container" ref={containerRef}>
        <AppTooltip
          title={tooltip ?? ''}
          disabled={suppressChipTooltip || showDropdown || isEditing}
        >
          <div
            className={`option-chip ${isLocked ? 'locked' : ''} ${showDropdown ? 'dropdown-open' : ''}`}
            onClick={handleChipClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleChipClick();
              }
            }}
          >
          {isEditing && inlineEdit ? (
            <input
              ref={inputRef}
              type={inlineType}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleInlineSave}
              onKeyDown={handleInlineKeyDown}
              onClick={(e) => e.stopPropagation()}
              min={inlineMin}
              max={inlineMax}
              className="option-chip-inline-input"
            />
          ) : (
            <span className="option-chip-value">{value}</span>
          )}
          <div className="option-chip-actions">
            {onRandomize && (
              <AppTooltip title="Randomize this option">
                <button
                  className="option-chip-dice"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRandomize();
                  }}
                  onMouseEnter={() => setSuppressChipTooltip(true)}
                  onMouseLeave={() => setSuppressChipTooltip(false)}
                  onFocus={() => setSuppressChipTooltip(true)}
                  onBlur={() => setSuppressChipTooltip(false)}
                  aria-label="Randomize"
                >
                  <DiceIcon variant="single" size={14} />
                </button>
              </AppTooltip>
            )}
            <AppTooltip title={isLocked ? 'Unlock to allow randomization' : 'Lock to prevent randomization'}>
              <button
                className="option-chip-lock"
                onClick={(e) => {
                  e.stopPropagation();
                  onLockToggle();
                }}
                onMouseEnter={() => setSuppressChipTooltip(true)}
                onMouseLeave={() => setSuppressChipTooltip(false)}
                onFocus={() => setSuppressChipTooltip(true)}
                onBlur={() => setSuppressChipTooltip(false)}
                aria-label={isLocked ? 'Unlock' : 'Lock'}
              >
                <span className="material-symbols-outlined">
                  {isLocked ? 'lock' : 'lock_open'}
                </span>
              </button>
            </AppTooltip>
          </div>
          </div>
        </AppTooltip>
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
      </div>
    </div>
  );
};

export default OptionChip;
