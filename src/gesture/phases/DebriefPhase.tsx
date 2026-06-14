import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { formatDurationMs } from '../session/buildSessionQueue';
import type { SessionDebrief } from '../types';

interface DebriefPhaseProps {
  debrief: SessionDebrief;
  onHome: () => void;
}

export default function DebriefPhase({ debrief, onHome }: DebriefPhaseProps) {
  return (
    <div className="gesture-shell">
      <Typography component="h1" className="gesture-title">
        Session complete
      </Typography>
      <Typography className="gesture-lede" sx={{ mb: 2 }}>
        Nice work. Your progress syncs to Drive when you are signed in.
      </Typography>

      <section className="gesture-practice-controls" aria-label="Session summary">
        <div className="gesture-stat-grid">
          <div className="gesture-stat">
            <span className="gesture-stat-value">{debrief.photosCompleted}</span>
            <span className="gesture-stat-label">Photos completed</span>
          </div>
          <div className="gesture-stat">
            <span className="gesture-stat-value">{formatDurationMs(debrief.totalMs)}</span>
            <span className="gesture-stat-label">Time logged</span>
          </div>
        </div>
      </section>

      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={onHome}>
          Back home
        </Button>
      </Box>
    </div>
  );
}
