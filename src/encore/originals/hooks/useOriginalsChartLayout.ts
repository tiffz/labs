import { useCallback, useEffect, useRef, useState } from 'react';
import { applyProgressionToChartSection, type ApplySectionProgressionResult } from '../../../shared/music/chordPro/applySectionProgression';
import {
  layoutToWriteDocument,
  moveChordById,
  parseChordProToChartLayout,
  parseWriteDocumentToLayout,
  removeChordById,
  replaceChordById,
  serializeChartLayoutToChordPro,
  snapChordColumnToCharIndex,
  updateLineInLayout,
  upsertChordAtIndex,
  type ChartLayout,
} from '../../../shared/music/chordPro/chordChartLayout';
import { parseChordProSectionHeader } from '../../../shared/music/chordPro/chordProText';
import {
  importPastedChartFromClipboard,
  type PastedChartImportSummary,
} from '../../../shared/music/chordPro/pastedChartImport';
import { looksLikeFullSongLyrics } from '../../../shared/music/lyricSectionParser';
import {
  chartDocumentToChartLayout,
  chartLayoutFromPlainLyrics,
} from '../../../shared/music/lyrics/lyricsToChartLayout';
import type { ChordInteractionTarget, WordInteractionTarget } from '../chartInteractionTypes';
import { FULL_STRUCTURAL_BLUEPRINT } from '../originalsStructurePresets';

export type { ChordInteractionTarget, WordInteractionTarget } from '../chartInteractionTypes';

/** Delay chord reconciliation while the user is still typing in Write mode. */
export const ORIGINALS_WRITE_RECONCILE_DEBOUNCE_MS = 800;

function initialLayout(chordPro: string): ChartLayout {
  const trimmed = chordPro.trim();
  if (!trimmed) {
    return parseChordProToChartLayout(FULL_STRUCTURAL_BLUEPRINT);
  }
  return chartDocumentToChartLayout(chordPro);
}

function layoutFromWriteDocument(doc: string, previous: ChartLayout): ChartLayout {
  const hasExplicitHeaders = doc
    .split('\n')
    .some((line) => parseChordProSectionHeader(line.trim()));
  let next = parseWriteDocumentToLayout(doc, previous);
  if (!hasExplicitHeaders && looksLikeFullSongLyrics(doc)) {
    const inferred = chartLayoutFromPlainLyrics(doc);
    if (inferred.sections.length > 1) next = inferred;
  }
  return next;
}

export type UseOriginalsChartLayoutResult = {
  layout: ChartLayout;
  writeDocument: string;
  armedChord: string | null;
  setArmedChord: (chord: string | null) => void;
  selectedChord: ChordInteractionTarget | null;
  selectedWord: WordInteractionTarget | null;
  onWriteChange: (doc: string) => void;
  /** Apply pending write edits to chord markers (call when leaving Write or on debounce). */
  flushWriteReconcile: () => void;
  onImportPastedChart: (raw: string) => PastedChartImportSummary;
  onStamp: (sectionId: string, lineId: string, charIndex: number) => void;
  onRemoveChord: (sectionId: string, lineId: string, chordId: string) => void;
  onSwapChord: (target: ChordInteractionTarget, chordName: string) => void;
  onPlaceChord: (target: WordInteractionTarget, chordName: string) => void;
  onSelectChord: (target: ChordInteractionTarget) => void;
  onSelectWord: (target: WordInteractionTarget) => void;
  onClearSelection: () => void;
  onApplySectionProgression: (sectionId: string, progression: string) => ApplySectionProgressionResult;
};

