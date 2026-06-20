import { useCallback, useEffect, useRef, useState } from 'react';
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

function initialLayout(chordPro: string): ChartLayout {
  const trimmed = chordPro.trim();
  if (!trimmed) {
    return parseChordProToChartLayout(FULL_STRUCTURAL_BLUEPRINT);
  }
  return chartDocumentToChartLayout(chordPro);
}

export type UseOriginalsChartLayoutResult = {
  layout: ChartLayout;
  writeDocument: string;
  armedChord: string | null;
  setArmedChord: (chord: string | null) => void;
  selectedChord: ChordInteractionTarget | null;
  selectedWord: WordInteractionTarget | null;
  onWriteChange: (doc: string) => void;
  onImportPastedChart: (raw: string) => PastedChartImportSummary;
  onStamp: (sectionId: string, lineId: string, charIndex: number) => void;
  onRemoveChord: (sectionId: string, lineId: string, chordId: string) => void;
  onSwapChord: (target: ChordInteractionTarget, chordName: string) => void;
  onPlaceChord: (target: WordInteractionTarget, chordName: string) => void;
  onSelectChord: (target: ChordInteractionTarget) => void;
  onSelectWord: (target: WordInteractionTarget) => void;
  onClearSelection: () => void;
};

export function useOriginalsChartLayout(
  value: string,
  onChange: (chordPro: string) => void,
): UseOriginalsChartLayoutResult {
  const [layout, setLayout] = useState<ChartLayout>(() => initialLayout(value));
  const [armedChord, setArmedChord] = useState<string | null>(null);
  const [selectedChord, setSelectedChord] = useState<ChordInteractionTarget | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordInteractionTarget | null>(null);
  const externalValueRef = useRef(value);

  useEffect(() => {
    if (value === externalValueRef.current) return;
    externalValueRef.current = value;
    setLayout(initialLayout(value));
  }, [value]);

  const commitLayout = useCallback(
    (next: ChartLayout) => {
      setLayout(next);
      const chordPro = serializeChartLayoutToChordPro(next);
      externalValueRef.current = chordPro;
      onChange(chordPro);
    },
    [onChange],
  );

  const writeDocument = layoutToWriteDocument(layout);

  const onWriteChange = useCallback(
    (doc: string) => {
      const hasExplicitHeaders = doc
        .split('\n')
        .some((line) => parseChordProSectionHeader(line.trim()));
      let next = parseWriteDocumentToLayout(doc, layout);
      if (!hasExplicitHeaders && looksLikeFullSongLyrics(doc)) {
        const inferred = chartLayoutFromPlainLyrics(doc);
        if (inferred.sections.length > 1) next = inferred;
      }
      commitLayout(next);
    },
    [commitLayout, layout],
  );

  const onImportPastedChart = useCallback(
    (raw: string): PastedChartImportSummary => {
      const result = importPastedChartFromClipboard(raw);
      if (result.ok && result.layout) {
        commitLayout(result.layout);
      }
      return result;
    },
    [commitLayout],
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

  return {
    layout,
    writeDocument,
    armedChord,
    setArmedChord,
    selectedChord,
    selectedWord,
    onWriteChange,
    onImportPastedChart,
    onStamp,
    onRemoveChord,
    onSwapChord,
    onPlaceChord,
    onSelectChord,
    onSelectWord,
    onClearSelection,
  };
}
