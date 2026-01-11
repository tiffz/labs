import React, { useState, useCallback, useEffect } from 'react';
import MediaUploader, { type MediaFile } from './components/MediaUploader';
import BpmDisplay from './components/BpmDisplay';
import BeatVisualizer from './components/BeatVisualizer';
import VideoPlayer from './components/VideoPlayer';
import PlaybackBar from './components/PlaybackBar';
import DrumAccompaniment from './components/DrumAccompaniment';
import ChordChart from './components/ChordChart';
import { useAudioAnalysis } from './hooks/useAudioAnalysis';

// Experimental features - only available in development
const IS_DEV = import.meta.env.DEV;
const EXPERIMENTAL_CHORD_CHART = IS_DEV;

import { transposeKey } from './utils/musicTheory';
import { useBeatSync, PLAYBACK_SPEEDS, type PlaybackSpeed } from './hooks/useBeatSync';
import { useSectionDetection } from './hooks/useSectionDetection';
import { useChordAnalysis } from './hooks/useChordAnalysis';
import type { TimeSignature } from '../shared/rhythm/types';
import { type Section, extendToMeasureBoundary } from './utils/sectionDetector';

const App: React.FC = () => {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [timeSignature] = useState<TimeSignature>({
    numerator: 4,
    denominator: 4,
  });
  const [metronomeEnabled, setMetronomeEnabled] = useState(true); // Click on by default
  const [drumEnabled, setDrumEnabled] = useState(false); // Drums off by default
  
  // Sync start time - defines where the steady beat section begins
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);

  const {
    isAnalyzing,
    analysisResult,
    audioBuffer,
    error: analysisError,
    analyzeMedia,
    setBpm: setAnalyzedBpm,
    reset: resetAnalysis,
  } = useAudioAnalysis();

  // Section detection
  const {
    sections,
    isDetecting: isDetectingSections,
    detectSectionsFromBuffer,
    clearSections,
    merge: mergeSections,
    split: splitSection,
  } = useSectionDetection();

  // Chord analysis
  const {
    isAnalyzing: isAnalyzingChords,
    chordResult,
    analyzeChords: runChordAnalysis,
    validateWithBeats,
    reset: resetChordAnalysis,
  } = useChordAnalysis();

  // Chord chart visibility state (experimental feature)
  const [showChordChart, setShowChordChart] = useState(false);

  // Selected section(s) for looping - supports multiple adjacent sections
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);

  const [drumVolume, setDrumVolume] = useState(70);
  
  // Transpose in semitones (-12 to +12)
  const [transposeSemitones, setTransposeSemitones] = useState(0);

  // Calculate effective sync start (user-adjusted or auto-detected)
  const effectiveSyncStart = syncStartTime ?? analysisResult?.musicStartTime ?? 0;

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
    isInSyncRegion,
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
    bpm: analysisResult?.bpm ?? 120,
    timeSignature,
    musicStartTime: analysisResult?.musicStartTime ?? 0,
    metronomeEnabled,
    syncStartTime: effectiveSyncStart,
    mediaUrl: mediaFile?.url,
    transposeSemitones,
  });

  // Run chord analysis after BPM analysis completes
  useEffect(() => {
    if (audioBuffer && analysisResult && !isAnalyzingChords && !chordResult) {
      runChordAnalysis(audioBuffer, analysisResult.beats);
    }
  }, [audioBuffer, analysisResult, isAnalyzingChords, chordResult, runChordAnalysis]);

  // Validate beat/chord alignment when both are available
  useEffect(() => {
    if (analysisResult && chordResult) {
      validateWithBeats(analysisResult.beats, analysisResult.bpm);
    }
  }, [analysisResult, chordResult, validateWithBeats]);

  // Run section detection after chord analysis completes
  // We wait for chord data because key changes are strong indicators of section boundaries
  useEffect(() => {
    if (audioBuffer && analysisResult && chordResult && !isDetectingSections && sections.length === 0) {
      detectSectionsFromBuffer(audioBuffer, analysisResult.beats, {
        minSectionDuration: 8,
        sensitivity: 0.5,
        musicStartTime: analysisResult.musicStartTime,
        bpm: analysisResult.bpm,
        beatsPerMeasure: timeSignature.numerator,
        keyChanges: chordResult.keyChanges,
      }).catch((err) => {
        console.error('[Section Detection] Detection failed:', err);
      });
    }
  }, [audioBuffer, analysisResult, chordResult, isDetectingSections, sections.length, detectSectionsFromBuffer, timeSignature.numerator]);

  const handleFileSelect = useCallback(
    async (media: MediaFile) => {
      setMediaFile(media);
      // Reset sync start for new file
      setSyncStartTime(null);
      await analyzeMedia(media);
    },
    [analyzeMedia]
  );

  const handleFileRemove = useCallback(() => {
    stop();
    if (mediaFile?.url) {
      URL.revokeObjectURL(mediaFile.url);
    }
    setMediaFile(null);
    setSyncStartTime(null);
    resetAnalysis();
    clearSections();
    resetChordAnalysis();
    setShowChordChart(false);
    setSelectedSectionIds([]);
    setLoopRegion(null);
    setLoopEnabled(false);
  }, [stop, mediaFile, resetAnalysis, clearSections, resetChordAnalysis, setLoopRegion, setLoopEnabled]);

  // Handle section selection (supports multi-select with shift key)
  // Loop regions are extended to nearest measure boundaries for smoother musical transitions
  const handleSelectSection = useCallback(
    (section: Section, extendSelection: boolean = false) => {
      const bpm = analysisResult?.bpm ?? 120;
      const musicStart = analysisResult?.musicStartTime ?? 0;
      const beatsPerMeasure = timeSignature.numerator;
      
      if (extendSelection && selectedSectionIds.length > 0) {
        // Extend selection to include range from first selected to clicked section
        const clickedIndex = sections.findIndex(s => s.id === section.id);
        const selectedIndices = selectedSectionIds.map(id => sections.findIndex(s => s.id === id));
        const minSelected = Math.min(...selectedIndices);
        const maxSelected = Math.max(...selectedIndices);
        
        // Determine the new range
        let newStart: number, newEnd: number;
        if (clickedIndex < minSelected) {
          newStart = clickedIndex;
          newEnd = maxSelected;
        } else if (clickedIndex > maxSelected) {
          newStart = minSelected;
          newEnd = clickedIndex;
        } else {
          // Clicked within range, keep existing selection
          newStart = minSelected;
          newEnd = maxSelected;
        }
        
        // Select all sections in range
        const newIds = sections.slice(newStart, newEnd + 1).map(s => s.id);
        setSelectedSectionIds(newIds);
        
        // Update loop region to span all selected sections, extended to measure boundaries
        const firstSection = sections[newStart];
        const lastSection = sections[newEnd];
        const loopStart = extendToMeasureBoundary(firstSection.startTime, 'start', bpm, musicStart, beatsPerMeasure);
        const loopEnd = extendToMeasureBoundary(lastSection.endTime, 'end', bpm, musicStart, beatsPerMeasure, duration);
        setLoopRegion({
          startTime: loopStart,
          endTime: loopEnd,
        });
        seek(loopStart);
      } else {
        // Single selection - extend to measure boundaries for smoother loops
        setSelectedSectionIds([section.id]);
        const loopStart = extendToMeasureBoundary(section.startTime, 'start', bpm, musicStart, beatsPerMeasure);
        const loopEnd = extendToMeasureBoundary(section.endTime, 'end', bpm, musicStart, beatsPerMeasure, duration);
        setLoopRegion({
          startTime: loopStart,
          endTime: loopEnd,
        });
        seek(loopStart);
      }
    },
    [sections, selectedSectionIds, seek, setLoopRegion, analysisResult, timeSignature.numerator, duration]
  );

  // Handle clearing section selection
  const handleClearSelection = useCallback(() => {
    setSelectedSectionIds([]);
    setLoopRegion(null);
    setLoopEnabled(false);
  }, [setLoopRegion, setLoopEnabled]);

  // Handle looping entire track
  const handleLoopEntireTrack = useCallback(() => {
    setSelectedSectionIds([]);
    const musicStart = analysisResult?.musicStartTime ?? 0;
    setLoopRegion({
      startTime: musicStart,
      endTime: duration,
    });
    setLoopEnabled(true);
  }, [analysisResult?.musicStartTime, duration, setLoopRegion, setLoopEnabled]);

  // Handle combining selected sections
  const handleCombineSections = useCallback(() => {
    if (selectedSectionIds.length < 2) return;
    
    // Find indices of selected sections and sort them
    const indices = selectedSectionIds
      .map(id => sections.findIndex(s => s.id === id))
      .filter(i => i >= 0)
      .sort((a, b) => a - b);
    
    if (indices.length < 2) return;
    
    // Merge from the end to avoid index shifting issues
    for (let i = indices.length - 1; i > 0; i--) {
      mergeSections(indices[i - 1], indices[i]);
    }
    
    // Select the merged section (first index)
    const newSection = sections[indices[0]];
    if (newSection) {
      setSelectedSectionIds([newSection.id]);
    }
  }, [selectedSectionIds, sections, mergeSections]);

  // Handle splitting a section at current time
  const handleSplitSection = useCallback((sectionId: string, splitTime: number) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex < 0) return;
    
    splitSection(sectionIndex, splitTime);
    
    // Clear selection after split
    setSelectedSectionIds([]);
  }, [sections, splitSection]);

  // Handle extending/reducing selection by measures
  const handleExtendSelection = useCallback((direction: 'start' | 'end', delta: number) => {
    if (!loopRegion || !analysisResult) return;
    
    const bpm = analysisResult.bpm;
    const musicStart = analysisResult.musicStartTime ?? 0;
    const beatsPerMeasure = timeSignature.numerator;
    const measureDuration = (60 / bpm) * beatsPerMeasure;
    
    let newStart = loopRegion.startTime;
    let newEnd = loopRegion.endTime;
    
    if (direction === 'start') {
      // delta > 0 means move start later (shrink from start)
      // delta < 0 means move start earlier (extend from start)
      newStart = Math.max(musicStart, loopRegion.startTime + delta * measureDuration);
    } else {
      // delta > 0 means move end later (extend from end)
      // delta < 0 means move end earlier (shrink from end)
      newEnd = Math.min(duration, loopRegion.endTime + delta * measureDuration);
    }
    
    // Ensure minimum 1 measure length
    if (newEnd - newStart < measureDuration) return;
    
    setLoopRegion({ startTime: newStart, endTime: newEnd });
  }, [loopRegion, analysisResult, timeSignature.numerator, duration, setLoopRegion]);
  
  // Handler for dragging sync start marker
  const handleSyncStartChange = useCallback((time: number) => {
    setSyncStartTime(Math.max(0, Math.min(time, duration - 1)));
  }, [duration]);

  const handleBpmChange = useCallback(
    (newBpm: number) => {
      setAnalyzedBpm(newBpm);
    },
    [setAnalyzedBpm]
  );

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const hasAudio = audioBuffer !== null;
  const hasVideo = mediaFile?.type === 'video';

  // Get confidence display
  const confidenceLevel = analysisResult?.confidenceLevel ?? 'medium';
  const warnings = analysisResult?.warnings ?? [];

  return (
    <div className="beat-app">
      {/* Compact Header */}
      <header className="beat-header">
        <h1>Find the Beat</h1>
      </header>

      <main className="beat-main">
        {/* Upload State */}
        {!hasAudio && (
          <div className="upload-section">
            {isAnalyzing ? (
              <div className="analyzing">
                <div className="analyzing-spinner" />
                <p>Analyzing...</p>
              </div>
            ) : (
              <>
                <div className="landing-info">
                  <p className="landing-description">
                    Upload a song to detect its tempo and practice with a metronome / drums.
                  </p>
                  <p className="landing-note">
                    Works best with songs that have a steady, consistent rhythm.
                  </p>
                </div>
                <MediaUploader onFileSelect={handleFileSelect} />
              </>
            )}
            {analysisError && (
              <p className="error-text">{analysisError}</p>
            )}
          </div>
        )}

        {/* Main Player UI - Compact single-screen layout */}
        {hasAudio && analysisResult && (
          <div className="player-layout">
            {/* Left: Visualization + Playback Controls */}
            <div className="viz-section">
              {/* Video or Beat visualization */}
              {hasVideo && mediaFile ? (
                <div className="video-container">
                  <VideoPlayer
                    videoUrl={mediaFile.url}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    playbackRate={playbackRate}
                    onPlayPauseToggle={handlePlayPause}
                  />
                </div>
              ) : (
                <div className="beat-viz-container">
                  <BeatVisualizer
                    timeSignature={timeSignature}
                    currentBeat={currentBeat}
                    progress={progress}
                  />
                  <span className="measure-num large">Measure {currentMeasure + 1}</span>
                </div>
              )}

              {/* Playback Bar with integrated sections */}
              <PlaybackBar
                currentTime={currentTime}
                duration={duration}
                musicStartTime={analysisResult.musicStartTime}
                syncStartTime={effectiveSyncStart}
                onSeek={seek}
                onSyncStartChange={handleSyncStartChange}
                isInSyncRegion={isInSyncRegion}
                sections={sections}
                loopRegion={loopRegion}
                loopEnabled={loopEnabled}
                selectedSectionIds={selectedSectionIds}
                onSelectSection={handleSelectSection}
                onClearSelection={handleClearSelection}
                isDetectingSections={isDetectingSections}
                onCombineSections={handleCombineSections}
                onSplitSection={handleSplitSection}
                onExtendSelection={handleExtendSelection}
                chordChanges={chordResult?.chordChanges}
                keyChanges={chordResult?.keyChanges}
              />

              {/* Transport Controls - under video */}
              <div className="transport-controls">
                <div className="transport-row">
                  <button
                    className={`play-btn ${isPlaying ? 'playing' : ''}`}
                    onClick={handlePlayPause}
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    <span className="material-symbols-outlined">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </button>
                  <button
                    className="nav-btn"
                    onClick={skipToStart}
                    title="Skip to start"
                  >
                    <span className="material-symbols-outlined">skip_previous</span>
                  </button>
                  <button
                    className="nav-btn"
                    onClick={() => seekByMeasures(-1)}
                    title="Previous measure"
                  >
                    <span className="material-symbols-outlined">fast_rewind</span>
                  </button>
                  <button
                    className="nav-btn"
                    onClick={() => seekByMeasures(1)}
                    title="Next measure"
                  >
                    <span className="material-symbols-outlined">fast_forward</span>
                  </button>
                  <button
                    className="nav-btn"
                    onClick={skipToEnd}
                    title="Skip to end"
                  >
                    <span className="material-symbols-outlined">skip_next</span>
                  </button>
                  <div className="speed-control">
                    <select
                      value={playbackRate}
                      onChange={e => setPlaybackRate(Number(e.target.value) as PlaybackSpeed)}
                      className="speed-select"
                      title="Playback speed"
                    >
                      {PLAYBACK_SPEEDS.map((speed: PlaybackSpeed) => (
                        <option key={speed} value={speed}>
                          {speed === 1 ? '1×' : `${speed}×`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Loop mode controls */}
                  <div className="loop-options">
                    <label 
                      className={`loop-option has-tooltip ${!loopEnabled ? 'active' : ''}`} 
                      data-tooltip="Play through"
                    >
                      <input
                        type="radio"
                        name="loopMode"
                        checked={!loopEnabled}
                        onChange={() => setLoopEnabled(false)}
                      />
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </label>
                    <label 
                      className={`loop-option has-tooltip ${loopEnabled && selectedSectionIds.length === 0 ? 'active' : ''}`} 
                      data-tooltip="Loop track"
                    >
                      <input
                        type="radio"
                        name="loopMode"
                        checked={loopEnabled && selectedSectionIds.length === 0}
                        onChange={handleLoopEntireTrack}
                      />
                      <span className="material-symbols-outlined">repeat</span>
                    </label>
                    <label 
                      className={`loop-option has-tooltip ${loopEnabled && selectedSectionIds.length > 0 ? 'active' : ''}`} 
                      data-tooltip="Loop section"
                    >
                      <input
                        type="radio"
                        name="loopMode"
                        checked={loopEnabled && selectedSectionIds.length > 0}
                        onChange={() => {
                          // If no section selected, select current section first
                          if (selectedSectionIds.length === 0) {
                            const currentSection = sections.find(
                              s => currentTime >= s.startTime && currentTime < s.endTime
                            );
                            if (currentSection) {
                              handleSelectSection(currentSection, false);
                            }
                          }
                          setLoopEnabled(true);
                        }}
                      />
                      <span className="material-symbols-outlined">repeat_one</span>
                    </label>
                  </div>
                </div>

                {/* Volume Mixer - under transport */}
                <div className="volume-mixer horizontal">
                  <div className="mixer-row has-tooltip" data-tooltip="Track volume">
                    <span className="mixer-label">
                      <span className="material-symbols-outlined">music_note</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={audioVolume}
                      onChange={e => setAudioVolume(Number(e.target.value))}
                      className="mixer-slider"
                    />
                    <span className="mixer-value">{audioVolume}%</span>
                  </div>
                  <div className="mixer-row has-tooltip" data-tooltip="Drum volume">
                    <span className="mixer-label">
                      <span className="material-symbols-outlined">music_cast</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={drumVolume}
                      onChange={e => setDrumVolume(Number(e.target.value))}
                      className="mixer-slider"
                    />
                    <span className="mixer-value">{drumVolume}%</span>
                  </div>
                  <div className="mixer-row has-tooltip" data-tooltip="Metronome volume">
                    <span className="mixer-label">
                      <span className="material-symbols-outlined">timer</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={metronomeVolume}
                      onChange={e => setMetronomeVolume(Number(e.target.value))}
                      className="mixer-slider"
                      disabled={!metronomeEnabled}
                    />
                    <span className="mixer-value">{metronomeVolume}%</span>
                  </div>
                </div>
              </div>

              {/* File info */}
              <div className="file-bar">
                <span className="file-icon material-symbols-outlined">
                  {hasVideo ? 'movie' : 'music_note'}
                </span>
                <span className="file-name">{mediaFile?.file.name}</span>
                <button className="change-file-btn" onClick={handleFileRemove} title="Change file">
                  <span className="material-symbols-outlined">swap_horiz</span>
                  Change
                </button>
              </div>

              {/* Chord Chart Section - EXPERIMENTAL (dev only) */}
              {EXPERIMENTAL_CHORD_CHART && chordResult && chordResult.chordChanges.length > 0 && (
                <div className="chord-chart-section">
                  {/* Toggle above the chart */}
                  <button
                    className={`chord-chart-toggle ${showChordChart ? 'active' : ''}`}
                    onClick={() => setShowChordChart(!showChordChart)}
                    title={showChordChart ? 'Hide chord chart' : 'Show chord chart'}
                  >
                    <span className="material-symbols-outlined">
                      {showChordChart ? 'expand_less' : 'expand_more'}
                    </span>
                    <span className="toggle-label">Chord Chart</span>
                    <span className="toggle-hint">(experimental)</span>
                  </button>
                  
                  {/* Chart when enabled */}
                  {showChordChart && (
                    <ChordChart
                      chordResult={chordResult}
                      bpm={analysisResult?.bpm ?? 120}
                      beatsPerMeasure={timeSignature.numerator}
                      currentTime={currentTime}
                      duration={duration}
                      onSeek={seek}
                      isPlaying={isPlaying}
                      sections={sections}
                      musicStartTime={effectiveSyncStart}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Right: BPM + Key + Drum Pattern */}
            <div className="controls-section">
              {/* BPM Display with confidence */}
              <div className="bpm-section">
                <BpmDisplay
                  bpm={analysisResult.bpm}
                  confidence={analysisResult.confidence}
                  onBpmChange={handleBpmChange}
                />
                {/* Effective BPM when playback speed is adjusted */}
                {playbackRate !== 1.0 && (
                  <span 
                    className="effective-bpm has-tooltip"
                    data-tooltip={`Playing at ${playbackRate}× speed`}
                  >
                    → {Math.round(analysisResult.bpm * playbackRate)}
                  </span>
                )}
                {/* BPM Confidence indicator - right after BPM */}
                {(() => {
                  const icon = confidenceLevel === 'high' ? 'verified' : 
                               confidenceLevel === 'medium' ? 'help' : 'warning';
                  const label = confidenceLevel === 'high' ? 'High' :
                                confidenceLevel === 'medium' ? 'Med' : 'Low';
                  
                  // Build tooltip message
                  const messages: string[] = [];
                  if (confidenceLevel === 'high') {
                    messages.push('High confidence in BPM detection');
                  } else if (confidenceLevel === 'medium') {
                    messages.push('Medium confidence - BPM may need adjustment');
                  } else {
                    messages.push('Low confidence - adjust BPM manually');
                  }
                  
                  // Add other warnings
                  const otherWarnings = warnings.filter((w: string) => 
                    !w.toLowerCase().includes('confidence') &&
                    !w.toLowerCase().includes('music starts')
                  );
                  if (otherWarnings.length > 0) {
                    messages.push(...otherWarnings);
                  }
                  
                  return (
                    <span 
                      className={`confidence-badge ${confidenceLevel} has-tooltip`}
                      data-tooltip={messages.join(' · ')}
                    >
                      <span className="material-symbols-outlined">{icon}</span>
                      <span className="confidence-label">{label}</span>
                    </span>
                  );
                })()}
                <div className="time-sig">
                  <span>{timeSignature.numerator}</span>
                  <span>{timeSignature.denominator}</span>
                </div>
              </div>
              
              {/* Detected Key Display */}
              {chordResult && chordResult.key && chordResult.key !== 'Unknown' && (
                <div className="key-section">
                  <div className="key-display-group">
                    <span className="key-label">Detected Key</span>
                    <span className="key-value">
                      {chordResult.key}{chordResult.scale === 'minor' ? 'm' : ''}
                    </span>
                    {/* Transposed key when transpose is active */}
                    {transposeSemitones !== 0 && (
                      <span
                        className="effective-key has-tooltip"
                        data-tooltip={`Transposed ${transposeSemitones > 0 ? '+' : ''}${transposeSemitones} semitones`}
                      >
                        → {transposeKey(chordResult.key, transposeSemitones)}{chordResult.scale === 'minor' ? 'm' : ''}
                      </span>
                    )}
                    {/* Key confidence badge */}
                    {(() => {
                      const keyConf = chordResult.keyConfidence;
                      const level = keyConf >= 0.7 ? 'high' : keyConf >= 0.4 ? 'medium' : 'low';
                      const label = level === 'high' ? 'High' : level === 'medium' ? 'Med' : 'Low';
                      const icon = level === 'high' ? 'verified' : level === 'medium' ? 'help' : 'warning';
                      
                      return (
                        <span 
                          className={`confidence-badge small ${level} has-tooltip`}
                          data-tooltip={`${label} confidence in key detection`}
                        >
                          <span className="material-symbols-outlined">{icon}</span>
                        </span>
                      );
                    })()}
                  </div>
                  {/* Transpose controls */}
                  <div className="transpose-controls">
                    <button
                      className="transpose-btn has-tooltip"
                      data-tooltip="Transpose down 1 semitone"
                      disabled={transposeSemitones <= -12}
                      onClick={() => setTransposeSemitones(t => Math.max(-12, t - 1))}
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <span
                      className={`transpose-value ${transposeSemitones !== 0 ? 'active' : ''}`}
                      title={transposeSemitones === 0 ? 'Original pitch' : `${transposeSemitones > 0 ? '+' : ''}${transposeSemitones} semitones`}
                    >
                      {transposeSemitones === 0 ? '0' : (transposeSemitones > 0 ? `+${transposeSemitones}` : transposeSemitones)}
                    </span>
                    <button
                      className="transpose-btn has-tooltip"
                      data-tooltip="Transpose up 1 semitone"
                      disabled={transposeSemitones >= 12}
                      onClick={() => setTransposeSemitones(t => Math.min(12, t + 1))}
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Metronome toggle */}
              <button
                className={`toggle-btn metronome-btn wide ${metronomeEnabled ? 'active' : ''}`}
                onClick={() => setMetronomeEnabled(!metronomeEnabled)}
                title="Toggle metronome click"
              >
                <span className="material-symbols-outlined">timer</span>
                <span className="btn-label">Metronome {metronomeEnabled ? 'On' : 'Off'}</span>
              </button>

              {/* Beat counter when video */}
              {hasVideo && (
                <div className="mini-beat-display">
                  <BeatVisualizer
                    timeSignature={timeSignature}
                    currentBeat={currentBeat}
                    progress={progress}
                    compact
                  />
                  <span className="measure-num">M{currentMeasure + 1}</span>
                </div>
              )}

              {/* Drum Pattern */}
              <div className="drum-section-inline">
                <label className="drum-checkbox-row">
                  <input
                    type="checkbox"
                    checked={drumEnabled}
                    onChange={(e) => setDrumEnabled(e.target.checked)}
                  />
                  <span className="drum-checkbox-label">Add drums</span>
                </label>
                {drumEnabled && (
                  <DrumAccompaniment
                    bpm={analysisResult.bpm}
                    timeSignature={timeSignature}
                    isPlaying={isPlaying && isInSyncRegion}
                    currentBeatTime={currentTime - effectiveSyncStart}
                    currentBeat={currentBeat}
                    metronomeEnabled={metronomeEnabled}
                    volume={drumVolume}
                  />
                )}
              </div>


            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
