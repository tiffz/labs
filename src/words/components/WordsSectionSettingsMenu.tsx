import type { RefObject } from 'react';
import type { ParsedRhythm, TimeSignature } from '../../shared/rhythm/types';
import type { ChordStyleId } from '../../shared/music/chordStyleOptions';
import { CHORD_STYLE_OPTIONS } from '../../shared/music/chordStyleOptions';
import type { Key } from '../../shared/music/chordTypes';
import type { SongSection } from '../../shared/music/songSections';
import AppTooltip from '../../shared/components/AppTooltip';
import DiceIcon from '../../shared/components/DiceIcon';
import ChordProgressionInput from '../../shared/components/music/ChordProgressionInput';
import ChordStyleInput from '../../shared/components/music/ChordStyleInput';
import DrumNotationMini from '../../shared/notation/DrumNotationMini';
import { RhythmTemplateVariationControls } from '../../shared/notation/RhythmTemplateVariationControls';
import type { SectionSettingsPosition } from '../hooks/useSectionSettingsPortalPosition';

type TemplatePreset = { id: string; label: string; notation: string };

export type WordsSectionSettingsMenuProps = {
  section: SongSection;
  menuRef: RefObject<HTMLDivElement | null>;
  position: SectionSettingsPosition;
  songKey: Key;
  bpm: number;
  timeSignature: TimeSignature;
  metronomeEnabled: boolean;
  templatePresets: TemplatePreset[];
  selectedTemplatePreset: TemplatePreset | null;
  sectionTemplateVariations: readonly { notation: string; label: string }[];
  sectionActiveVariationIndex: number;
  templatePreview: ParsedRhythm | undefined;
  defaultTemplateNotation: string;
  onChordProgressionChange: (value: string) => void;
  onRandomizeChords: () => void;
  onChordStyleChange: (styleId: ChordStyleId) => void;
  onRandomizeChordStyle: () => void;
  onToggleChorusLyricsLink: () => void;
  onToggleChorusTemplateLink: () => void;
  onTemplateNotationChange: (notation: string) => void;
  onRandomizeTemplate: (mode: 'preset' | 'full') => void;
  onTemplateVariationPrevious: () => void;
  onTemplateVariationNext: () => void;
};

export default function WordsSectionSettingsMenu({
  section,
  menuRef,
  position,
  songKey,
  bpm,
  timeSignature,
  metronomeEnabled,
  templatePresets,
  selectedTemplatePreset,
  sectionTemplateVariations,
  sectionActiveVariationIndex,
  templatePreview,
  defaultTemplateNotation,
  onChordProgressionChange,
  onRandomizeChords,
  onChordStyleChange,
  onRandomizeChordStyle,
  onToggleChorusLyricsLink,
  onToggleChorusTemplateLink,
  onTemplateNotationChange,
  onRandomizeTemplate,
  onTemplateVariationPrevious,
  onTemplateVariationNext,
}: WordsSectionSettingsMenuProps) {
  const previewValid =
    templatePreview?.isValid && (templatePreview.measures.length ?? 0) > 0;

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
        <div className="words-template-input-only">
          <input
            type="text"
            value={section.templateNotation}
            onChange={(event) => onTemplateNotationChange(event.target.value)}
            placeholder="D---T---D-D-T---"
          />
        </div>
      </label>
      <div className="words-section-template-presets">
        {templatePresets.map((preset) => (
          <button
            key={`${section.id}-${preset.label}`}
            type="button"
            className={`words-button words-button-template${
              selectedTemplatePreset?.id === preset.id ? ' is-active' : ''
            }`}
            onClick={() => onTemplateNotationChange(preset.notation)}
          >
            {preset.label}
          </button>
        ))}
        <AppTooltip title="Random preset template">
          <button
            type="button"
            className="words-button words-button-template words-button-template-icon words-icon-tooltip"
            onClick={() => onRandomizeTemplate('preset')}
            aria-label="Random preset template"
          >
            <DiceIcon variant="single" size={15} />
          </button>
        </AppTooltip>
        <AppTooltip title="Fully randomize template">
          <button
            type="button"
            className="words-button words-button-template words-button-template-icon words-icon-tooltip"
            onClick={() => onRandomizeTemplate('full')}
            aria-label="Fully randomize template"
          >
            <DiceIcon variant="multiple" size={15} />
          </button>
        </AppTooltip>
      </div>
      {previewValid && templatePreview ? (
        <div className="words-template-preview words-section-template-preview">
          {selectedTemplatePreset && sectionTemplateVariations.length > 1 ? (
            <RhythmTemplateVariationControls
              className="words-template-variation-carousel"
              presetLabel={selectedTemplatePreset.label}
              variations={sectionTemplateVariations}
              activeVariationIndex={sectionActiveVariationIndex}
              onPrevious={onTemplateVariationPrevious}
              onNext={onTemplateVariationNext}
            />
          ) : null}
          <DrumNotationMini
            rhythm={templatePreview}
            width={320}
            style="light"
            showDrumSymbols={true}
            drumSymbolScale={0.52}
            darbukaLinkOptions={{
              notation: section.templateNotation || defaultTemplateNotation,
              bpm,
              timeSignature,
              metronomeEnabled,
              className: 'words-template-edit-link',
            }}
          />
        </div>
      ) : (
        <p className="words-template-error">Section template notation is invalid for this meter.</p>
      )}
    </div>
  );
}
