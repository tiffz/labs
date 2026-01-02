/**
 * Manual controls for chord progression generator
 * Chip-based inline editing interface
 */

import React, { useMemo, useEffect } from 'react';
import type { ChordProgressionState, Key, TimeSignature, LockedOptions } from '../types';
import { COMMON_CHORD_PROGRESSIONS } from '../data/chordProgressions';
import { CHORD_STYLING_STRATEGIES } from '../data/chordStylingStrategies';
import { ALL_KEYS, randomChordProgression, randomKey, randomTempo } from '../utils/randomization';
import { getCompatibleStylingStrategies } from '../utils/stylingCompatibility';
import { transposeKeyUp, transposeKeyDown } from '../utils/keyTransposition';
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

        <div className="option-chip-row">
          <span className="option-chip-label">Key:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <div style={{ flex: 1 }}>
              <OptionChip
                label="Key"
                value={state.key}
                isLocked={lockedOptions.key || false}
                tooltip="The key signature for the chord progression"
                options={ALL_KEYS.map(key => ({ value: key, label: key }))}
                onSelect={(value) => onStateChange({ key: value as Key })}
                onLockToggle={() => onLockChange('key', !lockedOptions.key)}
                onRandomize={handleRandomizeKey}
                hideLabel={true}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', flexShrink: 0 }}>
              <button
                className="key-transpose-button"
                onClick={() => {
                  if (!lockedOptions.key) {
                    onStateChange({ key: transposeKeyDown(state.key) });
                  }
                }}
                disabled={lockedOptions.key}
                title="Transpose down one semitone"
                aria-label="Transpose down"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
              <button
                className="key-transpose-button"
                onClick={() => {
                  if (!lockedOptions.key) {
                    onStateChange({ key: transposeKeyUp(state.key) });
                  }
                }}
                disabled={lockedOptions.key}
                title="Transpose up one semitone"
                aria-label="Transpose up"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>
        </div>

        <OptionChip
          label="Tempo"
          value={`${state.tempo}`}
          isLocked={lockedOptions.tempo || false}
          tooltip="Beats per minute (BPM)"
          inlineEdit={true}
          inlineType="number"
          inlineMin={60}
          inlineMax={200}
          onInlineChange={(newValue) => {
            const tempo = parseInt(newValue, 10);
            if (!isNaN(tempo) && tempo >= 60 && tempo <= 200) {
              onStateChange({ tempo });
            }
          }}
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
                      width={140}
                      height={80}
                    />
                  </div>
                  <div className="style-preview-label">{config.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>


    </>
  );
};

export default ManualControls;
