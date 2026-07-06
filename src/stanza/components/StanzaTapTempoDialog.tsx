/**
 * Focused tap-along flow for calibrating BPM and Beat 1 while the track plays.
 * Opens from the metronome rail; starts from the playhead when in scope, counts in, then records taps.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import BpmInput from '../../shared/components/music/BpmInput';
import type { StanzaMetronomeTimingScope } from '../db/stanzaDb';
import {
  STANZA_METRONOME_TAP_COUNT,
  STANZA_METRONOME_TAP_MIN_COUNT,
  STANZA_TAP_COUNTDOWN_SEC,
  beatOffsetFromTapsExtrapolated,
  estimateBpmFromTapTimes,
  resolveTapPlaybackStartSec,
} from '../utils/stanzaMetronome';

type TapPhase = 'ready' | 'countdown' | 'tapping' | 'preview';

export interface StanzaTapTempoDialogProps {
  open: boolean;
  onClose: () => void;
  timingScope: StanzaMetronomeTimingScope;
  segmentStart: number;
  /** Section end when calibrating a section; whole-song duration when scope is song. */
  segmentEnd: number;
  songDurationSec: number;
  playbackIsPlaying: boolean;
  getMediaTime: () => number;
  onRequestSeek: (timeSec: number) => void;
  onRequestPlay: () => void;
  onRequestPause: () => void;
  onPrimeMetronomeAudio?: () => void;
  /** Drive the metronome strip while previewing (not during active tapping). */
  onLivePreview: (bpm: number, firstBeatOffsetSec: number) => void;
  /** True only in the preview step so workspace can enable click without jarring taps. */
  onMetronomePreviewActiveChange?: (active: boolean) => void;
  /** True during count-in and active tapping so workspace mutes metronome clicks and drums. */
  onMetronomeTapActiveChange?: (active: boolean) => void;
  onApply: (result: { bpm: number; firstBeatOffsetSec: number }) => void;
}

function roundBeatOffsetForUi(sec: number): number {
  return Math.round(sec * 1000) / 1000;
}

function beatOffsetSecToMsDisplay(sec: number): string {
  return String(Math.round(sec * 1000));
}

function beatOffsetMsInputToSec(raw: string): number | null {
  const t = raw.trim();
  if (t === '' || t === '-' || t === '+') return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n)) return null;
  return n / 1000;
}

