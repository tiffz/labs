import AppLinearVolumeSlider from '../../shared/components/AppLinearVolumeSlider';
import AppTooltip from '../../shared/components/AppTooltip';

export type BeatMixerChannelProps = {
  label: string;
  icon: string;
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onMutedChange: (muted: boolean) => void;
  sliderDisabled?: boolean;
  muteDisabled?: boolean;
  muteDisabledReason?: string;
};

export default function BeatMixerChannel({
  label,
  icon,
  volume,
  muted,
  onVolumeChange,
  onMutedChange,
  sliderDisabled = false,
  muteDisabled = false,
  muteDisabledReason,
}: BeatMixerChannelProps) {
  const muteLabel = muted ? `Unmute ${label}` : `Mute ${label}`;
  const muteTooltip = muteDisabled
    ? (muteDisabledReason ?? `${label} mute not available`)
    : muted
      ? `${muteLabel} (restores ${volume}%)`
      : `${muteLabel} (keeps slider level)`;

  return (
    <div className={`mixer-row${muted ? ' mixer-row--muted' : ''}`}>
      <span className="mixer-label">
        <span className="material-symbols-outlined">{icon}</span>
        {label}
      </span>
      <AppTooltip title={muteTooltip}>
        <span className="mixer-mute-btn-wrap">
          <button
            type="button"
            className={`mixer-mute-btn${muted ? ' mixer-mute-btn--active' : ''}`}
            aria-label={muteLabel}
            aria-pressed={muted}
            disabled={muteDisabled}
            onClick={() => onMutedChange(!muted)}
          >
            <span className="material-symbols-outlined" aria-hidden>
              {muted ? 'volume_off' : 'volume_up'}
            </span>
          </button>
        </span>
      </AppTooltip>
      <AppLinearVolumeSlider
        min={0}
        max={100}
        step={1}
        value={volume}
        onChange={(_, value) => onVolumeChange(Number(value))}
        className="mixer-slider"
        disabled={sliderDisabled}
        aria-label={`${label} volume`}
      />
      <span className="mixer-value">{muted ? 'Muted' : `${volume}%`}</span>
    </div>
  );
}
