import type { RefObject } from 'react';
import AppTooltip from '../../shared/components/AppTooltip';
import PlaybackSpeedControl from './PlaybackSpeedControl';
import SharedExportPopover from '../../shared/components/music/SharedExportPopover';
import type { ExportSourceAdapter } from '../../shared/music/exportTypes';
import BeatVolumeMixerPopover from './BeatVolumeMixerPopover';

export type BeatTransportControlsProps = {
  effectiveIsPlaying: boolean;
  onPlayPause: () => void;
  onSkipToStart: () => void;
  onSeekByMeasures: (delta: number) => void;
  onSkipToEnd: () => void;
  effectivePlaybackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  isYouTubeMedia: boolean;
  exportButtonRef: RefObject<HTMLButtonElement | null>;
  exportOpen: boolean;
  onExportOpen: () => void;
  onExportClose: () => void;
  exportAdapter: ExportSourceAdapter;
  loopEnabled: boolean;
  selectedSectionIds: string[];
  selectedAnalysisIds: string[];
  onLoopEntireTrack: () => void;
  onLoopSection: () => void;
  onLoopPlayThrough: () => void;
  mixerOpen: boolean;
  mixerAnchorRef: RefObject<HTMLButtonElement | null>;
  onToggleMixer: () => void;
  onCloseMixer: () => void;
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

export default function BeatTransportControls({
  effectiveIsPlaying,
  onPlayPause,
  onSkipToStart,
  onSeekByMeasures,
  onSkipToEnd,
  effectivePlaybackRate,
  onPlaybackRateChange,
  isYouTubeMedia,
  exportButtonRef,
  exportOpen,
  onExportOpen,
  onExportClose,
  exportAdapter,
  loopEnabled,
  selectedSectionIds,
  selectedAnalysisIds,
  onLoopEntireTrack,
  onLoopSection,
  onLoopPlayThrough,
  mixerOpen,
  mixerAnchorRef,
  onToggleMixer,
  onCloseMixer,
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
}: BeatTransportControlsProps) {
  return (
    <div className="transport-controls transport-controls-sticky">
      <div className="transport-row">
        <button className={`play-btn ${effectiveIsPlaying ? 'playing' : ''}`} onClick={onPlayPause}>
          <span className="material-symbols-outlined">{effectiveIsPlaying ? 'pause' : 'play_arrow'}</span>
        </button>
        <button className="nav-btn" onClick={onSkipToStart}>
          <span className="material-symbols-outlined">skip_previous</span>
        </button>
        <button className="nav-btn" onClick={() => onSeekByMeasures(-1)}>
          <span className="material-symbols-outlined">fast_rewind</span>
        </button>
        <button className="nav-btn" onClick={() => onSeekByMeasures(1)}>
          <span className="material-symbols-outlined">fast_forward</span>
        </button>
        <button className="nav-btn" onClick={onSkipToEnd}>
          <span className="material-symbols-outlined">skip_next</span>
        </button>
        <PlaybackSpeedControl
          value={effectivePlaybackRate}
          onChange={onPlaybackRateChange}
          variant="compact"
          className="shared-bpm-input beat-playback-speed-transport"
          dropdownClassName="beat-bpm-dropdown"
          sliderClassName="beat-bpm-slider"
        />
        <AppTooltip title={isYouTubeMedia ? 'Export not available for YouTube videos' : 'Export audio'}>
          <span>
            <button
              ref={exportButtonRef}
              className="nav-btn"
              onClick={onExportOpen}
              aria-label="Export audio"
              disabled={isYouTubeMedia}
            >
              <span className="material-symbols-outlined">download</span>
            </button>
          </span>
        </AppTooltip>
        <SharedExportPopover
          open={exportOpen}
          anchorEl={exportButtonRef.current}
          onClose={onExportClose}
          adapter={exportAdapter}
          persistKey="beat"
        />
        <div className="loop-options">
          <AppTooltip title="Play through">
            <label className={`loop-option has-tooltip ${!loopEnabled ? 'active' : ''}`}>
              <input type="radio" name="loopMode" checked={!loopEnabled} onChange={onLoopPlayThrough} />
              <span className="material-symbols-outlined">arrow_forward</span>
            </label>
          </AppTooltip>
          <AppTooltip title="Loop track">
            <label
              className={`loop-option has-tooltip ${
                loopEnabled && selectedSectionIds.length === 0 ? 'active' : ''
              }`}
            >
              <input
                type="radio"
                name="loopMode"
                checked={loopEnabled && selectedSectionIds.length === 0}
                onChange={onLoopEntireTrack}
              />
              <span className="material-symbols-outlined">repeat</span>
            </label>
          </AppTooltip>
          <AppTooltip title="Loop section">
            <label
              className={`loop-option has-tooltip ${
                loopEnabled && (selectedSectionIds.length > 0 || selectedAnalysisIds.length > 0)
                  ? 'active'
                  : ''
              }`}
            >
              <input
                type="radio"
                name="loopMode"
                checked={
                  loopEnabled &&
                  (selectedSectionIds.length > 0 || selectedAnalysisIds.length > 0)
                }
                onChange={onLoopSection}
              />
              <span className="material-symbols-outlined">repeat_one</span>
            </label>
          </AppTooltip>
        </div>
        <div className="mixer-anchor">
          <AppTooltip title="Volume mixer">
            <button
              ref={mixerAnchorRef}
              className="icon-btn subtle"
              onClick={onToggleMixer}
              aria-label="Volume mixer"
            >
              <span className="material-symbols-outlined">tune</span>
            </button>
          </AppTooltip>
        </div>
      </div>
      <BeatVolumeMixerPopover
        open={mixerOpen}
        anchorEl={mixerAnchorRef.current}
        onClose={onCloseMixer}
        isYouTube={isYouTube}
        audioVolume={audioVolume}
        audioMuted={audioMuted}
        onAudioVolumeChange={onAudioVolumeChange}
        onAudioMutedChange={onAudioMutedChange}
        drumVolume={drumVolume}
        drumMuted={drumMuted}
        onDrumVolumeChange={onDrumVolumeChange}
        onDrumMutedChange={onDrumMutedChange}
        metronomeVolume={metronomeVolume}
        metronomeMuted={metronomeMuted}
        metronomeEnabled={metronomeEnabled}
        onMetronomeVolumeChange={onMetronomeVolumeChange}
        onMetronomeMutedChange={onMetronomeMutedChange}
      />
    </div>
  );
}
