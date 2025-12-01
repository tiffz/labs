import React, { useEffect, useRef } from 'react';
import type { PlaybackSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';
import SettingsHelpTooltip from './SettingsHelpTooltip';

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
  const [position, setPosition] = React.useState<React.CSSProperties>({});

  // Simplified positioning: button is always on right edge, so always right-align dropdown
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const calculatePosition = () => {
      const buttonRect = buttonRef.current!.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8;
      const dropdownWidth = 380;
      const dropdownHeight = 500;
      
      // Always right-align: dropdown's right edge aligns with button's right edge
      // Calculate right position from viewport edge to button's right edge
      const rightPos = viewportWidth - buttonRect.right;
      
      // Ensure dropdown doesn't overflow left edge of viewport
      // If dropdown would extend past left edge, constrain it
      const maxRightPos = viewportWidth - dropdownWidth - padding;
      const finalRightPos = Math.min(rightPos, maxRightPos);
      
      // Vertical positioning: prefer below, fallback to above
      const spaceBelow = viewportHeight - buttonRect.bottom - padding;
      const spaceAbove = buttonRect.top - padding;
      
      let topPos: number;
      let maxHeight: number;
      
      if (spaceBelow >= 200) {
        topPos = buttonRect.bottom + 8;
        maxHeight = Math.min(dropdownHeight, spaceBelow);
      } else if (spaceAbove >= 200) {
        topPos = buttonRect.top - Math.min(dropdownHeight, spaceAbove) - 8;
        maxHeight = Math.min(dropdownHeight, spaceAbove);
      } else {
        // Limited space - use available space
        if (spaceBelow > spaceAbove) {
          topPos = buttonRect.bottom + 8;
          maxHeight = Math.max(200, spaceBelow);
        } else {
          topPos = padding;
          maxHeight = Math.max(200, spaceAbove);
        }
      }
      
      // Ensure top position is valid
      topPos = Math.max(padding, topPos);
      maxHeight = Math.min(maxHeight, viewportHeight - topPos - padding);
      
      setPosition({
        position: 'fixed',
        right: `${finalRightPos}px`,
        top: `${topPos}px`,
        maxHeight: `${maxHeight}px`,
      });
    };

    // Calculate position after a brief delay to ensure DOM is ready
    const timeoutId = setTimeout(calculatePosition, 0);
    
    // Recalculate on window resize and scroll
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isOpen, buttonRef]);

  // Close dropdown when clicking outside (but allow button to toggle)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Don't close if clicking the button (let it toggle via its onClick handler)
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }
      
      // Close if clicking outside both button and dropdown
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        onClose();
      }
    };

    // Use a slight delay to allow button's onClick to fire first
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
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

  const handleReverbStrengthChange = (value: number) => {
    onSettingsChange({
      ...settings,
      reverbStrength: Math.max(0, Math.min(100, value)),
    });
  };

  const handleResetToDefault = () => {
    onSettingsChange(DEFAULT_SETTINGS);
  };

  return (
    <div 
      className="settings-dropdown-container" 
      ref={dropdownRef}
      style={position}
    >
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
              <SettingsHelpTooltip
                ariaLabel="Help for measure accent volume"
                content={
                  <div className="tooltip-content">
                    <p>Volume for the first note of each measure (downbeat)</p>
                  </div>
                }
              >
                <span>Measure Accent Volume</span>
              </SettingsHelpTooltip>
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
          </div>

          <div className="settings-group">
            <label htmlFor="beat-group-accent-volume" className="settings-label">
              <SettingsHelpTooltip
                ariaLabel="Help for beat group accent volume"
                content={
                  <div className="tooltip-content">
                    <p>Volume for the first note of each beat group (for compound and asymmetric rhythms)</p>
                  </div>
                }
              >
                <span>Beat Group Accent Volume</span>
              </SettingsHelpTooltip>
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
          </div>

          <div className="settings-group">
            <label htmlFor="non-accent-volume" className="settings-label">
              <SettingsHelpTooltip
                ariaLabel="Help for non-accent volume"
                content={
                  <div className="tooltip-content">
                    <p>Volume for non-accented notes (cannot exceed accent volumes)</p>
                  </div>
                }
              >
                <span>Non-Accent Volume</span>
              </SettingsHelpTooltip>
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
          </div>

          <div className="settings-group">
            <label htmlFor="metronome-volume" className="settings-label">
              Metronome Volume
              <span className="settings-value">{settings.metronomeVolume}%</span>
            </label>
            <div className="settings-slider-wrapper">
              <input
                id="metronome-volume"
                type="range"
                min="0"
                max="100"
                value={settings.metronomeVolume}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  onSettingsChange({
                    ...settings,
                    metronomeVolume: Math.max(0, Math.min(100, value)),
                  });
                }}
                className="settings-slider"
                style={{
                  '--disabled-start': '100%',
                } as React.CSSProperties}
              />
            </div>
          </div>

          <div className="settings-group">
            <label htmlFor="reverb-strength" className="settings-label">
              <span>Reverb Strength</span>
              <span className="settings-value">{settings.reverbStrength}%</span>
            </label>
            <div className="settings-slider-wrapper">
              <input
                id="reverb-strength"
                type="range"
                min="0"
                max="100"
                value={settings.reverbStrength}
                onChange={(e) => handleReverbStrengthChange(parseInt(e.target.value, 10))}
                className="settings-slider"
                style={{
                  '--disabled-start': '100%',
                } as React.CSSProperties}
              />
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-checkbox-label">
              <input
                type="checkbox"
                checked={settings.emphasizeSimpleRhythms}
                onChange={(e) => handleEmphasizeSimpleRhythmsChange(e.target.checked)}
                className="settings-checkbox"
              />
              <SettingsHelpTooltip
                ariaLabel="Help for emphasize simple rhythms"
                content={
                  <div className="tooltip-content">
                    <p>When enabled, accents beat groups in /4 rhythms.</p>
                  </div>
                }
              >
                <span>Emphasize beats in simple rhythms</span>
              </SettingsHelpTooltip>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;

