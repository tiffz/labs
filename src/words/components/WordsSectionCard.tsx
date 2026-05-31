import { createPortal } from 'react-dom';
import type { ClipboardEvent, RefObject } from 'react';
import type { ParsedRhythm, TimeSignature } from '../../shared/rhythm/types';
import type { Key } from '../../shared/music/chordTypes';
import type { ChordStyleId } from '../../shared/music/chordStyleOptions';
import type { SongSection, SongSectionType } from '../../shared/music/songSections';
import AppTooltip from '../../shared/components/AppTooltip';
import DiceIcon from '../../shared/components/DiceIcon';
import WordsRandomizeMenuPopover from './WordsRandomizeMenuPopover';
import WordsSectionSettingsMenu from './WordsSectionSettingsMenu';
import type { SectionSettingsPosition } from '../hooks/useSectionSettingsPortalPosition';
import type { RandomizeMode } from '../utils/randomizeModes';

type TemplatePreset = { id: string; label: string; notation: string };

export type WordsSectionCardProps = {
  section: SongSection;
  effectiveLyrics: string;
  sectionDisplayName: string;
  isSettingsOpen: boolean;
  settingsPosition: SectionSettingsPosition | null;
  isLoopActive: boolean;
  isRandomizeMenuOpen: boolean;
  randomizeAnchorEl: HTMLElement | null;
  selectedTemplatePreset: TemplatePreset | null;
  sectionTemplateVariations: readonly { notation: string; label: string }[];
  sectionActiveVariationIndex: number;
  templatePreview: ParsedRhythm | undefined;
  templatePresets: TemplatePreset[];
  defaultTemplateNotation: string;
  settingsMenuRef: RefObject<HTMLDivElement | null>;
  randomizeMenuRef: RefObject<HTMLDivElement | null>;
  settingsAnchorRef: (element: HTMLDivElement | null) => void;
  randomizeAnchorRef: (element: HTMLDivElement | null) => void;
  onToggleSettings: () => void;
  onTypeChange: (type: SongSectionType) => void;
  onToggleChorusLyricsLink: () => void;
  onLyricsChange: (lyrics: string) => void;
  onLyricsPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onToggleLock: () => void;
  onToggleLoop: () => void;
  onRandomizeSelect: (mode: RandomizeMode) => void;
  onCloseRandomizeMenu: () => void;
  onToggleRandomizeMenu: () => void;
  onScrollIntoNotation: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onChordProgressionChange: (value: string) => void;
  onRandomizeChords: () => void;
  onChordStyleChange: (styleId: ChordStyleId) => void;
  onRandomizeChordStyle: () => void;
  onToggleChorusLyricsLinkInSettings: () => void;
  onToggleChorusTemplateLink: () => void;
  onTemplateNotationChange: (notation: string) => void;
  onRandomizeTemplate: (mode: 'preset' | 'full') => void;
  onTemplateVariationPrevious: () => void;
  onTemplateVariationNext: () => void;
  songKey: Key;
  bpm: number;
  timeSignature: TimeSignature;
  metronomeEnabled: boolean;
};

