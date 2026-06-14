import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import CloseIcon from '@mui/icons-material/Close';
import { useLiveQuery } from 'dexie-react-hooks';
import AppTooltip from '../../shared/components/AppTooltip';
import ZenTimerRing from '../components/ZenTimerRing';
import { readPersistedGoogleSession } from '../../shared/google/encoreGoogleTokenStorage';
import { recordGestureDraw } from '../db/gestureLocalData';
import { gestureDb } from '../db/gestureDb';
import { clearGestureImagePrefetchCache } from '../media/gestureImagePrefetchCache';
import { useGestureImagePrefetch } from '../hooks/useGestureImagePrefetch';
import { buildSessionQueue, formatTimerSec } from '../session/buildSessionQueue';
import { useDrawingTimer } from '../session/useDrawingTimer';
import { useSessionKeyboard } from '../session/useSessionKeyboard';
import type { SessionConfig, SessionDebrief, SessionQueueItem } from '../types';

interface ZenSessionPhaseProps {
  config: SessionConfig;
  onExit: (debrief: SessionDebrief) => void;
}

export default function ZenSessionPhase({ config, onExit }: ZenSessionPhaseProps) {
  const packFiles = useLiveQuery(() => gestureDb.packFiles.toArray(), []) ?? [];
  const drawHistory = useLiveQuery(() => gestureDb.drawHistory.toArray(), []) ?? [];

  const drawnIds = useMemo(() => new Set(drawHistory.map((r) => r.driveFileId)), [drawHistory]);

  const queue = useMemo((): SessionQueueItem[] => {
    const files: SessionQueueItem[] = packFiles
      .filter((f) => config.packIds.includes(f.packId))
      .map((f) => ({ driveFileId: f.driveFileId, packId: f.packId, name: f.name }));
    return buildSessionQueue({
      files,
      drawnIds,
      excludePreviouslyDrawn: config.excludePreviouslyDrawn,
      shuffle: config.shuffle,
    });
  }, [config, packFiles, drawnIds]);

  const [index, setIndex] = useState(0);
  const [photosCompleted, setPhotosCompleted] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const loggedIndexRef = useRef<number | null>(null);

  const accessToken = readPersistedGoogleSession()?.accessToken ?? null;
  const current = queue[index] ?? null;
  const { src, loading, error } = useGestureImagePrefetch(queue, index, accessToken);

  const timer = useDrawingTimer(config.durationSec, Boolean(current));

  const finishSession = useCallback(() => {
    clearGestureImagePrefetchCache();
    onExit({
      photosCompleted,
      totalMs,
      packIds: config.packIds,
    });
  }, [config.packIds, onExit, photosCompleted, totalMs]);

  const logCurrentPhoto = useCallback(async () => {
    if (!current || loggedIndexRef.current === index) return;
    loggedIndexRef.current = index;
    const durationMs = config.durationSec * 1000;
    await recordGestureDraw({
      driveFileId: current.driveFileId,
      packId: current.packId,
      durationMs,
    });
    setPhotosCompleted((n) => n + 1);
    setTotalMs((ms) => ms + durationMs);
  }, [config.durationSec, current, index]);

  const goNext = useCallback(async () => {
    if (current) await logCurrentPhoto();
    if (index >= queue.length - 1) {
      finishSession();
      return;
    }
    loggedIndexRef.current = null;
    setIndex((i) => i + 1);
    timer.resetForNext(config.durationSec);
  }, [config.durationSec, current, finishSession, index, logCurrentPhoto, queue.length, timer]);

  const goBack = useCallback(() => {
    if (index <= 0) return;
    loggedIndexRef.current = null;
    setIndex((i) => i - 1);
    timer.resetForNext(config.durationSec);
  }, [config.durationSec, index, timer]);

  useEffect(() => {
    if (!timer.complete) return;
    void goNext();
  }, [timer.complete, goNext]);

  useSessionKeyboard(
    {
      onPause: timer.togglePause,
      onSkip: () => void goNext(),
      onBack: goBack,
      onExit: () => {
        if (window.confirm('End this session? Progress for completed photos is saved.')) {
          finishSession();
        }
      },
    },
    Boolean(current),
  );

  const timerProgress = config.durationSec > 0 ? timer.remainingSec / config.durationSec : 0;

  if (queue.length === 0) {
    return (
      <div className="gesture-shell">
        <Typography component="h1" sx={{ mb: 2 }}>
          No photos available
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {config.excludePreviouslyDrawn
            ? 'You have drawn every photo in the selected packs. Turn off exclude or refresh a pack.'
            : 'Refresh your packs from the home screen.'}
        </Typography>
        <Button variant="contained" onClick={() => finishSession()}>
          Back home
        </Button>
      </div>
    );
  }

  return (
    <div className="gesture-zen-root" data-gesture-zen="true">
      <div className="gesture-zen-progress-bar" aria-hidden="true">
        <div
          className="gesture-zen-progress-bar-fill"
          style={{ width: `${timerProgress * 100}%` }}
        />
      </div>

      <div className="gesture-zen-timer-label" aria-live="polite">
        {formatTimerSec(timer.remainingSec)}
      </div>

      <div className="gesture-zen-image-wrap">
        {src ? (
          <img
            src={src}
            alt={current?.name ?? 'Reference photo'}
            className={`gesture-zen-image${loading ? ' is-loading' : ''}`}
          />
        ) : null}
        {error ? (
          <Typography role="alert" sx={{ color: '#fca5a5', textAlign: 'center', px: 2 }}>
            {error}
          </Typography>
        ) : null}
        {timer.paused ? <div className="gesture-zen-paused">Paused</div> : null}
      </div>

      <div className="gesture-zen-controls">
        <AppTooltip title="Previous (B or ←)">
          <IconButton
            aria-label="Previous photo"
            onClick={goBack}
            className="gesture-zen-control-btn"
            size="large"
          >
            <SkipPreviousIcon />
          </IconButton>
        </AppTooltip>
        <AppTooltip title={timer.paused ? 'Resume (Space)' : 'Pause (Space)'}>
          <ZenTimerRing
            progress={timerProgress}
            ariaLabel={`${formatTimerSec(timer.remainingSec)} remaining`}
          >
            <IconButton
              aria-label={timer.paused ? 'Resume timer' : 'Pause timer'}
              onClick={timer.togglePause}
              className="gesture-zen-control-btn"
              size="medium"
              sx={{ width: 40, height: 40 }}
            >
              {timer.paused ? <PlayArrowIcon /> : <PauseIcon />}
            </IconButton>
          </ZenTimerRing>
        </AppTooltip>
        <AppTooltip title="Skip (N or →)">
          <IconButton
            aria-label="Skip to next photo"
            onClick={() => void goNext()}
            className="gesture-zen-control-btn"
            size="large"
          >
            <SkipNextIcon />
          </IconButton>
        </AppTooltip>
        <AppTooltip title="End session (Esc)">
          <IconButton
            aria-label="End session"
            onClick={() => {
              if (window.confirm('End this session? Progress for completed photos is saved.')) {
                finishSession();
              }
            }}
            className="gesture-zen-control-btn"
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </AppTooltip>
      </div>
    </div>
  );
}