function formatTapClock(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

function scopeStartLabel(scope: StanzaMetronomeTimingScope): string {
  return scope === 'song' ? 'track start' : 'section start';
}

function TapTempoHintRow({
  icon: Icon,
  children,
}: {
  icon: typeof PlayArrowIcon;
  children: ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1.75} alignItems="flex-start">
      <Box
        aria-hidden
        sx={(theme: Theme) => ({
          width: 32,
          height: 32,
          borderRadius: '10px',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${theme.palette.primary.main}0F`,
          color: 'text.secondary',
        })}
      >
        <Icon sx={{ fontSize: 17 }} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ pt: 0.45, lineHeight: 1.55 }}>
        {children}
      </Typography>
    </Stack>
  );
}

function TapTempoReadyPanel({
  timingScope,
  countdownSec,
}: {
  timingScope: StanzaMetronomeTimingScope;
  countdownSec: number;
}) {
  const scopeNoun = timingScope === 'song' ? 'track' : 'section';
  const scopePhrase = timingScope === 'song' ? 'the track' : 'this section';
  const scopeStart = scopeStartLabel(timingScope);

  const steps = [
    {
      icon: PlaceOutlinedIcon,
      title: 'Pick a spot',
      body: `Seek to a downbeat with a clear pulse in ${scopePhrase}.`,
    },
    {
      icon: TouchAppIcon,
      title: 'Tap the beat',
      body: 'Tap each downbeat while it plays. Spacing between taps sets BPM.',
    },
    {
      icon: LooksOneIcon,
      title: 'Beat 1',
      body: `We extrapolate Beat 1 for the ${scopeNoun} from those taps.`,
    },
  ] as const;

  return (
    <Stack spacing={4} className="stanza-tap-tempo-ready-panel">
      <Stack
        component="ol"
        spacing={3.5}
        sx={{
          m: 0,
          p: 0,
          listStyle: 'none',
        }}
      >
        {steps.map(({ icon: Icon, title, body }) => (
          <Stack key={title} component="li" direction="row" spacing={2.25} alignItems="flex-start">
            <Box
              aria-hidden
              sx={(theme: Theme) => ({
                width: 36,
                height: 36,
                borderRadius: '11px',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${theme.palette.primary.main}12`,
                color: 'primary.main',
              })}
            >
              <Icon sx={{ fontSize: 19 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, pt: 0.15 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, lineHeight: 1.35, letterSpacing: '0.00625rem', mb: 0.75 }}
              >
                {title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.55, letterSpacing: '0.015625rem' }}
              >
                {body}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>

      <Box
        className="stanza-tap-tempo-hints-card"
        sx={(theme: Theme) => ({
          p: 2.75,
          borderRadius: '18px',
          bgcolor: `${theme.palette.primary.main}07`,
          border: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Stack spacing={2.25}>
          <TapTempoHintRow icon={PlayArrowIcon}>
            Playback begins from your playhead when it is in {scopePhrase}; otherwise it jumps to the{' '}
            {scopeStart}.
          </TapTempoHintRow>
          <TapTempoHintRow icon={KeyboardIcon}>
            Press Space or Enter to start after a {countdownSec}-second count-in.
          </TapTempoHintRow>
        </Stack>
      </Box>
    </Stack>
  );
}

function TapTempoPreviewPanel({
  scopeLabel,
  tapSessionStartSec,
  tapStartedFromPlayhead,
  tapStartDiffersFromScopeStart,
  previewBpm,
  previewOffsetInput,
  tapsCount,
  playbackIsPlaying,
  segmentStart,
  onPreviewBpmChange,
  onPreviewOffsetInputChange,
  onPreviewOffsetBlur,
  onPrimeMetronomeAudio,
  onRequestPlay,
  onRequestPause,
  onRequestSeek,
}: {
  scopeLabel: string;
  tapSessionStartSec: number | null;
  tapStartedFromPlayhead: boolean;
  tapStartDiffersFromScopeStart: boolean;
  previewBpm: number;
  previewOffsetInput: string;
  tapsCount: number;
  playbackIsPlaying: boolean;
  segmentStart: number;
  onPreviewBpmChange: (next: number) => void;
  onPreviewOffsetInputChange: (raw: string) => void;
  onPreviewOffsetBlur: () => void;
  onPrimeMetronomeAudio?: () => void;
  onRequestPlay: () => void;
  onRequestPause: () => void;
  onRequestSeek: (timeSec: number) => void;
}) {
  const playFromScope = () => {
    onPrimeMetronomeAudio?.();
    if (playbackIsPlaying) {
      onRequestPause();
      return;
    }
    onRequestSeek(segmentStart);
    window.requestAnimationFrame(() => onRequestPlay());
  };

  const playFromTapStart = () => {
    if (tapSessionStartSec == null) return;
    onPrimeMetronomeAudio?.();
    onRequestSeek(tapSessionStartSec);
    window.requestAnimationFrame(() => onRequestPlay());
  };

  return (
    <Stack spacing={3.5} className="stanza-tap-tempo-preview-panel">
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55, letterSpacing: '0.015625rem' }}>
        Beat 1 and BPM were extrapolated from your taps
        {tapSessionStartSec != null && tapStartedFromPlayhead
          ? ` at ${formatTapClock(tapSessionStartSec)}`
          : ''}
        . Check from the {scopeLabel} so the click lands on the downbeat before you save.
      </Typography>

      <Stack spacing={2.25}>
        <Box sx={{ width: '100%' }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.75, fontWeight: 600, letterSpacing: '0.02em' }}
          >
            BPM
          </Typography>
          <BpmInput
            value={previewBpm}
            onChange={onPreviewBpmChange}
            appearance="stanza"
            className="stanza-bpm-rail-input stanza-bpm-modal-input"
            dropdownClassName="stanza-bpm-dropdown"
            sliderClassName="stanza-bpm-slider"
            presetPanelHorizontal="right"
            showPresetDropdown={false}
            showRateActions={false}
          />
        </Box>
        <Box sx={{ width: '100%' }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.75, fontWeight: 600, letterSpacing: '0.02em' }}
          >
            Beat 1 (ms) from {scopeLabel}
          </Typography>
          <TextField
            size="small"
            fullWidth
            value={previewOffsetInput}
            onChange={(e) => onPreviewOffsetInputChange(e.target.value)}
            onBlur={onPreviewOffsetBlur}
            inputProps={{ inputMode: 'numeric' }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
          />
        </Box>
      </Stack>

      <Stack spacing={1.25}>
        <Button
          type="button"
          variant="contained"
          disableElevation
          fullWidth
          size="medium"
          className="stanza-tempo-preview-play-btn"
          startIcon={playbackIsPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          onClick={playFromScope}
        >
          {playbackIsPlaying ? 'Pause' : `Play from ${scopeLabel}`}
        </Button>
        {tapStartDiffersFromScopeStart && tapSessionStartSec != null ? (
          <Button
            type="button"
            variant="outlined"
            fullWidth
            size="medium"
            startIcon={<PlayArrowIcon />}
            onClick={playFromTapStart}
          >
            Play from tap start ({formatTapClock(tapSessionStartSec)})
          </Button>
        ) : null}
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55, display: 'block' }}>
        {tapsCount} taps recorded. Nudge Beat 1 if the grid feels early or late.
      </Typography>
    </Stack>
  );
}

