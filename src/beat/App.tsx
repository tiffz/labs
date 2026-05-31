import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import SkipToMain from '../shared/components/SkipToMain';
import { type MediaFile } from './components/MediaUploader';
import BeatVisualizer from './components/BeatVisualizer';
import VideoPlayer from './components/VideoPlayer';
import PlaybackSpeedControl from './components/PlaybackSpeedControl';
import BeatTransportControls from './components/BeatTransportControls';
import BeatLibraryShell from './components/BeatLibraryShell';
import BeatLibraryCard from './components/BeatLibraryCard';
import type { YouTubeController, YouTubePlaybackState } from './components/YouTubePlayer';
const YouTubePlayer = lazy(() => import('./components/YouTubePlayer'));
import PlaybackBar from './components/PlaybackBar';
import DrumAccompaniment from '../shared/components/music/DrumAccompaniment';
import UploadLanding from './components/UploadLanding';
import { useAudioAnalysis } from './hooks/useAudioAnalysis';
import { createAppAnalytics } from '../shared/utils/analytics';
import { snapYouTubePlaybackRate } from './utils/playbackRateLimits';

const analytics = createAppAnalytics('beat');
import { transposeKey } from './utils/musicTheory';
import { useBeatSync } from './hooks/useBeatSync';
import { useSectionDetection } from './hooks/useSectionDetection';
import { useChordAnalysis } from './hooks/useChordAnalysis';
import { useSectionSelection } from './hooks/useSectionSelection';
import { useMetronome } from './hooks/useMetronome';
import type { TimeSignature } from '../shared/rhythm/types';
import AppTooltip from '../shared/components/AppTooltip';
import MetronomeToggleButton from '../shared/components/MetronomeToggleButton';
import BpmInput from '../shared/components/music/BpmInput';
import KeyInput from '../shared/components/music/KeyInput';
import { ALL_KEYS, type MusicKey } from '../shared/music/musicInputConstants';
import type { ExportSourceAdapter } from '../shared/music/exportTypes';
import { type Section } from './utils/sectionDetector';
import { getMeasureDuration, snapToMeasureStart } from './utils/measureUtils';
import {
  computePracticeSectionResize,
  loopRegionForSelectedSections,
} from './utils/practiceSectionResize';
import { sha256Fingerprint } from './utils/fingerprint';
import { BEAT_ANALYSIS_VERSION } from './utils/analysisVersion';
import { usePracticeEditorHistory } from './hooks/usePracticeEditorHistory';
import { useBeatPracticeLaneMutations } from './hooks/useBeatPracticeLaneMutations';
import { useBeatPracticeKeyboardShortcuts } from './hooks/useBeatPracticeKeyboardShortcuts';
import {
  createUserLane,
  readSavedSongBpm,
  type PerSongSettings,
  toLaneSection,
  type LaneSection,
  userSectionsStorageKey,
} from './utils/practiceSections';
import {
  mergeAdjacentLaneSections,
  splitLaneSection,
} from './utils/laneSectionOps';
import {
  extractYouTubeVideoId,
  getLocalFileForEntry,
  getUserPracticeSections,
  loadLibraryEntries,
  loadSongSettingsForEntry,
  markAllStaleIfVersionChanged,
  markEntryViewed,
  renameLibraryEntry,
  saveAnalysisBundle,
  saveSongSettingsForEntry,
  saveUserPracticeSections,
  setEntryStaleState,
  upsertLocalVideo,
  upsertYoutubeVideo,
} from './storage/beatLibraryService';
import { getAnalysisBundle, getSchemaVersion } from './storage/beatLibraryDb';
import type { BeatLibraryEntry, UploadTaskState, UserPracticeData, UserPracticeLane, UserPracticeSection } from './types/library';
import { decodeMediaToBuffer, runBeatAnalysisPipeline } from './utils/analysisPipeline';
import { repeatAudioBuffer } from './utils/repeatAudioBuffer';

