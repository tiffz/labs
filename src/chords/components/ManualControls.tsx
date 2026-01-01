/**
 * Manual controls for chord progression generator
 * Chip-based inline editing interface
 */

import React, { useState, useMemo, useEffect } from 'react';
import type { ChordProgressionState, Key, TimeSignature, LockedOptions } from '../types';
import { COMMON_CHORD_PROGRESSIONS } from '../data/chordProgressions';
import { CHORD_STYLING_STRATEGIES } from '../data/chordStylingStrategies';
import { ALL_KEYS, randomChordProgression, randomKey, randomTempo } from '../utils/randomization';
import { getCompatibleStylingStrategies } from '../utils/stylingCompatibility';
import OptionChip from './OptionChip';
import ChordStylePreview from './ChordStylePreview';

interface ManualControlsProps {
  state: ChordProgressionState;
  lockedOptions: LockedOptions;
  onStateChange: (updates: Partial<ChordProgressionState>) => void;
  onLockChange: (option: keyof LockedOptions, locked: boolean) => void;
  onRandomize: () => void;
}

// Get all time signatures that have at least one compatible styling strategy
function getAvailableTimeSignatures(): TimeSignature[] {
  const timeSigs = new Set<string>();
  Object.values(CHORD_STYLING_STRATEGIES).forEach(config => {
    config.compatibleTimeSignatures.forEach(ts => {
      timeSigs.add(`${ts.numerator}/${ts.denominator}`);
    });
  });
  return Array.from(timeSigs)
    .map(str => {
      const [num, den] = str.split('/').map(Number);
      return { numerator: num, denominator: den };
    })
    .sort((a, b) => {
      // Sort by denominator first, then numerator
      if (a.denominator !== b.denominator) return a.denominator - b.denominator;
      return a.numerator - b.numerator;
    });
}

