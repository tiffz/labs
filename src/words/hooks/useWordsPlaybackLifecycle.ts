import { useEffect, useRef } from 'react';
import type { SongSection } from '../../shared/music/songSections';
import {
  getCompatibleStylingStrategies,
  isStrategyCompatibleWithTimeSignature,
} from '../../shared/music/chordStylingCompatibility';
import type { TimeSignature } from '../../shared/rhythm/types';
import { createAppAnalytics } from '../../shared/utils/analytics';

const wordsAnalytics = createAppAnalytics('words');

function isEditableTarget(target: HTMLElement | null): boolean {
  return Boolean(
    target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
  );
}

export function useWordsKeyboardShortcuts(params: {
  isPlaying: boolean;
  stopPlaybackImmediately: () => void;
  setActiveSectionLoopId: (id: string | null) => void;
  setPlaybackSelectionRange: (range: { startTick: number; endTick: number } | null) => void;
  setPendingPlaybackStartMode: (mode: 'all' | 'section' | null) => void;
  setGenerationMenuOpen: (open: boolean) => void;
  setSoundMenuOpen: (open: boolean) => void;
  setOpenSectionSettingsId: (id: string | null) => void;
  setSectionRandomizeMenuId: (id: string | null) => void;
  setSectionChorusLinkMenuId: (id: string | null) => void;
  setRandomizeMenuOpen: (open: boolean) => void;
  setExportMenuOpen: (open: boolean) => void;
}): void {
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const p = paramsRef.current;
      if (event.key === 'Escape') {
        const target = event.target;
        if (target instanceof Element && target.closest('.MuiPopover-root')) {
          return;
        }
        p.setGenerationMenuOpen(false);
        p.setSoundMenuOpen(false);
        p.setOpenSectionSettingsId(null);
        p.setSectionRandomizeMenuId(null);
        p.setSectionChorusLinkMenuId(null);
        p.setRandomizeMenuOpen(false);
        p.setExportMenuOpen(false);
        return;
      }
      if (event.code !== 'Space' || event.repeat) return;
      if (isEditableTarget(event.target as HTMLElement | null)) return;
      event.preventDefault();
      if (p.isPlaying) {
        p.stopPlaybackImmediately();
        p.setActiveSectionLoopId(null);
      } else {
        p.setActiveSectionLoopId(null);
        p.setPlaybackSelectionRange(null);
        p.setPendingPlaybackStartMode('all');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

export function useWordsPlaybackLifecycle(params: {
  isPlaying: boolean;
  pendingPlaybackStartMode: 'all' | 'section' | null;
  playbackSelectionRange: { startTick: number; endTick: number } | null;
  notation: string;
  timeSignature: import('../../shared/rhythm/types').TimeSignature;
  handlePlay: () => void;
  stopPlaybackImmediately: () => void;
  setPendingPlaybackStartMode: (mode: 'all' | 'section' | null) => void;
}): void {
  const {
    isPlaying,
    pendingPlaybackStartMode,
    playbackSelectionRange,
    notation,
    timeSignature,
    handlePlay,
    stopPlaybackImmediately,
    setPendingPlaybackStartMode,
  } = params;

  useEffect(() => {
    if (!pendingPlaybackStartMode) return;
    if (pendingPlaybackStartMode === 'section' && !playbackSelectionRange) return;
    setPendingPlaybackStartMode(null);
    stopPlaybackImmediately();
    const frame = window.requestAnimationFrame(() => {
      handlePlay();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    pendingPlaybackStartMode,
    playbackSelectionRange,
    handlePlay,
    stopPlaybackImmediately,
    setPendingPlaybackStartMode,
  ]);

  const wordsPlayStartRef = useRef<number>(0);
  useEffect(() => {
    if (isPlaying) {
      wordsPlayStartRef.current = Date.now();
      wordsAnalytics.trackEvent('playback_start');
    } else if (wordsPlayStartRef.current > 0) {
      wordsAnalytics.trackSessionEnd(wordsPlayStartRef.current);
      wordsPlayStartRef.current = 0;
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) stopPlaybackImmediately();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notation, timeSignature]);
}

export function useWordsTimeSignatureTemplateReset(params: {
  timeSignature: TimeSignature;
  templatePresets: Array<{ notation: string }>;
  applySectionsChange: (transform: (previous: SongSection[]) => SongSection[]) => void;
  setBackingBeatNotation: (notation: string) => void;
}): void {
  const prevTimeSignatureRef = useRef(params.timeSignature);
  useEffect(() => {
    const prev = prevTimeSignatureRef.current;
    prevTimeSignatureRef.current = params.timeSignature;
    if (
      prev.numerator === params.timeSignature.numerator &&
      prev.denominator === params.timeSignature.denominator
    ) {
      return;
    }
    const newDefault = params.templatePresets[0]?.notation ?? '';
    if (!newDefault) return;
    params.applySectionsChange((previous) =>
      previous.map((section) => ({
        ...section,
        templateNotation: newDefault,
        chordStyleId: isStrategyCompatibleWithTimeSignature(
          section.chordStyleId,
          params.timeSignature
        )
          ? section.chordStyleId
          : (getCompatibleStylingStrategies(params.timeSignature)[0] ?? 'simple'),
      }))
    );
    params.setBackingBeatNotation(newDefault);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.timeSignature, params.templatePresets]);
}
