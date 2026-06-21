import { useMemo } from 'react';
import type { RefObject } from 'react';
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
  | 'sectionChorusLinkMenuId'
  | 'activeSectionLoopId'
  | 'isPlaying'
  | 'defaultTemplateNotation'
  | 'songKey'
  | 'bpm'
  | 'timeSignature'
  | 'metronomeEnabled'
>;

export function useWordsSectionsColumnProps(
  context: SectionColumnContext,
  refs: {
    sectionSettingsMenuRef: RefObject<HTMLDivElement | null>;
    sectionRandomizeMenuRef: RefObject<HTMLDivElement | null>;
    sectionChorusLinkMenuRef: RefObject<HTMLDivElement | null>;
    sectionSettingsAnchorRefs: RefObject<Map<string, HTMLDivElement>>;
    sectionRandomizeAnchorRefs: RefObject<Map<string, HTMLDivElement>>;
    sectionChorusLinkAnchorRefs: RefObject<Map<string, HTMLDivElement>>;
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
    | 'previewSectionChordProgression'
    | 'commitSectionChordProgression'
    | 'openLyricImport'
    | 'handleSectionLyricsPaste'
    | 'linkAllChorusLyrics'
    | 'unlinkAllChorusLyrics'
    | 'linkAllChorusTemplates'
    | 'unlinkAllChorusTemplates'
  >,
  actions: {
    applyRandomization: (mode: RandomizeMode, sectionId?: string) => void;
    randomizeChordProgression: (sectionId: string) => void;
    randomizeChordStyle: (sectionId: string) => void;
    scrollSectionIntoNotationView: (sectionId: string) => void;
    playSectionLoop: (sectionId: string, sectionIndex: number) => void;
    stopPlaybackImmediately: () => void;
    setOpenSectionSettingsId: React.Dispatch<React.SetStateAction<string | null>>;
    setSectionRandomizeMenuId: React.Dispatch<React.SetStateAction<string | null>>;
    setSectionChorusLinkMenuId: React.Dispatch<React.SetStateAction<string | null>>;
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
    previewSectionChordProgression,
    commitSectionChordProgression,
    openLyricImport,
    handleSectionLyricsPaste,
    linkAllChorusLyrics,
    unlinkAllChorusLyrics,
    linkAllChorusTemplates,
    unlinkAllChorusTemplates,
  } = sectionsState;

  return useMemo(
    () => ({
      ...context,
      sectionSettingsMenuRef: refs.sectionSettingsMenuRef,
      sectionRandomizeMenuRef: refs.sectionRandomizeMenuRef,
      sectionChorusLinkMenuRef: refs.sectionChorusLinkMenuRef,
      sectionSettingsAnchorRefs: refs.sectionSettingsAnchorRefs,
      sectionRandomizeAnchorRefs: refs.sectionRandomizeAnchorRefs,
      sectionChorusLinkAnchorRefs: refs.sectionChorusLinkAnchorRefs,
      onToggleSectionSettings: (sectionId: string) =>
        actions.setOpenSectionSettingsId((previous) => {
          actions.setGenerationMenuOpen(false);
          actions.setSoundMenuOpen(false);
          actions.setExportMenuOpen(false);
          actions.setSectionChorusLinkMenuId(null);
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
      onToggleSectionChorusLinkMenu: (sectionId) =>
        actions.setSectionChorusLinkMenuId((previous) => {
          actions.setOpenSectionSettingsId(null);
          actions.setSectionRandomizeMenuId(null);
          return previous === sectionId ? null : sectionId;
        }),
      onCloseSectionChorusLinkMenu: () => actions.setSectionChorusLinkMenuId(null),
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
            if (context.sectionChorusLinkMenuId === sectionId) {
              actions.setSectionChorusLinkMenuId(null);
            }
          }
        );
      },
      onSectionChordProgressionPreview: previewSectionChordProgression,
      onSectionChordProgressionCommit: commitSectionChordProgression,
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
      onAddSection: addSection,
      onImportLyrics: () =>
        openLyricImport(
          sections.map((section) => section.lyrics).filter(Boolean).join('\n\n')
        ),
      onLinkAllChorusLyrics: linkAllChorusLyrics,
      onUnlinkAllChorusLyrics: unlinkAllChorusLyrics,
      onLinkAllChorusTemplates: linkAllChorusTemplates,
      onUnlinkAllChorusTemplates: unlinkAllChorusTemplates,
    }),
    [
      context,
      refs.sectionSettingsMenuRef,
      refs.sectionRandomizeMenuRef,
      refs.sectionChorusLinkMenuRef,
      refs.sectionSettingsAnchorRefs,
      refs.sectionRandomizeAnchorRefs,
      refs.sectionChorusLinkAnchorRefs,
      sections,
      updateSection,
      updateSectionLyrics,
      updateSectionTemplateNotation,
      addSection,
      removeSection,
      moveSection,
      previewSectionChordProgression,
      commitSectionChordProgression,
      openLyricImport,
      handleSectionLyricsPaste,
      linkAllChorusLyrics,
      unlinkAllChorusLyrics,
      linkAllChorusTemplates,
      unlinkAllChorusTemplates,
      actions,
    ]
  );
}
