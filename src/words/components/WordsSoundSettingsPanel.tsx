import type { RefObject } from 'react';
import type { ParsedRhythm, TimeSignature } from '../../shared/rhythm/types';
import type { PlaybackSettings } from '../../shared/rhythm/types';
import type { SampledPianoLoadState } from '../../shared/music/sampledPianoLoadState';
import type { SoundType } from '../../shared/music/soundOptions';
import AppSlider from '../../shared/components/AppSlider';
import AppTooltip from '../../shared/components/AppTooltip';
import DiceIcon from '../../shared/components/DiceIcon';
import { PlaybackSoundSelect } from '../../shared/components/music/PlaybackSoundSelect';
import { PlaybackVolumeRow } from '../../shared/components/music/PlaybackVolumeRow';
import DrumNotationMini from '../../shared/notation/DrumNotationMini';
import { RhythmTemplateVariationControls } from '../../shared/notation/RhythmTemplateVariationControls';
import { volumeIconName } from '../utils/appRhythmHelpers';

type TemplatePreset = { id: string; label: string; notation: string };

export type WordsSoundSettingsPanelProps = {
  menuRef: RefObject<HTMLDivElement | null>;
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
  templatePresets: TemplatePreset[];
  backingSelectedTemplatePreset: TemplatePreset | null;
  onRandomizeBackingTemplate: (mode: 'preset' | 'full') => void;
  backingPatternRhythm: ParsedRhythm | null;
  backingTemplateVariations: readonly { notation: string; label: string }[];
  backingActiveVariationIndex: number;
  defaultTemplateNotation: string;
  bpm: number;
  timeSignature: TimeSignature;
  metronomeEnabled: boolean;
  autoFollowPlayback: boolean;
  onAutoFollowPlaybackChange: (enabled: boolean) => void;
};

export default function WordsSoundSettingsPanel({
  menuRef,
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
  templatePresets,
  backingSelectedTemplatePreset,
  onRandomizeBackingTemplate,
  backingPatternRhythm,
  backingTemplateVariations,
  backingActiveVariationIndex,
  defaultTemplateNotation,
  bpm,
  timeSignature,
  metronomeEnabled,
  autoFollowPlayback,
  onAutoFollowPlaybackChange,
}: WordsSoundSettingsPanelProps) {
  return (
    <div ref={menuRef} className="words-dropdown-menu words-dropdown-sound">
      <div className="words-dropdown-header">
        <strong>Sound settings</strong>
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
      <label className="words-slider-row">
        accent volume
        <AppSlider
          min={0}
          max={100}
          className="words-slider-input"
          value={playbackSettings.measureAccentVolume}
          onChange={(event) =>
            onPlaybackSettingsChange((previous) => ({
              ...previous,
              measureAccentVolume: Number(event.target.value),
              beatGroupAccentVolume: Math.min(
                Number(event.target.value),
                previous.beatGroupAccentVolume,
              ),
            }))
          }
        />
        <span>{playbackSettings.measureAccentVolume}</span>
        <AppTooltip title={accentMuted ? 'Unmute accents' : 'Mute accents'}>
          <button
            type="button"
            className="words-button words-button-icon words-icon-tooltip"
            onClick={onAccentMutedToggle}
            aria-label={accentMuted ? 'Unmute accents' : 'Mute accents'}
          >
            <span className="material-symbols-outlined">{volumeIconName(accentMuted)}</span>
          </button>
        </AppTooltip>
      </label>
      <label className="words-slider-row">
        metronome volume
        <AppSlider
          min={0}
          max={100}
          className="words-slider-input"
          value={playbackSettings.metronomeVolume}
          onChange={(event) =>
            onPlaybackSettingsChange((previous) => ({
              ...previous,
              metronomeVolume: Number(event.target.value),
            }))
          }
        />
        <span>{playbackSettings.metronomeVolume}</span>
        <AppTooltip title={metronomeMuted ? 'Unmute metronome' : 'Mute metronome'}>
          <button
            type="button"
            className="words-button words-button-icon words-icon-tooltip"
            onClick={onMetronomeMutedToggle}
            aria-label={metronomeMuted ? 'Unmute metronome' : 'Mute metronome'}
          >
            <span className="material-symbols-outlined">{volumeIconName(metronomeMuted)}</span>
          </button>
        </AppTooltip>
      </label>
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
                  <div className="words-template-input-with-link words-template-input-only">
                    <input
                      className="words-template-input"
                      type="text"
                      value={backingBeatNotation}
                      onChange={(event) => onBackingBeatNotationChange(event.target.value)}
                      placeholder={backingFallbackTemplate}
                    />
                  </div>
                </label>
                <div className="words-section-template-presets">
                  {templatePresets.map((preset) => (
                    <button
                      key={`backing-${preset.label}`}
                      type="button"
                      className={`words-button words-button-template${
                        backingSelectedTemplatePreset?.id === preset.id ? ' is-active' : ''
                      }`}
                      onClick={() => onBackingBeatNotationChange(preset.notation)}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <AppTooltip title="Random preset template">
                    <button
                      type="button"
                      className="words-button words-button-template words-button-template-icon words-icon-tooltip"
                      onClick={() => onRandomizeBackingTemplate('preset')}
                      aria-label="Random preset template"
                    >
                      <DiceIcon variant="single" size={15} />
                    </button>
                  </AppTooltip>
                  <AppTooltip title="Fully randomize template">
                    <button
                      type="button"
                      className="words-button words-button-template words-button-template-icon words-icon-tooltip"
                      onClick={() => onRandomizeBackingTemplate('full')}
                      aria-label="Fully randomize template"
                    >
                      <DiceIcon variant="multiple" size={15} />
                    </button>
                  </AppTooltip>
                </div>
              </>
            ) : null}
            {!backingBeatUseTemplate &&
            backingPatternRhythm?.isValid &&
            (backingPatternRhythm.measures.length ?? 0) > 0 ? (
              <div className="words-template-preview words-section-template-preview">
                {backingSelectedTemplatePreset && backingTemplateVariations.length > 1 ? (
                  <RhythmTemplateVariationControls
                    className="words-template-variation-carousel"
                    presetLabel={backingSelectedTemplatePreset.label}
                    variations={backingTemplateVariations}
                    activeVariationIndex={backingActiveVariationIndex}
                    onPrevious={() => {
                      const current =
                        backingActiveVariationIndex >= 0 ? backingActiveVariationIndex : 0;
                      const prevIndex =
                        (current - 1 + backingTemplateVariations.length) %
                        backingTemplateVariations.length;
                      onBackingBeatNotationChange(backingTemplateVariations[prevIndex].notation);
                    }}
                    onNext={() => {
                      const current =
                        backingActiveVariationIndex >= 0 ? backingActiveVariationIndex : 0;
                      const nextIndex = (current + 1) % backingTemplateVariations.length;
                      onBackingBeatNotationChange(backingTemplateVariations[nextIndex].notation);
                    }}
                  />
                ) : null}
                <DrumNotationMini
                  rhythm={backingPatternRhythm}
                  width={320}
                  style="light"
                  showDrumSymbols={true}
                  drumSymbolScale={0.52}
                  darbukaLinkOptions={{
                    notation: backingBeatUseTemplate
                      ? defaultTemplateNotation
                      : backingBeatNotation,
                    bpm,
                    timeSignature,
                    metronomeEnabled,
                    className: 'words-template-edit-link',
                  }}
                />
              </div>
            ) : !backingBeatUseTemplate ? (
              <p className="words-template-error">Backing beat notation is invalid for this meter.</p>
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
