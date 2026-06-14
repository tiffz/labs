import { useLiveQuery } from 'dexie-react-hooks';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ReplayIcon from '@mui/icons-material/Replay';
import { gestureDb } from '../db/gestureDb';
import {
  GESTURE_EMPTY_DRAW_HISTORY,
  GESTURE_EMPTY_PACK_FILES,
} from '../hooks/gestureLiveQueryEmpty';
import { useGestureRestartWarmup } from '../hooks/useGestureSessionWarmup';
import { formatDurationMs } from '../session/buildSessionQueue';
import type { SessionDebrief } from '../types';

interface DebriefPhaseProps {
  debrief: SessionDebrief;
  onHome: () => void;
  onRestart: () => void;
}

export default function DebriefPhase({ debrief, onHome, onRestart }: DebriefPhaseProps) {
  const packFilesRaw = useLiveQuery(
    () =>
      debrief.config.packIds.length === 0
        ? Promise.resolve(GESTURE_EMPTY_PACK_FILES)
        : gestureDb.packFiles.where('packId').anyOf(debrief.config.packIds).toArray(),
    [debrief.config.packIds.join(',')],
    undefined,
  );
  const drawHistoryRaw = useLiveQuery(() => gestureDb.drawHistory.toArray(), [], undefined);
  const packFiles = packFilesRaw ?? GESTURE_EMPTY_PACK_FILES;
  const drawHistory = drawHistoryRaw ?? GESTURE_EMPTY_DRAW_HISTORY;

  useGestureRestartWarmup(debrief.config, packFiles, drawHistory);

  const hasSkipped = debrief.photosSkipped > 0;
  const totalPhotos = debrief.photosCompleted + debrief.photosSkipped;

  return (
    <div className="gesture-shell gesture-debrief">
      <header className="gesture-debrief-header">
        <Typography component="h1" className="gesture-title">
          Session complete
        </Typography>
        <Typography className="gesture-lede">
          {debrief.photosCompleted > 0
            ? 'Nice work. Your progress syncs to Drive when you are signed in.'
            : 'No photos were logged this round. Try again when you are ready.'}
        </Typography>
      </header>

      <section className="gesture-debrief-summary" aria-label="Session summary">
        <div className="gesture-stat-grid gesture-stat-grid--debrief">
          <div className="gesture-stat">
            <span className="gesture-stat-value">{debrief.photosCompleted}</span>
            <span className="gesture-stat-label">Photos completed</span>
          </div>
          {hasSkipped ? (
            <div className="gesture-stat gesture-stat--muted">
              <span className="gesture-stat-value">{debrief.photosSkipped}</span>
              <span className="gesture-stat-label">Skipped</span>
            </div>
          ) : null}
          <div className="gesture-stat">
            <span className="gesture-stat-value">{formatDurationMs(debrief.totalMs)}</span>
            <span className="gesture-stat-label">Time logged</span>
          </div>
          {totalPhotos > 0 ? (
            <div className="gesture-stat gesture-stat--muted">
              <span className="gesture-stat-value">{totalPhotos}</span>
              <span className="gesture-stat-label">Photos seen</span>
            </div>
          ) : null}
        </div>
        {hasSkipped ? (
          <Typography className="gesture-debrief-skipped-note">
            Skipped photos are not marked as drawn — they may appear in a future session.
          </Typography>
        ) : null}
      </section>

      <Box className="gesture-debrief-actions">
        <Button
          variant="contained"
          size="large"
          className="gesture-enter-btn"
          startIcon={<ReplayIcon />}
          onClick={onRestart}
        >
          Practice again
        </Button>
        <Button variant="text" onClick={onHome} className="gesture-debrief-home-btn">
          Back home
        </Button>
      </Box>
    </div>
  );
}
