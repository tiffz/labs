import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { usePiano } from '../store';
import { durationToBeats, type NoteDuration } from '../types';
import {
  correlateVideoWithScore,
  type CorrelationResult,
} from '../utils/videoScoreCorrelation';
import { SmartBeatMap } from '../utils/smartBeatMap';
import { useMatTooltip } from './useMatTooltip';

const VideoPlayer: React.FC = () => {
  const { state, dispatch } = usePiano();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaReadyRef = useRef(false);
  const [mediaReady, setMediaReady] = useState(false);
  const manualOffsetRef = useRef(0);
  const rafRef = useRef(0);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationResult | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [tapping, setTapping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showTip, hideTip, tipPortal } = useMatTooltip();

  const scoreBpm = state.score?.tempo ?? 0;

  const beatMapRef = useRef<SmartBeatMap | null>(null);
  useEffect(() => {
    if (state.smartMetronomeEnabled && state.mediaBeats) {
      beatMapRef.current = new SmartBeatMap(state.mediaBeats, state.mediaStartOffset);
    } else {
      beatMapRef.current = null;
    }
  }, [state.smartMetronomeEnabled, state.mediaBeats, state.mediaStartOffset]);

  const liveBpm = useMemo(() => {
    if (!state.smartMetronomeEnabled || !state.mediaBeats || !state.isPlaying) return null;
    const map = new SmartBeatMap(state.mediaBeats, state.mediaStartOffset);
    return Math.round(map.instantBpm(state.currentBeat));
  }, [state.smartMetronomeEnabled, state.mediaBeats, state.mediaStartOffset, state.isPlaying, state.currentBeat]);

  // ── File handling ──

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    dispatch({ type: 'SET_MEDIA_FILE', file: { name: file.name, url, type: isVideo ? 'video' : 'audio' } });
    setAnalysisStatus('analyzing');
    setAnalysisProgress('Preparing...');
    setAnalysisError(null);
    setCorrelation(null);
    mediaReadyRef.current = false;
    setMediaReady(false);
  }, [dispatch]);

  const handleRemove = useCallback(() => {
    if (state.mediaFile) URL.revokeObjectURL(state.mediaFile.url);
    dispatch({ type: 'SET_MEDIA_FILE', file: null });
    setAnalysisStatus('idle');
    setCorrelation(null);
    setAnalysisError(null);
    mediaReadyRef.current = false;
    setMediaReady(false);
  }, [state.mediaFile, dispatch]);

  const handleApplyBpm = useCallback(() => {
    if (correlation?.suggestedBpm) {
      dispatch({ type: 'UPDATE_SCORE_META', tempo: correlation.suggestedBpm });
    }
  }, [correlation, dispatch]);

  // ── Media element setup ──

  useEffect(() => {
    const el = state.mediaFile?.type === 'video' ? videoRef.current : audioRef.current;
    if (!el || !state.mediaFile) return;
    if (el.src !== state.mediaFile.url) {
      mediaReadyRef.current = false;
      el.src = state.mediaFile.url;
      el.load();
    }
    const onReady = () => { mediaReadyRef.current = true; setMediaReady(true); };
    el.addEventListener('loadedmetadata', onReady);
    if (el.readyState >= 1) { mediaReadyRef.current = true; setMediaReady(true); }
    return () => el.removeEventListener('loadedmetadata', onReady);
  }, [state.mediaFile]);

  // ── Analysis ──

  const prevUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state.mediaFile) return;
    const url = state.mediaFile.url;
    if (url === prevUrlRef.current) return;
    prevUrlRef.current = url;

    if (!scoreBpm) {
      setAnalysisStatus('idle');
      return;
    }

    let cancelled = false;
    const analyze = async () => {
      setAnalysisStatus('analyzing');
      setAnalysisProgress('Loading audio…');
      setAnalysisError(null);
      setCorrelation(null);

      try {
        const audioCtx = new AudioContext();
        const resp = await fetch(url);
        const arrayBuffer = await resp.arrayBuffer();
        if (cancelled) { audioCtx.close(); return; }

        setAnalysisProgress('Decoding audio…');
        await new Promise(r => setTimeout(r, 0));
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (cancelled) { audioCtx.close(); return; }

        setAnalysisProgress('Detecting tempo…');
        await new Promise(r => setTimeout(r, 0));
        const { analyzeBeat } = await import('../../beat/utils/beatAnalyzer');
        const beatResult = await analyzeBeat(audioBuffer, (_stage, progress) => {
          const pct = Math.min(100, Math.round(progress));
          if (!cancelled) setAnalysisProgress(`Detecting tempo… ${pct}%`);
        });
        if (cancelled) { audioCtx.close(); return; }

        setAnalysisProgress('Aligning with score…');
        const result = await correlateVideoWithScore(
          audioBuffer, state.score!, beatResult, scoreBpm,
          (msg) => { if (!cancelled) setAnalysisProgress(msg); },
        );
        if (cancelled) { audioCtx.close(); return; }

        setCorrelation(result);
        audioCtx.close();
        setAnalysisStatus('done');
        dispatch({ type: 'SET_MEDIA_START_OFFSET', offset: result.bestOffset });
        dispatch({ type: 'SET_MEDIA_BEATS', beats: result.beats, hasTempoVariance: result.hasTempoVariance });

        if (result.hasTempoVariance) {
          dispatch({ type: 'SET_SMART_METRONOME', enabled: true });
        }
      } catch (err) {
        if (!cancelled) {
          setAnalysisStatus('error');
          setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
        }
      }
    };

    analyze();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mediaFile?.url, scoreBpm, dispatch, state.mediaFile]);

  // ── Volume sync ──

  useEffect(() => {
    const el = state.mediaFile?.type === 'video' ? videoRef.current : audioRef.current;
    if (el) el.volume = state.mediaMuted ? 0 : state.mediaVolume;
  }, [state.mediaVolume, state.mediaMuted, state.mediaFile?.type]);

  useEffect(() => {
    manualOffsetRef.current = state.mediaStartOffset;
  }, [state.mediaStartOffset]);

  // ── Playback sync ──

  const stateRef = useRef(state);
  stateRef.current = state;
  const prevBeatRef = useRef(-1);

  const getAudioStartTime = useCallback(() => {
    const s = stateRef.current;
    const sectionOffsetBeats = s.selectedMeasureRange
      ? getSectionStartBeats(s.selectedMeasureRange.start, s.score)
      : 0;
    const totalBeat = s.currentBeat + sectionOffsetBeats;

    const map = beatMapRef.current;
    if (map) {
      return manualOffsetRef.current + map.beatToTime(totalBeat);
    }

    const scoreTimeSec = totalBeat * (60 / s.tempo);
    return manualOffsetRef.current + scoreTimeSec;
  }, []);

  useEffect(() => {
    const el = state.mediaFile?.type === 'video' ? videoRef.current : audioRef.current;
    if (!el || !state.mediaFile) return;

    if (!state.isPlaying) {
      if (!el.paused) el.pause();
      cancelAnimationFrame(rafRef.current);
      prevBeatRef.current = -1;
      return;
    }

    if (!mediaReadyRef.current) return;

    el.playbackRate = 1;
    const target = getAudioStartTime();
    const dur = el.duration || Infinity;
    el.currentTime = Math.max(0, Math.min(target, dur));
    el.play().catch(() => {});
    prevBeatRef.current = state.currentBeat;

    const checkLoop = () => {
      const s = stateRef.current;
      if (!s.isPlaying) { if (!el.paused) el.pause(); return; }

      const isLoopReset = s.currentBeat < prevBeatRef.current - 0.5;
      const expected = getAudioStartTime();
      const actual = el.currentTime;
      const drift = actual - expected;

      if (isLoopReset) {
        el.currentTime = Math.max(0, Math.min(expected, el.duration || Infinity));
        el.playbackRate = 1;
      } else if (Math.abs(drift) > 0.4) {
        el.currentTime = Math.max(0, Math.min(expected, el.duration || Infinity));
        el.playbackRate = 1;
      } else if (Math.abs(drift) > 0.08) {
        el.playbackRate = drift > 0 ? 0.97 : 1.03;
      } else {
        el.playbackRate = 1;
      }

      prevBeatRef.current = s.currentBeat;
      rafRef.current = requestAnimationFrame(checkLoop);
    };

    rafRef.current = requestAnimationFrame(checkLoop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isPlaying, state.mediaFile, mediaReady, getAudioStartTime]);

  // ── Tap to align ──

  const tapMediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  const startTapping = useCallback(() => {
    const el = state.mediaFile?.type === 'video' ? videoRef.current : audioRef.current;
    if (!el || !mediaReadyRef.current) return;
    tapMediaRef.current = el;
    el.currentTime = 0;
    el.playbackRate = 1;
    el.play().catch(() => {});
    setTapping(true);
  }, [state.mediaFile?.type]);

  const handleTap = useCallback(() => {
    const el = tapMediaRef.current;
    if (!el) return;
    const offset = el.currentTime;
    el.pause();
    setTapping(false);
    dispatch({ type: 'SET_MEDIA_START_OFFSET', offset });
  }, [dispatch]);

  const cancelTap = useCallback(() => {
    const el = tapMediaRef.current;
    if (el && !el.paused) el.pause();
    setTapping(false);
  }, []);

  if (!state.mediaFile) return null;

  const isVideo = state.mediaFile.type === 'video';
  const isAnalyzing = analysisStatus === 'analyzing';
  const showVideo = isVideo && state.mediaVisible && !collapsed && !isAnalyzing;

  return (
    <div className="vp-section">
      {/* ── Header row ── */}
      <div className="vp-header" role="button" tabIndex={0} onClick={() => setCollapsed(v => !v)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(v => !v); } }}>
        <span className="material-symbols-outlined vp-header-arrow" style={{
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)',
        }}>expand_more</span>
        <span className="material-symbols-outlined vp-header-icon">
          {isVideo ? 'videocam' : 'audiotrack'}
        </span>
        <span className="vp-header-name">{state.mediaFile.name}</span>

        {isAnalyzing && (
          <span className="vp-header-badge">
            <span className="vp-spin" />
          </span>
        )}

        <span style={{ flex: 1 }} />

        <span className="vp-header-actions" onClick={e => e.stopPropagation()}>
          <button className="vp-icon-btn" onClick={() => dispatch({ type: 'SET_MEDIA_MUTED', muted: !state.mediaMuted })}
            onMouseEnter={e => showTip(e, state.mediaMuted ? 'Unmute' : 'Mute')} onMouseLeave={hideTip}>
            <span className="material-symbols-outlined">
              {state.mediaMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>
          {isVideo && (
            <button className="vp-icon-btn" onClick={() => dispatch({ type: 'SET_MEDIA_VISIBLE', visible: !state.mediaVisible })}
              onMouseEnter={e => showTip(e, state.mediaVisible ? 'Hide video' : 'Show video')} onMouseLeave={hideTip}>
              <span className="material-symbols-outlined">
                {state.mediaVisible ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          )}
          <button className="vp-icon-btn" onClick={() => fileInputRef.current?.click()}
            onMouseEnter={e => showTip(e, 'Replace file')} onMouseLeave={hideTip}>
            <span className="material-symbols-outlined">swap_horiz</span>
          </button>
          <button className="vp-icon-btn vp-icon-btn--danger" onClick={handleRemove}
            onMouseEnter={e => showTip(e, 'Remove')} onMouseLeave={hideTip}>
            <span className="material-symbols-outlined">close</span>
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*,video/*" onChange={handleFileSelect} style={{ display: 'none' }} />
        </span>
      </div>

      {/* ── Media elements ── */}
      <video ref={videoRef} className="vp-video" preload="auto"
        style={{ display: showVideo ? 'block' : 'none' }} />
      <audio ref={audioRef as React.RefObject<HTMLAudioElement>} preload="auto"
        style={{ display: 'none' }} />

      {/* ── Body ── */}
      {!collapsed && (
        <div className="vp-body">
          {isAnalyzing && (
            <div className="vp-analyzing">
              <span className="vp-analyzing-text">{analysisProgress}</span>
              <div className="vp-analyzing-track"><div className="vp-analyzing-fill" /></div>
            </div>
          )}

          {analysisError && (
            <div className="vp-error">
              <span className="material-symbols-outlined">error</span>
              {analysisError}
            </div>
          )}

          {correlation && (
            <>
              {/* Metrics as an inline row */}
              <div className="vp-info-row">
                <span className="vp-info-item">
                  <span className="vp-info-label">Detected</span>
                  ~{Math.round(correlation.detectedBpm)} BPM
                </span>
                <span className="vp-info-sep" />
                <span className="vp-info-item">
                  <span className="vp-info-label">Score</span>
                  {correlation.scoreBpm} BPM
                </span>
                <span className="vp-info-sep" />
                <span className="vp-info-item">
                  <span className="vp-info-label">Start</span>
                  {correlation.musicStartTime.toFixed(1)}s
                </span>
                {correlation.hasPickup && (
                  <>
                    <span className="vp-info-sep" />
                    <span className="vp-info-item vp-info-item--tag">Pickup</span>
                  </>
                )}
                {liveBpm !== null && (
                  <>
                    <span className="vp-info-sep" />
                    <span className="vp-info-item vp-info-item--live">
                      <span className="vp-info-label">Live</span>
                      ~{liveBpm} BPM
                    </span>
                  </>
                )}
              </div>

              {/* BPM suggestion */}
              {correlation.suggestedBpm && (
                <div className="vp-suggestion">
                  <span className="material-symbols-outlined">lightbulb</span>
                  <span>
                    Recording matches ~{correlation.suggestedBpm} BPM better
                  </span>
                  <button className="vp-suggestion-apply" onClick={handleApplyBpm}>
                    Apply
                  </button>
                </div>
              )}

              {/* Smart Metronome toggle */}
              {state.mediaBeats && (
                <div className="vp-controls-row">
                  <button
                    className={`vp-toggle-btn ${state.smartMetronomeEnabled ? 'vp-toggle-btn--on' : ''}`}
                    onClick={() => dispatch({ type: 'SET_SMART_METRONOME', enabled: !state.smartMetronomeEnabled })}
                    onMouseEnter={e => showTip(e,
                      state.smartMetronomeEnabled
                        ? 'Disable Smart Metronome — revert to fixed BPM'
                        : 'Enable Smart Metronome — metronome follows the recording\'s actual tempo',
                    )}
                    onMouseLeave={hideTip}
                  >
                    <span className="material-symbols-outlined">
                      {state.smartMetronomeEnabled ? 'music_note' : 'music_off'}
                    </span>
                    Smart Metronome
                  </button>
                  {correlation.hasTempoVariance && !state.smartMetronomeEnabled && (
                    <span className="vp-hint">Variable tempo detected</span>
                  )}
                </div>
              )}
            </>
          )}

          {/* Tap to align / Offset / Volume */}
          <div className="vp-controls-row">
            {tapping ? (
              <div className="vp-tap-row">
                <span className="vp-tap-pulse" />
                <span className="vp-tap-msg">Tap when you hear beat 1</span>
                <button className="vp-toggle-btn vp-toggle-btn--on" onClick={handleTap}>
                  <span className="material-symbols-outlined">touch_app</span>
                  Tap
                </button>
                <button className="vp-text-btn" onClick={cancelTap}>Cancel</button>
              </div>
            ) : (
              <button className="vp-text-btn" onClick={startTapping}
                onMouseEnter={e => showTip(e, 'Play the audio and tap on beat 1 of measure 1 to set the sync point')}
                onMouseLeave={hideTip}>
                <span className="material-symbols-outlined">touch_app</span>
                Tap to align
              </button>
            )}
          </div>

          <div className="vp-controls-row">
            <span className="sb-label">Offset</span>
            <input type="number" className="sb-tempo-input" step={0.1}
              value={Number(state.mediaStartOffset.toFixed(1))}
              onChange={e => dispatch({ type: 'SET_MEDIA_START_OFFSET', offset: parseFloat(e.target.value) || 0 })} />
            <span className="vp-unit">s</span>
            {correlation && (
              <button className="vp-icon-btn"
                onClick={() => dispatch({ type: 'SET_MEDIA_START_OFFSET', offset: correlation.bestOffset })}
                onMouseEnter={e => showTip(e, `Reset to auto (${correlation.bestOffset.toFixed(1)}s)`)}
                onMouseLeave={hideTip}>
                <span className="material-symbols-outlined">auto_fix_high</span>
              </button>
            )}
            <button className="vp-icon-btn" onClick={() => dispatch({ type: 'SET_MEDIA_START_OFFSET', offset: 0 })}
              onMouseEnter={e => showTip(e, 'Reset to 0')} onMouseLeave={hideTip}>
              <span className="material-symbols-outlined">restart_alt</span>
            </button>
          </div>

          <div className="vp-controls-row">
            <span className="sb-label">Volume</span>
            <input type="range" min={0} max={1} step={0.01}
              value={state.mediaVolume}
              onChange={e => dispatch({ type: 'SET_MEDIA_VOLUME', volume: parseFloat(e.target.value) })}
              className={`volume-slider${state.mediaMuted ? ' disabled-slider' : ''}`}
              style={{ flex: 1 }}
              disabled={state.mediaMuted} />
          </div>
        </div>
      )}

      {tipPortal}
    </div>
  );
};

function getSectionStartBeats(
  startMeasure: number,
  score: { parts: { measures: { notes: { duration: NoteDuration; dotted?: boolean }[] }[] }[]; timeSignature: { numerator: number; denominator: number } } | null,
): number {
  if (!score || startMeasure <= 0) return 0;
  const part = score.parts[0];
  if (!part) return 0;

  let totalBeats = 0;
  for (let m = 0; m < Math.min(startMeasure, part.measures.length); m++) {
    let mBeats = 0;
    for (const n of part.measures[m].notes) {
      mBeats += durationToBeats(n.duration, n.dotted);
    }
    totalBeats += Math.max(mBeats, score.timeSignature.numerator * (4 / score.timeSignature.denominator));
  }
  return totalBeats;
}

export default VideoPlayer;
