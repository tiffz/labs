import React, { useState, useEffect, useRef } from 'react';
import type { TimeSignature } from '../types';
import type { PlaybackSettings } from '../types/settings';
import AppTooltip from '../../shared/components/AppTooltip';
import SettingsMenu from './SettingsMenu';
import { MetronomeSplitControl, useMetronomePreferences, type MetronomePreferences } from '../../shared/audio/platform/metronome';
import BpmInput from '../../shared/components/music/BpmInput';
import TimeSignatureInput from '../../shared/components/music/TimeSignatureInput';
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
  metronomePreferences?: MetronomePreferences;
  onMetronomePreferencesChange?: (prefs: MetronomePreferences) => void;
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
  metronomePreferences: metronomePreferencesProp,
  onMetronomePreferencesChange,
}) => {
  const internalMetronomePrefs = useMetronomePreferences({
    storageKey: metronomePreferencesProp ? undefined : 'drums-metronome-prefs',
    timeSignature: { numerator: timeSignature.numerator, denominator: timeSignature.denominator },
  });
  const preferences = metronomePreferencesProp ?? internalMetronomePrefs.preferences;
  const setPreferences = onMetronomePreferencesChange ?? internalMetronomePrefs.setPreferences;
  const [beatGroupingInput, setBeatGroupingInput] = useState<string>('');
  const [beatGroupingError, setBeatGroupingError] = useState<string>('');
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // Update beat grouping input when time signature changes
  useEffect(() => {
    const defaultGrouping = getDefaultBeatGrouping(timeSignature);
    setBeatGroupingInput(formatBeatGrouping(defaultGrouping));
    setBeatGroupingError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeSignature.numerator, timeSignature.denominator]);

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
            <span className="play-button__label">Play</span>
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
            <span className="stop-button__label">Stop</span>
          </button>
        )}
      </div>

      {/* Timing Controls */}
      <div className="timing-controls">
        <div className="timing-inputs shared-music-timing-row">
          <TimeSignatureInput
            value={timeSignature}
            onChange={onTimeSignatureChange}
            disabled={isPlaying}
            className="drums-shared-time-sig-input"
            dropdownClassName="drums-floating-menu drums-time-sig-dropdown"
          />
          <div className="bpm-control-inline">
            <BpmInput
              value={bpm}
              onChange={(next) => onBpmChange(Math.max(20, Math.min(300, Math.round(next))))}
              min={20}
              max={300}
              className="drums-shared-bpm-input"
              dropdownClassName="drums-floating-menu drums-bpm-dropdown"
              sliderClassName="drums-bpm-slider"
              leadingActions={<span className="drums-bpm-inline-label">BPM</span>}
            />
          </div>

          {(isCompoundTimeSignature(timeSignature) ||
            isAsymmetricTimeSignature(timeSignature) ||
            timeSignature.denominator === 16) && (
            <div className="beat-grouping-control-inline">
              <label htmlFor="beat-grouping-input" className="drums-beat-grouping-inline-label">
                Groups
              </label>
              <input
                id="beat-grouping-input"
                type="text"
                className={`beat-grouping-input ${beatGroupingError ? 'input-error' : ''}`}
                value={beatGroupingInput}
                onChange={handleBeatGroupingChange}
                onBlur={handleBeatGroupingBlur}
                disabled={isPlaying}
                placeholder="3+3+2"
                aria-label="Beat grouping"
                aria-invalid={beatGroupingError ? true : undefined}
                aria-describedby={beatGroupingError ? 'beat-grouping-error' : undefined}
                title={beatGroupingError || 'Enter beat grouping (e.g., 3+3+2)'}
              />
              <span className="beat-grouping-help">
                <AppTooltip
                  interactive
                  placement="bottom"
                  popperClassName="drums-help-tooltip"
                  title={
                    <>
                      <div className="tooltip-title">Beat Grouping</div>
                      <div className="tooltip-content">
                        <p>
                          <strong>Compound rhythms</strong> (ie: 6/8, 9/8, 12/8) are grouped into sets of 3 eighth
                          notes by default. For example, 12/8 defaults to 3+3+3+3.
                        </p>
                        <p>
                          <strong>Asymmetric rhythms</strong> (ie: 5/8, 7/8, 11/8) can have different groupings. For
                          example, 11/8 can be 3+3+3+2 or 2+3+3+3.
                        </p>
                        <p>You can adjust the grouping for any /8 or /16 time signature to create custom patterns.</p>
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
                >
                  <button className="help-button" type="button" aria-label="Help for beat grouping">
                    ?
                  </button>
                </AppTooltip>
              </span>
              {beatGroupingError ? (
                <div id="beat-grouping-error" className="beat-grouping-error-message" role="alert">
                  {beatGroupingError}
                </div>
              ) : null}
            </div>
          )}

        </div>
      </div>
      {/* Right-aligned controls group: Metronome + Settings */}
      <div className="right-controls-group">
        <MetronomeSplitControl
          enabled={metronomeEnabled}
          onToggle={() => onMetronomeToggle(!metronomeEnabled)}
          preferences={preferences}
          onPreferencesChange={setPreferences}
          timeSignature={{ numerator: timeSignature.numerator, denominator: timeSignature.denominator }}
          appearance="drums"
          toggleClassName="metronome-button"
          toggleActiveClassName="active"
        />

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
  );
};

export default PlaybackControls;

