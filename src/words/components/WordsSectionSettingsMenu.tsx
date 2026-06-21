import type { RefObject } from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { ChordStyleId } from '../../shared/music/chordStyleOptions';
import { CHORD_STYLE_OPTIONS } from '../../shared/music/chordStyleOptions';
import type { SongKey } from '../../shared/music/songKeyFormat';
import type { SongSection } from '../../shared/music/songSections';
import AppTooltip from '../../shared/components/AppTooltip';
import DiceIcon from '../../shared/components/DiceIcon';
import ChordProgressionInput from '../../shared/components/music/ChordProgressionInput';
import ChordStyleInput from '../../shared/components/music/ChordStyleInput';
import DarbukaTrainerIconLink from '../../shared/components/music/DarbukaTrainerIconLink';
import DrumAccompaniment from '../../shared/components/music/DrumAccompaniment';
import type { SectionSettingsPosition } from '../hooks/useSectionSettingsPortalPosition';
import {
  WORDS_HOST_INPUT_DRUM_UX,
  WORDS_INLINE_DRUM_NOTATION_STYLE,
  WORDS_INLINE_DRUM_RANDOMIZE_BUTTON_CLASS,
  WORDS_INLINE_DRUM_TEMPLATE_BUTTON_CLASS,
} from '../utils/wordsInlineDrumUx';

export type WordsSectionSettingsMenuProps = {
  section: SongSection;
  menuRef: RefObject<HTMLDivElement | null>;
  position: SectionSettingsPosition;
  songKey: SongKey;
  bpm: number;
  timeSignature: TimeSignature;
  metronomeEnabled: boolean;
  defaultTemplateNotation: string;
  onChordProgressionPreview: (value: string) => void;
  onChordProgressionCommit: (value: string) => void;
  onRandomizeChords: () => void;
  onChordStyleChange: (styleId: ChordStyleId) => void;
  onRandomizeChordStyle: () => void;
  onTemplateNotationChange: (notation: string) => void;
};

export default function WordsSectionSettingsMenu({
  section,
  menuRef,
  position,
  songKey,
  bpm,
  timeSignature,
  metronomeEnabled,
  defaultTemplateNotation,
  onChordProgressionPreview,
  onChordProgressionCommit,
  onRandomizeChords,
  onChordStyleChange,
  onRandomizeChordStyle,
  onTemplateNotationChange,
}: WordsSectionSettingsMenuProps) {
  const templateNotation = section.templateNotation || defaultTemplateNotation;

  return (
    <div
      ref={menuRef}
      className="words-dropdown-menu words-dropdown-section words-section-settings-menu words-section-settings-menu-portal"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        maxHeight: `${position.maxHeight}px`,
      }}
    >
      <div className="words-dropdown-header">
        <strong>Section settings</strong>
      </div>
      <label className="words-slider-row words-chord-row">
        section chords
        <div className="words-chord-input-with-action">
          <ChordProgressionInput
            value={section.chordProgressionInput}
            onChange={onChordProgressionPreview}
            onCommit={onChordProgressionCommit}
            keyContext={songKey}
            showResolvedForKey
            className="words-section-chord-input"
            inputClassName="words-section-chord-text-input"
            dropdownClassName="words-section-chord-dropdown"
            appearance="words"
            presetColumns={2}
            showInputInPopover
            placeholder="I–V–vi–IV or C–G–Am–F"
          />
          <AppTooltip title="Randomize section chords">
            <button
              className="words-button words-button-icon words-icon-tooltip"
              type="button"
              onClick={onRandomizeChords}
              aria-label="Randomize section chords"
            >
              <DiceIcon variant="single" size={16} />
            </button>
          </AppTooltip>
        </div>
      </label>
      <label className="words-slider-row words-chord-row">
        chord style
        <div className="words-chord-input-with-action">
          <ChordStyleInput
            value={section.chordStyleId}
            onChange={(next) => onChordStyleChange(next as ChordStyleId)}
            options={CHORD_STYLE_OPTIONS}
            className="words-chord-style-input"
            triggerClassName="words-select-inline words-chord-style-select"
            dropdownClassName="words-section-style-dropdown"
            appearance="words"
            menuColumns={3}
            timeSignature={timeSignature}
          />
          <AppTooltip title="Randomize chord style">
            <button
              className="words-button words-button-icon words-icon-tooltip"
              type="button"
              onClick={onRandomizeChordStyle}
              aria-label="Randomize chord style"
            >
              <DiceIcon variant="single" size={16} />
            </button>
          </AppTooltip>
        </div>
      </label>
      <label className="words-slider-row words-chord-row">
        rhythm template
        <div className="words-chord-input-with-action">
          <div className="words-template-input-only">
            <input
              type="text"
              value={section.templateNotation}
              onChange={(event) => onTemplateNotationChange(event.target.value)}
              placeholder="D---T---D-D-T---"
            />
          </div>
          <DarbukaTrainerIconLink
            params={{
              notation: templateNotation,
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
          notationValue={templateNotation}
          onNotationValueChange={onTemplateNotationChange}
          notationWidth={320}
          notationStyle={WORDS_INLINE_DRUM_NOTATION_STYLE}
          notationFrameClassName="words-template-preview words-section-template-preview"
          templateButtonClassName={WORDS_INLINE_DRUM_TEMPLATE_BUTTON_CLASS}
          randomizeButtonClassName={WORDS_INLINE_DRUM_RANDOMIZE_BUTTON_CLASS}
        />
      </div>
    </div>
  );
}
