import AnchoredPopover from '../../shared/components/AnchoredPopover';
import BeatMixerChannel from './BeatMixerChannel';

type BeatVolumeMixerPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  isYouTube: boolean;
  audioVolume: number;
  audioMuted: boolean;
  onAudioVolumeChange: (value: number) => void;
  onAudioMutedChange: (muted: boolean) => void;
  drumVolume: number;
  drumMuted: boolean;
  onDrumVolumeChange: (value: number) => void;
  onDrumMutedChange: (muted: boolean) => void;
  metronomeVolume: number;
  metronomeMuted: boolean;
  metronomeEnabled: boolean;
  onMetronomeVolumeChange: (value: number) => void;
  onMetronomeMutedChange: (muted: boolean) => void;
};

export default function BeatVolumeMixerPopover({
  open,
  anchorEl,
  onClose,
  isYouTube,
  audioVolume,
  audioMuted,
  onAudioVolumeChange,
  onAudioMutedChange,
  drumVolume,
  drumMuted,
  onDrumVolumeChange,
  onDrumMutedChange,
  metronomeVolume,
  metronomeMuted,
  metronomeEnabled,
  onMetronomeVolumeChange,
  onMetronomeMutedChange,
}: BeatVolumeMixerPopoverProps) {
  return (
    <AnchoredPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      placement="bottom-end"
      paperClassName="mixer-popover"
    >
      <div className="volume-mixer vertical">
        <BeatMixerChannel
          label="Video"
          icon="movie"
          volume={audioVolume}
          muted={audioMuted}
          onVolumeChange={onAudioVolumeChange}
          onMutedChange={onAudioMutedChange}
          sliderDisabled={isYouTube}
          muteDisabled={isYouTube}
          muteDisabledReason="YouTube volume is controlled in the player"
        />
        <BeatMixerChannel
          label="Drums"
          icon="music_cast"
          volume={drumVolume}
          muted={drumMuted}
          onVolumeChange={onDrumVolumeChange}
          onMutedChange={onDrumMutedChange}
        />
        <BeatMixerChannel
          label="Metronome"
          icon="timer"
          volume={metronomeVolume}
          muted={metronomeMuted}
          onVolumeChange={onMetronomeVolumeChange}
          onMutedChange={onMetronomeMutedChange}
          sliderDisabled={!metronomeEnabled}
          muteDisabled={!metronomeEnabled}
          muteDisabledReason="Turn on the metronome first"
        />
      </div>
    </AnchoredPopover>
  );
}
