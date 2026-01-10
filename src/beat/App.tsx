import React, { useState, useCallback, useEffect } from 'react';
import MediaUploader, { type MediaFile } from './components/MediaUploader';
import BpmDisplay from './components/BpmDisplay';
import BeatVisualizer from './components/BeatVisualizer';
import VideoPlayer from './components/VideoPlayer';
import PlaybackBar from './components/PlaybackBar';
import DrumAccompaniment from './components/DrumAccompaniment';
import { useAudioAnalysis } from './hooks/useAudioAnalysis';
import { useBeatSync, PLAYBACK_SPEEDS, type PlaybackSpeed } from './hooks/useBeatSync';
import { useSectionDetection } from './hooks/useSectionDetection';
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

  // Selected section(s) for looping - supports multiple adjacent sections
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);

  const [drumVolume, setDrumVolume] = useState(70);

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
  });

  // Run section detection after BPM analysis completes
  useEffect(() => {
    if (audioBuffer && analysisResult && !isDetectingSections && sections.length === 0) {
      detectSectionsFromBuffer(audioBuffer, analysisResult.beats, {
        minSectionDuration: 8,
        sensitivity: 0.5,
        musicStartTime: analysisResult.musicStartTime,
        bpm: analysisResult.bpm,
        beatsPerMeasure: timeSignature.numerator,
      });
    }
  }, [audioBuffer, analysisResult, isDetectingSections, sections.length, detectSectionsFromBuffer, timeSignature.numerator]);

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
    setSelectedSectionIds([]);
    setLoopRegion(null);
    setLoopEnabled(false);
  }, [stop, mediaFile, resetAnalysis, clearSections, setLoopRegion, setLoopEnabled]);

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
                  />
                </div>
              ) : (
                <div className="beat-viz-container">
                  <BeatVisualizer
                    timeSignature={timeSignature}
                    currentBeat={currentBeat}
                    progress={progress}
                  />
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
                      {PLAYBACK_SPEEDS.map(speed => (
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
            </div>

            {/* Right: BPM + Drum Pattern */}
            <div className="controls-section">
              {/* BPM Display with inline confidence indicator */}
              <div className="bpm-section">
                <BpmDisplay
                  bpm={analysisResult.bpm}
                  confidence={analysisResult.confidence}
                  onBpmChange={handleBpmChange}
                />
                <div className="time-sig">
                  <span>{timeSignature.numerator}</span>
                  <span>{timeSignature.denominator}</span>
                </div>
                {/* Confidence indicator - inline with BPM */}
                {(() => {
                  // Build tooltip message
                  const messages: string[] = [];
                  
                  if (confidenceLevel === 'high') {
                    messages.push('High confidence in BPM detection');
                  } else if (confidenceLevel === 'medium') {
                    messages.push('Medium confidence - BPM may need adjustment');
                  } else {
                    messages.push('Low confidence - adjust BPM manually');
                  }
                  
                  // Add other warnings (filter out confidence-related and music start ones)
                  const otherWarnings = warnings.filter((w: string) => 
                    !w.toLowerCase().includes('confidence') &&
                    !w.toLowerCase().includes('music starts')
                  );
                  if (otherWarnings.length > 0) {
                    messages.push(...otherWarnings);
                  }
                  
                  const icon = confidenceLevel === 'high' ? 'verified' : 
                               confidenceLevel === 'medium' ? 'help' : 'warning';
                  
                  return (
                    <span 
                      className={`status-icon confidence ${confidenceLevel} has-tooltip`}
                      data-tooltip={messages.join(' · ')}
                    >
                      <span className="material-symbols-outlined">{icon}</span>
                    </span>
                  );
                })()}
              </div>

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
