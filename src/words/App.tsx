import React, { useCallback, useMemo, useRef, useState } from 'react';
import { usePlayback } from '../shared/rhythm/usePlayback';
import { DEFAULT_PLAYBACK_SETTINGS } from '../shared/rhythm/types';
import type { PlaybackSettings, TimeSignature } from '../shared/rhythm/types';
import type { WordRhythmGenerationSettings } from './utils/prosodyEngine';
import type { SoundType } from '../shared/music/soundOptions';
import {
  IDLE_SAMPLED_PIANO_LOAD_STATE,
  type SampledPianoLoadState,
} from '../shared/music/sampledPianoLoadState';
import { useSampledPianoPreload } from '../shared/hooks/useSampledPianoPreload';
import { SampledPiano, type Instrument } from '../shared/playback/instruments';
import type { UrlRoutingHistoryState } from '../shared/utils/urlRouting';
import { LyricImportModal } from './components/LyricImportModal';
import WordsSectionsColumn from './components/WordsSectionsColumn';
import WordsStickyControlsSection from './components/WordsStickyControlsSection';
import WordsNotationPanel from './components/WordsNotationPanel';
import { useSectionSettingsPortalPosition } from './hooks/useSectionSettingsPortalPosition';
import { useWordsStickyObservers } from './hooks/useWordsStickyObservers';
import { useWordsMenuDismiss } from './hooks/useWordsMenuDismiss';
import { useGenerationSettingsHandlers } from './hooks/useGenerationSettingsHandlers';
import { useWordsChordPlayback } from './hooks/useWordsChordPlayback';
import { useWordsUrlState } from './hooks/useWordsUrlState';
import {
  useWordsSectionsState,
  useWordsSectionScroll,
} from './hooks/useWordsSectionsState';
import { useWordsRandomization, useWordsBackingBeatPlayback } from './hooks/useWordsRandomization';
import {
  useWordsKeyboardShortcuts,
  useWordsPlaybackLifecycle,
  useWordsTimeSignatureTemplateReset,
} from './hooks/useWordsPlaybackLifecycle';
import { useWordsSongModel } from './hooks/useWordsSongModel';
import { useWordsSectionsColumnProps } from './hooks/useWordsSectionsColumnProps';
import { useWordsPlaybackRailProps } from './hooks/useWordsPlaybackRailProps';
import {
  deriveActiveChordMeasure,
  useWordsPlaybackActions,
  useWordsPlaybackRangeState,
} from './hooks/useWordsPlaybackSelection';
import { useWordsNotationPanelProps } from './hooks/useWordsNotationPanelProps';
import type { RandomizeMode } from './utils/randomizeModes';
import { getNotationScrollContainer } from './utils/scrollOwner';
import SkipToMain from '../shared/components/SkipToMain';
import {
  APP_DEFAULT_GENERATION_SETTINGS,
  BACKING_FALLBACK_TEMPLATE,
  DEFAULT_TIME_SIGNATURE,
  DEFAULT_WORD_RESULT,
  DRUM_SOUNDS,
} from './utils/wordsAppDefaults';