export default function WordsSectionCard({
  section,
  effectiveLyrics,
  sectionDisplayName,
  isSettingsOpen,
  settingsPosition,
  isLoopActive,
  isRandomizeMenuOpen,
  randomizeAnchorEl,
  selectedTemplatePreset,
  sectionTemplateVariations,
  sectionActiveVariationIndex,
  templatePreview,
  templatePresets,
  defaultTemplateNotation,
  settingsMenuRef,
  randomizeMenuRef,
  settingsAnchorRef,
  randomizeAnchorRef,
  onToggleSettings,
  onTypeChange,
  onToggleChorusLyricsLink,
  onLyricsChange,
  onLyricsPaste,
  onToggleLock,
  onToggleLoop,
  onRandomizeSelect,
  onCloseRandomizeMenu,
  onToggleRandomizeMenu,
  onScrollIntoNotation,
  onMoveUp,
  onMoveDown,
  onRemove,
  onChordProgressionChange,
  onRandomizeChords,
  onChordStyleChange,
  onRandomizeChordStyle,
  onToggleChorusLyricsLinkInSettings,
  onToggleChorusTemplateLink,
  onTemplateNotationChange,
  onRandomizeTemplate,
  onTemplateVariationPrevious,
  onTemplateVariationNext,
  songKey,
  bpm,
  timeSignature,
  metronomeEnabled,
}: WordsSectionCardProps) {
  return (
    <div
      className={`words-section-card${isSettingsOpen ? ' is-settings-open' : ''}${
        isLoopActive ? ' is-looping' : ''
      }`}
    >
      <div className="words-section-head">
        <select
          className="words-select-inline words-section-type-select"
          value={section.type}
          onChange={(event) => onTypeChange(event.target.value as SongSectionType)}
          aria-label="Section type"
        >
          <option value="verse">
            {sectionDisplayName.includes('Verse') ? sectionDisplayName : 'Verse'}
          </option>
          <option value="chorus">
            {sectionDisplayName.includes('Chorus') ? sectionDisplayName : 'Chorus'}
          </option>
          <option value="bridge">
            {sectionDisplayName.includes('Bridge') ? sectionDisplayName : 'Bridge'}
          </option>
        </select>
        {section.type === 'chorus' ? (
          <AppTooltip
            title={
              section.linkedToPreviousChorusLyrics
                ? 'Chorus lyrics are linked. Click to unlink lyrics for this chorus.'
                : 'Chorus lyrics are unlinked. Click to relink lyrics for this chorus.'
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
        ) : null}
        <div className="words-section-actions-inline">
          <div
            className={`words-section-settings-anchor${isSettingsOpen ? ' is-open' : ''}`}
            ref={settingsAnchorRef}
          >
            <AppTooltip title="Section settings">
              <button
                type="button"
                className={`words-button words-button-icon words-icon-tooltip${
                  isSettingsOpen ? ' is-open' : ''
                }`}
                onClick={onToggleSettings}
                aria-label={`${sectionDisplayName} settings`}
              >
                <span className="material-symbols-outlined">settings</span>
              </button>
            </AppTooltip>
            {isSettingsOpen && typeof document !== 'undefined' && settingsPosition
              ? createPortal(
                  <WordsSectionSettingsMenu
                    section={section}
                    menuRef={settingsMenuRef}
                    position={settingsPosition}
                    songKey={songKey}
                    bpm={bpm}
                    timeSignature={timeSignature}
                    metronomeEnabled={metronomeEnabled}
                    templatePresets={templatePresets}
                    selectedTemplatePreset={selectedTemplatePreset}
                    sectionTemplateVariations={sectionTemplateVariations}
                    sectionActiveVariationIndex={sectionActiveVariationIndex}
                    templatePreview={templatePreview}
                    defaultTemplateNotation={defaultTemplateNotation}
                    onChordProgressionChange={onChordProgressionChange}
                    onRandomizeChords={onRandomizeChords}
                    onChordStyleChange={onChordStyleChange}
                    onRandomizeChordStyle={onRandomizeChordStyle}
                    onToggleChorusLyricsLink={onToggleChorusLyricsLinkInSettings}
                    onToggleChorusTemplateLink={onToggleChorusTemplateLink}
                    onTemplateNotationChange={onTemplateNotationChange}
                    onRandomizeTemplate={onRandomizeTemplate}
                    onTemplateVariationPrevious={onTemplateVariationPrevious}
                    onTemplateVariationNext={onTemplateVariationNext}
                  />,
                  document.body,
                )
              : null}
          </div>
          <AppTooltip
            title={isLoopActive ? 'Pause section loop' : 'Play this section in a loop'}
          >
            <button
              type="button"
              className={
                isLoopActive
                  ? 'words-button words-button-primary words-section-loop-button words-icon-tooltip'
                  : 'words-button words-button-icon words-icon-tooltip'
              }
              onClick={onToggleLoop}
              aria-label={`${isLoopActive ? 'Pause' : 'Play'} ${sectionDisplayName} section loop`}
            >
              {isLoopActive ? (
                <>
                  <span className="material-symbols-outlined">pause</span>
                  pause
                </>
              ) : (
                <span className="material-symbols-outlined">play_arrow</span>
              )}
            </button>
          </AppTooltip>
          <AppTooltip
            title={
              section.isLocked
                ? 'Section is locked and excluded from randomization'
                : 'Lock this section to keep it unchanged when randomizing'
            }
          >
            <button
              type="button"
              className={`words-button words-button-icon words-icon-tooltip${
                section.isLocked ? ' is-open' : ''
              }`}
              onClick={onToggleLock}
              aria-label={`Toggle lock for ${sectionDisplayName}`}
            >
              <span className="material-symbols-outlined">
                {section.isLocked ? 'lock' : 'lock_open'}
              </span>
            </button>
          </AppTooltip>
          <div className="words-section-randomize-anchor" ref={randomizeAnchorRef}>
            <AppTooltip
              title={
                section.isLocked
                  ? 'Section is locked'
                  : 'Open randomization options for this section'
              }
            >
              <button
                type="button"
                className="words-button words-button-icon"
                onClick={onToggleRandomizeMenu}
                aria-label={`Randomize ${sectionDisplayName}`}
              >
                <DiceIcon variant="single" size={16} />
              </button>
            </AppTooltip>
            <WordsRandomizeMenuPopover
              open={isRandomizeMenuOpen}
              anchorEl={randomizeAnchorEl}
              onClose={onCloseRandomizeMenu}
              paperRef={randomizeMenuRef}
              onSelect={onRandomizeSelect}
            />
          </div>
          <AppTooltip title="Show this section in notation">
            <button
              type="button"
              className="words-button words-button-icon words-icon-tooltip"
              onClick={onScrollIntoNotation}
              aria-label={`Show ${sectionDisplayName} in notation`}
            >
              <span className="material-symbols-outlined">visibility</span>
            </button>
          </AppTooltip>
          <AppTooltip title="Move section up">
            <button
              type="button"
              className="words-button words-button-icon words-icon-tooltip"
              onClick={onMoveUp}
              aria-label={`Move ${sectionDisplayName} up`}
            >
              <span className="material-symbols-outlined">arrow_upward</span>
            </button>
          </AppTooltip>
          <AppTooltip title="Move section down">
            <button
              type="button"
              className="words-button words-button-icon words-icon-tooltip"
              onClick={onMoveDown}
              aria-label={`Move ${sectionDisplayName} down`}
            >
              <span className="material-symbols-outlined">arrow_downward</span>
            </button>
          </AppTooltip>
          <AppTooltip title="Delete section">
            <button
              type="button"
              className="words-button words-button-icon words-button-danger words-icon-tooltip"
              onClick={onRemove}
              aria-label={`Remove ${sectionDisplayName}`}
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </AppTooltip>
        </div>
      </div>
      <textarea
        className="words-textarea words-section-textarea"
        rows={4}
        value={effectiveLyrics}
        onPaste={onLyricsPaste}
        onChange={(event) => onLyricsChange(event.target.value)}
        placeholder="Type words or lyrics..."
      />
    </div>
  );
}