export function useOriginalsChartLayout(
  value: string,
  onChange: (chordPro: string) => void,
  songKey: string,
): UseOriginalsChartLayoutResult {
  const [layout, setLayout] = useState<ChartLayout>(() => initialLayout(value));
  const [writeDraft, setWriteDraft] = useState(() => layoutToWriteDocument(initialLayout(value)));
  const [armedChord, setArmedChord] = useState<string | null>(null);
  const [selectedChord, setSelectedChord] = useState<ChordInteractionTarget | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordInteractionTarget | null>(null);
  const externalValueRef = useRef(value);
  const layoutRef = useRef(layout);
  const writeDraftRef = useRef(writeDraft);
  const writeReconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  layoutRef.current = layout;
  writeDraftRef.current = writeDraft;

  useEffect(() => {
    if (value === externalValueRef.current) return;
    externalValueRef.current = value;
    const nextLayout = initialLayout(value);
    setLayout(nextLayout);
    setWriteDraft(layoutToWriteDocument(nextLayout));
  }, [value]);

  const commitLayout = useCallback(
    (next: ChartLayout, opts?: { syncWriteDraft?: boolean }) => {
      setLayout(next);
      if (opts?.syncWriteDraft !== false) {
        setWriteDraft(layoutToWriteDocument(next));
      }
      const chordPro = serializeChartLayoutToChordPro(next);
      externalValueRef.current = chordPro;
      onChange(chordPro);
    },
    [onChange],
  );

  const cancelWriteReconcileTimer = useCallback(() => {
    if (writeReconcileTimerRef.current) {
      clearTimeout(writeReconcileTimerRef.current);
      writeReconcileTimerRef.current = null;
    }
  }, []);

  const flushWriteReconcile = useCallback(() => {
    cancelWriteReconcileTimer();
    const doc = writeDraftRef.current;
    const prev = layoutRef.current;
    if (doc === layoutToWriteDocument(prev)) return;
    const next = layoutFromWriteDocument(doc, prev);
    commitLayout(next);
  }, [cancelWriteReconcileTimer, commitLayout]);

  useEffect(() => () => cancelWriteReconcileTimer(), [cancelWriteReconcileTimer]);

  const scheduleWriteReconcile = useCallback(() => {
    cancelWriteReconcileTimer();
    writeReconcileTimerRef.current = setTimeout(() => {
      writeReconcileTimerRef.current = null;
      flushWriteReconcile();
    }, ORIGINALS_WRITE_RECONCILE_DEBOUNCE_MS);
  }, [cancelWriteReconcileTimer, flushWriteReconcile]);

  const onWriteChange = useCallback(
    (doc: string) => {
      writeDraftRef.current = doc;
      setWriteDraft(doc);
      scheduleWriteReconcile();
    },
    [scheduleWriteReconcile],
  );

  const onImportPastedChart = useCallback(
    (raw: string): PastedChartImportSummary => {
      cancelWriteReconcileTimer();
      const result = importPastedChartFromClipboard(raw);
      if (result.ok && result.layout) {
        commitLayout(result.layout);
      }
      return result;
    },
    [cancelWriteReconcileTimer, commitLayout],
  );

  const onClearSelection = useCallback(() => {
    setSelectedChord(null);
    setSelectedWord(null);
  }, []);

  const onSelectWord = useCallback((target: WordInteractionTarget) => {
    setSelectedWord((prev) => {
      const same =
        prev?.sectionId === target.sectionId &&
        prev.lineId === target.lineId &&
        prev.charIndex === target.charIndex;
      return same ? null : target;
    });
    setSelectedChord(null);
    setArmedChord(null);
  }, []);

  const onSelectChord = useCallback((target: ChordInteractionTarget) => {
    setSelectedChord((prev) => {
      const same =
        prev?.sectionId === target.sectionId &&
        prev.lineId === target.lineId &&
        prev.chordId === target.chordId;
      return same ? null : target;
    });
    setSelectedWord(null);
    setArmedChord(null);
  }, []);

  const onPlaceChord = useCallback(
    (target: WordInteractionTarget, chordName: string) => {
      commitLayout(
        updateLineInLayout(layout, target.sectionId, target.lineId, (line) =>
          upsertChordAtIndex(line, target.charIndex, chordName),
        ),
      );
      setSelectedWord(null);
      setArmedChord(null);
    },
    [commitLayout, layout],
  );

  const onSwapChord = useCallback(
    (target: ChordInteractionTarget, chordName: string) => {
      commitLayout(
        updateLineInLayout(layout, target.sectionId, target.lineId, (line) =>
          replaceChordById(line, target.chordId, chordName),
        ),
      );
    },
    [commitLayout, layout],
  );

  const onStamp = useCallback(
    (sectionId: string, lineId: string, charIndex: number) => {
      if (selectedChord) {
        if (selectedChord.sectionId !== sectionId || selectedChord.lineId !== lineId) return;
        const line = layout.sections
          .find((s) => s.sectionId === sectionId)
          ?.lines.find((l) => l.lineId === lineId);
        if (!line) return;
        const toIdx = line.text.trim() ? snapChordColumnToCharIndex(charIndex, line.text) : charIndex;
        const fromIdx = line.text.trim()
          ? snapChordColumnToCharIndex(selectedChord.charIndex, line.text)
          : selectedChord.charIndex;
        if (fromIdx === toIdx) return;
        commitLayout(
          updateLineInLayout(layout, sectionId, lineId, (line) =>
            moveChordById(line, selectedChord.chordId, toIdx),
          ),
        );
        setSelectedChord({ ...selectedChord, charIndex: toIdx });
        return;
      }
      if (!armedChord) return;
      commitLayout(
        updateLineInLayout(layout, sectionId, lineId, (line) => upsertChordAtIndex(line, charIndex, armedChord)),
      );
    },
    [armedChord, commitLayout, layout, selectedChord],
  );

  const onRemoveChord = useCallback(
    (sectionId: string, lineId: string, chordId: string) => {
      commitLayout(
        updateLineInLayout(layout, sectionId, lineId, (line) => removeChordById(line, chordId)),
      );
      if (
        selectedChord?.sectionId === sectionId &&
        selectedChord.lineId === lineId &&
        selectedChord.chordId === chordId
      ) {
        setSelectedChord(null);
      }
      if (selectedWord?.sectionId === sectionId && selectedWord.lineId === lineId) {
        const line = layout.sections
          .find((s) => s.sectionId === sectionId)
          ?.lines.find((l) => l.lineId === lineId);
        const removed = line?.chords.find((c) => c.id === chordId);
        if (removed && selectedWord.charIndex === removed.charIndex) {
          const remaining = line?.chords.filter(
            (c) => c.id !== chordId && c.charIndex === removed.charIndex,
          );
          if (!remaining?.length) setSelectedWord(null);
        }
      }
    },
    [commitLayout, layout, selectedChord, selectedWord],
  );

  const onApplySectionProgression = useCallback(
    (sectionId: string, progression: string): ApplySectionProgressionResult => {
      const { layout: next, result } = applyProgressionToChartSection(
        layout,
        sectionId,
        progression,
        songKey,
      );
      if (result.ok) {
        commitLayout(next);
        onClearSelection();
        setArmedChord(null);
      }
      return result;
    },
    [commitLayout, layout, onClearSelection, songKey],
  );

  return {
    layout,
    writeDocument: writeDraft,
    armedChord,
    setArmedChord,
    selectedChord,
    selectedWord,
    onWriteChange,
    flushWriteReconcile,
    onImportPastedChart,
    onStamp,
    onRemoveChord,
    onSwapChord,
    onPlaceChord,
    onSelectChord,
    onSelectWord,
    onClearSelection,
    onApplySectionProgression,
  };
}
