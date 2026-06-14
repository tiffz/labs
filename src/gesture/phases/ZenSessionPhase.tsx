import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import CloseIcon from '@mui/icons-material/Close';
import { useLiveQuery } from 'dexie-react-hooks';
import AppTooltip from '../../shared/components/AppTooltip';
import ZenTimerRing from '../components/ZenTimerRing';
import { recordGestureDraw } from '../db/gestureLocalData';
import { gestureDb } from '../db/gestureDb';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import {
  GESTURE_EMPTY_DRAW_HISTORY,
  GESTURE_EMPTY_PACK_FILES,
} from '../hooks/gestureLiveQueryEmpty';
import { clearGestureImagePrefetchCache } from '../media/gestureImagePrefetchCache';
import { useGestureImagePrefetch } from '../hooks/useGestureImagePrefetch';
import { formatTimerSec } from '../session/buildSessionQueue';
import { buildGestureSessionQueueFromConfig } from '../session/gestureSessionQueueFromConfig';
import { prefetchGestureSessionImages } from '../media/prefetchGestureSessionImages';
import { useDrawingTimer } from '../session/useDrawingTimer';
import { useSessionKeyboard } from '../session/useSessionKeyboard';
import type { SessionConfig, SessionDebrief, SessionQueueItem } from '../types';

interface ZenSessionPhaseProps {
  config: SessionConfig;
  onExit: (debrief: SessionDebrief) => void;
}

export default function ZenSessionPhase({ config, onExit }: ZenSessionPhaseProps) {
  const packFilesRaw = useLiveQuery(() => gestureDb.packFiles.toArray(), [], undefined);
  const drawHistoryRaw = useLiveQuery(() => gestureDb.drawHistory.toArray(), [], undefined);
  const packFiles = packFilesRaw ?? GESTURE_EMPTY_PACK_FILES;
  const drawHistory = drawHistoryRaw ?? GESTURE_EMPTY_DRAW_HISTORY;

  const queue = useMemo((): SessionQueueItem[] => {
    if (config.queue?.length) return config.queue;
    return buildGestureSessionQueueFromConfig(config, packFiles, drawHistory);
  }, [config, drawHistory, packFiles]);

  const [index, setIndex] = useState(0);
  const [photosCompleted, setPhotosCompleted] = useState(0);
  const [photosSkipped, setPhotosSkipped] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const loggedIndexRef = useRef<number | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    void readGestureDriveAccessToken().then(setAccessToken);
  }, []);

  useEffect(() => {
    if (!accessToken || config.queue?.length || queue.length === 0) return;
    void prefetchGestureSessionImages(accessToken, queue);
  }, [accessToken, config.queue, queue]);

  const current = queue[index] ?? null;
  const { src, ready, loading, error } = useGestureImagePrefetch(queue, index, accessToken);

  const timer = useDrawingTimer(config.durationSec, Boolean(current) && ready);

  const finishSession = useCallback(() => {
    clearGestureImagePrefetchCache();
    onExit({
      photosCompleted,
      photosSkipped,
      totalMs,
      packIds: config.packIds,
      config: {
        durationSec: config.durationSec,
        prioritizeLeastDrawn: config.prioritizeLeastDrawn,
        shuffle: config.shuffle,
        packIds: config.packIds,
        maxPhotos: config.maxPhotos,
      },
    });
  }, [config, onExit, photosCompleted, photosSkipped, totalMs]);

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

  const advance = useCallback(
    async (mode: 'complete' | 'skip') => {
      if (mode === 'complete' && current) {
        await logCurrentPhoto();
      } else if (mode === 'skip' && current) {
        setPhotosSkipped((n) => n + 1);
      }

      if (index >= queue.length - 1) {
        finishSession();
        return;
      }
      loggedIndexRef.current = null;
      setIndex((i) => i + 1);
      timer.resetForNext(config.durationSec);
    },
    [config.durationSec, current, finishSession, index, logCurrentPhoto, queue.length, timer],
  );

  const goNext = useCallback(() => void advance('skip'), [advance]);
  const goBack = useCallback(() => {
    if (index <= 0) return;
    loggedIndexRef.current = null;
    setIndex((i) => i - 1);
    timer.resetForNext(config.durationSec);
  }, [config.durationSec, index, timer]);

  useEffect(() => {
    if (!timer.complete) return;
    void advance('complete');
  }, [timer.complete, advance]);

  useSessionKeyboard(
    {
      onPause: timer.togglePause,
      onSkip: goNext,
      onBack: goBack,
      onExit: () => {
        if (window.confirm('End this session? Progress for completed photos is saved.')) {
          finishSession();
        }
      },
    },
    Boolean(current) && ready,
  );

  const timerProgress =
    ready && config.durationSec > 0 ? timer.remainingSec / config.durationSec : 0;

  if (queue.length === 0) {
    return (
      <div className="gesture-shell">
        <Typography component="h1" sx={{ mb: 2 }}>
          No photos available
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Selected collections have no photos yet. Refresh a collection or choose another.
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

      <div className="gesture-zen-image-wrap">
        {src ? (
          <img
            src={src}
            alt={current?.name ?? 'Reference photo'}
            className={`gesture-zen-image${loading ? ' is-loading' : ''}`}
          />
        ) : null}
        {!ready && !error ? (
          <div className="gesture-zen-preparing" aria-live="polite">
            Preparing photo…
          </div>
        ) : null}
        {error ? (
          <Typography role="alert" className="gesture-zen-error">
            {error}
          </Typography>
        ) : null}
        {ready && timer.paused ? <div className="gesture-zen-paused">Paused</div> : null}
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
            size={72}
            ariaLabel={`${formatTimerSec(timer.remainingSec)} remaining`}
          >
            <button
              type="button"
              className="gesture-zen-timer-ring-btn"
              aria-label={
                ready
                  ? timer.paused
                    ? `Resume timer, ${formatTimerSec(timer.remainingSec)} remaining`
                    : `Pause timer, ${formatTimerSec(timer.remainingSec)} remaining`
                  : 'Timer waiting for photo'
              }
              onClick={timer.togglePause}
              disabled={!ready}
            >
              <span className="gesture-zen-timer-countdown" aria-live="polite">
                {ready ? formatTimerSec(timer.remainingSec) : '…'}
              </span>
            </button>
          </ZenTimerRing>
        </AppTooltip>
        <AppTooltip title="Skip (N or →)">
          <IconButton
            aria-label="Skip to next photo"
            onClick={goNext}
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
