import type { Ref } from 'react';
import { createPortal } from 'react-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
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
  /** Removes the boundary at this section's start; merges into the previous section. */
  onDeleteSectionBoundaryMarker?: () => void;
  /** Resolved metronome BPM for this section (for display). */
  sectionBpm?: number;
  /** True when start/end boundaries are off the beat grid for this section. */
  boundariesMisalignedWithBeat?: boolean;
  /** Pad the section end forward to the next beat on the metronome grid (same grid as BPM display). */
  onSnapBoundariesToBeat?: () => void;
  /** Whether the section is currently marked to skip during forward playback. */
  isSkipped?: boolean;
  /** Toggle "skip during playback" for this section. */
  onSkippedChange?: (next: boolean) => void;
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
  sectionBpm,
  boundariesMisalignedWithBeat = false,
  onSnapBoundariesToBeat,
  isSkipped = false,
  onSkippedChange,
}: StanzaSectionHoverCardProps) {
  const dur = segment.end - segment.start;
  const practicedMin = ((stats?.totalMs ?? 0) / 60_000).toFixed(1);
  const cardW = 200;
  const half = cardW / 2;
  const leftPx = Math.min(Math.max(position.x - half, 8), window.innerWidth - cardW - 8);
  const topPx = Math.max(8, position.segmentTop - 8);

  const card = (
    <Box
      ref={cardRootRef}
      className="stanza-section-hover-card"
      sx={{
        position: 'fixed',
        left: `${leftPx}px`,
        top: `${topPx}px`,
        transform: 'translateY(-100%)',
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
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: 'block',
          mb: 0.35,
          fontWeight: 600,
          letterSpacing: '0.04em',
          fontSize: '0.65rem'
        }}>
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
      {typeof sectionBpm === 'number' && Number.isFinite(sectionBpm) ? (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: 'block',
            mb: 0.5,
            fontSize: '0.7rem'
          }}>
          Metronome:{' '}
          <strong>
            {Math.abs(sectionBpm - Math.round(sectionBpm)) < 1e-6
              ? String(Math.round(sectionBpm))
              : (Math.round(sectionBpm * 10) / 10).toFixed(1)}
          </strong>{' '}
          BPM
        </Typography>
      ) : null}
      {sectionBoundaryMarkerDeletable && onDeleteSectionBoundaryMarker ? (
        <AppTooltip title="Removes the split at the start of this section and merges it into the previous one. You can also press Delete with the section selected.">
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
      {boundariesMisalignedWithBeat && onSnapBoundariesToBeat ? (
        <AppTooltip title="Snap this section's start onto Beat 1 and pad the end forward to the next beat. The metronome click cadence stays the same. only the section edges move.">
          <Button
            type="button"
            variant="outlined"
            size="small"
            color="inherit"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              onSnapBoundariesToBeat();
            }}
            sx={{ mb: 0.5, py: 0.35, textTransform: 'none', fontSize: '0.6875rem' }}
          >
            Snap to beat
          </Button>
        </AppTooltip>
      ) : null}
      {onSkippedChange ? (
        <AppTooltip title="Auto-advance past this section during forward playback (e.g. instrumental breaks while practicing vocals). Manual scrubs still play it.">
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={isSkipped}
                onChange={(e) => {
                  e.stopPropagation();
                  onSkippedChange(e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{ p: 0.5 }}
              />
            }
            label="Skip during playback"
            sx={{
              display: 'flex',
              ml: -0.5,
              mb: 0.5,
              '& .MuiFormControlLabel-label': { fontSize: '0.6875rem', lineHeight: 1.25 },
            }}
          />
        </AppTooltip>
      ) : null}
      <Typography
        variant="caption"
        component="div"
        sx={{
          color: "text.secondary",
          lineHeight: 1.4,
          fontSize: '0.65rem'
        }}>
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

  return createPortal(card, document.body);
}
