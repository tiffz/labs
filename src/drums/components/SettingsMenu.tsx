import React, { useEffect, useRef } from 'react';
import type { PlaybackSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlaybackSettings;
  onSettingsChange: (settings: PlaybackSettings) => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  buttonRef,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;


  const handleNonAccentVolumeChange = (value: number) => {
    // Constrain non-accent volume to never exceed accent volumes
    const maxAllowed = Math.min(settings.measureAccentVolume, settings.beatGroupAccentVolume);
    const constrainedValue = Math.min(value, maxAllowed);
    onSettingsChange({
      ...settings,
      nonAccentVolume: Math.max(0, constrainedValue),
    });
  };

  const handleMeasureAccentChange = (value: number) => {
    const newValue = Math.max(0, Math.min(100, value));
    // If non-accent volume exceeds new measure accent, reduce it
    const constrainedNonAccent = Math.min(settings.nonAccentVolume, newValue);
    // If beat group accent exceeds new measure accent, reduce it
    const constrainedBeatGroup = Math.min(settings.beatGroupAccentVolume, newValue);
    onSettingsChange({
      ...settings,
      measureAccentVolume: newValue,
      beatGroupAccentVolume: constrainedBeatGroup,
      nonAccentVolume: constrainedNonAccent,
    });
  };

  const handleBeatGroupAccentChange = (value: number) => {
    // Constrain beat group accent to never exceed measure accent
    const maxAllowed = settings.measureAccentVolume;
    const constrainedValue = Math.min(value, maxAllowed);
    // If non-accent volume exceeds new beat group accent, reduce it
    const constrainedNonAccent = Math.min(settings.nonAccentVolume, constrainedValue);
    onSettingsChange({
      ...settings,
      beatGroupAccentVolume: Math.max(0, constrainedValue),
      nonAccentVolume: constrainedNonAccent,
    });
  };

  const handleEmphasizeSimpleRhythmsChange = (checked: boolean) => {
    onSettingsChange({
      ...settings,
      emphasizeSimpleRhythms: checked,
    });
  };

  const handleResetToDefault = () => {
    onSettingsChange(DEFAULT_SETTINGS);
  };

  return (
    <div className="settings-dropdown-container" ref={dropdownRef}>
      <div className="settings-dropdown">
        <div className="settings-header">
          <h3>Playback Settings</h3>
          <button
            type="button"
            onClick={handleResetToDefault}
            className="settings-reset-button"
            aria-label="Reset to default settings"
          >
            Reset
          </button>
        </div>
        <div className="settings-content">
          <div className="settings-group">
            <label htmlFor="measure-accent-volume" className="settings-label">
              Measure Accent Volume
              <span className="settings-value">{settings.measureAccentVolume}%</span>
            </label>
            <div className="settings-slider-wrapper">
              <input
                id="measure-accent-volume"
                type="range"
                min="0"
                max="100"
                value={settings.measureAccentVolume}
                onChange={(e) => handleMeasureAccentChange(parseInt(e.target.value, 10))}
                className="settings-slider"
                style={{
                  '--disabled-start': '100%',
                } as React.CSSProperties}
              />
            </div>
            <p className="settings-description">
              Volume for the first note of each measure (downbeat)
            </p>
          </div>

          <div className="settings-group">
            <label htmlFor="beat-group-accent-volume" className="settings-label">
              Beat Group Accent Volume
              <span className="settings-value">{settings.beatGroupAccentVolume}%</span>
            </label>
            <div className="settings-slider-wrapper">
              <input
                id="beat-group-accent-volume"
                type="range"
                min="0"
                max="100"
                value={settings.beatGroupAccentVolume}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  const maxAllowed = settings.measureAccentVolume;
                  if (value > maxAllowed) {
                    handleBeatGroupAccentChange(maxAllowed);
                  } else {
                    handleBeatGroupAccentChange(value);
                  }
                }}
                className="settings-slider"
                style={{
                  '--disabled-start': `${settings.measureAccentVolume}%`,
                } as React.CSSProperties}
              />
            </div>
            <p className="settings-description">
              Volume for the first note of each beat group (for compound and asymmetric rhythms)
            </p>
          </div>

          <div className="settings-group">
            <label htmlFor="non-accent-volume" className="settings-label">
              Non-Accent Volume
              <span className="settings-value">{settings.nonAccentVolume}%</span>
            </label>
            <div className="settings-slider-wrapper">
              <input
                id="non-accent-volume"
                type="range"
                min="0"
                max="100"
                value={settings.nonAccentVolume}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  const maxAllowed = Math.min(settings.measureAccentVolume, settings.beatGroupAccentVolume);
                  if (value > maxAllowed) {
                    handleNonAccentVolumeChange(maxAllowed);
                  } else {
                    handleNonAccentVolumeChange(value);
                  }
                }}
                className="settings-slider"
                style={{
                  '--disabled-start': `${Math.min(settings.measureAccentVolume, settings.beatGroupAccentVolume)}%`,
                } as React.CSSProperties}
              />
            </div>
            <p className="settings-description">
              Volume for non-accented notes (cannot exceed accent volumes)
            </p>
          </div>

          <div className="settings-group">
            <label className="settings-checkbox-label">
              <input
                type="checkbox"
                checked={settings.emphasizeSimpleRhythms}
                onChange={(e) => handleEmphasizeSimpleRhythmsChange(e.target.checked)}
                className="settings-checkbox"
              />
              <span>Emphasize beats in simple rhythms</span>
            </label>
            <p className="settings-description">
              When enabled, accents beat groups in /4 rhythms. When disabled, only the first beat of each measure is accented for a smoother sound.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;