export default function StanzaTapTempoDialog({
  open,
  onClose,
  timingScope,
  segmentStart,
  segmentEnd,
  songDurationSec,
  playbackIsPlaying,
  getMediaTime,
  onRequestSeek,
  onRequestPlay,
  onRequestPause,
  onPrimeMetronomeAudio,
  onLivePreview,
  onMetronomePreviewActiveChange,
  onMetronomeTapActiveChange,
  onApply,
}: StanzaTapTempoDialogProps) {
  const [phase, setPhase] = useState<TapPhase>('ready');
  const [countdown, setCountdown] = useState(STANZA_TAP_COUNTDOWN_SEC);
  const [taps, setTaps] = useState<number[]>([]);
  const [tapFlash, setTapFlash] = useState(false);
  const [previewBpm, setPreviewBpm] = useState<number | null>(null);
  const [previewOffsetSec, setPreviewOffsetSec] = useState<number | null>(null);
  const [previewOffsetInput, setPreviewOffsetInput] = useState('');
  const [tapSessionStartSec, setTapSessionStartSec] = useState<number | null>(null);
  const [tapStartedFromPlayhead, setTapStartedFromPlayhead] = useState(false);
  const countdownTimerRef = useRef<number | null>(null);
  const tapFlashTimerRef = useRef<number | null>(null);
  const tapPadRef = useRef<HTMLDivElement | null>(null);
  const startButtonRef = useRef<HTMLButtonElement | null>(null);
  const phaseRef = useRef<TapPhase>(phase);
  phaseRef.current = phase;

  const resetSession = useCallback(() => {
    if (countdownTimerRef.current != null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (tapFlashTimerRef.current != null) {
      window.clearTimeout(tapFlashTimerRef.current);
      tapFlashTimerRef.current = null;
    }
    setPhase('ready');
    setCountdown(STANZA_TAP_COUNTDOWN_SEC);
    setTaps([]);
    setTapFlash(false);
    setPreviewBpm(null);
    setPreviewOffsetSec(null);
    setPreviewOffsetInput('');
    setTapSessionStartSec(null);
    setTapStartedFromPlayhead(false);
  }, []);

  const handleDismiss = useCallback(() => {
    onRequestPause();
    resetSession();
    onClose();
  }, [onClose, onRequestPause, resetSession]);

  useEffect(() => {
    if (!open) resetSession();
  }, [open, resetSession]);

  useEffect(() => {
    onMetronomePreviewActiveChange?.(open && phase === 'preview');
  }, [open, onMetronomePreviewActiveChange, phase]);

  useEffect(() => {
    onMetronomeTapActiveChange?.(open && (phase === 'countdown' || phase === 'tapping'));
  }, [open, onMetronomeTapActiveChange, phase]);

  const finishToPreview = useCallback(
    (tapTimes: number[]) => {
      onRequestPause();
      const result = beatOffsetFromTapsExtrapolated(tapTimes, segmentStart, 0);
      if (!result) {
        setPhase('ready');
        setTaps([]);
        return;
      }
      const offSec = roundBeatOffsetForUi(result.firstBeatOffsetSec);
      const bpm = Math.round(result.bpm);
      setPreviewBpm(bpm);
      setPreviewOffsetSec(offSec);
      setPreviewOffsetInput(beatOffsetSecToMsDisplay(offSec));
      onLivePreview(bpm, offSec);
      setPhase('preview');
    },
    [onLivePreview, onRequestPause, segmentStart],
  );

  const registerTap = useCallback(() => {
    if (phaseRef.current !== 'tapping') return;
    const t = getMediaTime();
    if (!Number.isFinite(t)) return;
    setTaps((prev) => {
      const next = [...prev, t];
      if (next.length >= STANZA_METRONOME_TAP_COUNT) {
        window.requestAnimationFrame(() => finishToPreview(next));
      }
      return next;
    });
    setTapFlash(true);
    if (tapFlashTimerRef.current != null) window.clearTimeout(tapFlashTimerRef.current);
    tapFlashTimerRef.current = window.setTimeout(() => setTapFlash(false), 120);
  }, [finishToPreview, getMediaTime]);

  const startSession = useCallback(() => {
    onPrimeMetronomeAudio?.();
    onRequestPause();
    const { startSec, fromPlayhead } = resolveTapPlaybackStartSec({
      playheadSec: getMediaTime(),
      timingScope,
      segmentStart,
      segmentEnd,
      songDurationSec,
    });
    setTapSessionStartSec(startSec);
    setTapStartedFromPlayhead(fromPlayhead);
    onRequestSeek(startSec);
    setTaps([]);
    setCountdown(STANZA_TAP_COUNTDOWN_SEC);
    setPhase('countdown');
  }, [
    getMediaTime,
    onPrimeMetronomeAudio,
    onRequestPause,
    onRequestSeek,
    segmentEnd,
    segmentStart,
    songDurationSec,
    timingScope,
  ]);

  const startSessionRef = useRef(startSession);
  startSessionRef.current = startSession;
  const registerTapRef = useRef(registerTap);
  registerTapRef.current = registerTap;

  function keyboardTargetIsEditable(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    );
  }

  /** Capture Space/Enter before transport or the video element sees them. */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (e.repeat) return;
      if (keyboardTargetIsEditable(e.target)) return;

      const currentPhase = phaseRef.current;
      if (currentPhase === 'ready') {
        if (e.target instanceof HTMLButtonElement && e.target !== startButtonRef.current) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        startSessionRef.current();
        return;
      }
      if (currentPhase === 'tapping') {
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        e.stopPropagation();
        registerTapRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  useEffect(() => {
    if (!open || phase !== 'ready') return;
    startButtonRef.current?.focus({ preventScroll: true });
  }, [open, phase]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownTimerRef.current != null) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          window.requestAnimationFrame(() => {
            onRequestPlay();
            setPhase('tapping');
          });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownTimerRef.current != null) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [onRequestPlay, phase]);

  useEffect(() => {
    if (phase !== 'tapping') return;
    tapPadRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const handleTapPadKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      registerTapRef.current();
    },
    [],
  );

  useEffect(() => {
    if (!open || previewBpm == null || previewOffsetSec == null || phase !== 'preview') return;
    onLivePreview(previewBpm, previewOffsetSec);
  }, [open, onLivePreview, phase, previewBpm, previewOffsetSec]);

  const liveEstimate = taps.length >= 2 ? estimateBpmFromTapTimes(taps) : null;
  const canFinishEarly = taps.length >= STANZA_METRONOME_TAP_MIN_COUNT;
  const tapProgress = Math.min(taps.length / STANZA_METRONOME_TAP_COUNT, 1);

  const handlePreviewBpmChange = (next: number) => {
    const bpm = Math.round(next);
    setPreviewBpm(bpm);
    if (previewOffsetSec != null) onLivePreview(bpm, previewOffsetSec);
  };

  const handlePreviewOffsetInputChange = (raw: string) => {
    setPreviewOffsetInput(raw);
    const sec = beatOffsetMsInputToSec(raw);
    if (sec == null || previewBpm == null) return;
    const off = roundBeatOffsetForUi(sec);
    setPreviewOffsetSec(off);
    onLivePreview(previewBpm, off);
  };

  const handlePreviewOffsetBlur = () => {
    if (previewOffsetSec != null) setPreviewOffsetInput(beatOffsetSecToMsDisplay(previewOffsetSec));
  };

  const scopeLabel = scopeStartLabel(timingScope);
  const tapStartDiffersFromScopeStart =
    tapSessionStartSec != null && Math.abs(tapSessionStartSec - segmentStart) > 0.05;

  return (
    <Dialog
      open={open}
      onClose={handleDismiss}
      fullWidth
      maxWidth="xs"
      scroll="paper"
      aria-labelledby="stanza-tap-tempo-dialog-title"
      slotProps={{
        backdrop: {
          sx: { bgcolor: 'rgba(0, 0, 0, 0.32)' },
        },
        paper: {
          elevation: 3,
          className: 'stanza-tempo-preview-dialog-paper stanza-tap-tempo-dialog-paper',
          sx: (theme: Theme) => ({
            borderRadius: '28px',
            overflow: 'hidden',
            boxShadow: theme.shadows[8],
          }),
        },
      }}
    >
      <DialogTitle
        id="stanza-tap-tempo-dialog-title"
        component="div"
        sx={{ textAlign: 'center', pt: 4, pb: 2.5, px: { xs: 3, sm: 3.5 } }}
      >
        <Box
          aria-hidden
          sx={(theme: Theme) => ({
            width: 52,
            height: 52,
            mx: 'auto',
            borderRadius: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${theme.palette.primary.main}14`,
            color: 'primary.main',
          })}
        >
          <TouchAppIcon sx={{ fontSize: 26 }} />
        </Box>
        <Typography
          component="h2"
          variant="h6"
          sx={{ mt: 2, fontWeight: 600, lineHeight: 1.3, letterSpacing: '0.00625rem' }}
        >
          Tap tempo
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1,
            mx: 'auto',
            maxWidth: 300,
            lineHeight: 1.55,
            letterSpacing: '0.015625rem',
          }}
        >
          Calibrate BPM and Beat 1 by tapping along with the {timingScope === 'song' ? 'track' : 'section'}.
        </Typography>
      </DialogTitle>
      <DialogContent
        className="stanza-tempo-preview-dialog-content stanza-tap-tempo-dialog-content"
        sx={{ px: { xs: 3, sm: 3.5 }, pt: 0, pb: phase === 'ready' ? 1 : 2 }}
      >
        {phase === 'ready' ? (
          <TapTempoReadyPanel
            timingScope={timingScope}
            countdownSec={STANZA_TAP_COUNTDOWN_SEC}
          />
        ) : null}

        {phase === 'countdown' ? (
          <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Get ready. Tap on each downbeat once playback begins
              {tapSessionStartSec != null ? ` from ${formatTapClock(tapSessionStartSec)}` : ''}.
            </Typography>
            <Typography
              variant="h2"
              component="p"
              aria-live="polite"
              sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'primary.main' }}
            >
              {countdown > 0 ? countdown : 'Go'}
            </Typography>
          </Stack>
        ) : null}

        {phase === 'tapping' ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
              Tap on every downbeat
              {tapSessionStartSec != null ? ` from ${formatTapClock(tapSessionStartSec)}` : ''}.
              {' '}
              {STANZA_METRONOME_TAP_COUNT} taps gives the best read. Space works too.
            </Typography>
            <LinearProgress
              variant="determinate"
              value={tapProgress * 100}
              aria-label="Tap progress"
              sx={{ borderRadius: 1, height: 6 }}
            />
            <Typography variant="caption" color="text.secondary" aria-live="polite">
              {taps.length} of {STANZA_METRONOME_TAP_COUNT} taps
              {liveEstimate != null ? ` · about ${Math.round(liveEstimate)} BPM` : ''}
            </Typography>
            <Box
              ref={tapPadRef}
              role="button"
              tabIndex={0}
              className={`stanza-tap-tempo-pad${tapFlash ? ' stanza-tap-tempo-pad--flash' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault();
                registerTap();
              }}
              onKeyDown={handleTapPadKeyDown}
              aria-label="Tap on the downbeat. Space or Enter also works."
            >
              <TouchAppIcon sx={{ fontSize: 40 }} aria-hidden />
              <span>Tap here · Space</span>
            </Box>
            <Stack direction="row" spacing={1} useFlexGap>
              <Button type="button" variant="outlined" onClick={handleDismiss}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="contained"
                disabled={!canFinishEarly}
                onClick={() => finishToPreview(taps)}
              >
                Done ({taps.length} taps)
              </Button>
            </Stack>
          </Stack>
        ) : null}

        {phase === 'preview' && previewBpm != null && previewOffsetSec != null ? (
          <TapTempoPreviewPanel
            scopeLabel={scopeLabel}
            tapSessionStartSec={tapSessionStartSec}
            tapStartedFromPlayhead={tapStartedFromPlayhead}
            tapStartDiffersFromScopeStart={tapStartDiffersFromScopeStart}
            previewBpm={previewBpm}
            previewOffsetInput={previewOffsetInput}
            tapsCount={taps.length}
            playbackIsPlaying={playbackIsPlaying}
            segmentStart={segmentStart}
            onPreviewBpmChange={handlePreviewBpmChange}
            onPreviewOffsetInputChange={handlePreviewOffsetInputChange}
            onPreviewOffsetBlur={handlePreviewOffsetBlur}
            onPrimeMetronomeAudio={onPrimeMetronomeAudio}
            onRequestPlay={onRequestPlay}
            onRequestPause={onRequestPause}
            onRequestSeek={onRequestSeek}
          />
        ) : null}
      </DialogContent>
      <DialogActions
        sx={{
          flexDirection: phase === 'ready' ? 'column' : 'row',
          alignItems: phase === 'ready' ? 'stretch' : 'center',
          gap: phase === 'ready' ? 1.25 : 0,
          px: { xs: 3, sm: 3.5 },
          pb: 3.5,
          pt: phase === 'ready' ? 1.5 : undefined,
        }}
      >
        {phase === 'preview' ? (
          <>
            <Button type="button" onClick={handleDismiss}>
              Discard
            </Button>
            <Button
              type="button"
              variant="outlined"
              onClick={() => {
                onRequestPause();
                resetSession();
              }}
            >
              Tap again
            </Button>
            <Button
              variant="contained"
              disabled={previewBpm == null || previewOffsetSec == null}
              onClick={() => {
                if (previewBpm == null || previewOffsetSec == null) return;
                onApply({ bpm: previewBpm, firstBeatOffsetSec: previewOffsetSec });
                handleDismiss();
              }}
            >
              Save to {timingScope === 'song' ? 'whole song' : 'section'}
            </Button>
          </>
        ) : phase === 'ready' ? (
          <>
            <Button
              ref={startButtonRef}
              type="button"
              variant="contained"
              disableElevation
              fullWidth
              size="large"
              startIcon={<TouchAppIcon />}
              onClick={startSession}
              sx={{
                borderRadius: '999px',
                py: 1.25,
                fontWeight: 600,
                letterSpacing: '0.00625rem',
              }}
            >
              Start tapping
            </Button>
            <Button
              type="button"
              fullWidth
              onClick={handleDismiss}
              color="inherit"
              sx={{ py: 0.75, color: 'text.secondary' }}
            >
              Close
            </Button>
          </>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
