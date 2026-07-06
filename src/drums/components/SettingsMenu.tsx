import React from 'react';
import AnchoredPopover from '../../shared/components/AnchoredPopover';
import type { PlaybackSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';
import AppTooltip from '../../shared/components/AppTooltip';
import AppSlider from '../../shared/components/AppSlider';

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
  const handleNonAccentVolumeChange = (value: number) => {
    const maxAllowed = Math.min(settings.measureAccentVolume, settings.beatGroupAccentVolume);
    const constrainedValue = Math.min(value, maxAllowed);
    onSettingsChange({
      ...settings,
      nonAccentVolume: Math.max(0, constrainedValue),
    });
  };

  const handleMeasureAccentChange = (value: number) => {
    const newValue = Math.max(0, Math.min(100, value));
    const constrainedNonAccent = Math.min(settings.nonAccentVolume, newValue);
    const constrainedBeatGroup = Math.min(settings.beatGroupAccentVolume, newValue);
    onSettingsChange({
      ...settings,
      measureAccentVolume: newValue,
      beatGroupAccentVolume: constrainedBeatGroup,
      nonAccentVolume: constrainedNonAccent,
    });
  };

  const handleBeatGroupAccentChange = (value: number) => {
    const maxAllowed = settings.measureAccentVolume;
    const constrainedValue = Math.min(value, maxAllowed);
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
    <AnchoredPopover
      open={isOpen}
      onClose={onClose}
      anchorEl={buttonRef.current}
      placement="bottom-end"
      paperClassName="drums-floating-menu drums-settings-menu settings-dropdown-container"
    >
      <div className="settings-dropdown">
        <div className="drums-floating-menu__header">
          <h3 className="drums-floating-menu__title">Playback Settings</h3>
          <button
            type="button"
            onClick={handleResetToDefault}
            className="drums-floating-menu__header-action"
            aria-label="Reset to default settings"
          >
            Reset
          </button>
        </div>
        <div className="drums-floating-menu__body">
          <div className="settings-slider-row settings-group">
            <label htmlFor="measure-accent-volume" className="drums-floating-menu__field-label">
              <AppTooltip title="Volume for the first note of each measure (downbeat).">
                <span>Measure Accent Volume</span>
              </AppTooltip>
              <span className="drums-floating-menu__field-value">{settings.measureAccentVolume}%</span>
            </label>
            <div className="settings-slider-wrapper">
              <AppSlider
                id="measure-accent-volume"
                min={0}
                max={100}
                value={settings.measureAccentVolume}
                onChange={(e) => handleMeasureAccentChange(parseInt(e.target.value, 10))}
                className="settings-slider drums-floating-menu__slider"
                style={{
                  '--disabled-start': '100%',
                } as React.CSSProperties}
              />
            </div>
          </div>

          <div className="settings-slider-row settings-group">
            <label htmlFor="beat-group-accent-volume" className="drums-floating-menu__field-label">
              <AppTooltip title="Volume for the first note of each beat group (for compound and asymmetric rhythms).">
                <span>Beat Group Accent Volume</span>
              </AppTooltip>
              <span className="drums-floating-menu__field-value">{settings.beatGroupAccentVolume}%</span>
            </label>
            <div className="settings-slider-wrapper">
              <AppSlider
                id="beat-group-accent-volume"
                min={0}
                max={100}
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
                className="settings-slider drums-floating-menu__slider"
                style={{
                  '--disabled-start': `${settings.measureAccentVolume}%`,
                } as React.CSSProperties}
              />
            </div>
          </div>

          <div className="settings-slider-row settings-group">
            <label htmlFor="non-accent-volume" className="drums-floating-menu__field-label">
              <AppTooltip title="Volume for non-accented notes (cannot exceed accent volumes).">
                <span>Non-Accent Volume</span>
              </AppTooltip>
              <span className="drums-floating-menu__field-value">{settings.nonAccentVolume}%</span>
            </label>
            <div className="settings-slider-wrapper">
              <AppSlider
                id="non-accent-volume"
                min={0}
                max={100}
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
                className="settings-slider drums-floating-menu__slider"
                style={{
                  '--disabled-start': `${Math.min(settings.measureAccentVolume, settings.beatGroupAccentVolume)}%`,
                } as React.CSSProperties}
              />
            </div>
          </div>

          <div className="settings-slider-row settings-group">
            <label htmlFor="metronome-volume" className="drums-floating-menu__field-label">
              <span>Metronome Volume</span>
              <span className="drums-floating-menu__field-value">{settings.metronomeVolume}%</span>
            </label>
            <div className="settings-slider-wrapper">
              <AppSlider
                id="metronome-volume"
                min={0}
                max={100}
                value={settings.metronomeVolume}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  onSettingsChange({
                    ...settings,
                    metronomeVolume: Math.max(0, Math.min(100, value)),
                  });
                }}
                className="settings-slider drums-floating-menu__slider"
                style={{
                  '--disabled-start': '100%',
                } as React.CSSProperties}
              />
            </div>
          </div>

          <div className="settings-slider-row settings-group">
            <label htmlFor="reverb-strength" className="drums-floating-menu__field-label">
              <span>Reverb Strength</span>
              <span className="drums-floating-menu__field-value">{settings.reverbStrength}%</span>
            </label>
            <div className="settings-slider-wrapper">
              <AppSlider
                id="reverb-strength"
                min={0}
                max={100}
                value={settings.reverbStrength}
                onChange={(e) => handleReverbStrengthChange(parseInt(e.target.value, 10))}
                className="settings-slider drums-floating-menu__slider"
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
              <AppTooltip title="When enabled, accents beat groups in /4 rhythms.">
                <span>Emphasize beats in simple rhythms</span>
              </AppTooltip>
            </label>
          </div>

          <div className="settings-group">
            <label className="settings-checkbox-label">
              <input
                type="checkbox"
                checked={settings.autoScrollDuringPlayback}
                onChange={(e) => onSettingsChange({
                  ...settings,
                  autoScrollDuringPlayback: e.target.checked,
                })}
                className="settings-checkbox"
              />
              <AppTooltip title="When enabled, the page automatically scrolls to keep the currently playing note visible. Useful for long pieces.">
                <span>Auto-scroll during playback</span>
              </AppTooltip>
            </label>
          </div>
        </div>
      </div>
    </AnchoredPopover>
  );
};

export default SettingsMenu;
