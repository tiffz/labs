/**
 * StanzaSectionMetronomeRail — calibrate BPM and Beat 1 for either the whole song
 * or one section, plus the auto-detect (Essentia) preview modal.
 *
 * Calibration shape (see `db/stanzaDb.ts: StanzaSegmentMetronomeCalibration`):
 *   - `bpm`             — beats per minute
 *   - `anchorMediaTime` — media time (seconds) on which the downbeat lands
 *   - `firstBeatOffsetSec` — `anchorMediaTime - segmentStart` (kept so a section
 *     calibration can move with its boundary)
 *
 * Scope ("This section" vs "Whole song"):
 *   - Whole-song lives at `song.metronomeSongCalibration`.
 *   - Per-section overrides live at `song.metronomeBySegmentId[segmentId]`.
 *   - When a section has no override but the song does, this rail "inherits" the
 *     song BPM and reprojects Beat 1 to the section start.
 *
 * Why a long file:
 *   - Three coupled draft states (rail BPM, rail offset, modal BPM/offset) all
 *     persist into the same Dexie shape. Splitting risks the wrong draft winning
 *     a save race. Decompose alongside hook tests.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { analyzeBeatForMediaTimeRange } from '../../shared/beat/segmentBeatAnalysis';
import AppTooltip from '../../shared/components/AppTooltip';
import BpmInput from '../../shared/components/music/BpmInput';
import type { StanzaMetronomeTimingScope, StanzaSegmentMetronomeCalibration } from '../db/stanzaDb';
import { sectionBoundaryBeatMisaligned } from '../utils/stanzaBeatGrid';
import type { DerivedSegment } from '../utils/segments';
import {
  STANZA_METRONOME_ANALYZE_MIN_SECTION_SEC,
  buildStanzaSegmentCalibration,
  calibrationEffectiveAnchorMediaTime,
  inheritedFirstBeatOffsetSecFromSongCalibration,
} from '../utils/stanzaMetronome';
import { STANZA_SONG_METRONOME_LIVE_ID } from '../utils/stanzaMetronomeResolution';

export interface StanzaSectionMetronomeRailProps {
  segment: DerivedSegment;
  timingScope: StanzaMetronomeTimingScope;
  onTimingScopeChange: (scope: StanzaMetronomeTimingScope) => void;
  songDurationSec: number;
  songCalibration: StanzaSegmentMetronomeCalibration | undefined;
  segmentCalibration: StanzaSegmentMetronomeCalibration | undefined;
  canAnalyze: boolean;
  analyzeDisabledReason?: string;
  localAudioBlob: Blob | undefined;
  localSongTitle: string;
  mediaUrl: string;
  isLocalVideo: boolean;
  playbackIsPlaying: boolean;
  beatAnalysisCacheKey: string;
  onAnalysisModalOpenChange: (open: boolean) => void;
  onRequestPlay: () => void;
  onRequestPause: () => void;
  /** Seek transport before preview play (e.g. section start in the analysis modal). */
  onRequestSeek: (timeSec: number) => void;
  onLiveTimingChange: (info: { segmentId: string; bpm: number; anchorMediaTime: number }) => void;
  onPersistSongCalibration: (cal: StanzaSegmentMetronomeCalibration, opts?: { recordUndo?: boolean }) => void;
  onPersistSegmentCalibration: (cal: StanzaSegmentMetronomeCalibration, opts?: { recordUndo?: boolean }) => void;
  onClearSongCalibration: () => void;
  onClearSegmentCalibration: () => void;
  /** Snap this section's boundary markers to the metronome grid (same as timeline hover card). */
  onSnapSectionBoundariesToBeat?: () => void;
  /** Prime Web Audio click sample (call from user-driven analyze / preview play). */
  onPrimeMetronomeAudio?: () => void;
}

function offsetFromCalibration(segStart: number, cal: StanzaSegmentMetronomeCalibration | undefined): number {
  if (!cal) return 0;
  return calibrationEffectiveAnchorMediaTime(segStart, cal) - segStart;
}

function roundBeatOffsetForUi(sec: number): number {
  return Math.round(sec * 1000) / 1000;
}

