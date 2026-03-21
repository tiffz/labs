import React, { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePiano } from '../store';
import { durationToBeats, type NoteDuration } from '../types';
import {
  correlateVideoWithScore,
  type CorrelationResult,
} from '../utils/videoScoreCorrelation';

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
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showTip = useCallback((e: React.MouseEvent, text: string) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({ text, x: r.left + r.width / 2, y: r.top });
  }, []);
  const hideTip = useCallback(() => setTip(null), []);

  const scoreBpm = state.score?.tempo ?? 0;

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

  // ── Analysis: detect music start + BPM ──

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
      setAnalysisProgress('Loading audio...');
      setAnalysisError(null);
      setCorrelation(null);

      try {
        const audioCtx = new AudioContext();
        const resp = await fetch(url);
        const arrayBuffer = await resp.arrayBuffer();
        if (cancelled) { audioCtx.close(); return; }

        setAnalysisProgress('Decoding audio...');
        await new Promise(r => setTimeout(r, 0));
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (cancelled) { audioCtx.close(); return; }

        setAnalysisProgress('Detecting tempo...');
        await new Promise(r => setTimeout(r, 0));
        const { analyzeBeat } = await import('../../beat/utils/beatAnalyzer');
        const beatResult = await analyzeBeat(audioBuffer, (stage, progress) => {
          if (!cancelled) setAnalysisProgress(`${stage} (${Math.round(progress * 100)}%)`);
        });
        if (cancelled) { audioCtx.close(); return; }

        const result = await correlateVideoWithScore(
          audioBuffer, beatResult, scoreBpm,
          (msg) => { if (!cancelled) setAnalysisProgress(msg); },
        );
        if (cancelled) { audioCtx.close(); return; }

        setCorrelation(result);
        audioCtx.close();
        setAnalysisStatus('done');
        dispatch({ type: 'SET_MEDIA_START_OFFSET', offset: result.musicStartTime });
      } catch (err) {
        if (!cancelled) {
          setAnalysisStatus('error');
          setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
        }
      }
    };

    analyze();
    return () => { cancelled = true; };
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
    const sectionOffsetSec = s.selectedMeasureRange
      ? getSectionStartTime(s.selectedMeasureRange.start, s.score, s.tempo)
      : 0;
    const scoreTimeSec = s.currentBeat * (60 / s.tempo) + sectionOffsetSec;
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
      if (s.currentBeat < prevBeatRef.current - 0.5) {
        const t = getAudioStartTime();
        el.currentTime = Math.max(0, Math.min(t, el.duration || Infinity));
      }
      prevBeatRef.current = s.currentBeat;
      rafRef.current = requestAnimationFrame(checkLoop);
    };

    rafRef.current = requestAnimationFrame(checkLoop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isPlaying, state.mediaFile, mediaReady, getAudioStartTime]);

  // ── Tap to align ──
  // While tapping mode is active, the media plays freely.
  // User taps the button on beat 1 of measure 1 → we record currentTime as the offset.

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
      {/* ── Header ── */}
      <div className="vp-bar">
        <button className="vp-collapse-btn" onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? 'Expand' : 'Collapse'}>
          <span className="material-symbols-outlined" style={{
            fontSize: 18,
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)',
            transition: 'transform var(--transition-normal)',
          }}>expand_more</span>
        </button>

        <span className="material-symbols-outlined vp-icon" style={{ fontSize: 16 }}>
          {isVideo ? 'videocam' : 'audiotrack'}
        </span>
        <span className="vp-name">{state.mediaFile.name}</span>

        {isAnalyzing && (
          <span className="vp-badge vp-badge--muted">
            <span className="vp-spin" /> Analyzing…
          </span>
        )}

        <div style={{ flex: 1 }} />

        <div className="vp-actions">
          <button className="vp-act" onClick={() => dispatch({ type: 'SET_MEDIA_MUTED', muted: !state.mediaMuted })}
            onMouseEnter={e => showTip(e, state.mediaMuted ? 'Unmute' : 'Mute')} onMouseLeave={hideTip}>
            <span className="material-symbols-outlined">
              {state.mediaMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>
          {isVideo && (
            <button className="vp-act" onClick={() => dispatch({ type: 'SET_MEDIA_VISIBLE', visible: !state.mediaVisible })}
              onMouseEnter={e => showTip(e, state.mediaVisible ? 'Hide video' : 'Show video')} onMouseLeave={hideTip}>
              <span className="material-symbols-outlined">
                {state.mediaVisible ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          )}
          <button className="vp-act" onClick={() => fileInputRef.current?.click()}
            onMouseEnter={e => showTip(e, 'Replace file')} onMouseLeave={hideTip}>
            <span className="material-symbols-outlined">swap_horiz</span>
          </button>
          <button className="vp-act vp-act--danger" onClick={handleRemove}
            onMouseEnter={e => showTip(e, 'Remove')} onMouseLeave={hideTip}>
            <span className="material-symbols-outlined">close</span>
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*,video/*" onChange={handleFileSelect} style={{ display: 'none' }} />
        </div>
      </div>

      {/* ── Media elements ── */}
      <video ref={videoRef} className="vp-media" preload="auto"
        style={{ display: showVideo ? 'block' : 'none' }} />
      <audio ref={audioRef as React.RefObject<HTMLAudioElement>} preload="auto"
        style={{ display: 'none' }} />

      {/* ── Body ── */}
      {!collapsed && (
        <div className="vp-detail">
          {isAnalyzing && (
            <div className="vp-loader">
              <div className="vp-loader-ring" />
              <span className="vp-loader-text">{analysisProgress}</span>
              <div className="vp-loader-track"><div className="vp-loader-fill" /></div>
            </div>
          )}

          {analysisError && (
            <div className="vp-msg vp-msg--err">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
              {analysisError}
            </div>
          )}

          {correlation && (
            <div className="vp-msg">
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--piano-primary)' }}>info</span>
              <span className="vp-msg-text">{correlation.recommendation}</span>
            </div>
          )}

          {correlation?.suggestedBpm && (
            <div className="vp-suggest">
              <span className="material-symbols-outlined vp-suggest-icon">lightbulb</span>
              <span className="vp-suggest-text">
                Recording ~{Math.round(correlation.detectedBpm)} BPM (score: {correlation.scoreBpm})
              </span>
              <button className="vp-suggest-btn" onClick={handleApplyBpm}>
                Apply {correlation.suggestedBpm} BPM
              </button>
            </div>
          )}

          {/* ── Tap to align ── */}
          {tapping ? (
            <div className="vp-tap-active">
              <span className="vp-tap-pulse" />
              <span className="vp-tap-label">Listening… tap when you hear beat 1</span>
              <button className="vp-tap-btn vp-tap-btn--go" onClick={handleTap}>
                <span className="material-symbols-outlined">touch_app</span>
                Tap
              </button>
              <button className="vp-tap-btn vp-tap-btn--cancel" onClick={cancelTap}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="vp-align-btn" onClick={startTapping}
              onMouseEnter={e => showTip(e, 'Play the audio and tap on beat 1 of measure 1 to set the sync point')}
              onMouseLeave={hideTip}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>touch_app</span>
              Tap to align
            </button>
          )}

          {/* ── Offset ── */}
          <div className="vp-row">
            <span className="vp-lbl">Offset</span>
            <input type="number" className="vp-num-input" step={0.1}
              value={Number(state.mediaStartOffset.toFixed(1))}
              onChange={e => dispatch({ type: 'SET_MEDIA_START_OFFSET', offset: parseFloat(e.target.value) || 0 })} />
            <span className="vp-unit">s</span>
            <button className="vp-act" onClick={() => dispatch({ type: 'SET_MEDIA_START_OFFSET', offset: 0 })}
              onMouseEnter={e => showTip(e, 'Reset to 0')} onMouseLeave={hideTip}>
              <span className="material-symbols-outlined">restart_alt</span>
            </button>
          </div>

          {/* ── Volume ── */}
          <div className="vp-row">
            <span className="vp-lbl">Volume</span>
            <input type="range" min={0} max={1} step={0.01}
              value={state.mediaVolume}
              onChange={e => dispatch({ type: 'SET_MEDIA_VOLUME', volume: parseFloat(e.target.value) })}
              className={`volume-slider${state.mediaMuted ? ' disabled-slider' : ''}`}
              disabled={state.mediaMuted} />
          </div>
        </div>
      )}

      {tip && createPortal(
        <div className="mat-tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>,
        document.body,
      )}
    </div>
  );
};

function getSectionStartTime(
  startMeasure: number,
  score: { parts: { measures: { notes: { duration: NoteDuration; dotted?: boolean }[] }[] }[]; timeSignature: { numerator: number; denominator: number } } | null,
  tempo: number,
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
  return totalBeats * (60 / tempo);
}

export default VideoPlayer;
