import React, { useState, useEffect, useRef } from 'react';
import type { TimeSignature } from '../types';
import type { PlaybackSettings } from '../types/settings';
import HelpTooltip from './HelpTooltip';
import SettingsMenu from './SettingsMenu';
import {
  isAsymmetricTimeSignature,
  isCompoundTimeSignature,
  getDefaultBeatGrouping,
  parseBeatGrouping,
  formatBeatGrouping,
  validateBeatGrouping,
} from '../utils/timeSignatureUtils';

interface PlaybackControlsProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  timeSignature: TimeSignature;
  onTimeSignatureChange: (timeSignature: TimeSignature) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  metronomeEnabled: boolean;
  onMetronomeToggle: (enabled: boolean) => void;
  onSettingsClick: () => void;
  showSettings?: boolean;
  playbackSettings?: PlaybackSettings;
  onSettingsChange?: (settings: PlaybackSettings) => void;
  onSettingsClose?: () => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  bpm,
  onBpmChange,
  timeSignature,
  onTimeSignatureChange,
  isPlaying,
  onPlay,
  onStop,
  metronomeEnabled,
  onMetronomeToggle,
  onSettingsClick,
  showSettings = false,
  playbackSettings,
  onSettingsChange,
  onSettingsClose,
}) => {
  const [beatGroupingInput, setBeatGroupingInput] = useState<string>('');
  const [beatGroupingError, setBeatGroupingError] = useState<string>('');
  const [showTimeSigDropdown, setShowTimeSigDropdown] = useState<boolean>(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const timeSigInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Common time signatures
  const commonTimeSignatures: TimeSignature[] = [
    { numerator: 2, denominator: 4 },
    { numerator: 3, denominator: 4 },
    { numerator: 4, denominator: 4 },
    { numerator: 5, denominator: 4 },
    { numerator: 6, denominator: 8 },
    { numerator: 7, denominator: 8 },
    { numerator: 9, denominator: 8 },
    { numerator: 11, denominator: 8 },
    { numerator: 12, denominator: 8 },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        timeSigInputRef.current &&
        !timeSigInputRef.current.contains(event.target as Node)
      ) {
        setShowTimeSigDropdown(false);
      }
    };

    if (showTimeSigDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTimeSigDropdown]);

  // Update beat grouping input when time signature changes
  useEffect(() => {
    const defaultGrouping = getDefaultBeatGrouping(timeSignature);
    setBeatGroupingInput(formatBeatGrouping(defaultGrouping));
    setBeatGroupingError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeSignature.numerator, timeSignature.denominator]);

  const handleNumeratorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      // Allow empty input while typing
      return;
    }
    const newNumerator = parseInt(value, 10);
    if (!isNaN(newNumerator) && newNumerator > 0 && newNumerator <= 32) {
      onTimeSignatureChange({
        ...timeSignature,
        numerator: newNumerator,
        beatGrouping: undefined, // Reset to default
      });
    }
  };

  const handleNumeratorBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    if (isNaN(num) || num < 1) {
      // Reset to current value if invalid
      e.target.value = timeSignature.numerator.toString();
    } else if (num > 32) {
      // Cap at 32
      onTimeSignatureChange({
        ...timeSignature,
        numerator: 32,
        beatGrouping: undefined,
      });
    }
  };

  const handleDenominatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDenominator = parseInt(e.target.value, 10);
    onTimeSignatureChange({
      ...timeSignature,
      denominator: newDenominator,
      beatGrouping: undefined, // Reset to default
    });
  };

  const handleBeatGroupingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBeatGroupingInput(value);
    // Clear error while typing
    setBeatGroupingError('');
  };

  const handleBeatGroupingBlur = () => {
    // Only validate on blur to avoid distracting the user while typing
    const parsed = parseBeatGrouping(beatGroupingInput);
    if (!parsed) {
      setBeatGroupingError('Invalid format. Use numbers separated by + (e.g., 3+3+2)');
      return;
    }

    if (!validateBeatGrouping(parsed, timeSignature)) {
      setBeatGroupingError(`Must add up to ${timeSignature.numerator}`);
      return;
    }

    // Valid grouping
    setBeatGroupingError('');
    onTimeSignatureChange({
      ...timeSignature,
      beatGrouping: parsed,
    });
  };

  return (
    <div className="playback-controls-bar">
      {/* Playback Controls - moved to front */}
      <div className="playback-buttons">
        {!isPlaying ? (
          <button
            className="play-button"
            onClick={onPlay}
            type="button"
            aria-label="Play rhythm (Spacebar)"
            title="Play (Spacebar)"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            Play
          </button>
        ) : (
          <button
            className="stop-button"
            onClick={onStop}
            type="button"
            aria-label="Stop playback (Spacebar)"
            title="Stop (Spacebar)"
          >
            <span className="material-symbols-outlined">stop</span>
            Stop
          </button>
        )}
      </div>

      {/* Timing Controls */}
      <div className="timing-controls">
        <div className="timing-inputs">
          <div className="time-signature-control" style={{ position: 'relative' }}>
            <label htmlFor="time-sig-numerator" className="sr-only">Time signature numerator</label>
            <input
              ref={timeSigInputRef}
              id="time-sig-numerator"
              type="number"
              className="control-input time-sig-numerator-input"
              value={timeSignature.numerator}
              onChange={handleNumeratorChange}
              onBlur={handleNumeratorBlur}
              onFocus={() => setShowTimeSigDropdown(true)}
              min="1"
              max="32"
              disabled={isPlaying}
              aria-label="Time signature numerator"
            />
            <span className="time-sig-slash">/</span>
            <select
              className="control-select"
              value={timeSignature.denominator}
              onChange={handleDenominatorChange}
              aria-label="Time signature denominator"
            >
              <option value="4">4</option>
              <option value="8">8</option>
            </select>
            {showTimeSigDropdown && (
              <div
                ref={dropdownRef}
                className="time-sig-dropdown"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '0.25rem',
                  backgroundColor: 'white',
                  border: '2px solid var(--border-color)',
                  borderRadius: '0.375rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  minWidth: '100%',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {commonTimeSignatures.map((ts) => (
                  <button
                    key={`${ts.numerator}/${ts.denominator}`}
                    type="button"
                    className="time-sig-dropdown-item"
                    onClick={() => {
                      onTimeSignatureChange({
                        ...ts,
                        beatGrouping: undefined, // Reset to default
                      });
                      setShowTimeSigDropdown(false);
                      timeSigInputRef.current?.blur();
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      textAlign: 'left',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      color: 'var(--text-color)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {ts.numerator}/{ts.denominator}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="bpm-control-inline">
            <label htmlFor="bpm-input" className="sr-only">BPM</label>
            <input
              id="bpm-input"
              type="number"
              className="control-input"
              value={bpm}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onBpmChange(120);
                } else {
                  const num = parseInt(val, 10);
                  if (!isNaN(num)) {
                    onBpmChange(num);
                  }
                }
              }}
              onBlur={(e) => {
                const num = parseInt(e.target.value, 10);
                if (isNaN(num) || num < 20) {
                  onBpmChange(20);
                } else if (num > 300) {
                  onBpmChange(300);
                }
              }}
              min="20"
              max="300"
              placeholder="BPM"
            />
            <span className="input-suffix">BPM</span>
          </div>
          
          {/* Beat Grouping Input for Compound and Asymmetric Time Signatures */}
          <div className="beat-grouping-control">
            {(isCompoundTimeSignature(timeSignature) || isAsymmetricTimeSignature(timeSignature)) && (
              <>
                <div className="beat-grouping-header">
                  <label htmlFor="beat-grouping-input" className="beat-grouping-label">
                    Beat Grouping
                  </label>
                  <HelpTooltip
                    ariaLabel="Help for beat grouping"
                    content={
                      <>
                        <div className="tooltip-title">Beat Grouping</div>
                        <div className="tooltip-content">
                          <p>
                            <strong>Compound rhythms</strong> (ie: 6/8, 9/8, 12/8) are grouped into sets of 3 eighth notes by default. 
                            For example, 12/8 defaults to 3+3+3+3.
                          </p>
                          <p>
                            <strong>Asymmetric rhythms</strong> (ie: 5/8, 7/8, 11/8) can have different groupings. 
                            For example, 11/8 can be 3+3+3+2 or 2+3+3+3.
                          </p>
                          <p>
                            You can adjust the grouping for any /8 time signature to create custom patterns.
                          </p>
                        </div>
                        <a 
                          href="https://en.wikipedia.org/wiki/Additive_rhythm_and_divisive_rhythm#Additive_rhythm" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="tooltip-link"
                        >
                          Learn more about additive rhythm →
                        </a>
                      </>
                    }
                  />
                </div>
                <input
                  id="beat-grouping-input"
                  type="text"
                  className={`beat-grouping-input ${beatGroupingError ? 'input-error' : ''}`}
                  value={beatGroupingInput}
                  onChange={handleBeatGroupingChange}
                  onBlur={handleBeatGroupingBlur}
                  disabled={isPlaying}
                  placeholder="e.g., 3+3+2"
                  title="Enter beat grouping (e.g., 3+3+2)"
                />
                <div className="input-error-message">{beatGroupingError || '\u00A0'}</div>
              </>
            )}
          </div>
          
          {/* Right-aligned controls group: Metronome + Settings */}
          <div className="right-controls-group">
            {/* Metronome Toggle */}
            <button
              className={`metronome-button ${metronomeEnabled ? 'active' : ''}`}
              onClick={() => onMetronomeToggle(!metronomeEnabled)}
              type="button"
              aria-label="Toggle metronome"
              title={metronomeEnabled ? 'Metronome: On' : 'Metronome: Off'}
            >
              <span className="metronome-label">Metronome</span>
            </button>

            {/* Settings Button */}
            <div className="settings-button-container">
              <button
                ref={settingsButtonRef}
                className="settings-button"
                onClick={onSettingsClick}
                type="button"
                aria-label="Open settings"
                title="Playback settings"
              >
                <span className="material-symbols-outlined">settings</span>
              </button>
              {showSettings && playbackSettings && onSettingsChange && onSettingsClose && (
                <SettingsMenu
                  isOpen={showSettings}
                  onClose={onSettingsClose}
                  settings={playbackSettings}
                  onSettingsChange={onSettingsChange}
                  buttonRef={settingsButtonRef}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaybackControls;

