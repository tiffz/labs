import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormControl, MenuItem, Select, Slider } from '@mui/material';
import { type MediaFile } from './components/MediaUploader';
import BeatVisualizer from './components/BeatVisualizer';
import VideoPlayer from './components/VideoPlayer';
import YouTubePlayer, { type YouTubeController, type YouTubePlaybackState } from './components/YouTubePlayer';
import PlaybackBar from './components/PlaybackBar';
import DrumAccompaniment from './components/DrumAccompaniment';
import UploadLanding from './components/UploadLanding';
import { useAudioAnalysis } from './hooks/useAudioAnalysis';
import { transposeKey } from './utils/musicTheory';
import { useBeatSync, PLAYBACK_SPEEDS, type PlaybackSpeed } from './hooks/useBeatSync';
import { useSectionDetection } from './hooks/useSectionDetection';
import { useChordAnalysis } from './hooks/useChordAnalysis';
import { useSectionSelection } from './hooks/useSectionSelection';
import { useMetronome } from './hooks/useMetronome';
import type { TimeSignature } from '../shared/rhythm/types';
import AppTooltip from '../shared/components/AppTooltip';
import MetronomeToggleButton from '../shared/components/MetronomeToggleButton';
import BpmInput from '../shared/components/music/BpmInput';
import KeyInput from '../shared/components/music/KeyInput';
import SharedExportPopover from '../shared/components/music/SharedExportPopover';
import { ALL_KEYS, type MusicKey } from '../shared/music/musicInputConstants';
import type { ExportSourceAdapter } from '../shared/music/exportTypes';
import { type Section } from './utils/sectionDetector';
import { getMeasureDuration } from './utils/measureUtils';
import { snapToMeasureStart } from './utils/measureUtils';
import { sha256Fingerprint } from './utils/fingerprint';
import { BEAT_ANALYSIS_VERSION } from './utils/analysisVersion';
import { shouldHandleGlobalPlaybackSpacebar } from './utils/keyboardShortcuts';
import {
  createUserLane,
  toLaneSection,
  type LaneSection,
  type PracticeEditorSnapshot,
  userSectionsStorageKey,
} from './utils/practiceSections';
import {
  mergeAdjacentLaneSections,
  splitLaneSection,
} from './utils/laneSectionOps';
import {
  extractYouTubeVideoId,
  getLibraryRecord,
  getLocalFileForEntry,
  getUserPracticeSections,
  loadLibraryEntries,
  loadStaleReanalysisQueue,
  markAllStaleIfVersionChanged,
  markEntryViewed,
  saveAnalysisBundle,
  saveUserPracticeSections,
  setEntryStaleState,
  upsertLocalVideo,
  upsertYoutubeVideo,
} from './storage/beatLibraryService';
import { getSchemaVersion } from './storage/beatLibraryDb';
import type { BeatLibraryEntry, UploadTaskState, UserPracticeData, UserPracticeLane, UserPracticeSection } from './types/library';
import { decodeMediaToBuffer, runBeatAnalysisPipeline } from './utils/analysisPipeline';

function repeatAudioBuffer(source: AudioBuffer, loops: number): AudioBuffer {
  const safeLoops = Math.max(1, loops);
  const outLength = source.length * safeLoops;
  const context = new OfflineAudioContext(source.numberOfChannels, outLength, source.sampleRate);
  const out = context.createBuffer(source.numberOfChannels, outLength, source.sampleRate);
  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const sourceData = source.getChannelData(channel);
    const targetData = out.getChannelData(channel);
    for (let loop = 0; loop < safeLoops; loop += 1) {
      targetData.set(sourceData, loop * source.length);
    }
  }
  return out;
}

