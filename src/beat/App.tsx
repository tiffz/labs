import React, { useState, useCallback } from 'react';
import MediaUploader, { type MediaFile } from './components/MediaUploader';
import BpmDisplay from './components/BpmDisplay';
import BeatVisualizer from './components/BeatVisualizer';
import VideoPlayer from './components/VideoPlayer';
import PlaybackBar from './components/PlaybackBar';
import DrumAccompaniment from './components/DrumAccompaniment';
import { useAudioAnalysis } from './hooks/useAudioAnalysis';
import { useBeatSync, PLAYBACK_SPEEDS, type PlaybackSpeed } from './hooks/useBeatSync';
import type { TimeSignature } from '../shared/rhythm/types';

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
  } = useBeatSync({
    audioBuffer,
    bpm: analysisResult?.bpm ?? 120,
    timeSignature,
    musicStartTime: analysisResult?.musicStartTime ?? 0,
    metronomeEnabled,
    syncStartTime: effectiveSyncStart,
  });

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
  }, [stop, mediaFile, resetAnalysis]);
  
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
              <MediaUploader onFileSelect={handleFileSelect} />
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

              {/* Playback Bar */}
              <PlaybackBar
                currentTime={currentTime}
                duration={duration}
                musicStartTime={analysisResult.musicStartTime}
                syncStartTime={effectiveSyncStart}
                onSeek={seek}
                onSyncStartChange={handleSyncStartChange}
                isInSyncRegion={isInSyncRegion}
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
                </div>

                {/* Volume Mixer - under transport */}
                <div className="volume-mixer horizontal">
                  <div className="mixer-row">
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
                      title={`Audio: ${audioVolume}%`}
                    />
                  </div>
                  <div className="mixer-row">
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
                      title={`Drums: ${drumVolume}%`}
                    />
                  </div>
                  <div className="mixer-row">
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
                      title={`Click: ${metronomeVolume}%`}
                    />
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
              {/* BPM Display */}
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
              </div>

              {/* Confidence indicator */}
              <div className={`confidence-indicator ${confidenceLevel}`}>
                <span className="confidence-dot" />
                <span className="confidence-text">
                  {confidenceLevel === 'high' && 'High confidence'}
                  {confidenceLevel === 'medium' && 'Medium confidence'}
                  {confidenceLevel === 'low' && 'Low confidence - adjust BPM manually'}
                </span>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="warnings">
                  {warnings.slice(0, 1).map((w, i) => (
                    <span key={i} className="warning-text">{w}</span>
                  ))}
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
