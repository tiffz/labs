import type { RefObject } from 'react';
import type { ParsedRhythm, TimeSignature } from '../../shared/rhythm/types';
import type { Key } from '../../shared/music/chordTypes';
import type { SongSection, SongSectionType } from '../../shared/music/songSections';
import type { SectionSettingsPosition } from '../hooks/useSectionSettingsPortalPosition';
import type { RandomizeMode } from '../utils/randomizeModes';
import WordsSectionCard from './WordsSectionCard';

type TemplatePreset = { id: string; label: string; notation: string };

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
  activeSectionLoopId: string | null;
  isPlaying: boolean;
  sectionTemplatePreviewById: Map<string, ParsedRhythm>;
  templatePresets: TemplatePreset[];
  defaultTemplateNotation: string;
  songKey: Key;
  bpm: number;
  timeSignature: TimeSignature;
  metronomeEnabled: boolean;
  sectionSettingsMenuRef: RefObject<HTMLDivElement | null>;
  sectionRandomizeMenuRef: RefObject<HTMLDivElement | null>;
  sectionSettingsAnchorRefs: RefObject<Map<string, HTMLDivElement>>;
  sectionRandomizeAnchorRefs: RefObject<Map<string, HTMLDivElement>>;
  findTemplatePresetByNotation: (notation: string) => TemplatePreset | undefined;
  getTemplateVariations: (presetId: string) => readonly { notation: string; label: string }[];
  getTemplateVariationIndex: (presetId: string, notation: string) => number;
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
  onScrollSectionIntoNotation: (sectionId: string) => void;
  onMoveSection: (sectionId: string, delta: -1 | 1) => void;
  onRemoveSection: (sectionId: string) => void;
  onSectionChordProgressionChange: (sectionId: string, value: string) => void;
  onRandomizeSectionChords: (sectionId: string) => void;
  onSectionChordStyleChange: (sectionId: string, styleId: string) => void;
  onRandomizeSectionChordStyle: (sectionId: string) => void;
  onToggleChorusTemplateLink: (sectionId: string) => void;
  onSectionTemplateNotationChange: (sectionId: string, notation: string) => void;
  onRandomizeSectionTemplate: (sectionId: string, mode: 'preset' | 'full') => void;
  onAddSection: (type: SongSectionType) => void;
  onImportLyrics: () => void;
};

export default function WordsSectionsColumn({
  columnRef,
  sections,
  effectiveSections,
  sectionDisplayNames,
  openSectionSettingsId,
  sectionSettingsPosition,
  sectionRandomizeMenuId,
  activeSectionLoopId,
  isPlaying,
  sectionTemplatePreviewById,
  templatePresets,
  defaultTemplateNotation,
  songKey,
  bpm,
  timeSignature,
  metronomeEnabled,
  sectionSettingsMenuRef,
  sectionRandomizeMenuRef,
  sectionSettingsAnchorRefs,
  sectionRandomizeAnchorRefs,
  findTemplatePresetByNotation,
  getTemplateVariations,
  getTemplateVariationIndex,
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
  onScrollSectionIntoNotation,
  onMoveSection,
  onRemoveSection,
  onSectionChordProgressionChange,
  onRandomizeSectionChords,
  onSectionChordStyleChange,
  onRandomizeSectionChordStyle,
  onToggleChorusTemplateLink,
  onSectionTemplateNotationChange,
  onRandomizeSectionTemplate,
  onAddSection,
  onImportLyrics,
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
          const selectedTemplatePreset = findTemplatePresetByNotation(section.templateNotation);
          const sectionTemplateVariations = selectedTemplatePreset
            ? getTemplateVariations(selectedTemplatePreset.id)
            : [];
          const sectionActiveVariationIndex = selectedTemplatePreset
            ? getTemplateVariationIndex(selectedTemplatePreset.id, section.templateNotation ?? '')
            : -1;

          return (
            <WordsSectionCard
              key={section.id}
              section={section}
              effectiveLyrics={effectiveSection.effectiveLyrics}
              sectionDisplayName={sectionDisplayName}
              isSettingsOpen={openSectionSettingsId === section.id}
              settingsPosition={sectionSettingsPosition}
              isLoopActive={isPlaying && activeSectionLoopId === section.id}
              isRandomizeMenuOpen={sectionRandomizeMenuId === section.id}
              randomizeAnchorEl={sectionRandomizeAnchorRefs.current?.get(section.id) ?? null}
              selectedTemplatePreset={selectedTemplatePreset ?? null}
              sectionTemplateVariations={sectionTemplateVariations}
              sectionActiveVariationIndex={sectionActiveVariationIndex}
              templatePreview={sectionTemplatePreviewById.get(section.id)}
              templatePresets={templatePresets}
              defaultTemplateNotation={defaultTemplateNotation}
              settingsMenuRef={sectionSettingsMenuRef}
              randomizeMenuRef={sectionRandomizeMenuRef}
              settingsAnchorRef={(element) => {
                if (element) sectionSettingsAnchorRefs.current?.set(section.id, element);
                else sectionSettingsAnchorRefs.current?.delete(section.id);
              }}
              randomizeAnchorRef={(element) => {
                if (element) sectionRandomizeAnchorRefs.current?.set(section.id, element);
                else sectionRandomizeAnchorRefs.current?.delete(section.id);
              }}
              onToggleSettings={() => onToggleSectionSettings(section.id)}
              onTypeChange={(type) => onSectionTypeChange(section.id, type)}
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
              onChordProgressionChange={(value) => onSectionChordProgressionChange(section.id, value)}
              onRandomizeChords={() => onRandomizeSectionChords(section.id)}
              onChordStyleChange={(styleId) => onSectionChordStyleChange(section.id, styleId)}
              onRandomizeChordStyle={() => onRandomizeSectionChordStyle(section.id)}
              onToggleChorusLyricsLinkInSettings={() => onToggleChorusLyricsLink(section.id)}
              onToggleChorusTemplateLink={() => onToggleChorusTemplateLink(section.id)}
              onTemplateNotationChange={(notation) =>
                onSectionTemplateNotationChange(section.id, notation)
              }
              onRandomizeTemplate={(mode) => onRandomizeSectionTemplate(section.id, mode)}
              onTemplateVariationPrevious={() => {
                const current = sectionActiveVariationIndex >= 0 ? sectionActiveVariationIndex : 0;
                const prevIndex =
                  (current - 1 + sectionTemplateVariations.length) % sectionTemplateVariations.length;
                onSectionTemplateNotationChange(
                  section.id,
                  sectionTemplateVariations[prevIndex].notation,
                );
              }}
              onTemplateVariationNext={() => {
                const current = sectionActiveVariationIndex >= 0 ? sectionActiveVariationIndex : 0;
                const nextIndex = (current + 1) % sectionTemplateVariations.length;
                onSectionTemplateNotationChange(
                  section.id,
                  sectionTemplateVariations[nextIndex].notation,
                );
              }}
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
