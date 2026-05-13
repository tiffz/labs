import { useCallback, useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { analyzeBeatForMediaTimeRange } from '../../shared/beat/segmentBeatAnalysis';
import type { StanzaSegmentMetronomeCalibration } from '../db/stanzaDb';
import type { DerivedSegment } from '../utils/segments';
import {
  STANZA_METRONOME_ANALYZE_MIN_SECTION_SEC,
  STANZA_METRONOME_TAP_COUNT,
  bpmAnchorFromTaps,
} from '../utils/stanzaMetronome';

export interface StanzaSectionMetronomeRailProps {
  segment: DerivedSegment;
  calibration: StanzaSegmentMetronomeCalibration | undefined;
  canAnalyze: boolean;
  analyzeDisabledReason?: string;
  localAudioBlob: Blob | undefined;
  localSongTitle: string;
  mediaUrl: string;
  isLocalVideo: boolean;
  getMediaTime: () => number;
  playbackIsPlaying: boolean;
  onSaveCalibration: (cal: StanzaSegmentMetronomeCalibration) => void;
  onClearCalibration: () => void;
}

export default function StanzaSectionMetronomeRail({
  segment,
  calibration,
  canAnalyze,
  analyzeDisabledReason,
  localAudioBlob,
  localSongTitle,
  mediaUrl,
  isLocalVideo,
  getMediaTime,
  playbackIsPlaying,
  onSaveCalibration,
  onClearCalibration,
}: StanzaSectionMetronomeRailProps) {
  const [tapping, setTapping] = useState(false);
  const [taps, setTaps] = useState<number[]>([]);
  const [nudgeMs, setNudgeMs] = useState(0);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<StanzaSegmentMetronomeCalibration | null>(null);

  const resetTapSession = useCallback(() => {
    setTapping(false);
    setTaps([]);
    setNudgeMs(0);
  }, []);

  useEffect(() => {
    if (!tapping) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, [contenteditable=true]')) return;
      e.preventDefault();
      setTaps((prev) => {
        if (prev.length >= STANZA_METRONOME_TAP_COUNT) return prev;
        return [...prev, getMediaTime()];
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tapping, getMediaTime]);

  const tapDerived = bpmAnchorFromTaps(taps, nudgeMs);

  const handleSaveTaps = () => {
    if (!tapDerived) return;
    onSaveCalibration({ ...tapDerived, source: 'tap' });
    resetTapSession();
  };

  const audioContextRef = useRef<AudioContext | null>(null);
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const Ctx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio not supported');
      audioContextRef.current = new Ctx();
    }
    return audioContextRef.current;
  }, []);

  const runAnalyze = async () => {
    if (!localAudioBlob || !canAnalyze) return;
    setAnalysisError(null);
    setPendingAnalysis(null);
    setAnalysisBusy(true);
    try {
      const file = new File([localAudioBlob], localSongTitle || 'stanza-audio', {
        type: localAudioBlob.type || (isLocalVideo ? 'video/mp4' : 'audio/mpeg'),
      });
      const ctx = getAudioContext();
      const res = await analyzeBeatForMediaTimeRange({
        file,
        mediaType: isLocalVideo ? 'video' : 'audio',
        mediaUrl,
        rangeStartSec: segment.start,
        rangeEndSec: segment.end,
        audioContext: ctx,
        onProgress: () => {},
      });
      setPendingAnalysis({
        bpm: res.bpm,
        anchorMediaTime: res.anchorMediaTime,
        source: 'analysis',
        confidence: res.confidence,
        analyzedAt: Date.now(),
      });
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalysisBusy(false);
    }
  };

  const sectionDur = Math.max(0, segment.end - segment.start);
  const analyzeTooShort = sectionDur < STANZA_METRONOME_ANALYZE_MIN_SECTION_SEC;

  return (
    <Stack spacing={0.75} sx={{ mt: 0.35 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
        Section: <strong>{segment.label || `Section ${segment.index + 1}`}</strong>
        {calibration ? (
          <>
            {' '}
            · {calibration.bpm} BPM ({calibration.source === 'analysis' ? 'auto' : 'tap'})
          </>
        ) : (
          <> · not calibrated</>
        )}
      </Typography>

      {analysisError && (
        <Alert severity="error" onClose={() => setAnalysisError(null)}>
          {analysisError}
        </Alert>
      )}

      {pendingAnalysis && (
        <Alert
          severity="warning"
          action={
            <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
              <Button color="inherit" size="small" onClick={() => setPendingAnalysis(null)}>
                Discard
              </Button>
              <Button variant="contained" size="small" onClick={() => onSaveCalibration(pendingAnalysis)}>
                Save
              </Button>
            </Stack>
          }
        >
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Automatic detection is a starting point only — play along and confirm the click lines up before saving.
          </Typography>
          <Typography variant="body2">
            Suggested ~{pendingAnalysis.bpm} BPM
            {pendingAnalysis.confidence != null
              ? ` · confidence ${Math.round(pendingAnalysis.confidence * 100)}%`
              : ''}
          </Typography>
        </Alert>
      )}

      <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap>
        <Button
          variant={tapping ? 'contained' : 'outlined'}
          size="small"
          className="stanza-btn-soft-outline stanza-rail-compact-btn"
          sx={{ minHeight: 30, py: 0.25, fontSize: '0.75rem' }}
          onClick={() => {
            if (tapping) resetTapSession();
            else {
              setTaps([]);
              setNudgeMs(0);
              setTapping(true);
            }
          }}
        >
          {tapping ? 'Stop tapping' : 'Tap with Space'}
        </Button>
        {tapping && (
          <>
            <Typography variant="caption" color="text.secondary">
              {taps.length}/{STANZA_METRONOME_TAP_COUNT} taps
              {tapDerived ? ` · ~${tapDerived.bpm} BPM` : ''}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              disabled={!tapDerived}
              onClick={handleSaveTaps}
              sx={{ minHeight: 30, fontSize: '0.75rem' }}
            >
              Save taps
            </Button>
            <Button size="small" onClick={() => setNudgeMs((n) => n - 20)} sx={{ minHeight: 30, fontSize: '0.75rem' }}>
              Earlier
            </Button>
            <Button size="small" onClick={() => setNudgeMs((n) => n + 20)} sx={{ minHeight: 30, fontSize: '0.75rem' }}>
              Later
            </Button>
          </>
        )}
      </Stack>

      {!playbackIsPlaying && tapping && (
        <Typography variant="caption" color="text.secondary">
          Start playback, then tap Space in time with the beat.
        </Typography>
      )}

      <Box>
        <Button
          variant="outlined"
          size="small"
          className="stanza-btn-soft-outline stanza-rail-compact-btn"
          disabled={!canAnalyze || analysisBusy || analyzeTooShort || pendingAnalysis != null}
          onClick={() => void runAnalyze()}
          startIcon={analysisBusy ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ minHeight: 30, py: 0.25, fontSize: '0.75rem' }}
        >
          {analysisBusy ? 'Analyzing…' : 'Analyze section'}
        </Button>
        {!canAnalyze && analyzeDisabledReason && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
            {analyzeDisabledReason}
          </Typography>
        )}
        {canAnalyze && analyzeTooShort && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
            Section must be at least {STANZA_METRONOME_ANALYZE_MIN_SECTION_SEC}s long for analysis.
          </Typography>
        )}
      </Box>

      {calibration && (
        <Button size="small" color="inherit" onClick={onClearCalibration} sx={{ alignSelf: 'flex-start', fontSize: '0.7rem' }}>
          Clear this section
        </Button>
      )}
    </Stack>
  );
}
