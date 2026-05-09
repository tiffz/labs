import type { Ref } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AppTooltip from '../../shared/components/AppTooltip';
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
  /** Root element for “click outside” commit when the field keeps focus on non-focusable targets. */
  cardRootRef?: Ref<HTMLDivElement | null>;
  /** True when this section starts at an interior marker (removable boundary). */
  sectionBoundaryMarkerDeletable?: boolean;
  /** Removes the boundary at this section’s start; merges into the previous section (Logic-style). */
  onDeleteSectionBoundaryMarker?: () => void;
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
  cardRootRef,
  sectionBoundaryMarkerDeletable = false,
  onDeleteSectionBoundaryMarker,
}: StanzaSectionHoverCardProps) {
  const dur = segment.end - segment.start;
  const practicedMin = ((stats?.totalMs ?? 0) / 60_000).toFixed(1);

  return (
    <Box
      ref={cardRootRef}
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
      {sectionBoundaryMarkerDeletable && onDeleteSectionBoundaryMarker ? (
        <AppTooltip title="Removes this section’s start marker and joins this section into the previous one (same idea as Logic Pro). You can also press Delete with the section selected.">
          <Button
            type="button"
            variant="outlined"
            size="small"
            color="inherit"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSectionBoundaryMarker();
            }}
            sx={{ mb: 1, textTransform: 'none', fontSize: '0.75rem' }}
          >
            Remove section start
          </Button>
        </AppTooltip>
      ) : null}
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
