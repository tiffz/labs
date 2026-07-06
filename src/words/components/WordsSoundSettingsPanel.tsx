import type { RefObject } from 'react';
import { useFocusMenuOnOpen } from '../../shared/a11y/useFocusMenuOnOpen';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { PlaybackSettings } from '../../shared/rhythm/types';
import type { SampledPianoLoadState } from '../../shared/music/sampledPianoLoadState';
import type { SoundType } from '../../shared/music/soundOptions';
import { PlaybackSoundSelect } from '../../shared/components/music/PlaybackSoundSelect';
import { PlaybackVolumeRow } from '../../shared/components/music/PlaybackVolumeRow';
import DarbukaTrainerIconLink from '../../shared/components/music/DarbukaTrainerIconLink';
import DrumAccompaniment from '../../shared/components/music/DrumAccompaniment';
import {
  WORDS_HOST_INPUT_DRUM_UX,
  WORDS_INLINE_DRUM_NOTATION_STYLE,
  WORDS_INLINE_DRUM_RANDOMIZE_BUTTON_CLASS,
  WORDS_INLINE_DRUM_TEMPLATE_BUTTON_CLASS,
} from '../utils/wordsInlineDrumUx';

export type WordsSoundSettingsPanelProps = {
  menuRef: RefObject<HTMLDivElement | null>;
  menuId?: string;
  masterVolume: number;
  onMasterVolumeChange: (value: number) => void;
  masterMuted: boolean;
  onMasterMutedToggle: () => void;
  drumsVolume: number;
  onDrumsVolumeChange: (value: number) => void;
  drumsMuted: boolean;
  onDrumsMutedToggle: () => void;
  playbackSettings: PlaybackSettings;
  onPlaybackSettingsChange: (updater: (previous: PlaybackSettings) => PlaybackSettings) => void;
  accentMuted: boolean;
  onAccentMutedToggle: () => void;
  metronomeMuted: boolean;
  onMetronomeMutedToggle: () => void;
  chordSoundType: SoundType;
  onChordSoundTypeChange: (value: SoundType) => void;
  sampledPianoLoad: SampledPianoLoadState;
  chordVolume: number;
  onChordVolumeChange: (value: number) => void;
  chordMuted: boolean;
  onChordMutedToggle: () => void;
  backingBeatEnabled: boolean;
  onBackingBeatEnabledChange: (enabled: boolean) => void;
  backingBeatVolume: number;
  onBackingBeatVolumeChange: (value: number) => void;
  backingBeatMuted: boolean;
  onBackingBeatMutedToggle: () => void;
  backingBeatUseTemplate: boolean;
  onBackingBeatUseTemplateChange: (useTemplate: boolean) => void;
  backingBeatNotation: string;
  onBackingBeatNotationChange: (notation: string) => void;
  backingFallbackTemplate: string;
  bpm: number;
  timeSignature: TimeSignature;
  metronomeEnabled: boolean;
  autoFollowPlayback: boolean;
  onAutoFollowPlaybackChange: (enabled: boolean) => void;
};

