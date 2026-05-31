import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { parseProgressionText } from '../../shared/music/chordProgressionText';
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
import type { Key } from '../../shared/music/chordTypes';
import {
  cloneSectionsSnapshot,
  normalizeSectionsSnapshot,
} from '../utils/sectionSnapshot';
import {
  DEFAULT_SECTIONS,
  DEFAULT_SONG_KEY,
  MAX_UNDO_HISTORY,
  SECTION_CREATE_DEFAULTS,
} from '../utils/wordsAppDefaults';

export function useWordsSectionsState() {
  const [sections, setSections] = useState<SongSection[]>(DEFAULT_SECTIONS);
  const [songKey, setSongKey] = useState<Key>(DEFAULT_SONG_KEY);
  const [lyricImportOpen, setLyricImportOpen] = useState(false);
  const [lyricImportText, setLyricImportText] = useState('');
  const undoHistoryRef = useRef<Array<{ sections: SongSection[]; songKey: Key }>>(
    []
  );
  const songKeyRef = useRef<Key>(songKey);

  useEffect(() => {
    songKeyRef.current = songKey;
  }, [songKey]);

  const pushUndoSnapshot = useCallback(
    (sectionsSnapshot: SongSection[], songKeySnapshot: Key) => {
      undoHistoryRef.current.push({
        sections: cloneSectionsSnapshot(sectionsSnapshot),
        songKey: songKeySnapshot,
      });
      if (undoHistoryRef.current.length > MAX_UNDO_HISTORY) {
        undoHistoryRef.current.shift();
      }
    },
    []
  );

  const applySectionsChange = useCallback(
    (transform: (previous: SongSection[]) => SongSection[]) => {
      setSections((previous) => {
        const next = normalizeSectionsSnapshot(transform(previous));
        if (next === previous) return previous;
        pushUndoSnapshot(previous, songKeyRef.current);
        return next;
      });
    },
    [pushUndoSnapshot]
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

  const removeSection = useCallback(
    (
      sectionId: string,
      sectionDisplayName: string,
      onBeforeRemove?: () => void
    ) => {
      if (sections.length <= 1) return;
      const confirmed = window.confirm(`Delete ${sectionDisplayName}?`);
      if (!confirmed) return;
      onBeforeRemove?.();
      applySectionsChange((previous) =>
        previous.filter((section) => section.id !== sectionId)
      );
    },
    [sections.length, applySectionsChange]
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

  const setSectionChordProgression = useCallback(
    (sectionId: string, input: string) => {
      updateSection(sectionId, (section) => ({
        ...section,
        chordProgressionInput: input,
      }));
      const parsed = parseProgressionText(input, songKeyRef.current);
      if (parsed.isValid && parsed.format === 'chord' && parsed.inferredKey) {
        setSongKey(parsed.inferredKey);
      }
    },
    [updateSection]
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

  const undoSectionsChange = useCallback(() => {
    const snapshot = undoHistoryRef.current.pop();
    if (!snapshot) return false;
    setSections(normalizeSectionsSnapshot(cloneSectionsSnapshot(snapshot.sections)));
    setSongKey(snapshot.songKey);
    return true;
  }, []);

  return {
    sections,
    setSections,
    songKey,
    setSongKey,
    lyricImportOpen,
    setLyricImportOpen,
    lyricImportText,
    applySectionsChange,
    updateSection,
    updateSectionLyrics,
    updateSectionTemplateNotation,
    addSection,
    removeSection,
    moveSection,
    setSectionChordProgression,
    openLyricImport,
    applyLyricImport,
    handleSectionLyricsPaste,
    undoSectionsChange,
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
