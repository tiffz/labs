import { useCallback, useState } from 'react';
import type { RefObject } from 'react';
import type { Instrument } from '../../shared/playback/instruments';
import type { SoundType } from '../../shared/music/soundOptions';

export function useWordsPlaybackRangeState() {
  const [playbackSelectionRange, setPlaybackSelectionRange] = useState<{
    startTick: number;
    endTick: number;
  } | null>(null);
  const [activeSectionLoopId, setActiveSectionLoopId] = useState<string | null>(null);
  const [pendingPlaybackStartMode, setPendingPlaybackStartMode] = useState<
    'all' | 'section' | null
  >(null);

  return {
    playbackSelectionRange,
    setPlaybackSelectionRange,
    activeSectionLoopId,
    setActiveSectionLoopId,
    pendingPlaybackStartMode,
    setPendingPlaybackStartMode,
  };
}

export function useWordsPlaybackActions(params: {
  handleStopRef: RefObject<(() => void) | null>;
  chordInstrumentRef: RefObject<Instrument | null>;
  chordInstrumentTypeRef: RefObject<SoundType | null>;
  sectionTickRanges: Array<{ startTick: number; endTick: number } | undefined>;
  setActiveSectionLoopId: (id: string | null) => void;
  setPlaybackSelectionRange: (range: { startTick: number; endTick: number } | null) => void;
  setPendingPlaybackStartMode: (mode: 'all' | 'section' | null) => void;
}) {
  const {
    handleStopRef,
    chordInstrumentRef,
    chordInstrumentTypeRef,
    sectionTickRanges,
    setActiveSectionLoopId,
    setPlaybackSelectionRange,
    setPendingPlaybackStartMode,
  } = params;

  const stopPlaybackImmediately = useCallback(() => {
    handleStopRef.current?.();
    chordInstrumentRef.current?.stopAll(0);
    if (chordInstrumentRef.current) {
      chordInstrumentRef.current.disconnect();
    }
    chordInstrumentRef.current = null;
    chordInstrumentTypeRef.current = null;
  }, [chordInstrumentRef, chordInstrumentTypeRef, handleStopRef]);

  const playAllSections = useCallback(() => {
    setActiveSectionLoopId(null);
    setPlaybackSelectionRange(null);
    setPendingPlaybackStartMode('all');
  }, [setActiveSectionLoopId, setPendingPlaybackStartMode, setPlaybackSelectionRange]);

  const playSectionLoop = useCallback(
    (sectionId: string, sectionIndex: number) => {
      const range = sectionTickRanges[sectionIndex];
      if (!range || range.endTick <= range.startTick) return;
      setActiveSectionLoopId(sectionId);
      setPlaybackSelectionRange(range);
      setPendingPlaybackStartMode('section');
    },
    [
      sectionTickRanges,
      setActiveSectionLoopId,
      setPendingPlaybackStartMode,
      setPlaybackSelectionRange,
    ]
  );

  return { stopPlaybackImmediately, playAllSections, playSectionLoop };
}

export function deriveActiveChordMeasure(params: {
  isPlaying: boolean;
  chordLabelsByMeasure: Map<number, string>;
  currentNote: { measureIndex: number } | null;
}): number | null {
  const { isPlaying, chordLabelsByMeasure, currentNote } = params;
  return isPlaying && chordLabelsByMeasure.size > 0 && currentNote
    ? currentNote.measureIndex
    : null;
}
