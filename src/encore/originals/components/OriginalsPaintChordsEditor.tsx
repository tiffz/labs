import Box from '@mui/material/Box';
import { useEffect, type ReactElement, type ReactNode } from 'react';
import type { ChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import type { ChartPlaybackStep } from '../../../shared/music/chordPro/chartPlaybackSequence';
import type { ChordNotationMode } from '../../../shared/music/chordSymbolDisplay';
import { isPointerInsideSelector } from '../../../shared/dom/resolveEventTargetElement';
import type { ChordInteractionTarget, WordInteractionTarget } from '../chartInteractionTypes';
import { OriginalsPaintMode } from './chart/OriginalsPaintMode';

export type OriginalsPaintChordsEditorProps = {
  layout: ChartLayout;
  songKey: string;
  notation: ChordNotationMode;
  armedChord: string | null;
  selectedChord: ChordInteractionTarget | null;
  selectedWord: WordInteractionTarget | null;
  activePlaybackStep: ChartPlaybackStep | null;
  /** Renders at the top of the scrollable chart area (e.g. workflow stepper on the chords stage). */
  scrollHeader?: ReactNode;
  onArm: (chord: string | null) => void;
  onClearSelection: () => void;
  onStamp: (sectionId: string, lineId: string, charIndex: number) => void;
  onSelectChord: (sectionId: string, lineId: string, charIndex: number, chordId: string) => void;
  onSelectWord: (sectionId: string, lineId: string, charIndex: number) => void;
  onDeleteSelected: () => void;
};

export function OriginalsPaintChordsEditor({
  layout,
  songKey,
  notation,
  armedChord,
  selectedChord,
  selectedWord,
  activePlaybackStep,
  scrollHeader,
  onArm,
  onClearSelection,
  onStamp,
  onSelectChord,
  onSelectWord,
  onDeleteSelected,
}: OriginalsPaintChordsEditorProps): ReactElement {
  useEffect(() => {
    const hasSelection = Boolean(selectedChord || selectedWord || armedChord);
    if (!hasSelection) return;

    const onPointerDown = (e: PointerEvent) => {
      if (
        isPointerInsideSelector(e, 'input, textarea, [contenteditable="true"]') ||
        isPointerInsideSelector(
          e,
          '.encore-originals-chord-badge, .encore-originals-lyric-token, .encore-originals-chord-palette, .encore-originals-chord-palette-pick, .encore-originals-chord-palette-display, .encore-originals-chords-toolbar, .encore-originals-chords-playback-bar',
        )
      ) {
        return;
      }
      onArm(null);
      onClearSelection();
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [armedChord, onArm, onClearSelection, selectedChord, selectedWord]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onArm(null);
        onClearSelection();
        return;
      }
      if (!selectedChord) return;
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
      onDeleteSelected();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onArm, onClearSelection, onDeleteSelected, selectedChord]);

  return (
    <Box className="encore-originals-paint-editor">
      <OriginalsPaintMode
        layout={layout}
        songKey={songKey}
        notation={notation}
        armedChord={armedChord}
        selectedChord={selectedChord}
        selectedWord={selectedWord}
        activePlaybackStep={activePlaybackStep}
        scrollHeader={scrollHeader}
        onStamp={onStamp}
        onSelectChord={onSelectChord}
        onSelectWord={onSelectWord}
      />
    </Box>
  );
}
