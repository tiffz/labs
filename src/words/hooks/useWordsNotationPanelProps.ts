import { useCallback, useMemo } from 'react';
import type { RefObject } from 'react';
import { openMonospaceChartPrintWindow, type ChartPrintExportOptions } from '../../shared/music/chordChartPrintExport';
import { createAppAnalytics } from '../../shared/utils/analytics';
import type { SongKey } from '../../shared/music/songKeyFormat';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { SubdivisionLevel } from '../../shared/audio/metronome/types';
import type { ExportSourceAdapter } from '../../shared/music/exportTypes';
import type { ChordStyleId } from '../../shared/music/chordStyleOptions';
import type { WordsNotationPanelProps } from '../components/WordsNotationPanel';
import { buildNotationSectionBlocks } from '../utils/wordsChordExportText';
import type { SectionRenderPlan } from '../utils/wordsSectionPlans';
import type { SyllableHit } from '../utils/prosodyEngine';

const wordsAnalytics = createAppAnalytics('words');

export function useWordsNotationPanelProps(params: {
  notationScrollRef: RefObject<HTMLElement | null>;
  scoreActionsRef: RefObject<HTMLDivElement | null>;
  isScoreActionsStuck: boolean;
  scoreMeasureCount: number;
  estimatedSongDuration: string;
  scoreZoom: number;
  setScoreZoom: React.Dispatch<React.SetStateAction<number>>;
  exportButtonRef: RefObject<HTMLButtonElement | null>;
  exportMenuOpen: boolean;
  setExportMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  sharedExportOpen: boolean;
  setSharedExportOpen: React.Dispatch<React.SetStateAction<boolean>>;
  exportAdapter: ExportSourceAdapter;
  lyricsExportText: string;
  asciiChordChartExportText: string;
  chartPrintExportOptions: ChartPrintExportOptions;
  sectionRenderPlans: SectionRenderPlan[];
  timeSignature: TimeSignature;
  hitMap: Map<string, SyllableHit>;
  chordLabelsByMeasure: Map<number, string>;
  chordStyleByMeasure: Map<number, ChordStyleId>;
  currentNote: { measureIndex: number; noteIndex: number } | null;
  currentMetronomeBeat: {
    measureIndex: number;
    positionInSixteenths: number;
    isDownbeat: boolean;
  } | null;
  activeChordMeasure: number | null;
  activeSectionLoopId: string | null;
  isPlaying: boolean;
  sectionDisplayNames: string[];
  parsedMeasureCount: number;
  notationSectionRefs: RefObject<Map<string, HTMLElement>>;
  songKey: SongKey;
  metronomeEnabled: boolean;
  metronomeSubdivisionLevel: SubdivisionLevel;
  autoFollowPlayback: boolean;
  notation: string;
  darbukaEditUrl: string;
  getPlaybackScrollContainer: () => HTMLElement | null;
}): WordsNotationPanelProps {
  const {
    notationScrollRef,
    scoreActionsRef,
    isScoreActionsStuck,
    scoreMeasureCount,
    estimatedSongDuration,
    scoreZoom,
    setScoreZoom,
    exportButtonRef,
    exportMenuOpen,
    setExportMenuOpen,
    sharedExportOpen,
    setSharedExportOpen,
    exportAdapter,
    lyricsExportText,
    asciiChordChartExportText,
    chartPrintExportOptions,
    sectionRenderPlans,
    timeSignature,
    hitMap,
    chordLabelsByMeasure,
    chordStyleByMeasure,
    currentNote,
    currentMetronomeBeat,
    activeChordMeasure,
    activeSectionLoopId,
    isPlaying,
    sectionDisplayNames,
    parsedMeasureCount,
    notationSectionRefs,
    songKey,
    metronomeEnabled,
    metronomeSubdivisionLevel,
    autoFollowPlayback,
    notation,
    darbukaEditUrl,
    getPlaybackScrollContainer,
  } = params;

  const notationSectionBlocks = useMemo(
    () =>
      buildNotationSectionBlocks({
        sectionRenderPlans,
        timeSignature,
        hitMap,
        chordLabelsByMeasure,
        chordStyleByMeasure,
        currentNote,
        currentMetronomeBeat,
        activeChordMeasure,
        activeSectionLoopId,
        isPlaying,
        sectionDisplayNames,
        parsedMeasureCount,
      }),
    [
      sectionRenderPlans,
      timeSignature,
      hitMap,
      chordLabelsByMeasure,
      chordStyleByMeasure,
      currentNote,
      currentMetronomeBeat,
      activeChordMeasure,
      activeSectionLoopId,
      isPlaying,
      sectionDisplayNames,
      parsedMeasureCount,
    ]
  );

  const copyText = useCallback(async (value: string) => {
    if (!value.trim()) return;
    await navigator.clipboard.writeText(value);
  }, []);

  return useMemo(
    (): WordsNotationPanelProps => ({
      notationScrollRef,
      scoreActionsRef,
      isScoreActionsStuck,
      scoreMeasureCount,
      estimatedSongDuration,
      scoreZoom,
      onZoomOut: () => setScoreZoom((previous) => Math.max(0.75, previous - 0.1)),
      onZoomIn: () => setScoreZoom((previous) => Math.min(1.75, previous + 0.1)),
      exportButtonRef,
      exportMenuOpen,
      onToggleExportMenu: () => {
        setExportMenuOpen((previous) => !previous);
        wordsAnalytics.trackEvent('export_open');
      },
      onCloseExportMenu: () => setExportMenuOpen(false),
      onCopyLyrics: () => {
        void copyText(lyricsExportText);
        setExportMenuOpen(false);
      },
      onCopyAsciiChart: () => {
        void copyText(asciiChordChartExportText);
        setExportMenuOpen(false);
      },
      onDownloadPdf: () => {
        openMonospaceChartPrintWindow(asciiChordChartExportText, chartPrintExportOptions);
        setExportMenuOpen(false);
      },
      onOpenSharedExport: () => {
        setSharedExportOpen(true);
        setExportMenuOpen(false);
      },
      sharedExportOpen,
      onCloseSharedExport: () => setSharedExportOpen(false),
      exportAdapter,
      notationSectionBlocks,
      notationSectionRefs,
      timeSignature,
      songKey,
      metronomeEnabled,
      metronomeSubdivisionLevel,
      autoFollowPlayback,
      isPlaying,
      playbackScrollContainer: getPlaybackScrollContainer(),
      notation,
      darbukaEditUrl,
    }),
    [
      notationScrollRef,
      scoreActionsRef,
      isScoreActionsStuck,
      scoreMeasureCount,
      estimatedSongDuration,
      scoreZoom,
      setScoreZoom,
      exportButtonRef,
      exportMenuOpen,
      setExportMenuOpen,
      sharedExportOpen,
      setSharedExportOpen,
      exportAdapter,
      notationSectionBlocks,
      notationSectionRefs,
      timeSignature,
      songKey,
      metronomeEnabled,
      metronomeSubdivisionLevel,
      autoFollowPlayback,
      isPlaying,
      getPlaybackScrollContainer,
      notation,
      darbukaEditUrl,
      copyText,
      lyricsExportText,
      asciiChordChartExportText,
      chartPrintExportOptions,
    ]
  );
}