const App: React.FC = () => {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [libraryEntries, setLibraryEntries] = useState<BeatLibraryEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [uploadTasks, setUploadTasks] = useState<UploadTaskState[]>([]);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [reanalysisQueue, setReanalysisQueue] = useState<string[]>([]);
  const [isBackgroundReanalyzing, setIsBackgroundReanalyzing] = useState(false);
  const [backgroundIsReanalysis, setBackgroundIsReanalysis] = useState(false);
  const [analysisStaleMessage, setAnalysisStaleMessage] = useState<string | null>(null);
  const [alignLoopToMetronome, setAlignLoopToMetronome] = useState(true);
  const [nudgeUnit, setNudgeUnit] = useState<'measure' | 'beat'>('measure');
  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState<string[]>([]);
  const [practiceLanes, setPracticeLanes] = useState<UserPracticeLane[]>([]);
  const [activeLaneId, setActiveLaneId] = useState<string | null>(null);
  const [userSections, setUserSections] = useState<LaneSection[]>([]);
  const [libraryPreviewUrls, setLibraryPreviewUrls] = useState<Record<string, string>>({});
  const [detectedBpmBaseline, setDetectedBpmBaseline] = useState<number | null>(null);
  const [detectedKeyBaseline, setDetectedKeyBaseline] = useState<MusicKey | null>(null);
  const [correctedDetectedKey, setCorrectedDetectedKey] = useState<MusicKey | null>(null);
  const [seededPracticeForEntry, setSeededPracticeForEntry] = useState<string | null>(null);
  const [timeSignature] = useState<TimeSignature>({ numerator: 4, denominator: 4 });
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [drumEnabled, setDrumEnabled] = useState(false);
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);
  const [drumVolume, setDrumVolume] = useState(70);
  const [audioMuted, setAudioMuted] = useState(false);
  const [drumMuted, setDrumMuted] = useState(false);
  const [metronomeMuted, setMetronomeMuted] = useState(false);
  const [mixerOpen, setMixerOpen] = useState(false);
  const mixerAnchorRef = useRef<HTMLButtonElement | null>(null);
  const audioBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const [transposeSemitones, setTransposeSemitones] = useState(0);
  const [transposeDraft, setTransposeDraft] = useState('0');
  const [youtubePlayback, setYoutubePlayback] = useState<YouTubePlaybackState>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    playbackRate: 1,
  });
  const [showYoutubeUpgradeModal, setShowYoutubeUpgradeModal] = useState(false);
  const [pendingYoutubeUpgradeFile, setPendingYoutubeUpgradeFile] = useState<File | null>(null);
  const [transferPracticeSectionsOnUpgrade, setTransferPracticeSectionsOnUpgrade] = useState(true);
  const youtubeControllerRef = useRef<YouTubeController | null>(null);
  const youtubeUpgradeInputRef = useRef<HTMLInputElement | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement | null>(null);
  const youtubeMetronomeContextRef = useRef<AudioContext | null>(null);
  const youtubeLastBeatRef = useRef(-1);
  const isLoadingEntryRef = useRef(false);
  const captureSongSettingsRef = useRef<() => PerSongSettings>(() => ({}));
  const [manualBpmOverride, setManualBpmOverride] = useState<number | null>(null);
  const [youtubeManualBpm, setYoutubeManualBpm] = useState(120);
  const [exportOpen, setExportOpen] = useState(false);

  const {
    pushPracticeHistory,
    undoPracticeEdit,
    redoPracticeEdit,
  } = usePracticeEditorHistory({
    practiceLanes,
    userSections,
    activeLaneId,
    setPracticeLanes,
    setUserSections,
    setActiveLaneId,
  });

  const {
    isAnalyzing,
    analysisProgress,
    analysisResult,
    audioBuffer,
    error: analysisError,
    getAudioContext,
    loadMediaBuffer,
    analyzeLoadedBuffer,
    hydrateAnalysis,
    setBpm: setAnalyzedBpm,
    reset: resetAnalysis,
  } = useAudioAnalysis();

  const isBeatAnalysisPending = isAnalyzing || analysisProgress !== null;

  const {
    sections: analysisSections,
    isDetecting: isDetectingSections,
    detectSectionsFromBuffer,
    clearSections: clearAnalysisSections,
  } = useSectionDetection();

  const {
    createManualSection,
    createPracticeLane,
    renamePracticeLane,
    deletePracticeLane,
    cloneGeneratedLane,
    clonePracticeLane,
    renamePracticeSection,
  } = useBeatPracticeLaneMutations({
    practiceLanes,
    userSections,
    activeLaneId,
    analysisSections,
    setPracticeLanes,
    setUserSections,
    setActiveLaneId,
    pushPracticeHistory,
  });

  const {
    isAnalyzing: isAnalyzingChords,
    chordResult,
    analyzeChords: runChordAnalysis,
    validateWithBeats,
    reset: resetChordAnalysis,
  } = useChordAnalysis();

  const isYouTubeMedia = mediaFile?.sourceType === 'youtube';
  const effectiveBpm = isYouTubeMedia
    ? youtubeManualBpm
    : Math.round(manualBpmOverride ?? analysisResult?.bpm ?? 120);
  const effectiveSyncStart = syncStartTime ?? analysisResult?.musicStartTime ?? 0;
  const detectedSyncStart = isYouTubeMedia ? 0 : (analysisResult?.musicStartTime ?? 0);

  const {
    isPlaying,
    currentBeat,
    currentMeasure,
    progress,
    currentTime,
    duration,
    playbackRate,
    audioVolume,
    metronomeVolume,
    loopRegion,
    loopEnabled,
    play,
    pause,
    stop,
    seek,
    setPlaybackRate,
    setAudioVolume,
    setMetronomeVolume,
    skipToStart,
    skipToEnd,
    seekByMeasures,
    setLoopRegion,
    setLoopEnabled,
  } = useBeatSync({
    audioBuffer,
    bpm: effectiveBpm,
    timeSignature,
    musicStartTime: analysisResult?.musicStartTime ?? 0,
    metronomeEnabled: metronomeEnabled && !isBeatAnalysisPending,
    syncStartTime: effectiveSyncStart,
    mediaUrl: isYouTubeMedia ? undefined : mediaFile?.url,
    transposeSemitones,
    tempoRegions: analysisResult?.tempoRegions,
    audioMuted,
    metronomeMuted,
  });

  const mergeUserSections = useCallback((indexA: number, indexB: number) => {
    setUserSections((prev) => mergeAdjacentLaneSections(prev, indexA, indexB));
  }, []);

  const splitUserSections = useCallback((index: number, splitTime: number) => {
    setUserSections((prev) => splitLaneSection(prev, index, splitTime));
  }, []);

  const handleUnifiedSeek = useCallback(
    (time: number) => {
      if (isYouTubeMedia) {
        youtubeControllerRef.current?.seekTo(time);
        return;
      }
      seek(time);
    },
    [isYouTubeMedia, seek]
  );
  const handleYouTubeControllerReady = useCallback((controller: YouTubeController | null) => {
    youtubeControllerRef.current = controller;
    if (controller) {
      controller.setPlaybackRate(snapYouTubePlaybackRate(youtubePlayback.playbackRate));
    }
  }, [youtubePlayback.playbackRate]);

  const effectiveDuration = isYouTubeMedia ? youtubePlayback.duration : duration;
  const effectiveCurrentTime = isYouTubeMedia ? youtubePlayback.currentTime : currentTime;
  const effectiveIsPlaying = isYouTubeMedia ? youtubePlayback.isPlaying : isPlaying;
  const effectivePlaybackRate = isYouTubeMedia ? youtubePlayback.playbackRate : playbackRate;

  const captureSongSettings = useCallback((): PerSongSettings => {
    const bpm = Math.round(effectiveBpm);
    return {
      metronomeEnabled,
      drumEnabled,
      audioVolume,
      metronomeVolume,
      drumVolume,
      audioMuted,
      drumMuted,
      metronomeMuted,
      alignLoopToMetronome,
      correctedDetectedKey: correctedDetectedKey ?? null,
      transposeSemitones,
      bpm,
      youtubeManualBpm: isYouTubeMedia ? bpm : undefined,
      playbackRate: effectivePlaybackRate,
      syncStartTime,
      loopEnabled,
      loopRegion,
      nudgeUnit,
    };
  }, [
    alignLoopToMetronome,
    audioMuted,
    audioVolume,
    correctedDetectedKey,
    drumEnabled,
    drumMuted,
    drumVolume,
    effectiveBpm,
    effectivePlaybackRate,
    isYouTubeMedia,
    loopEnabled,
    loopRegion,
    metronomeEnabled,
    metronomeMuted,
    metronomeVolume,
    nudgeUnit,
    syncStartTime,
    transposeSemitones,
  ]);

  useEffect(() => {
    captureSongSettingsRef.current = captureSongSettings;
  }, [captureSongSettings]);

  const persistCurrentSongSettings = useCallback(
    (entryId: string = activeEntryId ?? '', overrides?: Partial<PerSongSettings>) => {
      if (!entryId || isLoadingEntryRef.current) return;
      const settings = { ...captureSongSettingsRef.current(), ...overrides };
      void saveSongSettingsForEntry(entryId, settings).catch((error) => {
        console.error('Failed to save song settings', error);
      });
    },
    [activeEntryId]
  );

  const exportAdapter = useMemo<ExportSourceAdapter>(() => {
    const hasAudio = Boolean(audioBuffer);
    const baseName = (mediaFile?.file.name || 'beat-track')
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    return {
      id: 'beat',
      title: 'Export Beat Track',
      fileBaseName: baseName || 'beat-track',
      stems: [{ id: 'mix', label: 'Full mix', defaultSelected: true }],
      defaultFormat: 'wav',
      supportsFormat: (format) => {
        if (!hasAudio) return false;
        return format === 'wav' || format === 'mp3' || format === 'ogg' || format === 'flac';
      },
      estimateDurationSeconds: (loopCount) => (audioBuffer?.duration ?? 0) * loopCount,
      renderAudio: async ({ loopCount }) => {
        if (!audioBuffer) {
          throw new Error('No audio loaded for export.');
        }
        return { mix: repeatAudioBuffer(audioBuffer, loopCount) };
      },
    };
  }, [audioBuffer, mediaFile?.file.name]);

  const getYoutubeMetronomeAudioContext = useCallback(() => {
    if (!youtubeMetronomeContextRef.current || youtubeMetronomeContextRef.current.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      youtubeMetronomeContextRef.current = new AudioContextClass();
    }
    return youtubeMetronomeContextRef.current;
  }, []);

  const { playClick: playYouTubeClick } = useMetronome({
    getAudioContext: getYoutubeMetronomeAudioContext,
    volume: metronomeMuted ? 0 : metronomeVolume,
  });

  const {
    selectedSectionIds,
    selectSection,
    clearSelection,
    loopEntireTrack,
    combineSelected,
    splitAtTime,
    resetSelection,
  } = useSectionSelection({
    sections: userSections,
    bpm: effectiveBpm,
    musicStartTime: effectiveSyncStart,
    musicEndTime: isYouTubeMedia ? youtubePlayback.duration : analysisResult?.musicEndTime,
    beatsPerMeasure: timeSignature.numerator,
    duration: effectiveDuration,
    mergeSections: mergeUserSections,
    splitSection: splitUserSections,
    setLoopRegion,
    setLoopEnabled,
    seek: handleUnifiedSeek,
    loopRegion,
    snapToMeasures: alignLoopToMetronome,
  });
  const hasPracticeSelection = selectedSectionIds.length > 0;
  const hasAnalysisSelection = selectedAnalysisIds.length > 0;

  const refreshLibrary = useCallback(async () => {
    const entries = await loadLibraryEntries();
    setLibraryEntries(entries);
  }, []);

  const hydratePracticeData = useCallback((rawData: UserPracticeData | UserPracticeSection[] | null) => {
    if (!rawData) {
      const lane = createUserLane('My Sections');
      setPracticeLanes([lane]);
      setActiveLaneId(lane.id);
      setUserSections([]);
      return;
    }
    const normalized: UserPracticeData = Array.isArray(rawData)
      ? {
          lanes: [createUserLane('My Sections')],
          sections: rawData,
        }
      : rawData;
    const lanes = normalized.lanes.length > 0 ? normalized.lanes : [createUserLane('My Sections')];
    const sections = normalized.sections.map((section) => toLaneSection(section, lanes[0].id)).map((section, index) => ({
      ...section,
      id: section.id || `user-section-${index}`,
    }));
    setPracticeLanes(lanes);
    setActiveLaneId(lanes[0]?.id ?? null);
    setUserSections(sections);
  }, []);

  const persistUserSections = useCallback(
    async (sectionsToSave: LaneSection[], lanesToSave: UserPracticeLane[]) => {
      if (!activeEntryId) return;
      const payload: UserPracticeData = {
        lanes: lanesToSave,
        sections: sectionsToSave.map((section) => ({
          id: section.id,
          label: section.label,
          startTime: section.startTime,
          endTime: section.endTime,
          laneId: section.laneId,
          source: 'manual',
        })),
      };
      localStorage.setItem(userSectionsStorageKey(activeEntryId), JSON.stringify(payload));
      await saveUserPracticeSections(activeEntryId, payload);
    },
    [activeEntryId]
  );

  useEffect(() => {
    persistUserSections(userSections, practiceLanes).catch((error) => {
      console.error('Failed to save user sections', error);
    });
  }, [practiceLanes, userSections, persistUserSections]);

  useEffect(() => {
    if (!activeEntryId || isLoadingEntryRef.current) return;
    const timer = window.setTimeout(() => {
      if (!activeEntryId || isLoadingEntryRef.current) return;
      persistCurrentSongSettings(activeEntryId);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [activeEntryId, captureSongSettings, persistCurrentSongSettings]);

  useEffect(() => {
    const flush = () => {
      if (activeEntryId && !isLoadingEntryRef.current) {
        void saveSongSettingsForEntry(activeEntryId, captureSongSettingsRef.current()).catch((error) => {
          console.error('Failed to flush song settings', error);
        });
      }
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [activeEntryId]);

  useEffect(() => {
    if (analysisResult && detectedBpmBaseline === null) {
      setDetectedBpmBaseline(analysisResult.bpm);
    }
  }, [analysisResult, detectedBpmBaseline]);

  useEffect(() => {
    if (!chordResult?.key || chordResult.key === 'Unknown') return;
    const nextDetectedKey = chordResult.key as MusicKey;
    setDetectedKeyBaseline((previousDetected) => (previousDetected === nextDetectedKey ? previousDetected : nextDetectedKey));
  }, [chordResult]);

  useEffect(() => {
    if (!detectedKeyBaseline) return;
    setCorrectedDetectedKey((previousCorrected) => {
      if (previousCorrected === null) return detectedKeyBaseline;
      if (!ALL_KEYS.includes(previousCorrected)) return detectedKeyBaseline;
      return previousCorrected;
    });
  }, [detectedKeyBaseline]);

  const previewUrlsRef = useRef(libraryPreviewUrls);
  previewUrlsRef.current = libraryPreviewUrls;

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    const loadPreviews = async () => {
      const currentUrls = previewUrlsRef.current;
      const neededLocalEntries = libraryEntries
        .filter((entry) => entry.sourceType === 'local' && entry.mediaKind === 'video' && !currentUrls[entry.id])
        .slice(0, 12);
      if (neededLocalEntries.length === 0) return;
      const updates: Record<string, string> = {};
      for (const entry of neededLocalEntries) {
        const file = await getLocalFileForEntry(entry.id);
        if (!file) continue;
        const objectUrl = URL.createObjectURL(file);
        created.push(objectUrl);
        updates[entry.id] = objectUrl;
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setLibraryPreviewUrls((prev) => ({ ...prev, ...updates }));
      }
    };

    loadPreviews().catch((error) => console.error('Failed to create library previews', error));
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [libraryEntries]);

  useEffect(() => {
    if (audioBuffer && analysisResult && !isAnalyzingChords && !chordResult) {
      runChordAnalysis(audioBuffer, analysisResult.beats);
    }
  }, [audioBuffer, analysisResult, isAnalyzingChords, chordResult, runChordAnalysis]);

  useEffect(() => {
    if (analysisResult && chordResult) {
      validateWithBeats(analysisResult.beats, analysisResult.bpm);
    }
  }, [analysisResult, chordResult, validateWithBeats]);

  useEffect(() => {
    if (audioBuffer && analysisResult && chordResult && !isDetectingSections && analysisSections.length === 0) {
      const fermataEndTimes =
        analysisResult.tempoRegions?.filter((region) => region.type === 'fermata').map((region) => region.endTime) ??
        [];
      detectSectionsFromBuffer(audioBuffer, analysisResult.beats, {
        minSectionDuration: 8,
        sensitivity: 0.5,
        musicStartTime: analysisResult.musicStartTime,
        bpm: analysisResult.bpm,
        beatsPerMeasure: timeSignature.numerator,
        chordEvents: chordResult.chordChanges,
        chordChangeTimes: chordResult.chordChanges.map((c) => c.time),
        keyChanges: chordResult.keyChanges,
        fermataEndTimes,
      }).catch((error) => {
        console.error('Section detection failed', error);
      });
    }
  }, [
    audioBuffer,
    analysisResult,
    chordResult,
    isDetectingSections,
    analysisSections.length,
    detectSectionsFromBuffer,
    timeSignature.numerator,
  ]);

  useEffect(() => {
    if (!activeEntryId || !analysisResult) return;
    saveAnalysisBundle(activeEntryId, {
      beat: analysisResult,
      metadata: {
        analysisVersion: BEAT_ANALYSIS_VERSION,
        analyzedAt: Date.now(),
        stale: false,
      },
    })
      .then(refreshLibrary)
      .catch((error) => console.error('Failed to save analysis bundle', error));
  }, [activeEntryId, analysisResult, refreshLibrary]);

  // Track whether we've attempted to restore from URL params yet
  const hasRestoredFromUrl = useRef(false);

  // Sync URL params when the active entry changes
  useEffect(() => {
    if (!activeEntryId && !hasRestoredFromUrl.current) return;
    const url = new URL(window.location.href);
    if (!activeEntryId) {
      url.searchParams.delete('v');
      url.searchParams.delete('f');
      if (url.search !== window.location.search) {
        window.history.replaceState(null, '', url.toString());
      }
      return;
    }
    const entry = libraryEntries.find((e) => e.id === activeEntryId);
    if (!entry) return;
    if (entry.sourceType === 'youtube' && entry.youtubeVideoId) {
      url.searchParams.set('v', entry.youtubeVideoId);
      url.searchParams.delete('f');
    } else {
      url.searchParams.set('f', entry.fingerprint);
      url.searchParams.delete('v');
    }
    if (url.search !== window.location.search) {
      window.history.replaceState(null, '', url.toString());
    }
  }, [activeEntryId, libraryEntries]);

  const applyLoadedSongSettings = useCallback((saved: PerSongSettings | null, entry: BeatLibraryEntry) => {
    const savedBpm = readSavedSongBpm(saved);
    const savedRate = saved?.playbackRate ?? 1;
    setManualBpmOverride(entry.sourceType === 'youtube' ? null : savedBpm);
    setMetronomeEnabled(saved?.metronomeEnabled ?? true);
    setDrumEnabled(saved?.drumEnabled ?? false);
    setDrumVolume(saved?.drumVolume ?? 70);
    setAudioVolume(saved?.audioVolume ?? 80);
    setMetronomeVolume(saved?.metronomeVolume ?? 50);
    setAudioMuted(saved?.audioMuted ?? false);
    setDrumMuted(saved?.drumMuted ?? false);
    setMetronomeMuted(saved?.metronomeMuted ?? false);
    setAlignLoopToMetronome(saved?.alignLoopToMetronome ?? true);
    setCorrectedDetectedKey((saved?.correctedDetectedKey as MusicKey) ?? null);
    setTransposeSemitones(saved?.transposeSemitones ?? 0);
    setSyncStartTime(saved?.syncStartTime ?? null);
    setLoopEnabled(saved?.loopEnabled ?? false);
    setLoopRegion(saved?.loopRegion ?? null);
    setNudgeUnit(saved?.nudgeUnit ?? 'measure');
    setPlaybackRate(savedRate);
    if (entry.sourceType === 'youtube') {
      setYoutubeManualBpm(savedBpm ?? 120);
    }
  }, [setAudioVolume, setLoopEnabled, setLoopRegion, setMetronomeVolume, setPlaybackRate]);

  const loadEntry = useCallback(
    async (entry: BeatLibraryEntry) => {
      if (activeEntryId && activeEntryId !== entry.id) {
        void saveSongSettingsForEntry(activeEntryId, captureSongSettingsRef.current()).catch((error) => {
          console.error('Failed to save song settings when switching entries', error);
        });
      }

      isLoadingEntryRef.current = true;

      try {
        const saved = await loadSongSettingsForEntry(entry.id);

        setActiveEntryId(entry.id);
        setAnalysisStaleMessage(
          entry.analysis.stale && entry.analysis.analyzedAt > 0
            ? entry.analysis.staleReason ?? 'Analysis may be out of date.'
            : null
        );
        setSelectedAnalysisIds([]);
        setDetectedBpmBaseline(null);
        setDetectedKeyBaseline(null);
        setSeededPracticeForEntry(null);
        setPracticeLanes([]);
        setActiveLaneId(null);
        resetSelection();
        clearSelection();
        clearAnalysisSections();
        resetChordAnalysis();
        resetAnalysis();
        applyLoadedSongSettings(saved, entry);

        const savedLocal = localStorage.getItem(userSectionsStorageKey(entry.id));
        if (savedLocal) {
          const parsed = JSON.parse(savedLocal) as UserPracticeData | UserPracticeSection[];
          hydratePracticeData(parsed);
        } else {
          const persisted = await getUserPracticeSections(entry.id);
          hydratePracticeData(persisted);
        }

        if (entry.sourceType === 'youtube' && entry.youtubeVideoId && entry.sourceUrl) {
          const savedRate = saved?.playbackRate ?? 1;
          setYoutubePlayback({
            currentTime: 0,
            duration: 0,
            isPlaying: false,
            playbackRate: snapYouTubePlaybackRate(savedRate),
          });
          setMediaFile({
            file: new File([], `${entry.title}.url`, { type: 'text/uri-list' }),
            type: 'video',
            sourceType: 'youtube',
            sourceUrl: entry.sourceUrl,
            youtubeVideoId: entry.youtubeVideoId,
            url: `https://www.youtube.com/embed/${entry.youtubeVideoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`,
          });
          return;
        }

        const [file, analysisBundle] = await Promise.all([
          getLocalFileForEntry(entry.id),
          getAnalysisBundle(entry.id),
        ]);
        if (!file) return;

        const localMedia: MediaFile = {
          file,
          type: entry.mediaKind,
          url: URL.createObjectURL(file),
          sourceType: 'local',
        };
        setMediaFile(localMedia);

        const savedBpm = readSavedSongBpm(saved);
        const hydrateFromBundle = async () => {
          if (!analysisBundle?.beat) return;
          let buffer = audioBufferCacheRef.current.get(entry.id);
          if (!buffer) {
            buffer = await decodeMediaToBuffer({
              file: localMedia.file,
              mediaType: localMedia.type,
              mediaUrl: localMedia.url,
              audioContext: getAudioContext(),
            });
            audioBufferCacheRef.current.set(entry.id, buffer);
            if (audioBufferCacheRef.current.size > 5) {
              const oldest = audioBufferCacheRef.current.keys().next().value;
              if (oldest) audioBufferCacheRef.current.delete(oldest);
            }
          }
          hydrateAnalysis({ result: analysisBundle.beat, buffer });
          if (savedBpm != null) {
            setAnalyzedBpm(savedBpm, { buffer });
          }
        };

        if (analysisBundle?.beat) {
          void hydrateFromBundle().catch((error) => console.error('[beat] failed to hydrate cached analysis', error));
          if (entry.analysis.stale) {
            setReanalysisQueue((prev) => [entry.id, ...prev.filter((id) => id !== entry.id)]);
          }
        } else {
          void (async () => {
            try {
              let buffer = audioBufferCacheRef.current.get(entry.id);
              if (!buffer) {
                buffer = await loadMediaBuffer(localMedia);
                audioBufferCacheRef.current.set(entry.id, buffer);
                if (audioBufferCacheRef.current.size > 5) {
                  const oldest = audioBufferCacheRef.current.keys().next().value;
                  if (oldest) audioBufferCacheRef.current.delete(oldest);
                }
              }
              await analyzeLoadedBuffer(buffer);
              if (savedBpm != null) {
                setAnalyzedBpm(savedBpm, { buffer });
              }
            } catch (err) {
              console.error('[beat] background analysis failed', err);
            }
          })();
        }
      } finally {
        isLoadingEntryRef.current = false;
      }

      void markEntryViewed(entry.id)
        .then(() => refreshLibrary())
        .catch((error) => console.error('Failed to mark entry viewed', error));
    },
    [
      activeEntryId,
      analyzeLoadedBuffer,
      applyLoadedSongSettings,
      clearAnalysisSections,
      clearSelection,
      getAudioContext,
      hydrateAnalysis,
      hydratePracticeData,
      loadMediaBuffer,
      refreshLibrary,
      resetAnalysis,
      resetChordAnalysis,
      resetSelection,
      setAnalyzedBpm,
    ]
  );

  const ingestAndMaybeLoad = useCallback(
    async (media: MediaFile, focus: boolean) => {
      analytics.trackEvent('analysis_start', { source: media.sourceType });
      if (media.sourceType === 'youtube') {
        const videoId = media.youtubeVideoId ?? (media.sourceUrl ? extractYouTubeVideoId(media.sourceUrl) : null);
        if (!videoId || !media.sourceUrl) return;
        const { entry, duplicateOf } = await upsertYoutubeVideo({ url: media.sourceUrl, videoId });
        await refreshLibrary();
        if (duplicateOf) {
          setDuplicateMessage(`Already in your library. Opened existing video: ${duplicateOf.title}`);
        }
        if (focus) {
          await loadEntry(entry);
        }
        return;
      }

      const taskId = crypto.randomUUID();
      setUploadTasks((prev) => [...prev, { id: taskId, name: media.file.name, status: 'processing', detail: 'Fingerprinting…' }]);

      const fingerprint = await sha256Fingerprint(media.file);
      const { entry, duplicateOf } = await upsertLocalVideo({
        file: media.file,
        mediaKind: media.type,
        fingerprint,
      });
      await refreshLibrary();

      if (duplicateOf) {
        setUploadTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: 'done', detail: 'Duplicate found' } : task)));
        setDuplicateMessage(`Duplicate detected. Opened existing upload: ${duplicateOf.title}`);
        await loadEntry(duplicateOf);
        return;
      }

      if (focus) {
        await loadEntry(entry);
      } else {
        setReanalysisQueue((prev) => [entry.id, ...prev.filter((id) => id !== entry.id)]);
      }
      setUploadTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: 'done', detail: 'Queued' } : task)));
    },
    [loadEntry, refreshLibrary]
  );

  // On mount, restore the active entry from URL params
  useEffect(() => {
    if (hasRestoredFromUrl.current || libraryEntries.length === 0) return;
    hasRestoredFromUrl.current = true;
    const params = new URLSearchParams(window.location.search);
    const ytVideoId = params.get('v');
    const fp = params.get('f');
    if (ytVideoId) {
      const match = libraryEntries.find((e) => e.youtubeVideoId === ytVideoId);
      if (match) {
        loadEntry(match);
        return;
      }
      const ytUrl = `https://www.youtube.com/watch?v=${ytVideoId}`;
      ingestAndMaybeLoad({
        file: new File([], `${ytVideoId}.url`, { type: 'text/uri-list' }),
        type: 'video',
        sourceType: 'youtube',
        sourceUrl: ytUrl,
        youtubeVideoId: ytVideoId,
        url: `https://www.youtube.com/embed/${ytVideoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`,
      }, true);
    } else if (fp) {
      const match = libraryEntries.find((e) => e.fingerprint === fp);
      if (match) {
        loadEntry(match);
      }
    }
  }, [libraryEntries, loadEntry, ingestAndMaybeLoad]);

  const handleFileSelect = useCallback(
    async (media: MediaFile) => {
      const hasActiveEntry = Boolean(activeEntryId);
      await ingestAndMaybeLoad(media, !hasActiveEntry);
    },
    [activeEntryId, ingestAndMaybeLoad]
  );

  const handleYoutubeUpgradeFileSelected = useCallback((file: File | null) => {
    if (!file) return;
    setPendingYoutubeUpgradeFile(file);
    setTransferPracticeSectionsOnUpgrade(true);
    setShowYoutubeUpgradeModal(true);
  }, []);

  const completeYoutubeUpgrade = useCallback(async () => {
    if (!pendingYoutubeUpgradeFile) return;
    const mediaKind: 'audio' | 'video' = pendingYoutubeUpgradeFile.type.startsWith('audio/') ? 'audio' : 'video';
    const fingerprint = await sha256Fingerprint(pendingYoutubeUpgradeFile);
    const existingSections = [...userSections];
    const existingLanes = [...practiceLanes];
    const { entry, duplicateOf } = await upsertLocalVideo({
      file: pendingYoutubeUpgradeFile,
      mediaKind,
      fingerprint,
    });
    await refreshLibrary();
    await loadEntry(duplicateOf ?? entry);
    if (transferPracticeSectionsOnUpgrade && existingSections.length > 0) {
      setPracticeLanes(existingLanes);
      setUserSections(existingSections);
      if ((duplicateOf ?? entry).id) {
        const payload: UserPracticeData = {
          lanes: existingLanes,
          sections: existingSections.map((section) => ({
            id: section.id,
            label: section.label,
            startTime: section.startTime,
            endTime: section.endTime,
            laneId: section.laneId,
            source: 'manual',
          })),
        };
        await saveUserPracticeSections((duplicateOf ?? entry).id, payload);
      }
    }
    setShowYoutubeUpgradeModal(false);
    setPendingYoutubeUpgradeFile(null);
  }, [loadEntry, pendingYoutubeUpgradeFile, practiceLanes, refreshLibrary, transferPracticeSectionsOnUpgrade, userSections]);

  const queueDroppedFile = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file);
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      const mediaType: 'audio' | 'video' = ['mp4', 'webm', 'mov', 'm4v', 'ogv'].includes(extension) ? 'video' : 'audio';
      await ingestAndMaybeLoad({ file, type: mediaType, url, sourceType: 'local' }, false);
    },
    [ingestAndMaybeLoad]
  );

  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
    };
    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      queueDroppedFile(file).catch((error) => console.error('Global drop failed', error));
    };
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [queueDroppedFile]);

  useEffect(() => {
    getSchemaVersion()
      .then((version) => {
        if (version < 1) {
          console.warn('Unexpected Beat Finder library schema version', version);
        }
      })
      .catch((error) => console.error('Schema version check failed', error));
    markAllStaleIfVersionChanged()
      .then(refreshLibrary)
      .catch((error) => console.error('Failed stale refresh', error));
  }, [refreshLibrary]);

  const hasBackfilledTitles = useRef(false);
  useEffect(() => {
    if (hasBackfilledTitles.current || libraryEntries.length === 0) return;
    const stale = libraryEntries.filter(
      (e) => e.sourceType === 'youtube' && e.youtubeVideoId && e.title.startsWith('YouTube ')
    );
    if (stale.length === 0) { hasBackfilledTitles.current = true; return; }
    hasBackfilledTitles.current = true;
    (async () => {
      for (const entry of stale) {
        await upsertYoutubeVideo({ url: entry.sourceUrl ?? '', videoId: entry.youtubeVideoId! });
      }
      await refreshLibrary();
    })().catch((error) => console.error('YouTube title backfill failed', error));
  }, [libraryEntries, refreshLibrary]);

  useEffect(() => {
    if (isBackgroundReanalyzing || reanalysisQueue.length === 0 || isAnalyzing) return;
    const timer = window.setTimeout(async () => {
      setIsBackgroundReanalyzing(true);
      const [nextId, ...rest] = reanalysisQueue;
      setReanalysisQueue(rest);
      try {
        const entry = libraryEntries.find((e) => e.id === nextId);
        if (!entry || entry.sourceType !== 'local') {
          return;
        }
        const isReanalysis = entry.analysis.analyzedAt > 0;
        setBackgroundIsReanalysis(isReanalysis);
        const entryTitle = entry.title;
        setUploadTasks((prev) => {
          const matching = prev.find((t) => t.detail === 'Queued' && t.name === entryTitle);
          if (matching) return prev.map((t) => (t.id === matching.id ? { ...t, status: 'processing' as const, detail: 'Analyzing…' } : t));
          return prev;
        });
        const file = await getLocalFileForEntry(nextId);
        if (!file) return;
        const mediaType = entry.mediaKind;
        const mediaUrl = URL.createObjectURL(file);
        const { result } = await runBeatAnalysisPipeline({
          file,
          mediaType,
          mediaUrl,
          audioContext: getAudioContext(),
        });
        await saveAnalysisBundle(nextId, {
          beat: result,
          metadata: {
            analysisVersion: BEAT_ANALYSIS_VERSION,
            analyzedAt: Date.now(),
            stale: false,
          },
        });
        await setEntryStaleState(nextId, false);
        URL.revokeObjectURL(mediaUrl);
        await refreshLibrary();
        setUploadTasks((prev) => {
          const matching = prev.find((t) => t.detail === 'Analyzing…' && t.name === entryTitle);
          if (matching) return prev.map((t) => (t.id === matching.id ? { ...t, status: 'done' as const, detail: 'Done' } : t));
          return prev;
        });
      } catch (error) {
        console.error('Background reanalysis failed', error);
        setUploadTasks((prev) =>
          prev.map((t) => (t.detail === 'Analyzing…' ? { ...t, status: 'error' as const, detail: 'Analysis failed' } : t))
        );
      } finally {
        setBackgroundIsReanalysis(false);
        setIsBackgroundReanalyzing(false);
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [getAudioContext, isAnalyzing, isBackgroundReanalyzing, libraryEntries, reanalysisQueue, refreshLibrary]);

  useEffect(() => {
    const hasTerminal = uploadTasks.some(
      (t) => t.status === 'done' || t.status === 'error'
    );
    if (!hasTerminal) return;
    const timer = window.setTimeout(() => {
      setUploadTasks((prev) =>
        prev.filter((t) => t.status !== 'done' && t.status !== 'error')
      );
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [uploadTasks]);

  const handleFileRemove = useCallback(() => {
    if (activeEntryId) {
      void saveSongSettingsForEntry(activeEntryId, captureSongSettingsRef.current()).catch((error) => {
        console.error('Failed to save song settings on remove', error);
      });
    }
    youtubeControllerRef.current?.pause();
    stop();
    if (mediaFile?.url && mediaFile.sourceType !== 'youtube') {
      URL.revokeObjectURL(mediaFile.url);
    }
    setMediaFile(null);
    setActiveEntryId(null);
    setManualBpmOverride(null);
    setSyncStartTime(null);
    setAnalysisStaleMessage(null);
    setUserSections([]);
    setPracticeLanes([]);
    setActiveLaneId(null);
    setDetectedBpmBaseline(null);
    setDetectedKeyBaseline(null);
    setCorrectedDetectedKey(null);
    setYoutubePlayback({
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      playbackRate: 1,
    });
    setSeededPracticeForEntry(null);
    resetAnalysis();
    clearAnalysisSections();
    resetChordAnalysis();
    resetSelection();
    setLoopRegion(null);
    setLoopEnabled(false);
  }, [activeEntryId, stop, mediaFile, resetAnalysis, clearAnalysisSections, resetChordAnalysis, resetSelection, setLoopRegion, setLoopEnabled]);

  const handleSyncStartChange = useCallback((time: number) => {
    const next = Math.max(0, Math.min(time, Math.max(0, effectiveDuration - 1)));
    setSyncStartTime(next);
    persistCurrentSongSettings(undefined, { syncStartTime: next });
  }, [effectiveDuration, persistCurrentSongSettings]);

  const handleBpmChange = useCallback((newBpm: number) => {
    if (isBeatAnalysisPending) return;
    const rounded = Math.max(40, Math.min(220, Math.round(newBpm)));
    if (isYouTubeMedia) {
      setYoutubeManualBpm(rounded);
      persistCurrentSongSettings(undefined, { bpm: rounded, youtubeManualBpm: rounded });
      return;
    }
    setManualBpmOverride(rounded);
    setAnalyzedBpm(rounded);
    persistCurrentSongSettings(undefined, { bpm: rounded });
    if (activeEntryId) {
      setEntryStaleState(activeEntryId, false).catch((error) => console.error(error));
    }
  }, [activeEntryId, isBeatAnalysisPending, isYouTubeMedia, persistCurrentSongSettings, setAnalyzedBpm]);

  const handlePlaybackRateChange = useCallback(
    (nextRate: number) => {
      if (isYouTubeMedia) {
        const snapped = snapYouTubePlaybackRate(nextRate);
        youtubeControllerRef.current?.setPlaybackRate(snapped);
        setYoutubePlayback((prev) => ({ ...prev, playbackRate: snapped }));
        return;
      }
      setPlaybackRate(nextRate);
    },
    [isYouTubeMedia, setPlaybackRate]
  );

  const handlePlayPause = useCallback(() => {
    analytics.trackEvent('playback_toggle');
    if (isYouTubeMedia) {
      if (youtubePlayback.isPlaying) youtubeControllerRef.current?.pause();
      else youtubeControllerRef.current?.play();
      return;
    }
    if (isPlaying) pause();
    else play();
  }, [isPlaying, isYouTubeMedia, pause, play, youtubePlayback.isPlaying]);


  const handleSkipToStart = useCallback(() => {
    if (isYouTubeMedia) {
      const loopStart = loopEnabled && loopRegion ? loopRegion.startTime : 0;
      youtubeControllerRef.current?.seekTo(loopStart);
      return;
    }
    skipToStart();
  }, [isYouTubeMedia, loopEnabled, loopRegion, skipToStart]);

  const handleSkipToEnd = useCallback(() => {
    if (isYouTubeMedia) {
      const target = loopEnabled && loopRegion ? loopRegion.endTime : effectiveDuration;
      youtubeControllerRef.current?.seekTo(Math.max(0, target - 0.25));
      return;
    }
    skipToEnd();
  }, [effectiveDuration, isYouTubeMedia, loopEnabled, loopRegion, skipToEnd]);

  const handleSeekByMeasures = useCallback(
    (delta: number) => {
      if (isYouTubeMedia) {
        const measureDuration = (60 / effectiveBpm) * timeSignature.numerator;
        youtubeControllerRef.current?.seekTo(Math.max(0, effectiveCurrentTime + delta * measureDuration));
        return;
      }
      seekByMeasures(delta);
    },
    [effectiveBpm, effectiveCurrentTime, isYouTubeMedia, seekByMeasures, timeSignature.numerator]
  );

  const toEditableSplitTime = useCallback((time: number) => {
    if (!alignLoopToMetronome) return time;
    return snapToMeasureStart(time, Math.max(1, effectiveBpm), effectiveSyncStart, timeSignature.numerator);
  }, [alignLoopToMetronome, effectiveBpm, effectiveSyncStart, timeSignature.numerator]);

  const handleCreateFromAnalysisSelection = useCallback(() => {
    const selected = analysisSections.filter((section) => selectedAnalysisIds.includes(section.id));
    if (selected.length === 0) return;
    const startTime = Math.min(...selected.map((s) => s.startTime));
    const endTime = Math.max(...selected.map((s) => s.endTime));
    createManualSection(startTime, endTime);
  }, [analysisSections, createManualSection, selectedAnalysisIds]);

  const handleSelectPracticeSection = useCallback(
    (section: Section, extendSelection: boolean) => {
      if (selectedAnalysisIds.length > 0) {
        setSelectedAnalysisIds([]);
      }
      const laneSection = section as LaneSection;
      setActiveLaneId(laneSection.laneId);
      selectSection(section, extendSelection);
    },
    [selectSection, selectedAnalysisIds.length]
  );

  const handleSplitAtCurrentTime = useCallback(() => {
    if (effectiveDuration <= 0) return;
    const rawSplitTime = isYouTubeMedia ? youtubePlayback.currentTime : currentTime;
    const splitTime = toEditableSplitTime(rawSplitTime);
    const sectionAtTime = userSections.find((section) => splitTime > section.startTime && splitTime < section.endTime);
    if (sectionAtTime) {
      pushPracticeHistory();
      splitAtTime(sectionAtTime.id, splitTime);
      return;
    }
    if (hasAnalysisSelection && selectedAnalysisIds.length > 0) {
      const selected = analysisSections.filter((section) => selectedAnalysisIds.includes(section.id));
      if (selected.length > 0) {
        const startTime = Math.min(...selected.map((section) => section.startTime));
        const endTime = Math.max(...selected.map((section) => section.endTime));
        if (splitTime > startTime && splitTime < endTime) {
          const lane = createPracticeLane(`Split ${practiceLanes.length + 1}`);
          createManualSection(startTime, splitTime, lane.id);
          createManualSection(splitTime, endTime, lane.id);
          return;
        }
      }
    }
    const baseStart = syncStartTime ?? analysisResult?.musicStartTime ?? 0;
    const baseEnd = isYouTubeMedia
      ? effectiveDuration
      : analysisResult?.musicEndTime && analysisResult.musicEndTime > baseStart
        ? analysisResult.musicEndTime
        : effectiveDuration;
    if (splitTime <= baseStart || splitTime >= baseEnd) return;
    pushPracticeHistory();
    setUserSections([
      {
        id: `user-${crypto.randomUUID()}`,
        startTime: baseStart,
        endTime: splitTime,
        label: 'Section 1',
        laneId: activeLaneId ?? practiceLanes[0]?.id ?? 'lane-user-1',
        color: '#7eb5c4',
        confidence: 1,
      },
      {
        id: `user-${crypto.randomUUID()}`,
        startTime: splitTime,
        endTime: baseEnd,
        label: 'Section 2',
        laneId: activeLaneId ?? practiceLanes[0]?.id ?? 'lane-user-1',
        color: '#7eb5c4',
        confidence: 1,
      },
    ]);
  }, [activeLaneId, analysisResult, analysisSections, createManualSection, createPracticeLane, currentTime, effectiveDuration, hasAnalysisSelection, isYouTubeMedia, practiceLanes, pushPracticeHistory, selectedAnalysisIds, splitAtTime, syncStartTime, toEditableSplitTime, userSections, youtubePlayback.currentTime]);

  const clearAnySelection = useCallback(() => {
    clearSelection();
    setSelectedAnalysisIds([]);
  }, [clearSelection]);

  const handleDeleteSelectedPracticeSections = useCallback(() => {
    if (selectedSectionIds.length === 0) return;
    pushPracticeHistory();
    setUserSections((prev) => prev.filter((section) => !selectedSectionIds.includes(section.id)));
    clearAnySelection();
  }, [clearAnySelection, pushPracticeHistory, selectedSectionIds]);

  useBeatPracticeKeyboardShortcuts({
    undoPracticeEdit,
    redoPracticeEdit,
    handleDeleteSelectedPracticeSections,
    handlePlayPause,
    selectedSectionCount: selectedSectionIds.length,
  });

  const handleResizeSection = useCallback(
    (sectionId: string, edge: 'start' | 'end', newTime: number) => {
      const section = userSections.find((s) => s.id === sectionId);
      if (!section) return;
      const resized = computePracticeSectionResize({
        section,
        edge,
        newTime,
        effectiveDuration,
        alignLoopToMetronome,
        effectiveBpm,
        beatsPerMeasure: timeSignature.numerator,
        syncStartTime: syncStartTime ?? 0,
      });
      if (!resized) return;
      setUserSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, ...resized } : s))
      );
      if (loopRegion) {
        const updatedSections = userSections.map((s) =>
          s.id === sectionId ? { ...s, ...resized } : s
        );
        const nextLoop = loopRegionForSelectedSections(updatedSections, selectedSectionIds);
        if (nextLoop) setLoopRegion(nextLoop);
      }
    },
    [
      alignLoopToMetronome,
      effectiveBpm,
      effectiveDuration,
      loopRegion,
      selectedSectionIds,
      setLoopRegion,
      syncStartTime,
      timeSignature.numerator,
      userSections,
    ]
  );

  const handleCombineSelection = useCallback(() => {
    if (hasPracticeSelection) {
      pushPracticeHistory();
      combineSelected();
      return;
    }
    if (!hasAnalysisSelection || selectedAnalysisIds.length < 2) return;
    const selected = analysisSections
      .filter((section) => selectedAnalysisIds.includes(section.id))
      .sort((a, b) => a.startTime - b.startTime);
    if (selected.length < 2) return;
    const startTime = selected[0].startTime;
    const endTime = selected[selected.length - 1].endTime;
    if (endTime > startTime) {
      const lane = createPracticeLane(`Merged ${practiceLanes.length + 1}`);
      createManualSection(startTime, endTime, lane.id);
    }
    setSelectedAnalysisIds([]);
  }, [analysisSections, combineSelected, createManualSection, createPracticeLane, hasAnalysisSelection, hasPracticeSelection, practiceLanes.length, pushPracticeHistory, selectedAnalysisIds]);

  const handleNudgeLoopSelection = useCallback(
    (direction: 'start' | 'end', delta: number) => {
      const selectedPractice = userSections.filter((section) => selectedSectionIds.includes(section.id));
      const selectedAnalysis = analysisSections.filter((section) => selectedAnalysisIds.includes(section.id));
      const selectedPool = selectedPractice.length > 0 ? selectedPractice : selectedAnalysis;
      let region = loopRegion;
      if (!region && selectedPool.length > 0) {
        region = {
          startTime: Math.min(...selectedPool.map((section) => section.startTime)),
          endTime: Math.max(...selectedPool.map((section) => section.endTime)),
        };
      }
      if (!region) return;

      const measureDuration = getMeasureDuration(Math.max(1, effectiveBpm), timeSignature.numerator);
      const stepDuration = nudgeUnit === 'beat' ? (measureDuration / timeSignature.numerator) : measureDuration;
      let nextStart = region.startTime;
      let nextEnd = region.endTime;
      if (direction === 'start') {
        nextStart = Math.max(0, region.startTime + delta * stepDuration);
      } else {
        nextEnd = Math.min(effectiveDuration, region.endTime + delta * stepDuration);
      }
      if (nextEnd - nextStart < Math.max(0.2, stepDuration * 0.5)) return;
      setLoopRegion({ startTime: nextStart, endTime: nextEnd });
    },
    [analysisSections, effectiveBpm, effectiveDuration, loopRegion, nudgeUnit, selectedAnalysisIds, selectedSectionIds, setLoopRegion, timeSignature.numerator, userSections]
  );

  const handleSelectAnalysisSection = useCallback(
    (section: Section, extendSelection: boolean) => {
      if (!extendSelection || selectedAnalysisIds.length === 0) {
        clearSelection();
        setSelectedAnalysisIds([section.id]);
        setLoopRegion({ startTime: section.startTime, endTime: section.endTime });
        handleUnifiedSeek(section.startTime);
        return;
      }
      const clickedIndex = analysisSections.findIndex((item) => item.id === section.id);
      const selectedIndices = selectedAnalysisIds
        .map((id) => analysisSections.findIndex((item) => item.id === id))
        .filter((index) => index >= 0)
        .sort((a, b) => a - b);
      if (clickedIndex < 0 || selectedIndices.length === 0) {
        clearSelection();
        setSelectedAnalysisIds([section.id]);
        return;
      }
      const start = Math.min(selectedIndices[0], clickedIndex);
      const end = Math.max(selectedIndices[selectedIndices.length - 1], clickedIndex);
      const range = analysisSections.slice(start, end + 1);
      setSelectedAnalysisIds(range.map((item) => item.id));
      if (range.length > 0) {
        const startTime = range[0].startTime;
        const endTime = range[range.length - 1].endTime;
        setLoopRegion({ startTime, endTime });
        handleUnifiedSeek(startTime);
      }
    },
    [analysisSections, clearSelection, handleUnifiedSeek, selectedAnalysisIds, setLoopRegion]
  );

  const filteredLibrary = useMemo(() => {
    const term = libraryQuery.trim().toLowerCase();
    if (!term) return libraryEntries;
    return libraryEntries.filter((entry) => entry.title.toLowerCase().includes(term));
  }, [libraryEntries, libraryQuery]);
  const staleLibraryIds = useMemo(() => libraryEntries.filter((entry) => entry.analysis.stale).map((entry) => entry.id), [libraryEntries]);
  const staleCount = staleLibraryIds.length;

  const currentPlaybackKey = useMemo<MusicKey>(() => {
    const baseKey = correctedDetectedKey ?? detectedKeyBaseline;
    if (!baseKey) return 'C';
    return transposeKey(baseKey, transposeSemitones) as MusicKey;
  }, [correctedDetectedKey, detectedKeyBaseline, transposeSemitones]);
  const playbackBpmValue = Math.round(effectiveBpm * effectivePlaybackRate);
  const playbackRateDelta = effectivePlaybackRate - 1;
  const isPlaybackBpmShifted = Math.abs(playbackRateDelta) > 0.001;
  const isPlaybackKeyShifted = transposeSemitones !== 0;

  useEffect(() => {
    setTransposeDraft(String(transposeSemitones));
  }, [transposeSemitones]);

  const commitTransposeDraft = useCallback((raw: string) => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      setTransposeDraft((current) => (current.trim() === '' ? '0' : String(transposeSemitones)));
      return;
    }
    const next = Math.max(-12, Math.min(12, Math.round(parsed)));
    setTransposeSemitones(next);
    setTransposeDraft(String(next));
  }, [transposeSemitones]);

  const timelineSections = userSections;

  const getEntryStatusLabel = useCallback(
    (entry: BeatLibraryEntry): string => {
      if (entry.id === activeEntryId && isAnalyzing) return 'Analyzing';
      if (entry.analysis.stale) return 'Outdated';
      return '';
    },
    [activeEntryId, isAnalyzing]
  );
  const commitRename = useCallback(async (entryId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (trimmed) {
      await renameLibraryEntry(entryId, trimmed);
      await refreshLibrary();
    }
    setEditingEntryId(null);
    setEditingTitle('');
  }, [refreshLibrary]);

  const renderLibraryCard = useCallback(
    (entry: BeatLibraryEntry, highlightActive = false) => {
      const statusLabel = getEntryStatusLabel(entry);
      const isActive = highlightActive && entry.id === activeEntryId;
      return (
        <BeatLibraryCard
          key={entry.id}
          entry={entry}
          isActive={isActive}
          isEditing={editingEntryId === entry.id}
          editingTitle={editingTitle}
          statusLabel={statusLabel}
          previewUrl={libraryPreviewUrls[entry.id]}
          onSelect={() => loadEntry(entry)}
          onStartRename={() => {
            setEditingEntryId(entry.id);
            setEditingTitle(entry.title);
          }}
          onEditingTitleChange={setEditingTitle}
          onCommitRename={(title) => commitRename(entry.id, title)}
          onCancelRename={() => {
            setEditingEntryId(null);
            setEditingTitle('');
          }}
        />
      );
    },
    [activeEntryId, commitRename, editingEntryId, editingTitle, getEntryStatusLabel, libraryPreviewUrls, loadEntry]
  );

  const hasAudio = audioBuffer !== null;
  const hasVideo = mediaFile?.type === 'video';
  const isYouTube = isYouTubeMedia;
  const isReady = Boolean(mediaFile);
  const confidenceLevel = analysisResult?.confidenceLevel ?? 'medium';
  const warnings = analysisResult?.warnings ?? [];
  const tempoWarning = warnings.find((w) => w.includes('tempo fluctuations') || w.includes('rubato'));
  const [tempoWarningDismissed, setTempoWarningDismissed] = useState(false);
  const keyConfidenceScore = chordResult?.keyConfidence ?? null;
  const keyConfidenceLevel =
    keyConfidenceScore === null ? null : keyConfidenceScore >= 0.68 ? 'high' : keyConfidenceScore >= 0.4 ? 'medium' : 'low';
  const activeEntry = useMemo(() => libraryEntries.find((e) => e.id === activeEntryId) ?? null, [libraryEntries, activeEntryId]);
  const canResetSyncStart = Math.abs(effectiveSyncStart - detectedSyncStart) > 0.05;
  const youtubeBeatState = useMemo(() => {
    if (!isYouTube || effectiveCurrentTime < effectiveSyncStart) {
      return { currentBeat: 0, currentMeasure: 0, progress: 0 };
    }
    const beatDuration = 60 / effectiveBpm;
    const elapsed = effectiveCurrentTime - effectiveSyncStart;
    const beats = Math.max(0, elapsed / beatDuration);
    const beatIndex = Math.floor(beats);
    return {
      currentBeat: beatIndex % timeSignature.numerator,
      currentMeasure: Math.floor(beatIndex / timeSignature.numerator),
      progress: beats - Math.floor(beats),
    };
  }, [effectiveBpm, effectiveCurrentTime, effectiveSyncStart, isYouTube, timeSignature.numerator]);

  const effectiveCurrentBeat = isYouTube ? youtubeBeatState.currentBeat : currentBeat;
  const effectiveCurrentMeasure = isYouTube ? youtubeBeatState.currentMeasure : currentMeasure;
  const effectiveProgress = isYouTube ? youtubeBeatState.progress : progress;

  useEffect(() => {
    if (!isYouTube || !loopEnabled || !loopRegion || !effectiveIsPlaying) return;
    if (effectiveCurrentTime >= loopRegion.endTime && loopRegion.endTime > loopRegion.startTime) {
      youtubeControllerRef.current?.seekTo(loopRegion.startTime);
    }
  }, [effectiveCurrentTime, effectiveIsPlaying, isYouTube, loopEnabled, loopRegion]);

  useEffect(() => {
    if (!isYouTube || !metronomeEnabled || isBeatAnalysisPending || metronomeMuted || !effectiveIsPlaying) return;
    if (effectiveCurrentTime < effectiveSyncStart) {
      youtubeLastBeatRef.current = -1;
      return;
    }
    const beatDuration = 60 / effectiveBpm;
    const beatIndex = Math.floor((effectiveCurrentTime - effectiveSyncStart) / beatDuration);
    if (beatIndex !== youtubeLastBeatRef.current) {
      youtubeLastBeatRef.current = beatIndex;
      playYouTubeClick(beatIndex % timeSignature.numerator === 0);
    }
  }, [effectiveBpm, effectiveCurrentTime, effectiveIsPlaying, effectiveSyncStart, isBeatAnalysisPending, isYouTube, metronomeEnabled, metronomeMuted, playYouTubeClick, timeSignature.numerator]);

  useEffect(() => {
    if (!isReady || effectiveDuration <= 0 || !activeEntryId) return;
    if (userSections.length > 0) return;
    if (seededPracticeForEntry === activeEntryId) return;
    const firstLane = practiceLanes[0] ?? createUserLane('My Sections');
    if (practiceLanes.length === 0) {
      setPracticeLanes([firstLane]);
      setActiveLaneId(firstLane.id);
    }
    const startTime = syncStartTime ?? analysisResult?.musicStartTime ?? 0;
    const endTime = isYouTube
      ? effectiveDuration
      : analysisResult?.musicEndTime && analysisResult.musicEndTime > startTime
        ? analysisResult.musicEndTime
        : effectiveDuration;
    setUserSections([
      {
        id: `user-${crypto.randomUUID()}`,
        startTime,
        endTime,
        label: 'Section 1',
        laneId: firstLane.id,
        color: '#7eb5c4',
        confidence: 1,
      },
    ]);
    setSeededPracticeForEntry(activeEntryId);
  }, [activeEntryId, analysisResult, effectiveDuration, isReady, isYouTube, practiceLanes, seededPracticeForEntry, syncStartTime, userSections.length]);

  return (
    <div className="beat-app">
      <SkipToMain />
      <header className="beat-header">
        <h1>Find the Beat</h1>
      </header>

      <main id="main" className="beat-main">
        {!isReady && (
          <div className="upload-section">
            <UploadLanding onFileSelect={handleFileSelect} />
            {analysisError && <p className="error-text">{analysisError}</p>}
            {duplicateMessage && <p className="error-text">{duplicateMessage}</p>}
            {libraryEntries.length > 0 && (
              <BeatLibraryShell
                staleCount={staleCount}
                staleLibraryIds={staleLibraryIds}
                onReanalyzeStale={setReanalysisQueue}
                libraryQuery={libraryQuery}
                onLibraryQueryChange={setLibraryQuery}
              >
                {filteredLibrary.map((entry) => renderLibraryCard(entry))}
              </BeatLibraryShell>
            )}
          </div>
        )}

        {isReady && mediaFile && (
          <div className="player-layout">
            <div className="viz-section">
              {isBeatAnalysisPending && (
                <div className="analysis-background-banner" role="status" aria-live="polite">
                  <div className="analyzing-spinner compact" aria-hidden />
                  <div className="analysis-background-banner-copy">
                    <strong>{analysisProgress?.stage ?? 'Analyzing tempo…'}</strong>
                    <span>Playback is available. BPM and metronome unlock when analysis finishes.</span>
                  </div>
                  <div className="analysis-progress inline">
                    <div
                      className={`analysis-progress-bar ${!analysisProgress || analysisProgress.progress < 5 ? 'indeterminate' : ''}`}
                      style={
                        analysisProgress && analysisProgress.progress >= 5
                          ? { width: `${analysisProgress.progress}%` }
                          : undefined
                      }
                    />
                  </div>
                </div>
              )}
              {tempoWarning && !tempoWarningDismissed && (
                <div className="tempo-warning-banner">
                  <span className="material-symbols-outlined">music_off</span>
                  <span className="tempo-warning-text">{tempoWarning}</span>
                  <button className="tempo-warning-dismiss" onClick={() => setTempoWarningDismissed(true)} aria-label="Dismiss">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              )}
              <BeatTransportControls
                effectiveIsPlaying={effectiveIsPlaying}
                onPlayPause={handlePlayPause}
                onSkipToStart={handleSkipToStart}
                onSeekByMeasures={handleSeekByMeasures}
                onSkipToEnd={handleSkipToEnd}
                effectivePlaybackRate={effectivePlaybackRate}
                onPlaybackRateChange={handlePlaybackRateChange}
                isYouTubeMedia={isYouTubeMedia}
                exportButtonRef={exportButtonRef}
                exportOpen={exportOpen}
                onExportOpen={() => { setExportOpen(true); analytics.trackEvent('export_open'); }}
                onExportClose={() => setExportOpen(false)}
                exportAdapter={exportAdapter}
                loopEnabled={loopEnabled}
                selectedSectionIds={selectedSectionIds}
                selectedAnalysisIds={selectedAnalysisIds}
                onLoopPlayThrough={() => setLoopEnabled(false)}
                onLoopEntireTrack={loopEntireTrack}
                onLoopSection={() => {
                  if (!loopRegion && selectedAnalysisIds.length > 0) {
                    const selected = analysisSections.filter((section) => selectedAnalysisIds.includes(section.id));
                    if (selected.length > 0) {
                      const startTime = Math.min(...selected.map((section) => section.startTime));
                      const endTime = Math.max(...selected.map((section) => section.endTime));
                      setLoopRegion({ startTime, endTime });
                      handleUnifiedSeek(startTime);
                    }
                  } else if (selectedSectionIds.length === 0 && timelineSections.length > 0) {
                    const currentSection = timelineSections.find(
                      (section) => effectiveCurrentTime >= section.startTime && effectiveCurrentTime < section.endTime
                    );
                    if (currentSection) {
                      selectSection(currentSection, false);
                    }
                  }
                  setLoopEnabled(true);
                }}
                mixerOpen={mixerOpen}
                mixerAnchorRef={mixerAnchorRef}
                onToggleMixer={() => setMixerOpen((o) => !o)}
                onCloseMixer={() => setMixerOpen(false)}
                isYouTube={isYouTube}
                audioVolume={audioVolume}
                audioMuted={audioMuted}
                onAudioVolumeChange={setAudioVolume}
                onAudioMutedChange={setAudioMuted}
                drumVolume={drumVolume}
                drumMuted={drumMuted}
                onDrumVolumeChange={setDrumVolume}
                onDrumMutedChange={setDrumMuted}
                metronomeVolume={metronomeVolume}
                metronomeMuted={metronomeMuted}
                metronomeEnabled={metronomeEnabled}
                onMetronomeVolumeChange={setMetronomeVolume}
                onMetronomeMutedChange={setMetronomeMuted}
              />

              {activeEntry && (
                <div className="now-playing-title-bar">
                  {editingEntryId === activeEntry.id ? (
                    <input
                      className="now-playing-title-input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => commitRename(activeEntry.id, editingTitle)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitRename(activeEntry.id, editingTitle); }
                        if (e.key === 'Escape') { setEditingEntryId(null); setEditingTitle(''); }
                      }}
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                    />
                  ) : (
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                    <h2
                      className="now-playing-title"
                      onDoubleClick={() => { setEditingEntryId(activeEntry.id); setEditingTitle(activeEntry.title); }}
                      title="Double-click to rename"
                    >
                      {activeEntry.title}
                    </h2>
                  )}
                </div>
              )}

              {hasVideo ? (
                <div className="video-container">
                  {isYouTube ? (
                    <Suspense fallback={<div className="video-loading">Loading YouTube player…</div>}>
                      <YouTubePlayer
                        embedUrl={mediaFile.url}
                        onStateChange={setYoutubePlayback}
                        onControllerReady={handleYouTubeControllerReady}
                      />
                    </Suspense>
                  ) : (
                    <VideoPlayer
                      videoUrl={mediaFile.url}
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                      playbackRate={playbackRate}
                      onPlayPauseToggle={handlePlayPause}
                    />
                  )}
                </div>
              ) : (
                <div className="beat-viz-container">
                  <BeatVisualizer timeSignature={timeSignature} currentBeat={currentBeat} progress={progress} />
                  <span className="measure-num large">Measure {currentMeasure + 1}</span>
                </div>
              )}

              {(isYouTube || analysisResult || hasAudio) && (
                <PlaybackBar
                  playback={{
                    currentTime: effectiveCurrentTime,
                    duration: effectiveDuration,
                    musicStartTime: effectiveSyncStart,
                    musicEndTime: isYouTube ? effectiveDuration : analysisResult?.musicEndTime,
                    syncStartTime: effectiveSyncStart,
                    isInSyncRegion: effectiveCurrentTime >= effectiveSyncStart,
                    isInFermata: false,
                    tempoRegions: undefined,
                  }}
                  loop={{ region: loopRegion, enabled: loopEnabled }}
                  sectionControls={{
                    sections: timelineSections,
                    practiceLanes,
                    generatedLaneLabel: 'Generated Sections',
                    referenceSections: analysisSections,
                    referenceSelectedIds: selectedAnalysisIds,
                    selectedIds: selectedSectionIds,
                    isDetecting: isDetectingSections,
                    onSelect: handleSelectPracticeSection,
                    onSelectReference: handleSelectAnalysisSection,
                    onClear: clearAnySelection,
                    onCombine: handleCombineSelection,
                    onSplit: (sectionId, splitTime) => {
                      if (hasPracticeSelection) {
                        pushPracticeHistory();
                        splitAtTime(sectionId, splitTime);
                        return;
                      }
                      const target = analysisSections.find((section) => section.id === sectionId);
                      if (target) {
                        const snapped = toEditableSplitTime(splitTime);
                        if (snapped > target.startTime && snapped < target.endTime) {
                          pushPracticeHistory();
                          const lane = createPracticeLane(`Split ${practiceLanes.length + 1}`);
                          createManualSection(target.startTime, snapped, lane.id);
                          createManualSection(snapped, target.endTime, lane.id);
                        }
                        setSelectedAnalysisIds([]);
                      }
                    },
                    onExtend: handleNudgeLoopSelection,
                    onResizeSection: handleResizeSection,
                    onSaveReferenceSelection: !isYouTube ? handleCreateFromAnalysisSelection : undefined,
                    onSplitAtCurrentTime: handleSplitAtCurrentTime,
                    onDeleteSelection: selectedSectionIds.length > 0 ? handleDeleteSelectedPracticeSections : undefined,
                    snapToMeasuresEnabled: alignLoopToMetronome,
                    onToggleSnapToMeasures: setAlignLoopToMetronome,
                    nudgeUnit,
                    onToggleNudgeUnit: setNudgeUnit,
                    onCreateLane: () => createPracticeLane(),
                    onRenameLane: renamePracticeLane,
                    onDeleteLane: deletePracticeLane,
                    onCloneGeneratedLane: cloneGeneratedLane,
                    onCloneLane: clonePracticeLane,
                    onRenameSection: renamePracticeSection,
                  }}
                  chordData={
                    chordResult
                      ? {
                          chordChanges: chordResult.chordChanges,
                          keyChanges: chordResult.keyChanges,
                        }
                      : undefined
                  }
                  onSeek={handleUnifiedSeek}
                  onSyncStartChange={handleSyncStartChange}
                />
              )}

            </div>
            <div className="sidebar-column">
            <div className="controls-section">
              {analysisStaleMessage && (
                <div className="stale-banner">
                  <span className="material-symbols-outlined">history</span>
                  <span>{analysisStaleMessage}</span>
                  {activeEntryId && (
                    <AppTooltip title="Reanalyze this video">
                      <button
                        className="icon-btn subtle"
                        onClick={() => setReanalysisQueue((prev) => [activeEntryId, ...prev.filter((id) => id !== activeEntryId)])}
                      >
                        <span className="material-symbols-outlined">refresh</span>
                      </button>
                    </AppTooltip>
                  )}
                </div>
              )}

              {isYouTube ? (
                <div className="youtube-capability-note">
                  <p>Advanced analysis is disabled for YouTube videos.</p>
                  <p>Upload a local copy of this song to unlock full analysis. Your practice sections can be transferred.</p>
                  <button className="url-load-btn small" onClick={() => youtubeUpgradeInputRef.current?.click()}>
                    <span className="material-symbols-outlined">upload</span>
                    Upload local video for analysis
                  </button>
                </div>
              ) : null}

              <div className="tempo-sync-group light">
                <div className="bpm-section">
                  <div className="bpm-label-row">
                    <div className="field-label-inline">
                      <span className="bpm-label">BPM</span>
                      {!isYouTube && (
                        <AppTooltip title={(warnings.length ? warnings : ['Analysis confidence']).join('\n')}>
                          <span className={`confidence-badge compact ${confidenceLevel}`}>
                            <span className="material-symbols-outlined">
                              {confidenceLevel === 'high' ? 'verified' : confidenceLevel === 'medium' ? 'help' : 'warning'}
                            </span>
                            <span className="confidence-label">{confidenceLevel}</span>
                          </span>
                        </AppTooltip>
                      )}
                    </div>
                  </div>
                  <div className="bpm-control-row">
                    <BpmInput
                      value={Math.round(effectiveBpm)}
                      onChange={handleBpmChange}
                      disabled={isBeatAnalysisPending}
                      className="shared-bpm-input"
                      dropdownClassName="beat-bpm-dropdown"
                      sliderClassName="beat-bpm-slider"
                      trailingActions={
                        <AppTooltip
                          title={
                            isYouTube
                              ? 'Reset to default: 120 BPM'
                              : `Reset to detected: ${Math.round(detectedBpmBaseline ?? effectiveBpm)} BPM`
                          }
                        >
                          <span className="bpm-reset-tooltip-anchor">
                            <button
                              type="button"
                              className="inline-icon-btn bpm-reset-btn"
                              aria-label={
                                isYouTube
                                  ? 'Reset to default: 120 BPM'
                                  : `Reset to detected: ${Math.round(detectedBpmBaseline ?? effectiveBpm)} BPM`
                              }
                              disabled={
                                isYouTube
                                  ? Math.round(youtubeManualBpm) === 120
                                  : detectedBpmBaseline === null || Math.round(effectiveBpm) === Math.round(detectedBpmBaseline)
                              }
                              onClick={() => {
                                if (isYouTube) {
                                  handleBpmChange(120);
                                } else if (detectedBpmBaseline !== null) {
                                  handleBpmChange(detectedBpmBaseline);
                                }
                              }}
                            >
                              <span className="material-symbols-outlined">restart_alt</span>
                            </button>
                          </span>
                        </AppTooltip>
                      }
                    />
                    <div className="time-sig bpm-time-sig">
                      <span>{timeSignature.numerator}</span>
                      <span>{timeSignature.denominator}</span>
                    </div>
                  </div>
                </div>

                <div className="playback-speed-row">
                  <span className="sync-start-label">Playback speed</span>
                  <div className="playback-speed-controls">
                    <PlaybackSpeedControl
                      value={effectivePlaybackRate}
                      onChange={handlePlaybackRateChange}
                      className="shared-bpm-input beat-playback-speed-sidebar"
                      dropdownClassName="beat-bpm-dropdown"
                      sliderClassName="beat-bpm-slider"
                      trailingActions={
                        Math.abs(effectivePlaybackRate - 1) > 0.001 ? (
                          <AppTooltip title="Reset playback speed to 1×">
                            <span className="bpm-reset-tooltip-anchor">
                              <button
                                type="button"
                                className="inline-icon-btn bpm-reset-btn"
                                aria-label="Reset playback speed to 1×"
                                onClick={() => handlePlaybackRateChange(1)}
                              >
                                <span className="material-symbols-outlined">restart_alt</span>
                              </button>
                            </span>
                          </AppTooltip>
                        ) : null
                      }
                    />
                    <span className={`playback-key-chip playback-bpm-chip ${isPlaybackBpmShifted ? 'shifted' : ''}`}>
                      {isPlaybackBpmShifted ? (
                        <span className={`material-symbols-outlined playback-chip-arrow ${playbackRateDelta > 0 ? 'up' : 'down'}`}>
                          {playbackRateDelta > 0 ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      ) : null}
                      {`Playback BPM: ${playbackBpmValue}`}
                    </span>
                  </div>
                </div>

                <div className="sync-start-editor">
                  <label className="sync-start-label" htmlFor="music-start-time-input">
                    Music start time (s)
                  </label>
                  <input
                    id="music-start-time-input"
                    className="sync-start-input"
                    type="number"
                    min={0}
                    max={Math.max(0, effectiveDuration)}
                    step={0.1}
                    value={Number.isFinite(effectiveSyncStart) ? effectiveSyncStart.toFixed(1) : '0.0'}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (!Number.isNaN(next)) handleSyncStartChange(next);
                    }}
                  />
                  <div className="sync-start-actions">
                    <AppTooltip title={isYouTube ? 'Reset start time to 0.0s' : 'Reset to detected music start time'}>
                      <button
                        type="button"
                        className="inline-icon-btn"
                        disabled={!canResetSyncStart}
                        onClick={() => handleSyncStartChange(detectedSyncStart)}
                      >
                        <span className="material-symbols-outlined">restart_alt</span>
                      </button>
                    </AppTooltip>
                    <AppTooltip title="Set current playback time as music start">
                      <button
                        type="button"
                        className="inline-icon-btn"
                        onClick={() => handleSyncStartChange(effectiveCurrentTime)}
                      >
                        <span className="material-symbols-outlined">my_location</span>
                      </button>
                    </AppTooltip>
                  </div>
                </div>
              </div>

              {!isYouTube && detectedKeyBaseline && (
                <div className="key-section dual">
                  <div className="key-input-group">
                    <div className="key-label-row">
                      <div className="field-label-inline">
                        <AppTooltip title="Fix the detected key if auto-detection is incorrect. This becomes the base key for transposition.">
                          <span className="key-label">Detected key (correct if needed)</span>
                        </AppTooltip>
                      {keyConfidenceLevel ? (
                        <AppTooltip title="Estimated confidence for key detection.">
                          <span className={`confidence-badge compact ${keyConfidenceLevel}`}>
                            <span className="material-symbols-outlined">
                              {keyConfidenceLevel === 'high' ? 'verified' : keyConfidenceLevel === 'medium' ? 'help' : 'warning'}
                            </span>
                            <span className="confidence-label">{keyConfidenceLevel}</span>
                          </span>
                        </AppTooltip>
                      ) : null}
                      </div>
                    </div>
                    <KeyInput
                      value={correctedDetectedKey ?? detectedKeyBaseline}
                      onChange={(next) => setCorrectedDetectedKey(next)}
                      className="shared-key-input"
                      dropdownClassName="beat-key-dropdown"
                      showStepButtons
                      trailingActions={
                        <AppTooltip title="Reset to automatically detected key">
                          <button
                            type="button"
                            className="inline-icon-btn"
                            disabled={!detectedKeyBaseline || correctedDetectedKey === detectedKeyBaseline}
                            onClick={() => {
                              if (detectedKeyBaseline) setCorrectedDetectedKey(detectedKeyBaseline);
                            }}
                          >
                            <span className="material-symbols-outlined">restart_alt</span>
                          </button>
                        </AppTooltip>
                      }
                    />
                  </div>
                  <div className="key-input-group">
                    <AppTooltip title="Set transposition in semitones. The resulting playback key updates from the corrected detected key.">
                      <span className="key-label">Transpose (semitones)</span>
                    </AppTooltip>
                    <div className="transpose-editor-row">
                      <div className="transpose-stepper-shell" role="group" aria-label="Transposition semitones">
                        <input
                          type="text"
                          inputMode="numeric"
                          className="transpose-number-input"
                          value={transposeDraft}
                          onChange={(event) => setTransposeDraft(event.target.value)}
                          onBlur={() => commitTransposeDraft(transposeDraft)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              commitTransposeDraft(transposeDraft);
                            }
                            if (event.key === 'Escape') {
                              setTransposeDraft(String(transposeSemitones));
                            }
                            if (event.key === 'ArrowUp') {
                              event.preventDefault();
                              setTransposeSemitones((value) => Math.min(12, value + 1));
                            }
                            if (event.key === 'ArrowDown') {
                              event.preventDefault();
                              setTransposeSemitones((value) => Math.max(-12, value - 1));
                            }
                          }}
                        />
                        <div className="shared-bpm-arrows">
                          <button
                            type="button"
                            className="shared-bpm-arrow"
                            disabled={transposeSemitones >= 12}
                            onClick={() => setTransposeSemitones((value) => Math.min(12, value + 1))}
                            aria-label="Increase transposition by semitone"
                          >
                            <span className="material-symbols-outlined">arrow_drop_up</span>
                          </button>
                          <button
                            type="button"
                            className="shared-bpm-arrow"
                            disabled={transposeSemitones <= -12}
                            onClick={() => setTransposeSemitones((value) => Math.max(-12, value - 1))}
                            aria-label="Decrease transposition by semitone"
                          >
                            <span className="material-symbols-outlined">arrow_drop_down</span>
                          </button>
                        </div>
                        <AppTooltip title="Reset transposition to unshifted key">
                          <button
                            type="button"
                            className="inline-icon-btn"
                            disabled={transposeSemitones === 0}
                            onClick={() => setTransposeSemitones(0)}
                          >
                            <span className="material-symbols-outlined">restart_alt</span>
                          </button>
                        </AppTooltip>
                      </div>
                      <span className={`playback-key-chip ${isPlaybackKeyShifted ? 'shifted' : ''}`}>
                        {isPlaybackKeyShifted ? (
                          <span className={`material-symbols-outlined playback-chip-arrow ${transposeSemitones > 0 ? 'up' : 'down'}`}>
                            {transposeSemitones > 0 ? 'arrow_upward' : 'arrow_downward'}
                          </span>
                        ) : null}
                        {`Playback key: ${currentPlaybackKey} (${transposeSemitones >= 0 ? '+' : ''}${transposeSemitones})`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className={`metronome-strip ${metronomeEnabled ? 'active' : ''}`}>
                {hasVideo ? (
                  <div className="mini-beat-display">
                    <BeatVisualizer timeSignature={timeSignature} currentBeat={effectiveCurrentBeat} progress={effectiveProgress} compact />
                    <span className="measure-num">M{effectiveCurrentMeasure + 1}</span>
                  </div>
                ) : (
                  <span className="metronome-strip-placeholder">Metronome</span>
                )}
                <div className="metronome-strip-toggle">
                  <AppTooltip
                    title={
                      isBeatAnalysisPending
                        ? 'Analyzing tempo…'
                        : metronomeEnabled
                          ? 'Metronome: On'
                          : 'Metronome: Off'
                    }
                  >
                    <span className="metronome-toggle-tooltip-wrap">
                      <MetronomeToggleButton
                        enabled={metronomeEnabled}
                        disabled={isBeatAnalysisPending}
                        onToggle={() => setMetronomeEnabled((value) => !value)}
                        className="toggle-btn metronome-btn icon-only"
                        label={undefined}
                        showOnLabel={false}
                        ariaLabel="Toggle metronome"
                        includeNativeTitle={false}
                        includeDataTooltip={false}
                      />
                    </span>
                  </AppTooltip>
                </div>
              </div>

              {(isYouTube || analysisResult) && (
                <div className="drum-section-inline">
                  <label className="drum-checkbox-row">
                    <input type="checkbox" checked={drumEnabled} onChange={(event) => setDrumEnabled(event.target.checked)} />
                    <span className="drum-checkbox-label">Add drums</span>
                  </label>
                  {drumEnabled && (
                    <DrumAccompaniment
                      bpm={effectiveBpm}
                      timeSignature={timeSignature}
                      isPlaying={effectiveIsPlaying && effectiveCurrentTime >= effectiveSyncStart}
                      currentBeatTime={Math.max(0, effectiveCurrentTime - effectiveSyncStart)}
                      currentBeat={effectiveCurrentBeat}
                      metronomeEnabled={metronomeEnabled}
                      volume={drumMuted ? 0 : drumVolume}
                    />
                  )}
                </div>
              )}

            </div>
              <div className="library-shell sidebar-library">
                <div className="library-header-row">
                  <div className="library-now-playing">
                    <span className="file-icon material-symbols-outlined">{hasVideo ? 'movie' : 'music_note'}</span>
                    <span className="file-name">{mediaFile.file.name}</span>
                  </div>
                  <div className="library-header-actions">
                    {staleCount > 0 && (
                      <AppTooltip title={`Reanalyze ${staleCount} outdated ${staleCount === 1 ? 'video' : 'videos'}`}>
                        <button className="icon-btn subtle" onClick={() => setReanalysisQueue(staleLibraryIds)}>
                          <span className="material-symbols-outlined">refresh</span>
                        </button>
                      </AppTooltip>
                    )}
                    <button className="change-file-btn" onClick={handleFileRemove}>
                      <span className="material-symbols-outlined">swap_horiz</span>
                      Change
                    </button>
                  </div>
                </div>
                <div className="library-toolbar">
                  <input
                    className="library-search-input"
                    placeholder="Search your uploads"
                    value={libraryQuery}
                    onChange={(event) => setLibraryQuery(event.target.value)}
                  />
                </div>
                <div className="library-grid">
                  {filteredLibrary.map((entry) => renderLibraryCard(entry, true))}
                </div>
              </div>
            </div>
          </div>
        )}

        <input
          ref={youtubeUpgradeInputRef}
          type="file"
          accept=".mp4,.webm,.mov,.m4v,.ogv,.mp3,.wav,.ogg,.flac,.aac,.m4a"
          style={{ display: 'none' }}
          onChange={(event) => {
            handleYoutubeUpgradeFileSelected(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
        />

        {showYoutubeUpgradeModal && pendingYoutubeUpgradeFile && (
          <div className="youtube-upgrade-modal-backdrop">
            <div className="youtube-upgrade-modal">
              <h3>Use local upload for full analysis?</h3>
              <p>
                You uploaded <strong>{pendingYoutubeUpgradeFile.name}</strong>. This enables advanced analysis.
              </p>
              <label className="section-checkbox-row inline">
                <input
                  type="checkbox"
                  checked={transferPracticeSectionsOnUpgrade}
                  onChange={(event) => setTransferPracticeSectionsOnUpgrade(event.target.checked)}
                />
                <span className="section-checkbox-label">Transfer current practice sections to the uploaded version</span>
              </label>
              <div className="youtube-upgrade-modal-actions">
                <button
                  className="url-load-btn small secondary"
                  onClick={() => {
                    setShowYoutubeUpgradeModal(false);
                    setPendingYoutubeUpgradeFile(null);
                  }}
                >
                  Cancel
                </button>
                <button className="url-load-btn small" onClick={() => void completeYoutubeUpgrade()}>
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {(uploadTasks.length > 0 || isBackgroundReanalyzing) && (
        <div className="floating-upload-tasks">
          {uploadTasks.slice(-4).map((task) => (
            <div key={task.id} className={`upload-task ${task.status}`}>
              <span>{task.name}</span>
              <span>{task.detail}</span>
            </div>
          ))}
          {isBackgroundReanalyzing && backgroundIsReanalysis && (
            <div className="upload-task processing">Updating older analysis in background…</div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
