import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
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
import { clearGestureSessionPhotoDisplayReady } from '../media/gestureSessionPhotoPipeline';
import { useGestureImagePrefetch } from '../hooks/useGestureImagePrefetch';
import { useGestureSessionPhotoPipeline } from '../hooks/useGestureSessionPhotoPipeline';
import { formatTimerSec } from '../session/buildSessionQueue';
import { buildGestureSessionQueueFromConfig } from '../session/gestureSessionQueueFromConfig';
import { useDrawingTimer } from '../session/useDrawingTimer';
import { useSessionKeyboard } from '../session/useSessionKeyboard';
import type { SessionConfig, SessionDebrief, SessionQueueItem } from '../types';

interface ZenSessionPhaseProps {
  config: SessionConfig;
  onExit: (debrief: SessionDebrief) => void;
}

export default function ZenSessionPhase({ config, onExit }: ZenSessionPhaseProps) {
  const packFilesRaw = useLiveQuery(
    () =>
      config.packIds.length === 0
        ? Promise.resolve(GESTURE_EMPTY_PACK_FILES)
        : gestureDb.packFiles.where('packId').anyOf(config.packIds).toArray(),
    [config.packIds.join(',')],
    undefined,
  );
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
  const advancingRef = useRef(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    void readGestureDriveAccessToken().then(setAccessToken);
  }, []);

  const aheadIndex = index + 1 < queue.length ? index + 1 : null;
  useGestureSessionPhotoPipeline({
    queue,
    headIndex: index,
    aheadIndex,
    accessToken,
    enabled: queue.length > 0,
  });

  const current = queue[index] ?? null;
  const { src, ready, loading, error } = useGestureImagePrefetch(queue, index, accessToken);

  const timer = useDrawingTimer(config.durationSec, Boolean(current) && ready);

  const finishSession = useCallback(() => {
    clearGestureImagePrefetchCache();
    clearGestureSessionPhotoDisplayReady();
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

  const logCurrentPhoto = useCallback(async (durationMs: number) => {
    if (!current || loggedIndexRef.current === index) return;
    loggedIndexRef.current = index;
    await recordGestureDraw({
      driveFileId: current.driveFileId,
      packId: current.packId,
      durationMs,
    });
    setPhotosCompleted((n) => n + 1);
    setTotalMs((ms) => ms + durationMs);
  }, [current, index]);

  const advance = useCallback(
    async (mode: 'complete' | 'skip') => {
      if (advancingRef.current) return;
      advancingRef.current = true;
      timer.resetForNext(config.durationSec);
      try {
        if (mode === 'complete' && current) {
          const durationMs = Math.max(1, timer.elapsedMs);
          await logCurrentPhoto(durationMs);
        } else if (mode === 'skip' && current) {
          setPhotosSkipped((n) => n + 1);
        }

        if (index >= queue.length - 1) {
          finishSession();
          return;
        }
        loggedIndexRef.current = null;
        setIndex((i) => i + 1);
      } finally {
        advancingRef.current = false;
      }
    },
    [config.durationSec, current, finishSession, index, logCurrentPhoto, queue.length, timer],
  );

  const markDone = useCallback(() => void advance('complete'), [advance]);
  const goNext = useCallback(() => void advance('skip'), [advance]);
  const goBack = useCallback(() => {
    if (index <= 0 || advancingRef.current) return;
    advancingRef.current = true;
    timer.resetForNext(config.durationSec);
    loggedIndexRef.current = null;
    setIndex((i) => i - 1);
    advancingRef.current = false;
  }, [config.durationSec, index, timer]);

  useEffect(() => {
    if (!timer.complete) return;
    void advance('complete');
  }, [timer.complete, advance]);

  useSessionKeyboard(
    {
      onPause: timer.togglePause,
      onMarkDone: markDone,
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
        <Typography
          sx={{
            color: "text.secondary",
            mb: 2
          }}>
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

      <div className="gesture-zen-stage">
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
      </div>

      <div className="gesture-zen-dock">
        <AppTooltip title="Previous (B or ←)">
          <IconButton
            aria-label="Previous photo"
            onClick={goBack}
            className="gesture-zen-control-btn"
            size="small"
          >
            <SkipPreviousIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
        <AppTooltip title={timer.paused ? 'Resume (Space)' : 'Pause (Space)'}>
          <button
            type="button"
            className="gesture-zen-timer-btn"
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
            <ZenTimerRing
              progress={timerProgress}
              size={44}
              ariaLabel={`${formatTimerSec(timer.remainingSec)} remaining`}
            >
              <span className="gesture-zen-timer-countdown" aria-live="polite">
                {ready ? formatTimerSec(timer.remainingSec) : '…'}
              </span>
            </ZenTimerRing>
          </button>
        </AppTooltip>
        <AppTooltip title="Mark done (Enter)">
          <IconButton
            aria-label="Mark drawing complete and go to next photo"
            onClick={markDone}
            className="gesture-zen-control-btn gesture-zen-complete-btn"
            size="small"
            disabled={!ready}
          >
            <CheckIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
        <AppTooltip title="Skip (N or →)">
          <IconButton
            aria-label="Skip to next photo"
            onClick={goNext}
            className="gesture-zen-control-btn"
            size="small"
          >
            <SkipNextIcon fontSize="small" />
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
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
      </div>
    </div>
  );
}