const App: React.FC = () => {
  const sectionsState = useWordsSectionsState();
  const {
    sections,
    setSections,
    songKey,
    setSongKey,
    lyricImportOpen,
    setLyricImportOpen,
    lyricImportText,
    applyLyricImport,
    undoSectionsChange,
  } = sectionsState;

  const [notation, setNotation] = useState<string>(DEFAULT_WORD_RESULT.notation);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(DEFAULT_TIME_SIGNATURE);
  const [bpm, setBpm] = useState<number>(100);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(true);
  const [autoFollowPlayback, setAutoFollowPlayback] = useState<boolean>(true);
  const [generationMenuOpen, setGenerationMenuOpen] = useState<boolean>(false);
  const [soundMenuOpen, setSoundMenuOpen] = useState<boolean>(false);
  const [randomizeMenuOpen, setRandomizeMenuOpen] = useState<boolean>(false);
  const [selectedRandomizeMode, setSelectedRandomizeMode] = useState<RandomizeMode>('phrasing');
  const [sectionRandomizeMenuId, setSectionRandomizeMenuId] = useState<string | null>(null);
  const [drumsVolume, setDrumsVolume] = useState<number>(100);
  const [masterVolume, setMasterVolume] = useState<number>(100);
  const [masterMuted, setMasterMuted] = useState<boolean>(false);
  const [drumsMuted, setDrumsMuted] = useState<boolean>(false);
  const [accentMuted, setAccentMuted] = useState<boolean>(false);
  const [metronomeMuted, setMetronomeMuted] = useState<boolean>(false);
  const [chordSoundType, setChordSoundType] = useState<SoundType>('piano');
  const [chordVolume, setChordVolume] = useState<number>(58);
  const [chordMuted, setChordMuted] = useState<boolean>(false);
  const [backingBeatEnabled, setBackingBeatEnabled] = useState<boolean>(false);
  const [backingBeatUseTemplate, setBackingBeatUseTemplate] = useState<boolean>(true);
  const [backingBeatNotation, setBackingBeatNotation] = useState<string>(BACKING_FALLBACK_TEMPLATE);
  const [backingBeatVolume, setBackingBeatVolume] = useState<number>(42);
  const [backingBeatMuted, setBackingBeatMuted] = useState<boolean>(false);
  const [sampledPianoLoad, setSampledPianoLoad] = useState<SampledPianoLoadState>(
    IDLE_SAMPLED_PIANO_LOAD_STATE
  );
  const [playbackSettings, setPlaybackSettings] =
    useState<PlaybackSettings>(DEFAULT_PLAYBACK_SETTINGS);
  const [generationSettings, setGenerationSettings] =
    useState<WordRhythmGenerationSettings>(APP_DEFAULT_GENERATION_SETTINGS);
  const [isStickyControlsStuck, setIsStickyControlsStuck] = useState<boolean>(false);
  const [isScoreActionsStuck, setIsScoreActionsStuck] = useState<boolean>(false);
  const [openSectionSettingsId, setOpenSectionSettingsId] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const [sharedExportOpen, setSharedExportOpen] = useState<boolean>(false);
  const [scoreZoom, setScoreZoom] = useState<number>(1);

  const stickyControlsRef = useRef<HTMLElement | null>(null);
  const scoreActionsRef = useRef<HTMLDivElement | null>(null);
  const generationMenuRef = useRef<HTMLDivElement | null>(null);
  const generationButtonRef = useRef<HTMLButtonElement | null>(null);
  const soundMenuRef = useRef<HTMLDivElement | null>(null);
  const soundButtonRef = useRef<HTMLButtonElement | null>(null);
  const randomizeButtonRef = useRef<HTMLDivElement | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement | null>(null);
  const sectionRandomizeAnchorRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sectionRandomizeMenuRef = useRef<HTMLDivElement | null>(null);
  const sectionSettingsAnchorRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sectionSettingsMenuRef = useRef<HTMLDivElement | null>(null);
  const sectionsColumnRef = useRef<HTMLElement | null>(null);
  const notationScrollRef = useRef<HTMLElement | null>(null);
  const notationSectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const chordAudioContextRef = useRef<AudioContext | null>(null);
  const chordSampledPianoRef = useRef<SampledPiano | null>(null);
  const chordInstrumentRef = useRef<Instrument | null>(null);
  const chordInstrumentTypeRef = useRef<SoundType | null>(null);
  const lastChordMeasureRef = useRef<number | null>(null);
  const urlHistoryStateRef = useRef<UrlRoutingHistoryState>({ lastPushTime: 0 });
  const handleStopRef = useRef<(() => void) | null>(null);

  const songModel = useWordsSongModel({
    sections,
    songKey,
    notation,
    setNotation,
    timeSignature,
    bpm,
    metronomeEnabled,
    generationSettings,
    playbackSettings,
    drumsVolume,
    drumsMuted,
    accentMuted,
    metronomeMuted,
    masterVolume,
    masterMuted,
    chordVolume,
    chordMuted,
    backingBeatEnabled,
    backingBeatUseTemplate,
    backingBeatNotation,
  });

  const {
    applyRandomization,
    randomizeChordProgression,
    randomizeChordStyle,
  } = useWordsRandomization({
    sectionsState,
    setBpm,
    timeSignature,
    templatePresets: songModel.templatePresets,
  });

  const playbackRange = useWordsPlaybackRangeState();

  const {
    isPlaying,
    currentNote,
    currentMetronomeBeat,
    handlePlay,
    handleStop,
    handleMetronomeToggle,
  } = usePlayback({
    parsedRhythm: songModel.parsedRhythm,
    bpm,
    metronomeEnabled,
    playbackSettings: songModel.effectivePlaybackSettings,
    selectionRange: playbackRange.playbackSelectionRange,
    metronomeResolution: 'beat',
  });

  handleStopRef.current = handleStop;

  const { stopPlaybackImmediately, playAllSections, playSectionLoop } = useWordsPlaybackActions({
    handleStopRef,
    chordInstrumentRef,
    chordInstrumentTypeRef,
    sectionTickRanges: songModel.sectionTickRanges,
    setActiveSectionLoopId: playbackRange.setActiveSectionLoopId,
    setPlaybackSelectionRange: playbackRange.setPlaybackSelectionRange,
    setPendingPlaybackStartMode: playbackRange.setPendingPlaybackStartMode,
  });

  const {
    playbackSelectionRange,
    setPlaybackSelectionRange,
    activeSectionLoopId,
    setActiveSectionLoopId,
    pendingPlaybackStartMode,
    setPendingPlaybackStartMode,
  } = playbackRange;

  const activeChordMeasure = deriveActiveChordMeasure({
    isPlaying,
    chordLabelsByMeasure: songModel.chordLabelsByMeasure,
    currentNote,
  });

  const scrollSectionIntoNotationView = useWordsSectionScroll(
    notationScrollRef,
    notationSectionRefs
  );

  const sectionSettingsPosition = useSectionSettingsPortalPosition(
    openSectionSettingsId,
    sectionSettingsAnchorRefs
  );

  const sectionColumnActions = useMemo(
    () => ({
      applyRandomization,
      randomizeChordProgression,
      randomizeChordStyle,
      scrollSectionIntoNotationView,
      playSectionLoop,
      stopPlaybackImmediately,
      setOpenSectionSettingsId,
      setSectionRandomizeMenuId,
      setGenerationMenuOpen,
      setSoundMenuOpen,
      setExportMenuOpen,
      setActiveSectionLoopId,
    }),
    [
      applyRandomization,
      randomizeChordProgression,
      randomizeChordStyle,
      scrollSectionIntoNotationView,
      playSectionLoop,
      stopPlaybackImmediately,
    ]
  );

  const sectionsColumnProps = useWordsSectionsColumnProps(
    {
      sections,
      effectiveSections: songModel.effectiveSections,
      sectionDisplayNames: songModel.sectionDisplayNames,
      openSectionSettingsId,
      sectionSettingsPosition,
      sectionRandomizeMenuId,
      activeSectionLoopId,
      isPlaying,
      defaultTemplateNotation: APP_DEFAULT_GENERATION_SETTINGS.templateNotation ?? '',
      songKey,
      bpm,
      timeSignature,
      metronomeEnabled,
    },
    {
      sectionSettingsMenuRef,
      sectionRandomizeMenuRef,
      sectionSettingsAnchorRefs,
      sectionRandomizeAnchorRefs,
    },
    sectionsState,
    sectionColumnActions
  );

  const playbackRailProps = useWordsPlaybackRailProps({
    isPlaying,
    stopPlaybackImmediately,
    setActiveSectionLoopId,
    playAllSections,
    chordAudioContextRef,
    bpm,
    setBpm,
    songKey,
    setSongKey,
    timeSignature,
    setTimeSignature,
    metronomeEnabled,
    setMetronomeEnabled,
    handleMetronomeToggle,
    soundButtonRef,
    soundMenuRef,
    soundMenuOpen,
    setSoundMenuOpen,
    setGenerationMenuOpen,
    masterVolume,
    setMasterVolume,
    masterMuted,
    setMasterMuted,
    drumsVolume,
    setDrumsVolume,
    drumsMuted,
    setDrumsMuted,
    playbackSettings,
    setPlaybackSettings,
    accentMuted,
    setAccentMuted,
    metronomeMuted,
    setMetronomeMuted,
    chordSoundType,
    setChordSoundType,
    sampledPianoLoad,
    chordVolume,
    setChordVolume,
    chordMuted,
    setChordMuted,
    backingBeatEnabled,
    setBackingBeatEnabled,
    backingBeatVolume,
    setBackingBeatVolume,
    backingBeatMuted,
    setBackingBeatMuted,
    backingBeatUseTemplate,
    setBackingBeatUseTemplate,
    backingBeatNotation,
    setBackingBeatNotation,
    autoFollowPlayback,
    setAutoFollowPlayback,
  });

  const getPlaybackScrollContainer = useCallback(
    () => getNotationScrollContainer(notationScrollRef.current),
    []
  );

  const notationPanelProps = useWordsNotationPanelProps({
    notationScrollRef,
    scoreActionsRef,
    isScoreActionsStuck,
    scoreMeasureCount: songModel.scoreMeasureCount,
    estimatedSongDuration: songModel.estimatedSongDuration,
    scoreZoom,
    setScoreZoom,
    exportButtonRef,
    exportMenuOpen,
    setExportMenuOpen,
    sharedExportOpen,
    setSharedExportOpen,
    exportAdapter: songModel.exportAdapter,
    lyricsExportText: songModel.lyricsExportText,
    asciiChordChartExportText: songModel.asciiChordChartExportText,
    sectionRenderPlans: songModel.sectionRenderPlans,
    timeSignature,
    hitMap: songModel.hitMap,
    chordLabelsByMeasure: songModel.chordLabelsByMeasure,
    chordStyleByMeasure: songModel.chordStyleByMeasure,
    currentNote,
    currentMetronomeBeat,
    activeChordMeasure,
    activeSectionLoopId,
    isPlaying,
    sectionDisplayNames: songModel.sectionDisplayNames,
    parsedMeasureCount: songModel.parsedRhythm.measures.length,
    notationSectionRefs,
    songKey,
    metronomeEnabled,
    autoFollowPlayback,
    notation,
    darbukaEditUrl: songModel.darbukaEditUrl,
    getPlaybackScrollContainer,
  });

  useWordsBackingBeatPlayback({
    isPlaying,
    backingBeatEnabled,
    backingPatternRhythm: songModel.backingPatternRhythm,
    backingTemplateMeasureMap: songModel.backingTemplateMeasureMap,
    currentMetronomeBeat,
    backingBeatVolume,
    backingBeatMuted,
    masterVolume,
    masterMuted,
    drumSounds: DRUM_SOUNDS,
  });

  useWordsPlaybackLifecycle({
    isPlaying,
    pendingPlaybackStartMode,
    playbackSelectionRange,
    notation,
    timeSignature,
    handlePlay,
    stopPlaybackImmediately,
    setPendingPlaybackStartMode,
  });

  useWordsTimeSignatureTemplateReset({
    timeSignature,
    templatePresets: songModel.templatePresets,
    setSections,
    setBackingBeatNotation,
  });

  useWordsStickyObservers(
    stickyControlsRef,
    scoreActionsRef,
    setIsStickyControlsStuck,
    setIsScoreActionsStuck
  );

  useSampledPianoPreload(chordSoundType, setSampledPianoLoad);

  useWordsChordPlayback({
    isPlaying,
    chordLabelsByMeasure: songModel.chordLabelsByMeasure,
    chordStyleByMeasure: songModel.chordStyleByMeasure,
    currentMetronomeBeat,
    currentNote,
    parsedRhythm: songModel.parsedRhythm,
    bpm,
    timeSignature,
    effectiveChordVolume: songModel.effectiveChordVolume,
    chordSoundType,
    sampledPianoLoad,
    setSampledPianoLoad,
    refs: {
      chordAudioContextRef,
      chordSampledPianoRef,
      chordInstrumentRef,
      chordInstrumentTypeRef,
      lastChordMeasureRef,
    },
  });

  useWordsMenuDismiss(
    {
      generationMenuRef,
      generationButtonRef,
      soundMenuRef,
      soundButtonRef,
      sectionSettingsMenuRef,
      sectionRandomizeMenuRef,
      exportButtonRef,
      randomizeButtonRef,
    },
    {
      setGenerationMenuOpen,
      setSoundMenuOpen,
      setOpenSectionSettingsId,
      setSectionRandomizeMenuId,
      setExportMenuOpen,
      setRandomizeMenuOpen,
    }
  );

  const {
    setRule,
    setNoteValueBias,
    setStressAlignment,
    setWordStartAlignment,
    handleSelectAllRules,
    handleClearAllRules,
    handleResetGenerationSettings,
  } = useGenerationSettingsHandlers(setGenerationSettings);

  useWordsUrlState(
    {
      sections,
      songKey,
      notation,
      bpm,
      timeSignature,
      metronomeEnabled,
      autoFollowPlayback,
      generationSettings,
      drumsVolume,
      chordSoundType,
      chordVolume,
    },
    {
      setSections,
      setSongKey,
      setBpm,
      setNotation,
      setTimeSignature,
      setMetronomeEnabled,
      setAutoFollowPlayback,
      setGenerationSettings,
      setDrumsVolume,
      setChordSoundType,
      setChordVolume,
    },
    urlHistoryStateRef
  );

  useWordsKeyboardShortcuts({
    isPlaying,
    stopPlaybackImmediately,
    setActiveSectionLoopId,
    setPlaybackSelectionRange,
    setPendingPlaybackStartMode,
    setGenerationMenuOpen,
    setSoundMenuOpen,
    setOpenSectionSettingsId,
    setSectionRandomizeMenuId,
    setRandomizeMenuOpen,
    setExportMenuOpen,
    undoSectionsChange,
  });

  return (
    <div className="words-page">
      <SkipToMain />
      <header className="words-header">
        <h1>Words in Rhythm</h1>
      </header>

      <main id="main" className="words-main">
        <WordsStickyControlsSection
          sectionRef={stickyControlsRef}
          isStuck={isStickyControlsStuck}
          randomizeButtonRef={randomizeButtonRef}
          randomizeMenuOpen={randomizeMenuOpen}
          selectedRandomizeMode={selectedRandomizeMode}
          onRandomize={() => {
            applyRandomization(selectedRandomizeMode);
            setRandomizeMenuOpen(false);
          }}
          onToggleRandomizeMenu={() => {
            setRandomizeMenuOpen((previous) => !previous);
            setGenerationMenuOpen(false);
            setSoundMenuOpen(false);
          }}
          onCloseRandomizeMenu={() => setRandomizeMenuOpen(false)}
          onSelectRandomizeMode={(mode) => {
            setSelectedRandomizeMode(mode);
            setRandomizeMenuOpen(false);
          }}
          generationButtonRef={generationButtonRef}
          generationMenuRef={generationMenuRef}
          generationMenuOpen={generationMenuOpen}
          onToggleGenerationMenu={() => {
            setGenerationMenuOpen((previous) => !previous);
            setSoundMenuOpen(false);
          }}
          generationSettings={generationSettings}
          onResetGenerationSettings={handleResetGenerationSettings}
          onSelectAllRules={handleSelectAllRules}
          onClearAllRules={handleClearAllRules}
          onSetRule={setRule}
          onSetNoteValueBias={setNoteValueBias}
          onSetStressAlignment={setStressAlignment}
          onSetWordStartAlignment={setWordStartAlignment}
          onGenerationSettingsChange={setGenerationSettings}
          playbackRailProps={playbackRailProps}
        />

        <section className="words-main-grid">
          <WordsSectionsColumn columnRef={sectionsColumnRef} {...sectionsColumnProps} />

          <WordsNotationPanel {...notationPanelProps} />
        </section>
      </main>

      <LyricImportModal
        isOpen={lyricImportOpen}
        initialText={lyricImportText}
        onClose={() => setLyricImportOpen(false)}
        onApply={applyLyricImport}
      />
    </div>
  );
};

export default App;
