import { useMemo } from 'react';
import type { RefObject } from 'react';
import { getTemplatePresetVariationIndex, getTemplatePresetVariations } from '../../shared/rhythm/presetDatabase';
import type { ChordStyleId } from '../../shared/music/chordStyleOptions';
import type { WordsSectionsColumnProps } from '../components/WordsSectionsColumn';
import type { RandomizeMode } from '../utils/randomizeModes';
import type { WordsSectionsState } from './useWordsSectionsState';

type SectionColumnContext = Pick<
  WordsSectionsColumnProps,
  | 'sections'
  | 'effectiveSections'
  | 'sectionDisplayNames'
  | 'openSectionSettingsId'
  | 'sectionSettingsPosition'
  | 'sectionRandomizeMenuId'
  | 'activeSectionLoopId'
  | 'isPlaying'
  | 'sectionTemplatePreviewById'
  | 'templatePresets'
  | 'defaultTemplateNotation'
  | 'songKey'
  | 'bpm'
  | 'timeSignature'
  | 'metronomeEnabled'
  | 'findTemplatePresetByNotation'
>;

export function useWordsSectionsColumnProps(
  context: SectionColumnContext,
  refs: {
    sectionSettingsMenuRef: RefObject<HTMLDivElement | null>;
    sectionRandomizeMenuRef: RefObject<HTMLDivElement | null>;
    sectionSettingsAnchorRefs: RefObject<Map<string, HTMLDivElement>>;
    sectionRandomizeAnchorRefs: RefObject<Map<string, HTMLDivElement>>;
  },
  sectionsState: Pick<
    WordsSectionsState,
    | 'sections'
    | 'updateSection'
    | 'updateSectionLyrics'
    | 'updateSectionTemplateNotation'
    | 'addSection'
    | 'removeSection'
    | 'moveSection'
    | 'setSectionChordProgression'
    | 'openLyricImport'
    | 'handleSectionLyricsPaste'
  >,
  actions: {
    applyRandomization: (mode: RandomizeMode, sectionId?: string) => void;
    randomizeChordProgression: (sectionId: string) => void;
    randomizeChordStyle: (sectionId: string) => void;
    randomizeSectionTemplate: (sectionId: string, mode: 'preset' | 'full') => void;
    scrollSectionIntoNotationView: (sectionId: string) => void;
    playSectionLoop: (sectionId: string, sectionIndex: number) => void;
    stopPlaybackImmediately: () => void;
    setOpenSectionSettingsId: React.Dispatch<React.SetStateAction<string | null>>;
    setSectionRandomizeMenuId: React.Dispatch<React.SetStateAction<string | null>>;
    setGenerationMenuOpen: (open: boolean) => void;
    setSoundMenuOpen: (open: boolean) => void;
    setExportMenuOpen: (open: boolean) => void;
    setActiveSectionLoopId: (id: string | null) => void;
  }
): Omit<WordsSectionsColumnProps, 'columnRef'> {
  const {
    sections,
    updateSection,
    updateSectionLyrics,
    updateSectionTemplateNotation,
    addSection,
    removeSection,
    moveSection,
    setSectionChordProgression,
    openLyricImport,
    handleSectionLyricsPaste,
  } = sectionsState;

  return useMemo(
    () => ({
      ...context,
      sectionSettingsMenuRef: refs.sectionSettingsMenuRef,
      sectionRandomizeMenuRef: refs.sectionRandomizeMenuRef,
      sectionSettingsAnchorRefs: refs.sectionSettingsAnchorRefs,
      sectionRandomizeAnchorRefs: refs.sectionRandomizeAnchorRefs,
      getTemplateVariations: (presetId: string) =>
        getTemplatePresetVariations(presetId, context.timeSignature),
      getTemplateVariationIndex: (presetId: string, notationValue: string) =>
        getTemplatePresetVariationIndex(presetId, notationValue, context.timeSignature),
      onToggleSectionSettings: (sectionId: string) =>
        actions.setOpenSectionSettingsId((previous) => {
          actions.setGenerationMenuOpen(false);
          actions.setSoundMenuOpen(false);
          actions.setExportMenuOpen(false);
          return previous === sectionId ? null : sectionId;
        }),
      onSectionTypeChange: (sectionId, nextType) =>
        updateSection(sectionId, (previousSection) => ({
          ...previousSection,
          type: nextType,
          linkedToPreviousChorusLyrics: nextType === 'chorus',
          linkedToPreviousChorusTemplate: nextType === 'chorus',
        })),
      onToggleChorusLyricsLink: (sectionId) =>
        updateSection(sectionId, (previousSection) => ({
          ...previousSection,
          linkedToPreviousChorusLyrics: !previousSection.linkedToPreviousChorusLyrics,
        })),
      onSectionLyricsChange: updateSectionLyrics,
      onSectionLyricsPaste: handleSectionLyricsPaste,
      onToggleSectionLock: (sectionId) =>
        updateSection(sectionId, (previousSection) => ({
          ...previousSection,
          isLocked: !previousSection.isLocked,
        })),
      onToggleSectionLoop: (sectionId, index) => {
        if (context.isPlaying && context.activeSectionLoopId === sectionId) {
          actions.stopPlaybackImmediately();
          actions.setActiveSectionLoopId(null);
          return;
        }
        actions.playSectionLoop(sectionId, index);
      },
      onSectionRandomizeSelect: (sectionId, mode) => {
        actions.applyRandomization(mode, sectionId);
        actions.setSectionRandomizeMenuId(null);
      },
      onCloseSectionRandomizeMenu: () => actions.setSectionRandomizeMenuId(null),
      onToggleSectionRandomizeMenu: (sectionId) =>
        actions.setSectionRandomizeMenuId((previous) =>
          previous === sectionId ? null : sectionId
        ),
      onScrollSectionIntoNotation: actions.scrollSectionIntoNotationView,
      onMoveSection: moveSection,
      onRemoveSection: (sectionId) => {
        const index = sections.findIndex((section) => section.id === sectionId);
        removeSection(
          sectionId,
          context.sectionDisplayNames[index] ?? 'this section',
          () => {
            if (context.openSectionSettingsId === sectionId) {
              actions.setOpenSectionSettingsId(null);
            }
          }
        );
      },
      onSectionChordProgressionChange: setSectionChordProgression,
      onRandomizeSectionChords: actions.randomizeChordProgression,
      onSectionChordStyleChange: (sectionId, styleId) =>
        updateSection(sectionId, (previousSection) => ({
          ...previousSection,
          chordStyleId: styleId as ChordStyleId,
        })),
      onRandomizeSectionChordStyle: actions.randomizeChordStyle,
      onToggleChorusTemplateLink: (sectionId) =>
        updateSection(sectionId, (previousSection) => ({
          ...previousSection,
          linkedToPreviousChorusTemplate: !previousSection.linkedToPreviousChorusTemplate,
        })),
      onSectionTemplateNotationChange: updateSectionTemplateNotation,
      onRandomizeSectionTemplate: actions.randomizeSectionTemplate,
      onAddSection: addSection,
      onImportLyrics: () =>
        openLyricImport(
          sections.map((section) => section.lyrics).filter(Boolean).join('\n\n')
        ),
    }),
    [
      context,
      refs.sectionSettingsMenuRef,
      refs.sectionRandomizeMenuRef,
      refs.sectionSettingsAnchorRefs,
      refs.sectionRandomizeAnchorRefs,
      sections,
      updateSection,
      updateSectionLyrics,
      updateSectionTemplateNotation,
      addSection,
      removeSection,
      moveSection,
      setSectionChordProgression,
      openLyricImport,
      handleSectionLyricsPaste,
      actions,
    ]
  );
}
