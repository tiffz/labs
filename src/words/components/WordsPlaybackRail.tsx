import type { RefObject } from 'react';
import type { Key } from '../../shared/music/chordTypes';
import type { TimeSignature } from '../../shared/rhythm/types';
import AppTooltip from '../../shared/components/AppTooltip';
import BpmInput from '../../shared/components/music/BpmInput';
import DiceIcon from '../../shared/components/DiceIcon';
import KeyInput from '../../shared/components/music/KeyInput';
import MetronomeToggleButton from '../../shared/components/MetronomeToggleButton';
import WordsSoundSettingsPanel from './WordsSoundSettingsPanel';

export type WordsPlaybackRailProps = {
  isPlaying: boolean;
  onPlayStop: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onRandomizeBpm: () => void;
  songKey: Key;
  onKeyChange: (key: Key) => void;
  onRandomizeKey: () => void;
  timeSignature: TimeSignature;
  timeSignatureOptions: Array<Pick<TimeSignature, 'numerator' | 'denominator'>>;
  onTimeSignatureChange: (timeSignature: TimeSignature) => void;
  metronomeEnabled: boolean;
  onMetronomeToggle: (enabled: boolean) => void;
  soundButtonRef: RefObject<HTMLButtonElement | null>;
  soundMenuOpen: boolean;
  onToggleSoundMenu: () => void;
  soundMenuProps: React.ComponentProps<typeof WordsSoundSettingsPanel>;
};

export default function WordsPlaybackRail({
  isPlaying,
  onPlayStop,
  bpm,
  onBpmChange,
  onRandomizeBpm,
  songKey,
  onKeyChange,
  onRandomizeKey,
  timeSignature,
  timeSignatureOptions,
  onTimeSignatureChange,
  metronomeEnabled,
  onMetronomeToggle,
  soundButtonRef,
  soundMenuOpen,
  onToggleSoundMenu,
  soundMenuProps,
}: WordsPlaybackRailProps) {
  return (
    <div className="words-playback-row">
      <button className="words-button words-button-primary" type="button" onClick={onPlayStop}>
        {isPlaying ? 'stop' : 'play'}
      </button>
      <label className="words-inline-control words-inline-control-bpm">
        bpm
        <BpmInput
          value={bpm}
          onChange={onBpmChange}
          min={40}
          max={220}
          className="words-bpm-input"
          dropdownClassName="words-bpm-dropdown"
          sliderClassName="words-bpm-slider"
          trailingActions={
            <AppTooltip title="Randomize tempo">
              <button
                type="button"
                className="words-inline-dice-button words-icon-tooltip"
                onClick={onRandomizeBpm}
                aria-label="Randomize tempo"
              >
                <DiceIcon variant="single" size={15} />
              </button>
            </AppTooltip>
          }
        />
      </label>
      <label className="words-inline-control">
        key
        <KeyInput
          value={songKey}
          onChange={(next) => onKeyChange(next as Key)}
          className="words-key-input"
          dropdownClassName="words-key-dropdown"
          trailingActions={
            <AppTooltip title="Randomize key">
              <button
                type="button"
                className="words-inline-dice-button words-icon-tooltip"
                onClick={onRandomizeKey}
                aria-label="Randomize key"
              >
                <DiceIcon variant="single" size={15} />
              </button>
            </AppTooltip>
          }
        />
      </label>
      <label className="words-inline-control">
        meter
        <select
          value={`${timeSignature.numerator}/${timeSignature.denominator}`}
          onChange={(event) => {
            const [numerator, denominator] = event.target.value.split('/').map(Number);
            onTimeSignatureChange({ numerator, denominator });
          }}
        >
          {timeSignatureOptions.map((option) => (
            <option
              key={`${option.numerator}/${option.denominator}`}
              value={`${option.numerator}/${option.denominator}`}
            >
              {option.numerator}/{option.denominator}
            </option>
          ))}
        </select>
      </label>
      <AppTooltip title={metronomeEnabled ? 'Metronome is on' : 'Metronome is off'}>
        <span>
          <MetronomeToggleButton
            enabled={metronomeEnabled}
            onToggle={() => onMetronomeToggle(!metronomeEnabled)}
            className="words-button words-button-icon words-icon-tooltip words-metronome-toggle"
            activeClassName="is-on"
            showOnLabel={false}
            tooltipOn="Metronome is on"
            tooltipOff="Metronome is off"
            includeNativeTitle={false}
            includeDataTooltip={false}
          />
        </span>
      </AppTooltip>
      <button
        ref={soundButtonRef}
        className={`words-button words-gear-button${soundMenuOpen ? ' is-open' : ''}`}
        type="button"
        aria-label="Sound settings"
        onClick={onToggleSoundMenu}
      >
        <span className="material-symbols-outlined">tune</span>
      </button>
      {soundMenuOpen ? <WordsSoundSettingsPanel {...soundMenuProps} /> : null}
    </div>
  );
}
