import { createPortal } from 'react-dom';
import type { RefObject, ClipboardEvent } from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { SongKey } from '../../shared/music/songKeyFormat';
import type { ChordStyleId } from '../../shared/music/chordStyleOptions';
import type { SongSection, SongSectionType } from '../../shared/music/songSections';
import AppTooltip from '../../shared/components/AppTooltip';
import DiceIcon from '../../shared/components/DiceIcon';
import WordsChorusLinkMenuPopover from './WordsChorusLinkMenuPopover';
import WordsRandomizeMenuPopover from './WordsRandomizeMenuPopover';
import WordsSectionSettingsMenu from './WordsSectionSettingsMenu';
import type { SectionSettingsPosition } from '../hooks/useSectionSettingsPortalPosition';
import type { RandomizeMode } from '../utils/randomizeModes';

export type WordsSectionCardProps = {
  section: SongSection;
  sections: SongSection[];
  effectiveLyrics: string;
  sectionDisplayName: string;
  isSettingsOpen: boolean;
  settingsPosition: SectionSettingsPosition | null;
  isLoopActive: boolean;
  isRandomizeMenuOpen: boolean;
  isChorusLinkMenuOpen: boolean;
  randomizeAnchorEl: HTMLElement | null;
  chorusLinkAnchorEl: HTMLElement | null;
  defaultTemplateNotation: string;
  settingsMenuRef: RefObject<HTMLDivElement | null>;
  randomizeMenuRef: RefObject<HTMLDivElement | null>;
  chorusLinkMenuRef: RefObject<HTMLDivElement | null>;
  settingsAnchorRef: (element: HTMLDivElement | null) => void;
  randomizeAnchorRef: (element: HTMLDivElement | null) => void;
  chorusLinkAnchorRef: (element: HTMLDivElement | null) => void;
  onToggleSettings: () => void;
  onTypeChange: (type: SongSectionType) => void;
  onToggleChorusLinkMenu: () => void;
  onCloseChorusLinkMenu: () => void;
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
  onChordProgressionPreview: (value: string) => void;
  onChordProgressionCommit: (value: string) => void;
  onRandomizeChords: () => void;
  onChordStyleChange: (styleId: ChordStyleId) => void;
  onRandomizeChordStyle: () => void;
  onToggleChorusTemplateLink: () => void;
  onLinkAllChorusLyrics: () => void;
  onUnlinkAllChorusLyrics: () => void;
  onLinkAllChorusTemplates: () => void;
  onUnlinkAllChorusTemplates: () => void;
  onTemplateNotationChange: (notation: string) => void;
  songKey: SongKey;
  bpm: number;
  timeSignature: TimeSignature;
  metronomeEnabled: boolean;
};

function chorusLinkButtonClass(section: SongSection): string {
  const lyricsLinked = section.linkedToPreviousChorusLyrics;
  const templateLinked = section.linkedToPreviousChorusTemplate;
  if (lyricsLinked && templateLinked) return ' is-linked';
  if (!lyricsLinked && !templateLinked) return ' is-unlinked';
  return ' is-mixed';
}

export default function WordsSectionCard({
  section,
  sections,
  effectiveLyrics,
  sectionDisplayName,
  isSettingsOpen,
  settingsPosition,
  isLoopActive,
  isRandomizeMenuOpen,
  isChorusLinkMenuOpen,
  randomizeAnchorEl,
  chorusLinkAnchorEl,
  defaultTemplateNotation,
  settingsMenuRef,
  randomizeMenuRef,
  chorusLinkMenuRef,
  settingsAnchorRef,
  randomizeAnchorRef,
  chorusLinkAnchorRef,
  onToggleSettings,
  onTypeChange,
  onToggleChorusLinkMenu,
  onCloseChorusLinkMenu,
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
  onChordProgressionPreview,
  onChordProgressionCommit,
  onRandomizeChords,
  onChordStyleChange,
  onRandomizeChordStyle,
  onToggleChorusTemplateLink,
  onLinkAllChorusLyrics,
  onUnlinkAllChorusLyrics,
  onLinkAllChorusTemplates,
  onUnlinkAllChorusTemplates,
  onTemplateNotationChange,
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
          <div
            className={`words-section-chorus-link-anchor${
              isChorusLinkMenuOpen ? ' is-open' : ''
            }`}
            ref={chorusLinkAnchorRef}
          >
            <AppTooltip title="Chorus linking options">
              <button
                type="button"
                className={`words-button words-link-toggle words-link-toggle-chorus words-chorus-link-trigger words-icon-tooltip${chorusLinkButtonClass(section)}${
                  isChorusLinkMenuOpen ? ' is-open' : ''
                }`}
                onClick={onToggleChorusLinkMenu}
                aria-haspopup="menu"
                aria-expanded={isChorusLinkMenuOpen}
                aria-label="Open chorus linking menu"
              >
                <span className="material-symbols-outlined words-chorus-link-trigger-icon">
                  {section.linkedToPreviousChorusLyrics ||
                  section.linkedToPreviousChorusTemplate
                    ? 'link'
                    : 'link_off'}
                </span>
                <span
                  className="material-symbols-outlined words-chorus-link-trigger-chevron"
                  aria-hidden
                >
                  expand_more
                </span>
              </button>
            </AppTooltip>
            <WordsChorusLinkMenuPopover
              open={isChorusLinkMenuOpen}
              anchorEl={chorusLinkAnchorEl}
              onClose={onCloseChorusLinkMenu}
              paperRef={chorusLinkMenuRef}
              section={section}
              sections={sections}
              onToggleChorusLyricsLink={onToggleChorusLyricsLink}
              onToggleChorusTemplateLink={onToggleChorusTemplateLink}
              onLinkAllChorusLyrics={onLinkAllChorusLyrics}
              onUnlinkAllChorusLyrics={onUnlinkAllChorusLyrics}
              onLinkAllChorusTemplates={onLinkAllChorusTemplates}
              onUnlinkAllChorusTemplates={onUnlinkAllChorusTemplates}
            />
          </div>
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
                    defaultTemplateNotation={defaultTemplateNotation}
                    onChordProgressionPreview={onChordProgressionPreview}
                    onChordProgressionCommit={onChordProgressionCommit}
                    onRandomizeChords={onRandomizeChords}
                    onChordStyleChange={onChordStyleChange}
                    onRandomizeChordStyle={onRandomizeChordStyle}
                    onTemplateNotationChange={onTemplateNotationChange}
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
        placeholder="Type words or lyrics…"
      />
    </div>
  );
}