export default function WordsSoundSettingsPanel({
  menuRef,
  menuId = 'words-sound-settings-menu',
  masterVolume,
  onMasterVolumeChange,
  masterMuted,
  onMasterMutedToggle,
  drumsVolume,
  onDrumsVolumeChange,
  drumsMuted,
  onDrumsMutedToggle,
  playbackSettings,
  onPlaybackSettingsChange,
  accentMuted,
  onAccentMutedToggle,
  metronomeMuted,
  onMetronomeMutedToggle,
  chordSoundType,
  onChordSoundTypeChange,
  sampledPianoLoad,
  chordVolume,
  onChordVolumeChange,
  chordMuted,
  onChordMutedToggle,
  backingBeatEnabled,
  onBackingBeatEnabledChange,
  backingBeatVolume,
  onBackingBeatVolumeChange,
  backingBeatMuted,
  onBackingBeatMutedToggle,
  backingBeatUseTemplate,
  onBackingBeatUseTemplateChange,
  backingBeatNotation,
  onBackingBeatNotationChange,
  backingFallbackTemplate,
  bpm,
  timeSignature,
  metronomeEnabled,
  autoFollowPlayback,
  onAutoFollowPlaybackChange,
}: WordsSoundSettingsPanelProps) {
  useFocusMenuOnOpen(true, menuRef);

  return (
    <div
      ref={menuRef}
      id={menuId}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${menuId}-title`}
      className="labs-popover-surface words-dropdown-menu words-dropdown-sound"
    >
      <div className="words-dropdown-header">
        <strong id={`${menuId}-title`}>Sound settings</strong>
      </div>
      <PlaybackVolumeRow
        label="Master"
        volume={masterVolume}
        muted={masterMuted}
        onVolumeChange={onMasterVolumeChange}
        onMutedChange={(next) => {
          if (next !== masterMuted) onMasterMutedToggle();
        }}
        aria-label="Master volume"
      />
      <PlaybackVolumeRow
        label="Drums"
        volume={drumsVolume}
        muted={drumsMuted}
        onVolumeChange={onDrumsVolumeChange}
        onMutedChange={(next) => {
          if (next !== drumsMuted) onDrumsMutedToggle();
        }}
        aria-label="Drums volume"
      />
      <PlaybackVolumeRow
        label="Accent"
        volume={playbackSettings.measureAccentVolume}
        muted={accentMuted}
        onVolumeChange={(volume) =>
          onPlaybackSettingsChange((previous) => ({
            ...previous,
            measureAccentVolume: volume,
            beatGroupAccentVolume: Math.min(volume, previous.beatGroupAccentVolume),
          }))
        }
        onMutedChange={(next) => {
          if (next !== accentMuted) onAccentMutedToggle();
        }}
        aria-label="Accent volume"
      />
      <PlaybackVolumeRow
        label="Metronome"
        volume={playbackSettings.metronomeVolume}
        muted={metronomeMuted}
        onVolumeChange={(volume) =>
          onPlaybackSettingsChange((previous) => ({
            ...previous,
            metronomeVolume: volume,
          }))
        }
        onMutedChange={(next) => {
          if (next !== metronomeMuted) onMetronomeMutedToggle();
        }}
        aria-label="Metronome volume"
      />
      <div className="words-chord-settings">
        <div className="words-chord-sound-field">
          <span className="words-chord-sound-label">chord sound</span>
          <PlaybackSoundSelect
            appearance="words"
            value={chordSoundType}
            onChange={onChordSoundTypeChange}
            sampledPianoLoad={sampledPianoLoad}
            aria-label="Chord sound"
            triggerClassName="words-chord-sound-select"
          />
        </div>
        <PlaybackVolumeRow
          label="Chords"
          volume={chordVolume}
          muted={chordMuted}
          onVolumeChange={onChordVolumeChange}
          onMutedChange={(next) => {
            if (next !== chordMuted) onChordMutedToggle();
          }}
          aria-label="Chord volume"
        />
      </div>
      <div className="words-chord-settings">
        <label className="word-rhythm-toggle words-toggle-inline">
          <input
            type="checkbox"
            checked={backingBeatEnabled}
            onChange={(event) => onBackingBeatEnabledChange(event.target.checked)}
          />
          Add backing drums
        </label>
        {backingBeatEnabled ? (
          <>
            <PlaybackVolumeRow
              label="Backing"
              volume={backingBeatVolume}
              muted={backingBeatMuted}
              onVolumeChange={onBackingBeatVolumeChange}
              onMutedChange={(next) => {
                if (next !== backingBeatMuted) onBackingBeatMutedToggle();
              }}
              aria-label="Backing drum volume"
            />
            <label className="word-rhythm-toggle words-toggle-inline">
              <input
                type="checkbox"
                checked={backingBeatUseTemplate}
                onChange={(event) => onBackingBeatUseTemplateChange(event.target.checked)}
              />
              Use section templates
            </label>
            {!backingBeatUseTemplate ? (
              <>
                <label className="words-slider-row words-chord-row">
                  backing beat notation
                  <div className="words-chord-input-with-action">
                    <div className="words-template-input-only">
                      <input
                        className="words-template-input"
                        type="text"
                        value={backingBeatNotation}
                        onChange={(event) => onBackingBeatNotationChange(event.target.value)}
                        placeholder={backingFallbackTemplate}
                      />
                    </div>
                    <DarbukaTrainerIconLink
                      params={{
                        notation: backingBeatNotation || backingFallbackTemplate,
                        bpm,
                        timeSignature,
                        metronomeEnabled,
                      }}
                      className="words-template-edit-link"
                    />
                  </div>
                </label>
                <div className="words-inline-drum-panel">
                  <DrumAccompaniment
                    {...WORDS_HOST_INPUT_DRUM_UX}
                    bpm={bpm}
                    timeSignature={timeSignature}
                    isPlaying={false}
                    currentBeatTime={0}
                    currentBeat={0}
                    metronomeEnabled={metronomeEnabled}
                    notationValue={backingBeatNotation || backingFallbackTemplate}
                    onNotationValueChange={onBackingBeatNotationChange}
                    notationWidth={320}
                    notationStyle={WORDS_INLINE_DRUM_NOTATION_STYLE}
                    notationFrameClassName="words-template-preview words-section-template-preview"
                    templateButtonClassName={WORDS_INLINE_DRUM_TEMPLATE_BUTTON_CLASS}
                    randomizeButtonClassName={WORDS_INLINE_DRUM_RANDOMIZE_BUTTON_CLASS}
                  />
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </div>
      <label className="word-rhythm-toggle words-toggle-inline">
        <input
          type="checkbox"
          checked={autoFollowPlayback}
          onChange={(event) => onAutoFollowPlaybackChange(event.target.checked)}
        />
        auto-follow playback
      </label>
    </div>
  );
}