const App: React.FC = () => {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [libraryEntries, setLibraryEntries] = useState<BeatLibraryEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [uploadTasks, setUploadTasks] = useState<UploadTaskState[]>([]);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [reanalysisQueue, setReanalysisQueue] = useState<string[]>([]);
  const [isBackgroundReanalyzing, setIsBackgroundReanalyzing] = useState(false);
  const [analysisStaleMessage, setAnalysisStaleMessage] = useState<string | null>(null);
  const [alignLoopToMetronome, setAlignLoopToMetronome] = useState(true);
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
  const [youtubeManualBpm, setYoutubeManualBpm] = useState(120);
  const [exportOpen, setExportOpen] = useState(false);
  const historyPastRef = useRef<PracticeEditorSnapshot[]>([]);
  const historyFutureRef = useRef<PracticeEditorSnapshot[]>([]);
  const isApplyingHistoryRef = useRef(false);

  const {
    isAnalyzing,
    analysisProgress,
    analysisResult,
    audioBuffer,
    error: analysisError,
    getAudioContext,
    analyzeMedia,
    hydrateAnalysis,
    setBpm: setAnalyzedBpm,
    reset: resetAnalysis,
  } = useAudioAnalysis();

  const {
    sections: analysisSections,
    isDetecting: isDetectingSections,
    detectSectionsFromBuffer,
    clearSections: clearAnalysisSections,
  } = useSectionDetection();

  const {
    isAnalyzing: isAnalyzingChords,
    chordResult,
    analyzeChords: runChordAnalysis,
    validateWithBeats,
    reset: resetChordAnalysis,
  } = useChordAnalysis();

  const isYouTubeMedia = mediaFile?.sourceType === 'youtube';
  const effectiveBpm = isYouTubeMedia ? youtubeManualBpm : Math.round(analysisResult?.bpm ?? 120);
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
    isInFermata,
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
    metronomeEnabled,
    syncStartTime: effectiveSyncStart,
    mediaUrl: isYouTubeMedia ? undefined : mediaFile?.url,
    transposeSemitones,
    tempoRegions: analysisResult?.tempoRegions,
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
  }, []);

  const effectiveDuration = isYouTubeMedia ? youtubePlayback.duration : duration;
  const effectiveCurrentTime = isYouTubeMedia ? youtubePlayback.currentTime : currentTime;
  const effectiveIsPlaying = isYouTubeMedia ? youtubePlayback.isPlaying : isPlaying;
  const effectivePlaybackRate = isYouTubeMedia ? youtubePlayback.playbackRate : playbackRate;
  const exportAdapter = useMemo<ExportSourceAdapter>(() => {
    const hasAudio = Boolean(audioBuffer);
    const baseName = (mediaFile?.name || 'beat-track')
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
  }, [audioBuffer, mediaFile?.name]);

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
    volume: metronomeVolume,
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

  const capturePracticeSnapshot = useCallback((): PracticeEditorSnapshot => ({
    lanes: practiceLanes.map((lane) => ({ ...lane })),
    sections: userSections.map((section) => ({ ...section })),
    activeLaneId,
  }), [activeLaneId, practiceLanes, userSections]);

  const pushPracticeHistory = useCallback(() => {
    if (isApplyingHistoryRef.current) return;
    const snapshot = capturePracticeSnapshot();
    historyPastRef.current = [...historyPastRef.current.slice(-79), snapshot];
    historyFutureRef.current = [];
  }, [capturePracticeSnapshot]);

  const applyPracticeSnapshot = useCallback((snapshot: PracticeEditorSnapshot) => {
    isApplyingHistoryRef.current = true;
    setPracticeLanes(snapshot.lanes.map((lane) => ({ ...lane })));
    setUserSections(snapshot.sections.map((section) => ({ ...section })));
    setActiveLaneId(snapshot.activeLaneId);
    window.setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 0);
  }, []);

  const undoPracticeEdit = useCallback(() => {
    const previous = historyPastRef.current[historyPastRef.current.length - 1];
    if (!previous) return;
    const current = capturePracticeSnapshot();
    historyPastRef.current = historyPastRef.current.slice(0, -1);
    historyFutureRef.current = [...historyFutureRef.current, current];
    applyPracticeSnapshot(previous);
  }, [applyPracticeSnapshot, capturePracticeSnapshot]);

  const redoPracticeEdit = useCallback(() => {
    const next = historyFutureRef.current[historyFutureRef.current.length - 1];
    if (!next) return;
    const current = capturePracticeSnapshot();
    historyFutureRef.current = historyFutureRef.current.slice(0, -1);
    historyPastRef.current = [...historyPastRef.current.slice(-79), current];
    applyPracticeSnapshot(next);
  }, [applyPracticeSnapshot, capturePracticeSnapshot]);

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

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    const loadPreviews = async () => {
      const neededLocalEntries = libraryEntries
        .filter((entry) => entry.sourceType === 'local' && entry.mediaKind === 'video' && !libraryPreviewUrls[entry.id])
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
  }, [libraryEntries, libraryPreviewUrls]);

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

  const loadEntry = useCallback(
    async (entry: BeatLibraryEntry) => {
      await markEntryViewed(entry.id);
      await refreshLibrary();
      setActiveEntryId(entry.id);
      setSyncStartTime(null);
      setAnalysisStaleMessage(
        entry.analysis.stale && entry.analysis.analyzedAt > 0
          ? entry.analysis.staleReason ?? 'Analysis may be out of date.'
          : null
      );
      setSelectedAnalysisIds([]);
      setDetectedBpmBaseline(null);
      setDetectedKeyBaseline(null);
      setCorrectedDetectedKey(null);
      setTransposeSemitones(0);
      setSeededPracticeForEntry(null);
      setPracticeLanes([]);
      setActiveLaneId(null);
      resetSelection();
      clearSelection();
      setLoopEnabled(false);
      setLoopRegion(null);
      clearAnalysisSections();
      resetChordAnalysis();
      resetAnalysis();

      const savedLocal = localStorage.getItem(userSectionsStorageKey(entry.id));
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal) as UserPracticeData | UserPracticeSection[];
        hydratePracticeData(parsed);
      } else {
        const persisted = await getUserPracticeSections(entry.id);
        hydratePracticeData(persisted);
      }

      if (entry.sourceType === 'youtube' && entry.youtubeVideoId && entry.sourceUrl) {
        setYoutubePlayback({
          currentTime: 0,
          duration: 0,
          isPlaying: false,
          playbackRate: 1,
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

      const file = await getLocalFileForEntry(entry.id);
      if (!file) return;
      const localMedia: MediaFile = {
        file,
        type: entry.mediaKind,
        url: URL.createObjectURL(file),
        sourceType: 'local',
      };
      setMediaFile(localMedia);

      const record = await getLibraryRecord(entry.id);
      if (record?.analysisBundle?.beat) {
        const buffer = await decodeMediaToBuffer({
          file: localMedia.file,
          mediaType: localMedia.type,
          mediaUrl: localMedia.url,
          audioContext: getAudioContext(),
        });
        hydrateAnalysis({ result: record.analysisBundle.beat, buffer });
        if (entry.analysis.stale) {
          setReanalysisQueue((prev) => [entry.id, ...prev.filter((id) => id !== entry.id)]);
        }
      } else {
        await analyzeMedia(localMedia);
      }
    },
    [
      analyzeMedia,
      clearAnalysisSections,
      clearSelection,
      getAudioContext,
      hydrateAnalysis,
      hydratePracticeData,
      refreshLibrary,
      resetAnalysis,
      resetChordAnalysis,
      resetSelection,
      setLoopEnabled,
      setLoopRegion,
    ]
  );

  const ingestAndMaybeLoad = useCallback(
    async (media: MediaFile, focus: boolean) => {
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
        setReanalysisQueue((prev) => [...prev, entry.id]);
      }
      setUploadTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: 'done', detail: 'Queued' } : task)));
    },
    [loadEntry, refreshLibrary]
  );

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
    loadStaleReanalysisQueue()
      .then((queue) => setReanalysisQueue(queue.map((item) => item.id)))
      .catch((error) => console.error('Failed to load stale queue', error));
  }, [refreshLibrary]);

  useEffect(() => {
    if (isBackgroundReanalyzing || reanalysisQueue.length === 0 || isAnalyzing) return;
    const timer = window.setTimeout(async () => {
      setIsBackgroundReanalyzing(true);
      const [nextId, ...rest] = reanalysisQueue;
      setReanalysisQueue(rest);
      try {
        const record = await getLibraryRecord(nextId);
        if (!record || record.entry.sourceType !== 'local') return;
        const file = await getLocalFileForEntry(nextId);
        if (!file) return;
        const mediaType = record.entry.mediaKind;
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
      } catch (error) {
        console.error('Background reanalysis failed', error);
      } finally {
        setIsBackgroundReanalyzing(false);
      }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [getAudioContext, isAnalyzing, isBackgroundReanalyzing, reanalysisQueue, refreshLibrary]);

  const handleFileRemove = useCallback(() => {
    youtubeControllerRef.current?.pause();
    stop();
    if (mediaFile?.url && mediaFile.sourceType !== 'youtube') {
      URL.revokeObjectURL(mediaFile.url);
    }
    setMediaFile(null);
    setActiveEntryId(null);
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
  }, [stop, mediaFile, resetAnalysis, clearAnalysisSections, resetChordAnalysis, resetSelection, setLoopRegion, setLoopEnabled]);

  const handleSyncStartChange = useCallback((time: number) => {
    setSyncStartTime(Math.max(0, Math.min(time, Math.max(0, effectiveDuration - 1))));
  }, [effectiveDuration]);

  const handleBpmChange = useCallback((newBpm: number) => {
    if (isYouTubeMedia) {
      setYoutubeManualBpm(Math.max(40, Math.min(220, Math.round(newBpm))));
      return;
    }
    setAnalyzedBpm(newBpm);
    if (activeEntryId) {
      setEntryStaleState(activeEntryId, false).catch((error) => console.error(error));
    }
  }, [activeEntryId, isYouTubeMedia, setAnalyzedBpm]);

  const handlePlaybackRateChange = useCallback(
    (nextRate: PlaybackSpeed) => {
      if (isYouTubeMedia) {
        youtubeControllerRef.current?.setPlaybackRate(nextRate);
        return;
      }
      setPlaybackRate(nextRate);
    },
    [isYouTubeMedia, setPlaybackRate]
  );

  const handlePlayPause = useCallback(() => {
    if (isYouTubeMedia) {
      if (youtubePlayback.isPlaying) youtubeControllerRef.current?.pause();
      else youtubeControllerRef.current?.play();
      return;
    }
    if (isPlaying) pause();
    else play();
  }, [isPlaying, isYouTubeMedia, pause, play, youtubePlayback.isPlaying]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditableTarget = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );

      if (!isEditableTarget && (event.metaKey || event.ctrlKey)) {
        const isRedo = event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z');
        const isUndo = !event.shiftKey && event.key.toLowerCase() === 'z';
        if (isUndo) {
          event.preventDefault();
          undoPracticeEdit();
          return;
        }
        if (isRedo) {
          event.preventDefault();
          redoPracticeEdit();
          return;
        }
      }

      if (!shouldHandleGlobalPlaybackSpacebar(event)) return;
      event.preventDefault();
      handlePlayPause();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, redoPracticeEdit, undoPracticeEdit]);

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

  const createManualSection = useCallback((startTime: number, endTime: number, laneId?: string) => {
    if (endTime <= startTime) return;
    const targetLaneId = laneId ?? activeLaneId ?? practiceLanes[0]?.id;
    if (!targetLaneId) return;
    pushPracticeHistory();
    setUserSections((prev) => [
      ...prev,
      {
        id: `user-${crypto.randomUUID()}`,
        startTime,
        endTime,
        label: `Section ${prev.length + 1}`,
        laneId: targetLaneId,
        color: '#7eb5c4',
        confidence: 1,
      },
    ]);
  }, [activeLaneId, practiceLanes, pushPracticeHistory]);

  const createPracticeLane = useCallback((name?: string) => {
    const laneName = name?.trim() ? name.trim() : `Lane ${practiceLanes.length + 1}`;
    const lane = createUserLane(laneName);
    pushPracticeHistory();
    setPracticeLanes((prev) => [...prev, lane]);
    setActiveLaneId(lane.id);
    return lane;
  }, [practiceLanes.length, pushPracticeHistory]);

  const renamePracticeLane = useCallback((laneId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = practiceLanes.find((lane) => lane.id === laneId);
    if (!existing || existing.name === trimmed) return;
    pushPracticeHistory();
    setPracticeLanes((prev) => prev.map((lane) => (lane.id === laneId ? { ...lane, name: trimmed } : lane)));
  }, [practiceLanes, pushPracticeHistory]);

  const deletePracticeLane = useCallback((laneId: string) => {
    pushPracticeHistory();
    setUserSections((prev) => prev.filter((section) => section.laneId !== laneId));
    setPracticeLanes((prev) => {
      const remaining = prev.filter((lane) => lane.id !== laneId);
      if (remaining.length === 0) {
        const fallback = createUserLane('Lane 1');
        setActiveLaneId(fallback.id);
        return [fallback];
      }
      if (activeLaneId === laneId) {
        setActiveLaneId(remaining[0].id);
      }
      return remaining;
    });
  }, [activeLaneId, pushPracticeHistory]);

  const cloneGeneratedLane = useCallback(() => {
    if (analysisSections.length === 0) return;
    pushPracticeHistory();
    const lane = createPracticeLane(`Generated Copy ${practiceLanes.length + 1}`);
    setUserSections((prev) => [
      ...prev,
      ...analysisSections.map((section, index) => ({
        ...section,
        id: `user-${crypto.randomUUID()}`,
        label: `Section ${prev.length + index + 1}`,
        laneId: lane.id,
        color: '#7eb5c4',
      })),
    ]);
  }, [analysisSections, createPracticeLane, practiceLanes.length, pushPracticeHistory]);

  const clonePracticeLane = useCallback(
    (laneId: string) => {
      const sourceLane = practiceLanes.find((lane) => lane.id === laneId);
      if (!sourceLane) return;
      pushPracticeHistory();
      const sourceSections = userSections.filter((section) => section.laneId === laneId);
      const lane = createPracticeLane(`${sourceLane.name} Copy`);
      setUserSections((prev) => [
        ...prev,
        ...sourceSections.map((section, index) => ({
          ...section,
          id: `section-${crypto.randomUUID()}`,
          label: `Section ${index + 1}`,
          laneId: lane.id,
        })),
      ]);
      setActiveLaneId(lane.id);
    },
    [createPracticeLane, practiceLanes, pushPracticeHistory, userSections]
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

  const renamePracticeSection = useCallback((sectionId: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const existing = userSections.find((section) => section.id === sectionId);
    if (!existing || existing.label === trimmed) return;
    pushPracticeHistory();
    setUserSections((prev) => prev.map((section) => (section.id === sectionId ? { ...section, label: trimmed } : section)));
  }, [pushPracticeHistory, userSections]);

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
    (direction: 'start' | 'end', deltaMeasures: number) => {
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
      let nextStart = region.startTime;
      let nextEnd = region.endTime;
      if (direction === 'start') {
        nextStart = Math.max(0, region.startTime + deltaMeasures * measureDuration);
      } else {
        nextEnd = Math.min(effectiveDuration, region.endTime + deltaMeasures * measureDuration);
      }
      if (nextEnd - nextStart < Math.max(0.2, measureDuration * 0.5)) return;
      setLoopRegion({ startTime: nextStart, endTime: nextEnd });
    },
    [analysisSections, effectiveBpm, effectiveDuration, loopRegion, selectedAnalysisIds, selectedSectionIds, setLoopRegion, timeSignature.numerator, userSections]
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
  const renderLibraryCard = useCallback(
    (entry: BeatLibraryEntry, highlightActive = false) => {
      const statusLabel = getEntryStatusLabel(entry);
      const isActive = highlightActive && entry.id === activeEntryId;
      return (
        <button
          key={entry.id}
          className={`library-card ${isActive ? 'active' : ''}`}
          onClick={() => loadEntry(entry)}
        >
          <div className="library-thumb">
            {entry.sourceType === 'youtube' && entry.youtubeVideoId ? (
              <img src={`https://i.ytimg.com/vi/${entry.youtubeVideoId}/hqdefault.jpg`} alt={entry.title} />
            ) : libraryPreviewUrls[entry.id] ? (
              <video src={libraryPreviewUrls[entry.id]} muted />
            ) : (
              <span className="material-symbols-outlined">movie</span>
            )}
          </div>
          <div className="library-card-meta">
            <span className="library-card-title">{entry.title}</span>
            {statusLabel && <span className={`library-status ${statusLabel === 'Outdated' ? 'stale' : 'fresh'}`}>{statusLabel}</span>}
          </div>
        </button>
      );
    },
    [activeEntryId, getEntryStatusLabel, libraryPreviewUrls, loadEntry]
  );

  const hasAudio = audioBuffer !== null;
  const hasVideo = mediaFile?.type === 'video';
  const isYouTube = isYouTubeMedia;
  const isProcessing = isAnalyzing || isAnalyzingChords || isDetectingSections;
  const isReady = isYouTube || (hasAudio && analysisResult !== null);
  const confidenceLevel = analysisResult?.confidenceLevel ?? 'medium';
  const warnings = analysisResult?.warnings ?? [];
  const keyConfidenceScore = chordResult?.keyConfidence ?? null;
  const keyConfidenceLevel =
    keyConfidenceScore === null ? null : keyConfidenceScore >= 0.68 ? 'high' : keyConfidenceScore >= 0.4 ? 'medium' : 'low';
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
    if (!isYouTube || !metronomeEnabled || !effectiveIsPlaying) return;
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
  }, [effectiveBpm, effectiveCurrentTime, effectiveIsPlaying, effectiveSyncStart, isYouTube, metronomeEnabled, playYouTubeClick, timeSignature.numerator]);

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
      <header className="beat-header">
        <h1>Find the Beat</h1>
      </header>

      <main className="beat-main">
        {!isReady && (
          <div className="upload-section">
            {isProcessing ? (
              <div className="analyzing">
                <div className="analyzing-spinner" />
                <p>{analysisProgress?.stage || 'Analyzing…'}</p>
                <div className="analysis-progress">
                  <div
                    className={`analysis-progress-bar ${!analysisProgress || analysisProgress.progress < 5 ? 'indeterminate' : ''}`}
                    style={analysisProgress && analysisProgress.progress >= 5 ? { width: `${analysisProgress.progress}%` } : undefined}
                  />
                </div>
              </div>
            ) : (
              <UploadLanding onFileSelect={handleFileSelect} />
            )}
            {analysisError && <p className="error-text">{analysisError}</p>}
            {duplicateMessage && <p className="error-text">{duplicateMessage}</p>}
            {libraryEntries.length > 0 && (
              <div className="library-shell compact">
                <div className="library-header-row">
                  <h3>Your uploads</h3>
                  {staleCount > 0 && (
                    <AppTooltip title={`Reanalyze ${staleCount} outdated ${staleCount === 1 ? 'video' : 'videos'}`}>
                      <button className="icon-btn subtle" onClick={() => setReanalysisQueue(staleLibraryIds)}>
                        <span className="material-symbols-outlined">refresh</span>
                      </button>
                    </AppTooltip>
                  )}
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
                  {filteredLibrary.map((entry) => renderLibraryCard(entry))}
                </div>
              </div>
            )}
          </div>
        )}

        {isReady && mediaFile && (
          <div className="player-layout">
            <div className="viz-section">
              <div className="transport-controls transport-controls-sticky">
                <div className="transport-row">
                  <button className={`play-btn ${effectiveIsPlaying ? 'playing' : ''}`} onClick={handlePlayPause}>
                    <span className="material-symbols-outlined">{effectiveIsPlaying ? 'pause' : 'play_arrow'}</span>
                  </button>
                  <button className="nav-btn" onClick={handleSkipToStart}>
                    <span className="material-symbols-outlined">skip_previous</span>
                  </button>
                  <button className="nav-btn" onClick={() => handleSeekByMeasures(-1)}>
                    <span className="material-symbols-outlined">fast_rewind</span>
                  </button>
                  <button className="nav-btn" onClick={() => handleSeekByMeasures(1)}>
                    <span className="material-symbols-outlined">fast_forward</span>
                  </button>
                  <button className="nav-btn" onClick={handleSkipToEnd}>
                    <span className="material-symbols-outlined">skip_next</span>
                  </button>
                  <FormControl size="small" className="speed-control">
                    <Select
                      value={effectivePlaybackRate}
                      onChange={(event) => {
                        const nextRate = Number(event.target.value) as PlaybackSpeed;
                        handlePlaybackRateChange(nextRate);
                      }}
                      className="speed-select"
                      MenuProps={{
                        PaperProps: { className: 'speed-menu-paper' },
                        MenuListProps: { className: 'speed-menu-list' },
                      }}
                    >
                      {PLAYBACK_SPEEDS.map((speed) => (
                        <MenuItem key={speed} value={speed}>
                          {speed === 1 ? '1×' : `${speed}×`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <button
                    ref={exportButtonRef}
                    className="nav-btn"
                    onClick={() => setExportOpen(true)}
                    aria-label="Export audio"
                    title="Export audio"
                  >
                    <span className="material-symbols-outlined">download</span>
                  </button>
                  <SharedExportPopover
                    open={exportOpen}
                    anchorEl={exportButtonRef.current}
                    onClose={() => setExportOpen(false)}
                    adapter={exportAdapter}
                    persistKey="beat"
                  />
                  <div className="loop-options">
                    <AppTooltip title="Play through">
                      <label className={`loop-option has-tooltip ${!loopEnabled ? 'active' : ''}`}>
                        <input type="radio" name="loopMode" checked={!loopEnabled} onChange={() => setLoopEnabled(false)} />
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </label>
                    </AppTooltip>
                    <AppTooltip title="Loop track">
                      <label className={`loop-option has-tooltip ${loopEnabled && selectedSectionIds.length === 0 ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="loopMode"
                          checked={loopEnabled && selectedSectionIds.length === 0}
                          onChange={loopEntireTrack}
                        />
                        <span className="material-symbols-outlined">repeat</span>
                      </label>
                    </AppTooltip>
                    <AppTooltip title="Loop section">
                      <label className={`loop-option has-tooltip ${loopEnabled && (selectedSectionIds.length > 0 || selectedAnalysisIds.length > 0) ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="loopMode"
                          checked={loopEnabled && (selectedSectionIds.length > 0 || selectedAnalysisIds.length > 0)}
                          onChange={() => {
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
                        />
                        <span className="material-symbols-outlined">repeat_one</span>
                      </label>
                    </AppTooltip>
                  </div>
                </div>
                <div className="volume-mixer horizontal">
                  <div className="mixer-row">
                    <span className="mixer-label">
                      <span className="material-symbols-outlined">music_note</span>
                    </span>
                    <Slider
                      min={0}
                      max={100}
                      value={audioVolume}
                      onChange={(_, value) => setAudioVolume(Number(value))}
                      className="mixer-slider"
                      disabled={isYouTube}
                      size="small"
                    />
                    <span className="mixer-value">{audioVolume}%</span>
                  </div>
                  <div className="mixer-row">
                    <span className="mixer-label">
                      <span className="material-symbols-outlined">music_cast</span>
                    </span>
                    <Slider
                      min={0}
                      max={100}
                      value={drumVolume}
                      onChange={(_, value) => setDrumVolume(Number(value))}
                      className="mixer-slider"
                      size="small"
                    />
                    <span className="mixer-value">{drumVolume}%</span>
                  </div>
                  <div className="mixer-row">
                    <span className="mixer-label">
                      <span className="material-symbols-outlined">timer</span>
                    </span>
                    <Slider
                      min={0}
                      max={100}
                      value={metronomeVolume}
                      onChange={(_, value) => setMetronomeVolume(Number(value))}
                      className="mixer-slider"
                      disabled={!metronomeEnabled}
                      size="small"
                    />
                    <span className="mixer-value">{metronomeVolume}%</span>
                  </div>
                </div>
              </div>

              {hasVideo ? (
                <div className="video-container">
                  {isYouTube ? (
                    <YouTubePlayer
                      embedUrl={mediaFile.url}
                      onStateChange={setYoutubePlayback}
                      onControllerReady={handleYouTubeControllerReady}
                    />
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

              {(isYouTube || analysisResult) && (
                <PlaybackBar
                  playback={{
                    currentTime: effectiveCurrentTime,
                    duration: effectiveDuration,
                    musicStartTime: effectiveSyncStart,
                    musicEndTime: isYouTube ? effectiveDuration : analysisResult?.musicEndTime,
                    syncStartTime: effectiveSyncStart,
                    isInSyncRegion: effectiveCurrentTime >= effectiveSyncStart,
                    isInFermata: isYouTube ? false : isInFermata,
                    tempoRegions: isYouTube ? undefined : analysisResult?.tempoRegions,
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
                    onSaveReferenceSelection: !isYouTube ? handleCreateFromAnalysisSelection : undefined,
                    onSplitAtCurrentTime: handleSplitAtCurrentTime,
                    onDeleteSelection: selectedSectionIds.length > 0 ? handleDeleteSelectedPracticeSections : undefined,
                    snapToMeasuresEnabled: alignLoopToMetronome,
                    onToggleSnapToMeasures: setAlignLoopToMetronome,
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
                    <FormControl size="small" className="speed-control sidebar">
                      <Select
                        value={effectivePlaybackRate}
                        onChange={(event) => {
                          const nextRate = Number(event.target.value) as PlaybackSpeed;
                          handlePlaybackRateChange(nextRate);
                        }}
                        className="speed-select"
                        MenuProps={{
                          PaperProps: { className: 'speed-menu-paper' },
                          MenuListProps: { className: 'speed-menu-list' },
                        }}
                      >
                        {PLAYBACK_SPEEDS.map((speed) => (
                          <MenuItem key={speed} value={speed}>
                            {speed === 1 ? '1×' : `${speed}×`}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
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
                  <AppTooltip title={metronomeEnabled ? 'Metronome: On' : 'Metronome: Off'}>
                    <span className="metronome-toggle-tooltip-wrap">
                      <MetronomeToggleButton
                        enabled={metronomeEnabled}
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
                      isPlaying={effectiveIsPlaying && effectiveCurrentTime >= effectiveSyncStart && (isYouTube || !isInFermata)}
                      currentBeatTime={Math.max(0, effectiveCurrentTime - effectiveSyncStart)}
                      currentBeat={effectiveCurrentBeat}
                      metronomeEnabled={metronomeEnabled}
                      volume={drumVolume}
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

      {uploadTasks.length > 0 && (
        <div className="floating-upload-tasks">
          {uploadTasks.slice(-4).map((task) => (
            <div key={task.id} className={`upload-task ${task.status}`}>
              <span>{task.name}</span>
              <span>{task.detail}</span>
            </div>
          ))}
          {isBackgroundReanalyzing && <div className="upload-task processing">Reanalyzing cached videos in background…</div>}
        </div>
      )}
    </div>
  );
};

export default App;
