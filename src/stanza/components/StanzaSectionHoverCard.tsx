import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { SegmentStat } from '../db/stanzaDb';
import type { DerivedSegment } from '../utils/segments';

export interface StanzaSectionHoverCardProps {
  segment: DerivedSegment;
  stats: SegmentStat | undefined;
  position: { x: number; y: number };
  draftLabel: string;
  onDraftLabelChange: (v: string) => void;
  onRenameCommit: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Hover card for a Stanza timeline section: label, timing, practice stats.
 */
export default function StanzaSectionHoverCard({
  segment,
  stats,
  position,
  draftLabel,
  onDraftLabelChange,
  onRenameCommit,
  onPointerEnter,
  onPointerLeave,
}: StanzaSectionHoverCardProps) {
  const dur = segment.end - segment.start;
  const practicedMin = ((stats?.totalMs ?? 0) / 60_000).toFixed(1);

  return (
    <Box
      className="stanza-section-hover-card"
      sx={{
        position: 'fixed',
        left: `${Math.min(Math.max(position.x, 160), window.innerWidth - 220)}px`,
        top: `${position.y + 12}px`,
        zIndex: 1400,
        width: 200,
        p: 1.5,
        bgcolor: 'rgba(255, 252, 248, 0.96)',
        border: '1px solid rgba(60, 60, 67, 0.14)',
        borderRadius: 2,
        boxShadow: '0 8px 28px rgba(29, 29, 31, 0.12)',
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <TextField
        value={draftLabel}
        size="small"
        fullWidth
        label="Section name"
        onChange={(e) => onDraftLabelChange(e.target.value)}
        onBlur={onRenameCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onRenameCommit();
          }
          if (e.key === 'Escape') onDraftLabelChange(segment.label);
        }}
        sx={{ mb: 1 }}
      />
      <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.5 }}>
        {formatDuration(segment.start)} → {formatDuration(segment.end)}
        <br />
        Length: {formatDuration(dur)}
        <br />
        Focus time: {practicedMin} min
        {stats?.lastPracticed ? (
          <>
            <br />
            Last practiced: {new Date(stats.lastPracticed).toLocaleDateString()}
          </>
        ) : null}
      </Typography>
    </Box>
  );
}
