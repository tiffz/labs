import type { RefObject } from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { SongKey } from '../../shared/music/songKeyFormat';
import type { SongSection, SongSectionType } from '../../shared/music/songSections';
import type { SectionSettingsPosition } from '../hooks/useSectionSettingsPortalPosition';
import type { RandomizeMode } from '../utils/randomizeModes';
import WordsSectionCard from './WordsSectionCard';

type EffectiveSection = SongSection & {
  effectiveLyrics: string;
  effectiveTemplateNotation: string;
};

export type WordsSectionsColumnProps = {
  columnRef: RefObject<HTMLElement | null>;
  sections: SongSection[];
  effectiveSections: EffectiveSection[];
  sectionDisplayNames: string[];
  openSectionSettingsId: string | null;
  sectionSettingsPosition: SectionSettingsPosition | null;
  sectionRandomizeMenuId: string | null;
  sectionChorusLinkMenuId: string | null;
  activeSectionLoopId: string | null;
  isPlaying: boolean;
  defaultTemplateNotation: string;
  songKey: SongKey;
  bpm: number;
  timeSignature: TimeSignature;
  metronomeEnabled: boolean;
  sectionSettingsMenuRef: RefObject<HTMLDivElement | null>;
  sectionRandomizeMenuRef: RefObject<HTMLDivElement | null>;
  sectionChorusLinkMenuRef: RefObject<HTMLDivElement | null>;
  sectionSettingsAnchorRefs: RefObject<Map<string, HTMLDivElement>>;
  sectionRandomizeAnchorRefs: RefObject<Map<string, HTMLDivElement>>;
  sectionChorusLinkAnchorRefs: RefObject<Map<string, HTMLDivElement>>;
  onToggleSectionSettings: (sectionId: string) => void;
  onSectionTypeChange: (sectionId: string, type: SongSectionType) => void;
  onToggleChorusLyricsLink: (sectionId: string) => void;
  onSectionLyricsChange: (sectionId: string, lyrics: string) => void;
  onSectionLyricsPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onToggleSectionLock: (sectionId: string) => void;
  onToggleSectionLoop: (sectionId: string, index: number) => void;
  onSectionRandomizeSelect: (sectionId: string, mode: RandomizeMode) => void;
  onCloseSectionRandomizeMenu: () => void;
  onToggleSectionRandomizeMenu: (sectionId: string) => void;
  onToggleSectionChorusLinkMenu: (sectionId: string) => void;
  onCloseSectionChorusLinkMenu: () => void;
  onScrollSectionIntoNotation: (sectionId: string) => void;
  onMoveSection: (sectionId: string, delta: -1 | 1) => void;
  onRemoveSection: (sectionId: string) => void;
  onSectionChordProgressionPreview: (sectionId: string, value: string) => void;
  onSectionChordProgressionCommit: (sectionId: string, value: string) => void;
  onRandomizeSectionChords: (sectionId: string) => void;
  onSectionChordStyleChange: (sectionId: string, styleId: string) => void;
  onRandomizeSectionChordStyle: (sectionId: string) => void;
  onToggleChorusTemplateLink: (sectionId: string) => void;
  onSectionTemplateNotationChange: (sectionId: string, notation: string) => void;
  onAddSection: (type: SongSectionType) => void;
  onImportLyrics: () => void;
  onLinkAllChorusLyrics: () => void;
  onUnlinkAllChorusLyrics: () => void;
  onLinkAllChorusTemplates: () => void;
  onUnlinkAllChorusTemplates: () => void;
};

