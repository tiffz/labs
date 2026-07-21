import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  createDefaultSection,
  findPreviousChorus,
  type SongSection,
  type SongSectionType,
} from '../../shared/music/songSections';
import {
  looksLikeFullSongLyrics,
  type ParsedLyricSectionDraft,
} from '../../shared/music/lyricSectionParser';
import type { SongKey } from '../../shared/music/songKeyFormat';
import {
  cloneSectionsSnapshot,
  normalizeSectionsSnapshot,
} from '../utils/sectionSnapshot';
import {
  applyLinkAllChorusLyrics,
  applyLinkAllChorusTemplates,
  applyUnlinkAllChorusLyrics,
  applyUnlinkAllChorusTemplates,
} from '../utils/wordsChorusLinking';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import type { LabsUndoCommit } from '../../shared/undo/labsUndoStack';
import {
  cloneWordsDocumentSnapshot,
  type WordsDocumentSnapshot,
} from '../utils/wordsDocumentSnapshot';
import {
  DEFAULT_SECTIONS,
  DEFAULT_SONG_KEY,
  SECTION_CREATE_DEFAULTS,
} from '../utils/wordsAppDefaults';
import { useLabsConfirm } from '../../shared/components/useLabsConfirm';

export function useWordsSectionsState() {
  const { push, isReplayingRef } = useLabsUndo();
  const [sections, setSections] = useState<SongSection[]>(DEFAULT_SECTIONS);
  const [songKey, setSongKey] = useState<SongKey>(DEFAULT_SONG_KEY);
  const [lyricImportOpen, setLyricImportOpen] = useState(false);
  const [lyricImportText, setLyricImportText] = useState('');
  const sectionsRef = useRef(sections);
  const songKeyRef = useRef<SongKey>(songKey);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  useEffect(() => {
    songKeyRef.current = songKey;
  }, [songKey]);

  const pushDocumentUndo = useCallback(
    (before: WordsDocumentSnapshot, after: WordsDocumentSnapshot) => {
      if (isReplayingRef.current) return;
      const beforeClone = cloneWordsDocumentSnapshot(before);
      const afterClone = cloneWordsDocumentSnapshot(after);
      push({
        undo: () => {
          isReplayingRef.current = true;
          setSections(
            normalizeSectionsSnapshot(cloneSectionsSnapshot(beforeClone.sections))
          );
          setSongKey(beforeClone.songKey);
          isReplayingRef.current = false;
        },
        redo: () => {
          isReplayingRef.current = true;
          setSections(
            normalizeSectionsSnapshot(cloneSectionsSnapshot(afterClone.sections))
          );
          setSongKey(afterClone.songKey);
          isReplayingRef.current = false;
        },
      });
    },
    [push, isReplayingRef]
  );

  const pushManualUndo = useCallback(
    (commit: LabsUndoCommit) => {
      if (!isReplayingRef.current) push(commit);
    },
    [push, isReplayingRef]
  );

  const applyDocumentChange = useCallback(
    (transform: (previous: WordsDocumentSnapshot) => WordsDocumentSnapshot | null) => {
      const previous: WordsDocumentSnapshot = {
        sections: sectionsRef.current,
        songKey: songKeyRef.current,
      };
      const result = transform(previous);
      if (!result) return;
      const nextSections = normalizeSectionsSnapshot(result.sections);
      if (nextSections === previous.sections && result.songKey === previous.songKey) {
        return;
      }
      pushDocumentUndo(previous, {
        sections: nextSections,
        songKey: result.songKey,
      });
      setSections(nextSections);
      setSongKey(result.songKey);
    },
    [pushDocumentUndo]
  );

  const applySectionsChange = useCallback(
    (transform: (previous: SongSection[]) => SongSection[]) => {
      applyDocumentChange((previous) => ({
        sections: transform(previous.sections),
        songKey: previous.songKey,
      }));
    },
    [applyDocumentChange]
  );

  const updateSection = useCallback(
    (sectionId: string, updater: (section: SongSection) => SongSection) => {
      applySectionsChange((previous) =>
        previous.map((section) =>
          section.id === sectionId ? updater(section) : section
        )
      );
    },
    [applySectionsChange]
  );

  const updateSectionLyrics = useCallback(
    (sectionId: string, lyrics: string) => {
      applySectionsChange((previous) =>
        previous.map((section) => {
          const edited = previous.find((candidate) => candidate.id === sectionId);
          if (
            edited?.type === 'chorus' &&
            edited.linkedToPreviousChorusLyrics &&
            section.type === 'chorus' &&
            section.linkedToPreviousChorusLyrics
          ) {
            return { ...section, lyrics };
          }
          if (section.id === sectionId) return { ...section, lyrics };
          return section;
        })
      );
    },
    [applySectionsChange]
  );

  const updateSectionTemplateNotation = useCallback(
    (sectionId: string, templateNotation: string) => {
      applySectionsChange((previous) =>
        previous.map((section) => {
          const edited = previous.find((candidate) => candidate.id === sectionId);
          if (
            edited?.type === 'chorus' &&
            edited.linkedToPreviousChorusTemplate &&
            section.type === 'chorus' &&
            section.linkedToPreviousChorusTemplate
          ) {
            return { ...section, templateNotation };
          }
          if (section.id === sectionId) return { ...section, templateNotation };
          return section;
        })
      );
    },
    [applySectionsChange]
  );

  const addSection = useCallback(
    (type: SongSectionType) => {
      applySectionsChange((previous) => {
        const previousChorus =
          type === 'chorus'
            ? findPreviousChorus(previous, previous.length)
            : null;
        const nextSection = createDefaultSection(
          type,
          SECTION_CREATE_DEFAULTS,
          previousChorus ?? undefined
        );
        if (type === 'chorus') {
          nextSection.linkedToPreviousChorusLyrics = true;
          nextSection.linkedToPreviousChorusTemplate = true;
        }
        return [...previous, nextSection];
      });
    },
    [applySectionsChange]
  );

  const { confirm: confirmRemoveSection, dialog: removeSectionDialog } = useLabsConfirm();
  const removeSection = useCallback(
    async (
      sectionId: string,
      sectionDisplayName: string,
      onBeforeRemove?: () => void
    ) => {
      if (sections.length <= 1) return;
      const confirmed = await confirmRemoveSection({
        title: `Delete ${sectionDisplayName}?`,
        message: 'This cannot be undone.',
      });
      if (!confirmed) return;
      onBeforeRemove?.();
      applySectionsChange((previous) =>
        previous.filter((section) => section.id !== sectionId)
      );
    },
    [sections.length, applySectionsChange, confirmRemoveSection]
  );

  const moveSection = useCallback(
    (sectionId: string, direction: -1 | 1) => {
      applySectionsChange((previous) => {
        const index = previous.findIndex((section) => section.id === sectionId);
        if (index < 0) return previous;
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= previous.length) return previous;
        const next = [...previous];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
    },
    [applySectionsChange]
  );

  const previewSectionChordProgression = useCallback((sectionId: string, input: string) => {
    setSections((previous) =>
      previous.map((section) =>
        section.id === sectionId ? { ...section, chordProgressionInput: input } : section
      )
    );
  }, []);

  const commitSectionChordProgression = useCallback(
    (sectionId: string, input: string) => {
      const section = sectionsRef.current.find((candidate) => candidate.id === sectionId);
      if (!section || section.chordProgressionInput === input) return;
      applySectionsChange((previous) =>
        previous.map((entry) =>
          entry.id === sectionId ? { ...entry, chordProgressionInput: input } : entry
        )
      );
    },
    [applySectionsChange]
  );

  const openLyricImport = useCallback((rawText: string) => {
    if (!rawText.trim()) return;
    setLyricImportText(rawText);
    setLyricImportOpen(true);
  }, []);

  const applyLyricImport = useCallback(
    (drafts: ParsedLyricSectionDraft[]) => {
      const nextSections: SongSection[] = [];
      drafts
        .filter((draft) => draft.lyrics.trim().length > 0)
        .forEach((draft) => {
          const previousChorus = findPreviousChorus(nextSections, nextSections.length);
          const nextSection = createDefaultSection(
            draft.type,
            SECTION_CREATE_DEFAULTS,
            previousChorus ?? undefined
          );
          nextSection.type = draft.type;
          nextSection.lyrics = draft.lyrics.trim();
          nextSection.linkedToPreviousChorusLyrics =
            draft.type === 'chorus' ? Boolean(draft.suggestedChorusLink) : false;
          nextSection.linkedToPreviousChorusTemplate =
            draft.type === 'chorus' ? true : false;
          nextSections.push(nextSection);
        });
      if (nextSections.length === 0) return;
      applySectionsChange(() => nextSections);
      setLyricImportOpen(false);
    },
    [applySectionsChange]
  );

  const handleSectionLyricsPaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pastedText = event.clipboardData.getData('text/plain');
      if (!looksLikeFullSongLyrics(pastedText)) return;
      event.preventDefault();
      openLyricImport(pastedText);
    },
    [openLyricImport]
  );

  const linkAllChorusLyrics = useCallback(() => {
    applySectionsChange(applyLinkAllChorusLyrics);
  }, [applySectionsChange]);

  const unlinkAllChorusLyrics = useCallback(() => {
    applySectionsChange(applyUnlinkAllChorusLyrics);
  }, [applySectionsChange]);

  const linkAllChorusTemplates = useCallback(() => {
    applySectionsChange(applyLinkAllChorusTemplates);
  }, [applySectionsChange]);

  const unlinkAllChorusTemplates = useCallback(() => {
    applySectionsChange(applyUnlinkAllChorusTemplates);
  }, [applySectionsChange]);

  return {
    sections,
    setSections,
    songKey,
    setSongKey,
    lyricImportOpen,
    setLyricImportOpen,
    lyricImportText,
    applySectionsChange,
    applyDocumentChange,
    pushManualUndo,
    updateSection,
    updateSectionLyrics,
    updateSectionTemplateNotation,
    addSection,
    removeSection,
    moveSection,
    previewSectionChordProgression,
    commitSectionChordProgression,
    openLyricImport,
    applyLyricImport,
    handleSectionLyricsPaste,
    linkAllChorusLyrics,
    unlinkAllChorusLyrics,
    linkAllChorusTemplates,
    unlinkAllChorusTemplates,
    removeSectionDialog,
  };
}

export type WordsSectionsState = ReturnType<typeof useWordsSectionsState>;

export function useWordsSectionScroll(
  notationScrollRef: RefObject<HTMLElement | null>,
  notationSectionRefs: RefObject<Map<string, HTMLElement>>
) {
  return useCallback(
    (sectionId: string) => {
      const container = notationScrollRef.current;
      const target = notationSectionRefs.current.get(sectionId);
      if (!container || !target) return;
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const upperBuffer = 72;
      const lowerBuffer = 120;
      if (
        targetRect.top >= containerRect.top + upperBuffer &&
        targetRect.bottom <= containerRect.bottom - lowerBuffer
      ) {
        return;
      }
      const targetTopWithinContainer =
        targetRect.top - containerRect.top + container.scrollTop;
      const desiredTop = Math.max(0, targetTopWithinContainer - upperBuffer);
      container.scrollTo({ top: desiredTop, behavior: 'auto' });
    },
    [notationScrollRef, notationSectionRefs]
  );
}
