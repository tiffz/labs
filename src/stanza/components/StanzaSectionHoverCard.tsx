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
  /** `x` = horizontal center of the card in viewport px; `segmentTop` = top edge of the hovered section (card sits above it). */
  position: { x: number; segmentTop: number };
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
  const cardW = 172;
  const half = cardW / 2;
  const leftPx = Math.min(Math.max(position.x - half, 8), window.innerWidth - cardW - 8);
  const bottomPx = window.innerHeight - position.segmentTop + 8;

  return (
    <Box
      ref={cardRootRef}
      className="stanza-section-hover-card"
      sx={{
        position: 'fixed',
        left: `${leftPx}px`,
        bottom: `${bottomPx}px`,
        top: 'auto',
        zIndex: 1400,
        width: cardW,
        p: 1,
        bgcolor: 'rgba(255, 252, 248, 0.98)',
        border: '1px solid rgba(60, 60, 67, 0.12)',
        borderRadius: 1.5,
        boxShadow: '0 4px 18px rgba(29, 29, 31, 0.1)',
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35, fontWeight: 600, letterSpacing: '0.04em', fontSize: '0.65rem' }}>
        Section
      </Typography>
      <TextField
        value={draftLabel}
        size="small"
        fullWidth
        label="Name"
        onChange={(e) => onDraftLabelChange(e.target.value)}
        onBlur={onRenameCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onRenameCommit();
          }
          if (e.key === 'Escape') onDraftLabelChange(segment.label);
        }}
        sx={{ mb: 0.75, '& .MuiInputBase-root': { fontSize: '0.8125rem' } }}
      />
      {sectionBoundaryMarkerDeletable && onDeleteSectionBoundaryMarker ? (
        <AppTooltip title="Removes the split at the start of this section and joins it into the previous one (same idea as Logic Pro). You can also press Delete with the section selected.">
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
            sx={{ mb: 0.5, py: 0.35, textTransform: 'none', fontSize: '0.6875rem' }}
          >
            Join with previous
          </Button>
        </AppTooltip>
      ) : null}
      <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.4, fontSize: '0.65rem' }}>
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
