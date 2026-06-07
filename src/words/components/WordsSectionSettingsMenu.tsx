import type { RefObject } from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { ChordStyleId } from '../../shared/music/chordStyleOptions';
import { CHORD_STYLE_OPTIONS } from '../../shared/music/chordStyleOptions';
import type { Key } from '../../shared/music/chordTypes';
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
  songKey: Key;
  bpm: number;
  timeSignature: TimeSignature;
  metronomeEnabled: boolean;
  defaultTemplateNotation: string;
  onChordProgressionChange: (value: string) => void;
  onRandomizeChords: () => void;
  onChordStyleChange: (styleId: ChordStyleId) => void;
  onRandomizeChordStyle: () => void;
  onToggleChorusLyricsLink: () => void;
  onToggleChorusTemplateLink: () => void;
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
  onChordProgressionChange,
  onRandomizeChords,
  onChordStyleChange,
  onRandomizeChordStyle,
  onToggleChorusLyricsLink,
  onToggleChorusTemplateLink,
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
            onChange={onChordProgressionChange}
            onCommit={onChordProgressionChange}
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
            menuColumns={2}
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
      {section.type === 'chorus' ? (
        <div className="words-chorus-link-controls">
          <strong>chorus linking</strong>
          <div className="words-chorus-link-row">
            <AppTooltip
              title={
                section.linkedToPreviousChorusLyrics
                  ? 'Lyrics are linked: editing one linked chorus updates all linked chorus lyrics.'
                  : 'Lyrics are unlinked: this chorus keeps its own lyrics.'
              }
            >
              <button
                type="button"
                className={`words-button words-button-icon words-link-toggle words-link-toggle-chorus words-icon-tooltip${
                  section.linkedToPreviousChorusLyrics ? ' is-linked' : ' is-unlinked'
                }`}
                onClick={onToggleChorusLyricsLink}
                aria-label="Toggle chorus lyrics linking"
              >
                <span className="material-symbols-outlined">
                  {section.linkedToPreviousChorusLyrics ? 'link' : 'link_off'}
                </span>
              </button>
            </AppTooltip>
            <span>lyrics link</span>
          </div>
          <div className="words-chorus-link-row">
            <AppTooltip
              title={
                section.linkedToPreviousChorusTemplate
                  ? 'Rhythm template is linked across linked choruses.'
                  : 'Rhythm template is unlinked for this chorus.'
              }
            >
              <button
                type="button"
                className={`words-button words-button-icon words-link-toggle words-icon-tooltip${
                  section.linkedToPreviousChorusTemplate ? ' is-linked' : ' is-unlinked'
                }`}
                onClick={onToggleChorusTemplateLink}
                aria-label="Toggle chorus rhythm template linking"
              >
                <span className="material-symbols-outlined">
                  {section.linkedToPreviousChorusTemplate ? 'link' : 'link_off'}
                </span>
              </button>
            </AppTooltip>
            <span>template link</span>
          </div>
        </div>
      ) : null}
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
