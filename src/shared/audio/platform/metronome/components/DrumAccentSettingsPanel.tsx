import AppSlider from '../../../../components/AppSlider';
import type { AccentMixState } from '../../mix/LabsAudioMixBus';

export type DrumAccentSettingsPanelProps = {
  accent: AccentMixState;
  onChange: (next: AccentMixState) => void;
  emphasizeSimpleRhythms?: boolean;
  onEmphasizeSimpleRhythmsChange?: (checked: boolean) => void;
  reverbStrength?: number;
  onReverbStrengthChange?: (value: number) => void;
  appearance?: string;
};

/**
 * Shared accent + reverb controls — replaces Drums SettingsMenu accent rows and Words custom sliders.
 */
export default function DrumAccentSettingsPanel({
  accent,
  onChange,
  emphasizeSimpleRhythms,
  onEmphasizeSimpleRhythmsChange,
  reverbStrength,
  onReverbStrengthChange,
  appearance = 'default',
}: DrumAccentSettingsPanelProps) {
  const patch = (partial: Partial<AccentMixState>) => onChange({ ...accent, ...partial });

  const handleNonAccentVolumeChange = (value: number) => {
    const maxAllowed = Math.min(accent.measureAccentVolume, accent.beatGroupAccentVolume);
    patch({ nonAccentVolume: Math.max(0, Math.min(value, maxAllowed)) });
  };

  const handleMeasureAccentChange = (value: number) => {
    const newValue = Math.max(0, Math.min(100, value));
    patch({
      measureAccentVolume: newValue,
      beatGroupAccentVolume: Math.min(accent.beatGroupAccentVolume, newValue),
      nonAccentVolume: Math.min(accent.nonAccentVolume, newValue),
    });
  };

  const handleBeatGroupAccentChange = (value: number) => {
    const constrained = Math.min(value, accent.measureAccentVolume);
    patch({
      beatGroupAccentVolume: Math.max(0, constrained),
      nonAccentVolume: Math.min(accent.nonAccentVolume, constrained),
    });
  };

  return (
    <div
      className={`labs-drum-accent-panel labs-drum-accent-panel--${appearance}`}
      role="group"
      aria-label="Drum accent settings"
    >
      <label className="labs-drum-accent-panel__row">
        <span>Measure accent</span>
        <AppSlider
          min={0}
          max={100}
          value={accent.measureAccentVolume}
          onChange={(e) => handleMeasureAccentChange(parseFloat(e.target.value))}
          aria-label="Measure accent volume"
        />
      </label>
      <label className="labs-drum-accent-panel__row">
        <span>Beat group accent</span>
        <AppSlider
          min={0}
          max={100}
          value={accent.beatGroupAccentVolume}
          onChange={(e) => handleBeatGroupAccentChange(parseFloat(e.target.value))}
          aria-label="Beat group accent volume"
        />
      </label>
      <label className="labs-drum-accent-panel__row">
        <span>Non-accent</span>
        <AppSlider
          min={0}
          max={100}
          value={accent.nonAccentVolume}
          onChange={(e) => handleNonAccentVolumeChange(parseFloat(e.target.value))}
          aria-label="Non-accent volume"
        />
      </label>
      {onEmphasizeSimpleRhythmsChange ? (
        <label className="labs-drum-accent-panel__checkbox">
          <input
            type="checkbox"
            checked={emphasizeSimpleRhythms ?? false}
            onChange={(e) => onEmphasizeSimpleRhythmsChange(e.target.checked)}
          />
          Emphasize simple rhythms
        </label>
      ) : null}
      {onReverbStrengthChange ? (
        <label className="labs-drum-accent-panel__row">
          <span>Reverb</span>
          <AppSlider
            min={0}
            max={100}
            value={reverbStrength ?? 0}
            onChange={(e) => onReverbStrengthChange(parseFloat(e.target.value))}
            aria-label="Reverb strength"
          />
        </label>
      ) : null}
    </div>
  );
}