export default function WordsSectionsColumn({
  columnRef,
  sections,
  effectiveSections,
  sectionDisplayNames,
  openSectionSettingsId,
  sectionSettingsPosition,
  sectionRandomizeMenuId,
  sectionChorusLinkMenuId,
  activeSectionLoopId,
  isPlaying,
  defaultTemplateNotation,
  songKey,
  bpm,
  timeSignature,
  metronomeEnabled,
  sectionSettingsMenuRef,
  sectionRandomizeMenuRef,
  sectionChorusLinkMenuRef,
  sectionSettingsAnchorRefs,
  sectionRandomizeAnchorRefs,
  sectionChorusLinkAnchorRefs,
  onToggleSectionSettings,
  onSectionTypeChange,
  onToggleChorusLyricsLink,
  onSectionLyricsChange,
  onSectionLyricsPaste,
  onToggleSectionLock,
  onToggleSectionLoop,
  onSectionRandomizeSelect,
  onCloseSectionRandomizeMenu,
  onToggleSectionRandomizeMenu,
  onToggleSectionChorusLinkMenu,
  onCloseSectionChorusLinkMenu,
  onScrollSectionIntoNotation,
  onMoveSection,
  onRemoveSection,
  onSectionChordProgressionPreview,
  onSectionChordProgressionCommit,
  onRandomizeSectionChords,
  onSectionChordStyleChange,
  onRandomizeSectionChordStyle,
  onToggleChorusTemplateLink,
  onSectionTemplateNotationChange,
  onAddSection,
  onImportLyrics,
  onLinkAllChorusLyrics,
  onUnlinkAllChorusLyrics,
  onLinkAllChorusTemplates,
  onUnlinkAllChorusTemplates,
}: WordsSectionsColumnProps) {
  return (
    <article ref={columnRef} className="words-sections-column">
      <div className="words-sections-list">
        {sections.map((section, index) => {
          const effectiveSection = effectiveSections[index] ?? {
            ...section,
            effectiveLyrics: section.lyrics,
            effectiveTemplateNotation: section.templateNotation,
          };
          const sectionDisplayName = sectionDisplayNames[index] ?? 'Section';

          return (
            <WordsSectionCard
              key={section.id}
              section={section}
              sections={sections}
              effectiveLyrics={effectiveSection.effectiveLyrics}
              sectionDisplayName={sectionDisplayName}
              isSettingsOpen={openSectionSettingsId === section.id}
              settingsPosition={sectionSettingsPosition}
              isLoopActive={isPlaying && activeSectionLoopId === section.id}
              isRandomizeMenuOpen={sectionRandomizeMenuId === section.id}
              isChorusLinkMenuOpen={sectionChorusLinkMenuId === section.id}
              randomizeAnchorEl={sectionRandomizeAnchorRefs.current?.get(section.id) ?? null}
              chorusLinkAnchorEl={sectionChorusLinkAnchorRefs.current?.get(section.id) ?? null}
              defaultTemplateNotation={defaultTemplateNotation}
              settingsMenuRef={sectionSettingsMenuRef}
              randomizeMenuRef={sectionRandomizeMenuRef}
              chorusLinkMenuRef={sectionChorusLinkMenuRef}
              settingsAnchorRef={(element) => {
                if (element) sectionSettingsAnchorRefs.current?.set(section.id, element);
                else sectionSettingsAnchorRefs.current?.delete(section.id);
              }}
              randomizeAnchorRef={(element) => {
                if (element) sectionRandomizeAnchorRefs.current?.set(section.id, element);
                else sectionRandomizeAnchorRefs.current?.delete(section.id);
              }}
              chorusLinkAnchorRef={(element) => {
                if (element) sectionChorusLinkAnchorRefs.current?.set(section.id, element);
                else sectionChorusLinkAnchorRefs.current?.delete(section.id);
              }}
              onToggleSettings={() => onToggleSectionSettings(section.id)}
              onTypeChange={(type) => onSectionTypeChange(section.id, type)}
              onToggleChorusLinkMenu={() => onToggleSectionChorusLinkMenu(section.id)}
              onCloseChorusLinkMenu={onCloseSectionChorusLinkMenu}
              onToggleChorusLyricsLink={() => onToggleChorusLyricsLink(section.id)}
              onLyricsChange={(lyrics) => onSectionLyricsChange(section.id, lyrics)}
              onLyricsPaste={onSectionLyricsPaste}
              onToggleLock={() => onToggleSectionLock(section.id)}
              onToggleLoop={() => onToggleSectionLoop(section.id, index)}
              onRandomizeSelect={(mode) => onSectionRandomizeSelect(section.id, mode)}
              onCloseRandomizeMenu={onCloseSectionRandomizeMenu}
              onToggleRandomizeMenu={() => onToggleSectionRandomizeMenu(section.id)}
              onScrollIntoNotation={() => onScrollSectionIntoNotation(section.id)}
              onMoveUp={() => onMoveSection(section.id, -1)}
              onMoveDown={() => onMoveSection(section.id, 1)}
              onRemove={() => onRemoveSection(section.id)}
              onChordProgressionPreview={(value) =>
                onSectionChordProgressionPreview(section.id, value)
              }
              onChordProgressionCommit={(value) =>
                onSectionChordProgressionCommit(section.id, value)
              }
              onRandomizeChords={() => onRandomizeSectionChords(section.id)}
              onChordStyleChange={(styleId) => onSectionChordStyleChange(section.id, styleId)}
              onRandomizeChordStyle={() => onRandomizeSectionChordStyle(section.id)}
              onToggleChorusTemplateLink={() => onToggleChorusTemplateLink(section.id)}
              onLinkAllChorusLyrics={onLinkAllChorusLyrics}
              onUnlinkAllChorusLyrics={onUnlinkAllChorusLyrics}
              onLinkAllChorusTemplates={onLinkAllChorusTemplates}
              onUnlinkAllChorusTemplates={onUnlinkAllChorusTemplates}
              onTemplateNotationChange={(notation) =>
                onSectionTemplateNotationChange(section.id, notation)
              }
              songKey={songKey}
              bpm={bpm}
              timeSignature={timeSignature}
              metronomeEnabled={metronomeEnabled}
            />
          );
        })}
      </div>
      <div className="words-section-add-row">
        <button className="words-button words-button-add" type="button" onClick={() => onAddSection('verse')}>
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          verse
        </button>
        <button className="words-button words-button-add" type="button" onClick={() => onAddSection('chorus')}>
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          chorus
        </button>
        <button className="words-button words-button-add" type="button" onClick={() => onAddSection('bridge')}>
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          bridge
        </button>
        <button className="words-button words-button-add" type="button" onClick={onImportLyrics}>
          <span className="material-symbols-outlined" aria-hidden="true">content_paste</span>
          import lyrics
        </button>
      </div>
    </article>
  );
}