const ManualControls: React.FC<ManualControlsProps> = ({
  state,
  lockedOptions,
  onStateChange,
  onLockChange,
  onRandomize,
}) => {
  const [editingOption, setEditingOption] = useState<string | null>(null);

  const currentProgressionIndex = COMMON_CHORD_PROGRESSIONS.findIndex(p => p.name === state.progression.name);
  const currentProgression = COMMON_CHORD_PROGRESSIONS[currentProgressionIndex >= 0 ? currentProgressionIndex : 0];

  const handleRandomizeProgression = () => {
    onStateChange({ progression: randomChordProgression() });
  };

  const handleRandomizeKey = () => {
    onStateChange({ key: randomKey() });
  };

  const handleRandomizeTempo = () => {
    onStateChange({ tempo: randomTempo() });
  };

  // Get available time signatures
  const availableTimeSignatures = useMemo(() => getAvailableTimeSignatures(), []);

  // Get compatible styling strategies for current time signature
  const compatibleStyles = useMemo(() => {
    return getCompatibleStylingStrategies(state.timeSignature);
  }, [state.timeSignature]);

  // Ensure current styling strategy is compatible, if not switch to first compatible one
  useEffect(() => {
    if (!compatibleStyles.includes(state.stylingStrategy)) {
      if (compatibleStyles.length > 0) {
        onStateChange({ stylingStrategy: compatibleStyles[0] });
      }
    }
  }, [state.timeSignature, state.stylingStrategy, compatibleStyles, onStateChange]);

  return (
    <>
      <div className="manual-controls">
        {/* Randomize button at top - always first */}
        <div className="randomize-section">
          <button onClick={onRandomize} className="randomize-button-large">
            Randomize
          </button>
        </div>

        <OptionChip
          label="Progression"
          value={currentProgression.name}
          isLocked={lockedOptions.progression || false}
          tooltip={currentProgression.description}
          options={COMMON_CHORD_PROGRESSIONS.map((prog) => ({
            value: prog.name,
            label: prog.name,
          }))}
          onSelect={(value) => {
            const progression = COMMON_CHORD_PROGRESSIONS.find(p => p.name === value);
            if (progression) {
              onStateChange({ progression });
            }
          }}
          onLockToggle={() => onLockChange('progression', !lockedOptions.progression)}
          onRandomize={handleRandomizeProgression}
        />

        <OptionChip
          label="Key"
          value={state.key}
          isLocked={lockedOptions.key || false}
          tooltip="The key signature for the chord progression"
          options={ALL_KEYS.map(key => ({ value: key, label: key }))}
          onSelect={(value) => onStateChange({ key: value as Key })}
          onLockToggle={() => onLockChange('key', !lockedOptions.key)}
          onRandomize={handleRandomizeKey}
        />

        <OptionChip
          label="Tempo"
          value={`${state.tempo}`}
          isLocked={lockedOptions.tempo || false}
          tooltip="Beats per minute (BPM)"
          onEdit={() => setEditingOption('tempo')}
          onLockToggle={() => onLockChange('tempo', !lockedOptions.tempo)}
          onRandomize={handleRandomizeTempo}
        />

        {/* Time Signature Tabs */}
        <div className="control-section">
          <div className="control-section-header">
            <label className="control-section-label">Time Signature</label>
            <button
              className={`control-section-lock ${lockedOptions.timeSignature ? 'locked' : ''}`}
              onClick={() => onLockChange('timeSignature', !lockedOptions.timeSignature)}
              title={lockedOptions.timeSignature ? 'Unlock' : 'Lock'}
            >
              <span className="material-symbols-outlined">
                {lockedOptions.timeSignature ? 'lock' : 'lock_open'}
              </span>
            </button>
          </div>
          <div className="time-signature-tabs">
            {availableTimeSignatures.map(ts => {
              const tsString = `${ts.numerator}/${ts.denominator}`;
              const isActive = state.timeSignature.numerator === ts.numerator && 
                              state.timeSignature.denominator === ts.denominator;
              return (
                <button
                  key={tsString}
                  className={`time-signature-tab ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (!isActive && !lockedOptions.timeSignature) {
                      const compatibleStyles = getCompatibleStylingStrategies(ts);
                      onStateChange({ 
                        timeSignature: ts,
                        stylingStrategy: compatibleStyles.length > 0 ? compatibleStyles[0] : state.stylingStrategy,
                      });
                    }
                  }}
                  disabled={lockedOptions.timeSignature}
                >
                  {tsString}
                </button>
              );
            })}
          </div>
        </div>

        {/* Styling with Visual Previews */}
        <div className="control-section">
          <div className="control-section-header">
            <label className="control-section-label">Styling</label>
            <button
              className={`control-section-lock ${lockedOptions.stylingStrategy ? 'locked' : ''}`}
              onClick={() => onLockChange('stylingStrategy', !lockedOptions.stylingStrategy)}
              title={lockedOptions.stylingStrategy ? 'Unlock' : 'Lock'}
            >
              <span className="material-symbols-outlined">
                {lockedOptions.stylingStrategy ? 'lock' : 'lock_open'}
              </span>
            </button>
          </div>
          <div className="style-preview-grid">
            {compatibleStyles.map(strategy => {
              const config = CHORD_STYLING_STRATEGIES[strategy];
              const isSelected = state.stylingStrategy === strategy;
              return (
                <div
                  key={strategy}
                  className={`style-preview-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    if (!lockedOptions.stylingStrategy) {
                      onStateChange({ stylingStrategy: strategy });
                    }
                  }}
                  style={{ cursor: lockedOptions.stylingStrategy ? 'not-allowed' : 'pointer', opacity: lockedOptions.stylingStrategy && !isSelected ? 0.5 : 1 }}
                >
                  <div className="style-preview-visual">
                    <ChordStylePreview
                      strategy={strategy}
                      timeSignature={state.timeSignature}
                      width={120}
                      height={75}
                    />
                  </div>
                  <div className="style-preview-label">{config.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tempo Modal - only one that needs a modal for number input */}
      {editingOption === 'tempo' && (
        <div className="option-modal-overlay" onClick={() => setEditingOption(null)}>
          <div className="option-modal" onClick={(e) => e.stopPropagation()}>
            <div className="option-modal-header">
              <h3>Set Tempo</h3>
              <button className="option-modal-close" onClick={() => setEditingOption(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="option-modal-content">
              <input
                type="number"
                min="60"
                max="200"
                value={state.tempo}
                onChange={(e) => {
                  const tempo = parseInt(e.target.value);
                  if (!isNaN(tempo) && tempo >= 60 && tempo <= 200) {
                    onStateChange({ tempo });
                  }
                }}
                className="option-modal-input"
                autoFocus
              />
              <div className="option-modal-actions">
                <button onClick={() => setEditingOption(null)} className="option-modal-button">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default ManualControls;
