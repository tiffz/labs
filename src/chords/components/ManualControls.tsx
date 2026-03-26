/**
 * Manual controls for chord progression generator
 * Chip-based inline editing interface
 */

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import type {
  ChordProgressionState,
  Key,
  TimeSignature,
  LockedOptions,
  RomanNumeral,
} from '../types';
import { COMMON_CHORD_PROGRESSIONS } from '../data/chordProgressions';
import { CHORD_STYLING_STRATEGIES } from '../data/chordStylingStrategies';
import {
  randomChordProgression,
  randomKey,
  randomTempo,
  randomMeasuresPerChord,
} from '../utils/randomization';
import { getCompatibleStylingStrategies } from '../utils/stylingCompatibility';
import OptionChip from './OptionChip';
import ChordStylePreview from './ChordStylePreview';
import { parseProgressionText } from '../../shared/music/chordProgressionText';
import AppTooltip from '../../shared/components/AppTooltip';
import DiceIcon from '../../shared/components/DiceIcon';
import BpmInput from '../../shared/components/music/BpmInput';
import ChordProgressionInput from '../../shared/components/music/ChordProgressionInput';
import KeyInput from '../../shared/components/music/KeyInput';

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
  Object.values(CHORD_STYLING_STRATEGIES).forEach((config) => {
    config.compatibleTimeSignatures.forEach((ts) => {
      timeSigs.add(`${ts.numerator}/${ts.denominator}`);
    });
  });
  return Array.from(timeSigs)
    .map((str) => {
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
  const [customProgressionInput, setCustomProgressionInput] = useState<string>(
    state.progression.progression.join('–')
  );
  const [customProgressionError, setCustomProgressionError] =
    useState<string>('');

  const [customProgressionWarning, setCustomProgressionWarning] =
    useState<string>('');

  const handleRandomizeProgression = () => {
    const next = randomChordProgression();
    onStateChange({ progression: next });
    setCustomProgressionInput(next.progression.join('–'));
    setCustomProgressionError('');
    setCustomProgressionWarning('');
  };

  const handleRandomizeKey = () => {
    onStateChange({ key: randomKey() });
  };

  const handleRandomizeTempo = () => {
    onStateChange({ tempo: randomTempo() });
  };

  const handleRandomizeMeasuresPerChord = () => {
    onStateChange({ measuresPerChord: randomMeasuresPerChord() });
  };

  // Get available time signatures
  const availableTimeSignatures = useMemo(
    () => getAvailableTimeSignatures(),
    []
  );

  // Get compatible styling strategies for current time signature
  const compatibleStyles = useMemo(() => {
    return getCompatibleStylingStrategies(state.timeSignature);
  }, [state.timeSignature]);

  const applyCustomProgression = useCallback((inputOverride?: string) => {
    const trimmed = (inputOverride ?? customProgressionInput).trim();
    const presetByName = COMMON_CHORD_PROGRESSIONS.find(
      (progression) =>
        progression.name.toLowerCase() === trimmed.toLowerCase()
    );
    const normalizedInput = presetByName
      ? presetByName.progression.join('–')
      : trimmed;
    const parsed = parseProgressionText(normalizedInput, state.key);
    if (!parsed.isValid || parsed.tokens.length < 1) {
      setCustomProgressionError(
        'Use I–V–vi–IV or C–G–Am–F with at least 1 chord.'
      );
      setCustomProgressionWarning('');
      return;
    }
    if (parsed.format === 'chord' && parsed.romanNumerals.length < 1) {
      setCustomProgressionError(
        'Could not map this chord progression to scale degrees. Try roman numerals (I–V–vi–IV).'
      );
      setCustomProgressionWarning('');
      return;
    }
    if (parsed.format === 'chord' && parsed.romanNumerals.length < parsed.tokens.length) {
      setCustomProgressionWarning(
        'Format is valid, but some chords were approximated to diatonic scale degrees.'
      );
    } else {
      setCustomProgressionWarning('');
    }
    const presetMatch = COMMON_CHORD_PROGRESSIONS.find(
      (progression) =>
        progression.progression.length === parsed.romanNumerals.length &&
        progression.progression.every(
          (token, index) => token === parsed.romanNumerals[index]
        )
    );
    const nextProgression = {
      name: presetMatch?.name ?? 'Custom progression',
      description: presetMatch?.description,
      progression: parsed.romanNumerals as RomanNumeral[],
    };
    const updates: Partial<ChordProgressionState> = {
      progression: nextProgression,
    };
    if (parsed.inferredKey) {
      updates.key = parsed.inferredKey;
    }
    onStateChange(updates);
    setCustomProgressionError('');
    setCustomProgressionInput(normalizedInput);
  }, [customProgressionInput, onStateChange, state.key]);

  // Ensure current styling strategy is compatible, if not switch to first compatible one
  useEffect(() => {
    if (!compatibleStyles.includes(state.stylingStrategy)) {
      if (compatibleStyles.length > 0) {
        onStateChange({ stylingStrategy: compatibleStyles[0] });
      }
    }
  }, [
    state.timeSignature,
    state.stylingStrategy,
    compatibleStyles,
    onStateChange,
  ]);

  useEffect(() => {
    if (state.progression.name !== 'Custom progression') {
      setCustomProgressionInput(state.progression.progression.join('–'));
    }
    setCustomProgressionError('');
    setCustomProgressionWarning('');
  }, [state.progression]);

  return (
    <>
      <div className="manual-controls">
        {/* Randomize button at top - always first */}
        <div className="randomize-section">
          <button onClick={onRandomize} className="randomize-button-large">
            Randomize
          </button>
        </div>

        <div className="option-chip-row">
          <span className="option-chip-label">Progression:</span>
          <div className="option-chip-container">
            <div className={`option-chip ${lockedOptions.progression ? 'locked' : ''}`}>
              <ChordProgressionInput
                value={customProgressionInput}
                onChange={(next) => {
                  setCustomProgressionInput(next);
                  setCustomProgressionError('');
                  setCustomProgressionWarning('');
                }}
                onCommit={applyCustomProgression}
                presets={COMMON_CHORD_PROGRESSIONS}
                selectedPresetIndex={COMMON_CHORD_PROGRESSIONS.findIndex(
                  (progression) => progression.progression.join('–') === customProgressionInput
                )}
                onSelectPreset={(index) => {
                  const preset = COMMON_CHORD_PROGRESSIONS[index];
                  if (!preset) return;
                  const value = preset.progression.join('–');
                  setCustomProgressionInput(value);
                  setCustomProgressionError('');
                  setCustomProgressionWarning('');
                  onStateChange({ progression: preset });
                }}
                keyContext={state.key}
                showResolvedForKey
                className="option-chip-inline-progression"
                inputClassName="option-chip-inline-input"
                dropdownClassName="option-chip-dropdown"
                appearance="chords"
                presetColumns={1}
                disabled={lockedOptions.progression}
              />
              <div className="option-chip-actions">
                <AppTooltip title="Randomize progression">
                  <button
                    className="option-chip-dice"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRandomizeProgression();
                    }}
                    disabled={lockedOptions.progression}
                    aria-label="Randomize progression"
                  >
                    <DiceIcon variant="single" size={14} />
                  </button>
                </AppTooltip>
                <AppTooltip
                  title={
                    lockedOptions.progression
                      ? 'Unlock to allow randomization'
                      : 'Lock to prevent randomization'
                  }
                >
                  <button
                    className="option-chip-lock"
                    onClick={(event) => {
                      event.stopPropagation();
                      onLockChange('progression', !lockedOptions.progression);
                    }}
                    aria-label={lockedOptions.progression ? 'Unlock progression' : 'Lock progression'}
                  >
                    <span className="material-symbols-outlined">
                      {lockedOptions.progression ? 'lock' : 'lock_open'}
                    </span>
                  </button>
                </AppTooltip>
              </div>
            </div>
          </div>
        </div>
        {customProgressionError ? (
          <p className="chord-custom-error">{customProgressionError}</p>
        ) : null}
        {!customProgressionError && customProgressionWarning ? (
          <p className="chord-custom-warning">{customProgressionWarning}</p>
        ) : null}

        <div className="option-chip-row">
          <span className="option-chip-label">Key:</span>
          <div className="option-chip-container">
            <div className={`chords-key-shell ${lockedOptions.key ? 'locked' : ''}`}>
              <KeyInput
                value={state.key}
                onChange={(next) => onStateChange({ key: next as Key })}
                disabled={lockedOptions.key}
                className="chords-key-input"
                dropdownClassName="chords-key-dropdown"
                showStepButtons
                trailingActions={(
                  <>
                    <AppTooltip title="Randomize key">
                      <button
                        type="button"
                        className="option-chip-dice"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRandomizeKey();
                        }}
                        disabled={lockedOptions.key}
                        aria-label="Randomize key"
                      >
                        <DiceIcon variant="single" size={14} />
                      </button>
                    </AppTooltip>
                    <AppTooltip
                      title={
                        lockedOptions.key
                          ? 'Unlock to allow randomization'
                          : 'Lock to prevent randomization'
                      }
                    >
                      <button
                        className="option-chip-lock"
                        onClick={(event) => {
                          event.stopPropagation();
                          onLockChange('key', !lockedOptions.key);
                        }}
                        aria-label={lockedOptions.key ? 'Unlock key' : 'Lock key'}
                      >
                        <span className="material-symbols-outlined">
                          {lockedOptions.key ? 'lock' : 'lock_open'}
                        </span>
                      </button>
                    </AppTooltip>
                  </>
                )}
              />
            </div>
          </div>
        </div>

        <div className="option-chip-row">
          <span className="option-chip-label">Tempo:</span>
          <div className="option-chip-container">
            <div className={`chords-tempo-shell ${lockedOptions.tempo ? 'locked' : ''}`}>
              <BpmInput
                value={state.tempo}
                onChange={(next) => {
                  const tempo = Math.max(20, Math.min(300, Math.round(next)));
                  onStateChange({ tempo });
                }}
                min={20}
                max={300}
                disabled={lockedOptions.tempo}
                className="chords-bpm-input"
                dropdownClassName="chords-bpm-dropdown"
                sliderClassName="chords-bpm-slider"
                dropdownOffsetPx={20}
                trailingActions={(
                  <>
                    <AppTooltip title="Randomize tempo">
                      <button
                        type="button"
                        className="option-chip-dice"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRandomizeTempo();
                        }}
                        disabled={lockedOptions.tempo}
                        aria-label="Randomize tempo"
                      >
                        <DiceIcon variant="single" size={14} />
                      </button>
                    </AppTooltip>
                    <AppTooltip
                      title={
                        lockedOptions.tempo
                          ? 'Unlock to allow randomization'
                          : 'Lock to prevent randomization'
                      }
                    >
                      <button
                        className="option-chip-lock"
                        onClick={(event) => {
                          event.stopPropagation();
                          onLockChange('tempo', !lockedOptions.tempo);
                        }}
                        aria-label={lockedOptions.tempo ? 'Unlock tempo' : 'Lock tempo'}
                      >
                        <span className="material-symbols-outlined">
                          {lockedOptions.tempo ? 'lock' : 'lock_open'}
                        </span>
                      </button>
                    </AppTooltip>
                  </>
                )}
              />
            </div>
          </div>
        </div>

        <OptionChip
          label="Measures per chord"
          value={`${state.measuresPerChord || 1}`}
          isLocked={lockedOptions.measuresPerChord || false}
          tooltip="Number of measures each chord spans (1-4)"
          inlineEdit={true}
          inlineType="number"
          inlineMin={1}
          inlineMax={4}
          onInlineChange={(newValue) => {
            const measuresPerChord = parseInt(newValue, 10);
            if (
              !isNaN(measuresPerChord) &&
              measuresPerChord >= 1 &&
              measuresPerChord <= 4
            ) {
              onStateChange({ measuresPerChord });
            }
          }}
          onLockToggle={() =>
            onLockChange('measuresPerChord', !lockedOptions.measuresPerChord)
          }
          onRandomize={handleRandomizeMeasuresPerChord}
        />

        {/* Time Signature Tabs */}
        <div className="control-section">
          <div className="control-section-header">
            <label className="control-section-label">Time Signature</label>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <AppTooltip title="Randomize time signature">
                <button
                  className="control-section-randomize"
                  onClick={() => {
                  if (!lockedOptions.timeSignature) {
                    // If styling is locked, only randomize compatible time signatures
                    let availableTimeSigs = availableTimeSignatures;
                    if (lockedOptions.stylingStrategy) {
                      // Get time signatures compatible with the locked styling strategy
                      const strategyConfig =
                        CHORD_STYLING_STRATEGIES[state.stylingStrategy];
                      const compatibleTimeSigs =
                        strategyConfig.compatibleTimeSignatures;
                      availableTimeSigs = availableTimeSignatures.filter((ts) =>
                        compatibleTimeSigs.some(
                          (compatTs) =>
                            compatTs.numerator === ts.numerator &&
                            compatTs.denominator === ts.denominator
                        )
                      );
                    }
                    if (availableTimeSigs.length > 0) {
                      const randomTs =
                        availableTimeSigs[
                          Math.floor(Math.random() * availableTimeSigs.length)
                        ];
                      const compatibleStyles =
                        getCompatibleStylingStrategies(randomTs);
                      onStateChange({
                        timeSignature: randomTs,
                        stylingStrategy: lockedOptions.stylingStrategy
                          ? state.stylingStrategy
                          : compatibleStyles.length > 0
                            ? compatibleStyles[0]
                            : state.stylingStrategy,
                      });
                    }
                  }
                  }}
                  disabled={lockedOptions.timeSignature}
                  aria-label="Randomize time signature"
                >
                  <DiceIcon variant="single" size={14} />
                </button>
              </AppTooltip>
              <AppTooltip
                title={
                  lockedOptions.timeSignature
                    ? 'Unlock to allow randomization'
                    : 'Lock to prevent randomization'
                }
              >
                <button
                  className={`control-section-lock ${lockedOptions.timeSignature ? 'locked' : ''}`}
                  onClick={() =>
                    onLockChange('timeSignature', !lockedOptions.timeSignature)
                  }
                  aria-label={lockedOptions.timeSignature ? 'Unlock time signature' : 'Lock time signature'}
                >
                  <span className="material-symbols-outlined">
                    {lockedOptions.timeSignature ? 'lock' : 'lock_open'}
                  </span>
                </button>
              </AppTooltip>
            </div>
          </div>
          <div className="time-signature-tabs">
            {availableTimeSignatures.map((ts) => {
              const tsString = `${ts.numerator}/${ts.denominator}`;
              const isActive =
                state.timeSignature.numerator === ts.numerator &&
                state.timeSignature.denominator === ts.denominator;
              return (
                <button
                  key={tsString}
                  className={`time-signature-tab ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (!isActive && !lockedOptions.timeSignature) {
                      const compatibleStyles =
                        getCompatibleStylingStrategies(ts);
                      onStateChange({
                        timeSignature: ts,
                        stylingStrategy:
                          compatibleStyles.length > 0
                            ? compatibleStyles[0]
                            : state.stylingStrategy,
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
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <AppTooltip title="Randomize styling">
                <button
                  className="control-section-randomize"
                  onClick={() => {
                  if (
                    !lockedOptions.stylingStrategy &&
                    compatibleStyles.length > 0
                  ) {
                    const randomStyle =
                      compatibleStyles[
                        Math.floor(Math.random() * compatibleStyles.length)
                      ];
                    onStateChange({ stylingStrategy: randomStyle });
                  }
                  }}
                  disabled={lockedOptions.stylingStrategy}
                  aria-label="Randomize styling"
                >
                  <DiceIcon variant="single" size={14} />
                </button>
              </AppTooltip>
              <AppTooltip
                title={
                  lockedOptions.stylingStrategy
                    ? 'Unlock to allow randomization'
                    : 'Lock to prevent randomization'
                }
              >
                <button
                  className={`control-section-lock ${lockedOptions.stylingStrategy ? 'locked' : ''}`}
                  onClick={() =>
                    onLockChange(
                      'stylingStrategy',
                      !lockedOptions.stylingStrategy
                    )
                  }
                  aria-label={lockedOptions.stylingStrategy ? 'Unlock styling' : 'Lock styling'}
                >
                  <span className="material-symbols-outlined">
                    {lockedOptions.stylingStrategy ? 'lock' : 'lock_open'}
                  </span>
                </button>
              </AppTooltip>
            </div>
          </div>
          <div className="style-preview-grid">
            {compatibleStyles.map((strategy) => {
              const config = CHORD_STYLING_STRATEGIES[strategy];
              const isSelected = state.stylingStrategy === strategy;
              return (
                <div
                  key={strategy}
                  className={`style-preview-item ${isSelected ? 'selected' : ''}`}
                  role="button"
                  tabIndex={lockedOptions.stylingStrategy ? -1 : 0}
                  aria-label={`Choose ${config.name} chord style`}
                  onClick={() => {
                    if (!lockedOptions.stylingStrategy) {
                      onStateChange({ stylingStrategy: strategy });
                    }
                  }}
                  onKeyDown={(event) => {
                    if (lockedOptions.stylingStrategy) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onStateChange({ stylingStrategy: strategy });
                    }
                  }}
                  style={{
                    cursor: lockedOptions.stylingStrategy
                      ? 'not-allowed'
                      : 'pointer',
                    opacity:
                      lockedOptions.stylingStrategy && !isSelected ? 0.5 : 1,
                  }}
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