function beatOffsetSecToMsDisplay(sec: number): string {
  const ms = Math.round(sec * 1000);
  return String(ms);
}

function beatOffsetMsInputToSec(raw: string): number | null {
  const t = raw.trim();
  if (t === '' || t === '-' || t === '+') return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n)) return null;
  return n / 1000;
}

const ZERO_SEG: StanzaSegmentMetronomeCalibration = {
  bpm: 120,
  anchorMediaTime: 0,
  firstBeatOffsetSec: 0,
  source: 'tap',
};

export default function StanzaSectionMetronomeRail({
  segment,
  timingScope,
  onTimingScopeChange,
  songDurationSec,
  songCalibration,
  segmentCalibration,
  canAnalyze,
  analyzeDisabledReason,
  localAudioBlob,
  localSongTitle,
  mediaUrl,
  isLocalVideo,
  playbackIsPlaying,
  beatAnalysisCacheKey,
  onAnalysisModalOpenChange,
  onRequestPlay,
  onRequestPause,
  onRequestSeek,
  onLiveTimingChange,
  onPersistSongCalibration,
  onPersistSegmentCalibration,
  onClearSongCalibration,
  onClearSegmentCalibration,
  onSnapSectionBoundariesToBeat,
  onPrimeMetronomeAudio,
}: StanzaSectionMetronomeRailProps) {
  const segmentStart = timingScope === 'song' ? 0 : segment.start;
  const persistedCal = timingScope === 'song' ? songCalibration : segmentCalibration;
  const inheritedSongOffsetSec =
    timingScope === 'section' && songCalibration
      ? inheritedFirstBeatOffsetSecFromSongCalibration(segment.start, songCalibration)
      : 0;

  const baselineBpm = useMemo(() => {
    if (persistedCal && persistedCal.bpm > 0) return persistedCal.bpm;
    if (timingScope === 'section' && songCalibration && songCalibration.bpm > 0) return songCalibration.bpm;
    return ZERO_SEG.bpm;
  }, [persistedCal, songCalibration, timingScope]);

  const baselineOffsetSec = useMemo(() => {
    if (persistedCal) return offsetFromCalibration(segmentStart, persistedCal);
    if (timingScope === 'section' && songCalibration) return inheritedSongOffsetSec;
    return 0;
  }, [inheritedSongOffsetSec, persistedCal, segmentStart, songCalibration, timingScope]);

  const [draftBpm, setDraftBpm] = useState(() => Math.round(baselineBpm));
  const [draftOffsetInput, setDraftOffsetInput] = useState(() => beatOffsetSecToMsDisplay(baselineOffsetSec));
  const draftDirtyRef = useRef(false);
  const draftRef = useRef({ bpm: Math.round(baselineBpm), offsetSec: roundBeatOffsetForUi(baselineOffsetSec) });
  const calibrationMetaRef = useRef({
    timingScope,
    segmentId: segment.id,
    beatAnalysisCacheKey,
  });
  const persistTimerRef = useRef<number | null>(null);
  /**
   * Set by the reset button after we optimistically write the post-reset draft
   * (e.g. inherited song values for a section). The Dexie clear is async, so the
   * next render still sees the OLD `segmentCalibration` / `songCalibration` props
   * and would normally `syncDraftFromBaseline()` back to the stale value, briefly
   * reverting the user-visible reset. While this ref holds expected baseline
   * numbers, the effect below skips the sync; once the prop-derived baseline
   * matches, we clear the gate and resume normal syncing.
   */
  const pendingResetBaselineRef = useRef<{ bpm: number; offsetSec: number } | null>(null);

  const syncDraftFromBaseline = useCallback(() => {
    const bpm = Math.round(baselineBpm);
    const off = roundBeatOffsetForUi(baselineOffsetSec);
    setDraftBpm(bpm);
    setDraftOffsetInput(beatOffsetSecToMsDisplay(off));
    draftRef.current = { bpm, offsetSec: off };
    draftDirtyRef.current = false;
  }, [baselineBpm, baselineOffsetSec]);

  useEffect(() => {
    const prev = calibrationMetaRef.current;
    const scopeOrSegOrCacheChanged =
      prev.timingScope !== timingScope || prev.segmentId !== segment.id || prev.beatAnalysisCacheKey !== beatAnalysisCacheKey;
    calibrationMetaRef.current = { timingScope, segmentId: segment.id, beatAnalysisCacheKey };
    if (scopeOrSegOrCacheChanged) {
      pendingResetBaselineRef.current = null;
      syncDraftFromBaseline();
      return;
    }
    if (pendingResetBaselineRef.current) {
      const expected = pendingResetBaselineRef.current;
      const baselineBpmRounded = Math.round(baselineBpm);
      const baselineOffR = roundBeatOffsetForUi(baselineOffsetSec);
      if (baselineBpmRounded === expected.bpm && Math.abs(baselineOffR - expected.offsetSec) < 1e-6) {
        // Props caught up to our optimistic reset; release the gate. The draft
        // already matches, so no extra sync needed.
        pendingResetBaselineRef.current = null;
      }
      return;
    }
    if (!draftDirtyRef.current) {
      syncDraftFromBaseline();
    }
  }, [baselineBpm, baselineOffsetSec, beatAnalysisCacheKey, segment.id, syncDraftFromBaseline, timingScope]);

  const pushLiveFromDraft = useCallback(
    (bpm: number, offsetSec: number) => {
      const built = buildStanzaSegmentCalibration({
        segmentStart,
        bpm,
        firstBeatOffsetSec: offsetSec,
        source: 'tap',
      });
      const liveId = timingScope === 'song' ? STANZA_SONG_METRONOME_LIVE_ID : segment.id;
      onLiveTimingChange({
        segmentId: liveId,
        bpm: built.bpm,
        anchorMediaTime: calibrationEffectiveAnchorMediaTime(segmentStart, built),
      });
    },
    [onLiveTimingChange, segment.id, segmentStart, timingScope],
  );

  const flushPersist = useCallback(() => {
    if (persistTimerRef.current != null) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    const { bpm, offsetSec } = draftRef.current;
    const built = buildStanzaSegmentCalibration({
      segmentStart,
      bpm,
      firstBeatOffsetSec: offsetSec,
      source: 'tap',
    });
    if (timingScope === 'song') {
      onPersistSongCalibration(built);
    } else {
      onPersistSegmentCalibration(built);
    }
    draftDirtyRef.current = false;
  }, [onPersistSegmentCalibration, onPersistSongCalibration, segmentStart, timingScope]);

  const schedulePersist = useCallback(() => {
    draftDirtyRef.current = true;
    if (persistTimerRef.current != null) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      flushPersist();
    }, 450);
  }, [flushPersist]);

  useEffect(
    () => () => {
      if (persistTimerRef.current != null) window.clearTimeout(persistTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    pushLiveFromDraft(draftRef.current.bpm, draftRef.current.offsetSec);
  }, [pushLiveFromDraft, segment.id, segmentStart]);

  const handleBpmChange = useCallback(
    (next: number) => {
      const bpm = Math.round(next);
      setDraftBpm(bpm);
      draftRef.current = { ...draftRef.current, bpm };
      pushLiveFromDraft(bpm, draftRef.current.offsetSec);
      schedulePersist();
    },
    [pushLiveFromDraft, schedulePersist],
  );

  const handleOffsetInputChange = (raw: string) => {
    setDraftOffsetInput(raw);
    const sec = beatOffsetMsInputToSec(raw);
    if (sec == null) return;
    const off = roundBeatOffsetForUi(sec);
    draftRef.current = { ...draftRef.current, offsetSec: off };
    pushLiveFromDraft(draftRef.current.bpm, off);
    schedulePersist();
  };

  const handleOffsetBlur = () => {
    setDraftOffsetInput(beatOffsetSecToMsDisplay(draftRef.current.offsetSec));
    flushPersist();
  };

  const boundariesMisaligned = useMemo(() => {
    const metronomeBySegmentId: Record<string, StanzaSegmentMetronomeCalibration> = {};
    if (segmentCalibration) {
      metronomeBySegmentId[segment.id] = segmentCalibration;
    }
    return sectionBoundaryBeatMisaligned(segment, songDurationSec, metronomeBySegmentId, songCalibration);
  }, [segment, segmentCalibration, songCalibration, songDurationSec]);

  const boundaryAlignmentMessage = useMemo(() => {
    if (timingScope !== 'section') return null;
    if (!boundariesMisaligned) return null;
    return "Section boundaries don't line up with this BPM grid.";
  }, [boundariesMisaligned, timingScope]);

  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [modalDraftBpm, setModalDraftBpm] = useState<number | null>(null);
  const [modalDraftOffsetSec, setModalDraftOffsetSec] = useState<number | null>(null);
  const [modalOffsetInput, setModalOffsetInput] = useState('');
  const [modalAnalysisConfidence, setModalAnalysisConfidence] = useState<number | undefined>(undefined);

  useEffect(() => {
    onAnalysisModalOpenChange(analysisModalOpen);
  }, [analysisModalOpen, onAnalysisModalOpenChange]);

  const dismissAnalysisModal = useCallback(() => {
    setAnalysisModalOpen(false);
    setModalDraftBpm(null);
    setModalDraftOffsetSec(null);
    setModalOffsetInput('');
    setModalAnalysisConfidence(undefined);
    pushLiveFromDraft(draftRef.current.bpm, draftRef.current.offsetSec);
  }, [pushLiveFromDraft]);

  /** While the modal is open, drive the metronome strip from modal drafts so preview matches edits. */
  useEffect(() => {
    if (!analysisModalOpen || modalDraftBpm == null || modalDraftOffsetSec == null) return;
    pushLiveFromDraft(Math.round(modalDraftBpm), roundBeatOffsetForUi(modalDraftOffsetSec));
  }, [analysisModalOpen, modalDraftBpm, modalDraftOffsetSec, pushLiveFromDraft]);

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
    setModalDraftBpm(null);
    setModalDraftOffsetSec(null);
    setModalOffsetInput('');
    setModalAnalysisConfidence(undefined);
    setAnalysisBusy(true);
    onPrimeMetronomeAudio?.();
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
      const built = buildStanzaSegmentCalibration({
        segmentStart,
        bpm: res.bpm,
        firstBeatOffsetSec: res.anchorMediaTime - segmentStart,
        source: 'analysis',
        confidence: res.confidence,
        analyzedAt: Date.now(),
      });
      const offSec = built.firstBeatOffsetSec ?? 0;
      setModalDraftBpm(Math.round(built.bpm));
      setModalDraftOffsetSec(offSec);
      setModalOffsetInput(beatOffsetSecToMsDisplay(offSec));
      setModalAnalysisConfidence(res.confidence);
      onRequestSeek(segment.start);
      setAnalysisModalOpen(true);
    } catch (e) {
      // Keep raw error in console for debugging; show user a friendly recovery line.
      console.error('[Stanza] Tempo analysis failed', e);
      setAnalysisError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalysisBusy(false);
    }
  };

  const applyModalCalibration = () => {
    if (modalDraftBpm == null || modalDraftOffsetSec == null) return;
    const bpmR = Math.round(modalDraftBpm);
    const offR = roundBeatOffsetForUi(modalDraftOffsetSec);
    const built = buildStanzaSegmentCalibration({
      segmentStart,
      bpm: bpmR,
      firstBeatOffsetSec: offR,
      source: 'analysis',
      confidence: modalAnalysisConfidence,
      analyzedAt: Date.now(),
    });
    if (timingScope === 'song') onPersistSongCalibration(built);
    else onPersistSegmentCalibration(built);
    setDraftBpm(bpmR);
    setDraftOffsetInput(beatOffsetSecToMsDisplay(offR));
    draftRef.current = { bpm: bpmR, offsetSec: offR };
    draftDirtyRef.current = false;
    pushLiveFromDraft(bpmR, offR);
    setAnalysisModalOpen(false);
    setModalDraftBpm(null);
    setModalDraftOffsetSec(null);
    setModalOffsetInput('');
    setModalAnalysisConfidence(undefined);
  };

  const handleModalBpmChange = useCallback(
    (next: number) => {
      setModalDraftBpm(Math.round(next));
    },
    [],
  );

  const handleModalOffsetInputChange = (raw: string) => {
    setModalOffsetInput(raw);
    const sec = beatOffsetMsInputToSec(raw);
    if (sec == null) return;
    setModalDraftOffsetSec(roundBeatOffsetForUi(sec));
  };

  const handleModalOffsetBlur = () => {
    if (modalDraftOffsetSec == null) return;
    setModalOffsetInput(beatOffsetSecToMsDisplay(modalDraftOffsetSec));
  };

  const sectionDur = Math.max(0, segment.end - segment.start);
  const analyzeTooShort = sectionDur < STANZA_METRONOME_ANALYZE_MIN_SECTION_SEC;

  const applyDraftNumbers = useCallback(
    (bpm: number, off: number) => {
      const roundedBpm = Math.round(bpm);
      const offR = roundBeatOffsetForUi(off);
      setDraftBpm(roundedBpm);
      setDraftOffsetInput(beatOffsetSecToMsDisplay(offR));
      draftRef.current = { bpm: roundedBpm, offsetSec: offR };
      pushLiveFromDraft(roundedBpm, offR);
    },
    [pushLiveFromDraft],
  );

  return (
    <Stack spacing={1} className="stanza-metronome-rail" sx={{ mt: 0.35 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={0.5}>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
          Calibrate for <strong>{segment.label || `Section ${segment.index + 1}`}</strong>
        </Typography>
        <AppTooltip
          title={
            timingScope === 'section'
              ? 'Tempo target: this section. Click to edit whole song.'
              : 'Tempo target: whole song. Click to edit this section only.'
          }
        >
          <Button
            type="button"
            size="small"
            variant="outlined"
            className="stanza-btn-soft-outline stanza-timing-scope-flip stanza-rail-compact-btn"
            onClick={() => onTimingScopeChange(timingScope === 'section' ? 'song' : 'section')}
            sx={{
              flexShrink: 0,
              minHeight: 30,
              px: 1.15,
              py: 0.25,
              fontSize: '0.72rem',
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            {timingScope === 'section' ? 'This section' : 'Whole song'}
          </Button>
        </AppTooltip>
      </Stack>

      {timingScope === 'section' && !segmentCalibration && songCalibration ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
          Inheriting {Math.round(songCalibration.bpm)} BPM from whole song until you override.
        </Typography>
      ) : null}

      {timingScope === 'song' && segmentCalibration ? (
        <Alert severity="info" sx={{ py: 0, '& .MuiAlert-message': { py: 0.5 } }}>
          <Typography variant="caption" sx={{ lineHeight: 1.35 }}>
            This section has its own tempo. Whole-song edits won&apos;t change its BPM or Beat 1.
          </Typography>
        </Alert>
      ) : null}

      {boundaryAlignmentMessage ? (
        <Alert
          severity="warning"
          sx={{
            py: 0,
            alignItems: 'center',
            // Keep the action vertically centered with the message and the
            // built-in icon. Without this the action slot drops a notch on
            // narrow rails and the button label looks orphaned.
            '& .MuiAlert-action': { pt: 0, alignItems: 'center', mr: 0.25, ml: 0.5, flexShrink: 0 },
            '& .MuiAlert-message': { py: 0.5, pr: 0.5, minWidth: 0 },
          }}
          action={
            onSnapSectionBoundariesToBeat ? (
              <AppTooltip title="Snap the section start onto Beat 1 and pad the end forward to the next beat. The metronome click cadence stays the same — only the section edges move.">
                <Button
                  type="button"
                  size="small"
                  // Text + inherit lets the button pick up the alert's warning
                  // tint instead of competing for primary attention. Pattern
                  // recommended for actions inside MUI Alerts.
                  variant="text"
                  color="inherit"
                  onClick={onSnapSectionBoundariesToBeat}
                  sx={{
                    whiteSpace: 'nowrap',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '0.6875rem',
                    px: 1,
                    minWidth: 0,
                  }}
                >
                  Snap to beat
                </Button>
              </AppTooltip>
            ) : undefined
          }
        >
          <Typography variant="caption" component="div" sx={{ lineHeight: 1.45 }}>
            {boundaryAlignmentMessage}
          </Typography>
        </Alert>
      ) : null}

      <Stack direction="row" alignItems="flex-end" spacing={0.75} flexWrap="wrap" useFlexGap>
        <Box sx={{ flex: '1 1 140px', minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontWeight: 600, letterSpacing: '0.01em' }}>
            BPM
          </Typography>
          <BpmInput
            value={draftBpm}
            onChange={handleBpmChange}
            className="shared-bpm-input stanza-bpm-rail-input"
            dropdownClassName="stanza-bpm-dropdown"
            sliderClassName="stanza-bpm-slider"
            presetPanelHorizontal="right"
            showRateActions={false}
            trailingActions={
              <AppTooltip title="Reset BPM and Beat 1 to defaults for the current target (whole song or this section)">
                <span>
                  <IconButton
                    type="button"
                    size="small"
                    aria-label="Reset tempo calibration"
                    onClick={() => {
                      if (persistTimerRef.current != null) {
                        window.clearTimeout(persistTimerRef.current);
                        persistTimerRef.current = null;
                      }
                      // Compute the post-reset target (what the rail should show
                      // once the persisted clear flushes). For section scope this
                      // is the inherited whole-song values; for song scope it's
                      // the blank default. We apply the target optimistically and
                      // gate the prop-driven sync until baseline matches, so the
                      // user never sees the value flicker back to the stale one.
                      let targetBpm: number;
                      let targetOff: number;
                      if (timingScope === 'song') {
                        onClearSongCalibration();
                        targetBpm = ZERO_SEG.bpm;
                        targetOff = 0;
                      } else {
                        onClearSegmentCalibration();
                        targetBpm =
                          songCalibration && songCalibration.bpm > 40 && songCalibration.bpm < 360
                            ? Math.round(songCalibration.bpm)
                            : ZERO_SEG.bpm;
                        targetOff = songCalibration
                          ? inheritedFirstBeatOffsetSecFromSongCalibration(segment.start, songCalibration)
                          : 0;
                      }
                      pendingResetBaselineRef.current = {
                        bpm: Math.round(targetBpm),
                        offsetSec: roundBeatOffsetForUi(targetOff),
                      };
                      applyDraftNumbers(targetBpm, targetOff);
                      draftDirtyRef.current = false;
                    }}
                    sx={{ p: 0.35 }}
                  >
                    <RestartAltOutlinedIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </span>
              </AppTooltip>
            }
          />
        </Box>
        <Box sx={{ width: 112, flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontWeight: 600, letterSpacing: '0.01em' }}>
            Beat 1 (ms)
          </Typography>
          <TextField
            size="small"
            fullWidth
            value={draftOffsetInput}
            onChange={(e) => handleOffsetInputChange(e.target.value)}
            onBlur={handleOffsetBlur}
            inputProps={{ inputMode: 'numeric' }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
          />
        </Box>
        <Box sx={{ flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontWeight: 600, letterSpacing: '0.01em' }}>
            Auto
          </Typography>
          <AppTooltip
            title={
              !canAnalyze
                ? analyzeDisabledReason ?? 'Analysis unavailable'
                : analyzeTooShort
                  ? `Section must be at least ${STANZA_METRONOME_ANALYZE_MIN_SECTION_SEC}s long for analysis.`
                  : timingScope === 'song'
                    ? 'Detect tempo from this section, then save it to the whole song.'
                    : 'Detect tempo from this section (preview before saving).'
            }
          >
            <span>
              <IconButton
                type="button"
                size="small"
                color="inherit"
                className="stanza-btn-soft-outline stanza-rail-compact-btn stanza-rail-analyze-icon"
                disabled={!canAnalyze || analysisBusy || analyzeTooShort}
                aria-label={
                  analysisBusy
                    ? 'Analyzing tempo'
                    : timingScope === 'song'
                      ? 'Analyze tempo for the whole song'
                      : 'Analyze tempo for this section'
                }
                onClick={() => void runAnalyze()}
                sx={{ minWidth: 40, minHeight: 40, borderRadius: '999px', border: '1px solid rgba(232, 72, 160, 0.35)' }}
              >
                {analysisBusy ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : <AutoFixHighIcon sx={{ fontSize: 20 }} />}
              </IconButton>
            </span>
          </AppTooltip>
        </Box>
      </Stack>

      {analysisError && (
        <Alert severity="error" onClose={() => setAnalysisError(null)}>
          Couldn&apos;t detect tempo. Try again, or set BPM manually.
        </Alert>
      )}

      {!canAnalyze && analyzeDisabledReason ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, display: 'block' }}>
          {analyzeDisabledReason}
        </Typography>
      ) : null}
      {canAnalyze && analyzeTooShort ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, display: 'block' }}>
          Section must be at least {STANZA_METRONOME_ANALYZE_MIN_SECTION_SEC}s long for analysis.
        </Typography>
      ) : null}

      <Dialog
        open={analysisModalOpen}
        onClose={dismissAnalysisModal}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        slotProps={{ paper: { className: 'stanza-tempo-preview-dialog-paper' } }}
      >
        <DialogTitle sx={{ pb: 1 }}>Automatic tempo (preview)</DialogTitle>
        <DialogContent className="stanza-tempo-preview-dialog-content">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
            Detection gets you close. Tweak BPM and Beat 1 (ms), then play from the section start so the click
            lands on the downbeat before you save.
          </Typography>
          {modalDraftBpm != null && modalDraftOffsetSec != null ? (
            <Stack spacing={2} sx={{ mt: 0.25 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'flex-end' }}
                useFlexGap
              >
                <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35, fontWeight: 600 }}>
                    BPM (preview)
                  </Typography>
                  <BpmInput
                    value={modalDraftBpm}
                    onChange={handleModalBpmChange}
                    className="shared-bpm-input stanza-bpm-rail-input stanza-bpm-modal-input"
                    dropdownClassName="stanza-bpm-dropdown"
                    sliderClassName="stanza-bpm-slider"
                    presetPanelHorizontal="right"
                    showPresetDropdown={false}
                    showRateActions={false}
                  />
                </Box>
                <Box sx={{ flex: '1 1 0', minWidth: 0, maxWidth: { sm: 220 } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35, fontWeight: 600 }}>
                    Beat 1 (ms) from {timingScope === 'song' ? 'track start' : 'section start'}
                  </Typography>
                  <TextField
                    size="small"
                    fullWidth
                    value={modalOffsetInput}
                    onChange={(e) => handleModalOffsetInputChange(e.target.value)}
                    onBlur={handleModalOffsetBlur}
                    inputProps={{ inputMode: 'numeric' }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                  />
                </Box>
              </Stack>
              {modalAnalysisConfidence != null ? (
                <Typography variant="caption" color="text.secondary">
                  Detector confidence ~{Math.round(modalAnalysisConfidence * 100)}%
                </Typography>
              ) : null}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} useFlexGap>
                <Button
                  type="button"
                  variant="contained"
                  disableElevation
                  size="medium"
                  className="stanza-tempo-preview-play-btn"
                  startIcon={playbackIsPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                  onClick={() => {
                    onPrimeMetronomeAudio?.();
                    if (playbackIsPlaying) {
                      onRequestPause();
                    } else {
                      onRequestSeek(segment.start);
                      window.requestAnimationFrame(() => {
                        onRequestPlay();
                      });
                    }
                  }}
                >
                  {playbackIsPlaying ? 'Pause' : 'Play from section start'}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45, flex: 1, minWidth: 0 }}>
                  Playback jumps to this section&apos;s start so the downbeat you hear matches the metronome strip.
                </Typography>
              </Stack>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button type="button" onClick={dismissAnalysisModal}>
            Discard
          </Button>
          <Button variant="contained" disabled={modalDraftBpm == null || modalDraftOffsetSec == null} onClick={applyModalCalibration}>
            Save to {timingScope === 'song' ? 'whole song' : 'section'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
