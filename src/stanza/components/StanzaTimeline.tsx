/**
 * StanzaTimeline — playback strip below the media (transport, loop chips, scrub
 * track, section buttons, hover rename card, footer toolbars).
 *
 * Owns:
 *   - Pointer scrub / playhead drag interactions on the track, including the
 *     refined "did the user click a section vs scrub" heuristic via
 *     `suppressSegmentClickRef`.
 *   - Marker drag with neighbour clamping (`clampMarkerTime`).
 *   - Hover card lifecycle (open delay, outside-click commit, rename draft).
 *   - Loop overlay (`stanza-playback-track--loop`) and selection span wash.
 *
 * Does NOT own:
 *   - Markers (the parent passes them in and receives `onMarkersChange`).
 *   - Section selection (parent owns the `selectedSegmentIndices` array).
 *   - Loop policy / hull math (lives in `utils/stanzaPlaybackLoop`).
 *   - Beat-grid math (lives in `utils/stanzaBeatGrid`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import CallSplitOutlinedIcon from '@mui/icons-material/CallSplitOutlined';
import CropFreeOutlinedIcon from '@mui/icons-material/CropFreeOutlined';
import DeselectOutlinedIcon from '@mui/icons-material/DeselectOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MergeTypeOutlinedIcon from '@mui/icons-material/MergeTypeOutlined';
import UnfoldMoreDoubleOutlinedIcon from '@mui/icons-material/UnfoldMoreDoubleOutlined';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RepeatIcon from '@mui/icons-material/Repeat';
import RepeatOneIcon from '@mui/icons-material/RepeatOne';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { SegmentStat, StanzaMarker, StanzaSegmentMetronomeCalibration } from '../db/stanzaDb';
import {
  deletableBoundaryMarkerAtTime,
  deriveSegments,
  ensureMarkerIds,
} from '../utils/segments';
import { effectiveBeatGridForSegment, sectionBoundaryBeatMisaligned } from '../utils/stanzaBeatGrid';
import { clampMarkerTimeBetweenNeighbours } from '../utils/stanzaMarkerSpacing';
import type { StanzaPlaybackLoopMode } from '../utils/stanzaPlaybackLoop';
import { computeLoopHull } from '../utils/stanzaPlaybackLoop';
import { stanzaPlayheadDisplayTime } from '../utils/stanzaPlayheadDisplayTime';
import AppTooltip from '../../shared/components/AppTooltip';
import PlaybackSpeedControl from '../../shared/components/music/PlaybackSpeedControl';
import StanzaSectionHoverCard from './StanzaSectionHoverCard';

export type { StanzaPlaybackLoopMode };

const SELECTION_SPAN_WASH = 'rgba(232, 72, 160, 0.16)';

/**
 * Short, sentence-case help text shown via the (i) icon next to the timeline.
 * Per docs/USER_COPY_STYLE.md: short sentences, no em dashes, scannable.
 */
const BAR_HELP =
  'Drag the bar or playhead to scrub. Click a section to jump there. Shift+click extends the selection across sections. ' +
  'The light pink fill is your selection span: pad and nudge it without touching markers. ' +
  'Loop icons play once, loop the whole song, or loop the selection.';

const HOVER_CLOSE_MS = 220;

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export type StanzaMarkersChangeContext = {
  /** Markers at pointer-down when the user started dragging a boundary (for undo). */
  dragBaseline?: StanzaMarker[];
};

export interface StanzaTimelineProps {
  duration: number;
  currentTime: number;
  markers: StanzaMarker[];
  segmentMs: Record<string, SegmentStat | undefined>;
  selectedSegmentIndices: number[];
  loopMode: StanzaPlaybackLoopMode;
  onLoopModeChange: (mode: StanzaPlaybackLoopMode) => void;
  onSelectSegments: (segmentIndex: number, event: React.MouseEvent) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number, opts?: { flushPlaybackState?: boolean }) => void;
  /** When set, playhead paint uses this instead of `currentTime` (keeps split/scrub in sync). */
  transportTime?: number;
  onMarkersChange: (markers: StanzaMarker[], context?: StanzaMarkersChangeContext) => void;
  onDeleteMarker: (markerId: string) => void;
  onRenameSectionFromLabel: (segmentIndex: number, label: string) => void;
  onSkipToLoopStart: () => void;
  onSkipToLoopEnd: () => void;
  onAddMarker?: () => void;
  /** Merge contiguous selected sections (internal boundaries only). */
  onJoinSections?: () => void;
  /** True when at least two adjacent sections are selected (Shift+click range). */
  joinSectionsEnabled?: boolean;
  /** Clear section selection (toolbar). */
  onClearSegmentSelection?: () => void;
  /** Selected time span (marker hull + extend); parent omits when no sections selected. */
  selectionTimeSpan?: { start: number; end: number } | null;
  /** Nudge selection span vs markers (seconds); start −1 = widen earlier, start +1 = tighten in. */
  onSelectionSpanNudge?: (axis: 'start' | 'end', deltaSec: number) => void;
  /** Add symmetric musical padding inside [0, duration] without editing markers. */
  onSelectionMusicalPad?: () => void;
  /** Clear selection extend back to marker hull. */
  onResetSelectionSpan?: () => void;
  selectionExtendActive?: boolean;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  /** One beat in seconds for the current selection span (from metronome grid); parent falls back to 120 BPM when unset. */
  selectionSpanBeatDeltaSec?: number;
  metronomeBySegmentId?: Record<string, StanzaSegmentMetronomeCalibration>;
  metronomeSongCalibration?: StanzaSegmentMetronomeCalibration;
  onSnapSectionBoundariesToBeat?: (segmentIndex: number) => void;
  onCommitSelectionToBoundaries?: () => void;
  commitSelectionToBoundariesDisabled?: boolean;
  commitSelectionToBoundariesTitle?: string;
  /** Sections marked to skip during forward playback (drives the hover-card checkbox + section button styling). */
  skippedBySegmentId?: Record<string, true>;
  /** Toggle "skip during playback" for a section by id. */
  onSegmentSkippedChange?: (segmentId: string, next: boolean) => void;
}

export default function StanzaTimeline({
  duration,
  currentTime,
  transportTime,
  markers,
  segmentMs,
  selectedSegmentIndices,
  loopMode,
  onLoopModeChange,
  onSelectSegments,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onMarkersChange,
  onDeleteMarker,
  onRenameSectionFromLabel,
  onSkipToLoopStart,
  onSkipToLoopEnd,
  onAddMarker,
  onJoinSections,
  joinSectionsEnabled = false,
  onClearSegmentSelection,
  selectionTimeSpan,
  onSelectionSpanNudge,
  onSelectionMusicalPad,
  onResetSelectionSpan,
  selectionExtendActive = false,
  playbackRate,
  onPlaybackRateChange,
  selectionSpanBeatDeltaSec,
  metronomeBySegmentId,
  metronomeSongCalibration,
  onSnapSectionBoundariesToBeat,
  onCommitSelectionToBoundaries,
  commitSelectionToBoundariesDisabled = false,
  commitSelectionToBoundariesTitle,
  skippedBySegmentId,
  onSegmentSkippedChange,
}: StanzaTimelineProps) {
  const [dragMarkers, setDragMarkers] = useState<StanzaMarker[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const workingMarkers = dragMarkers ?? markers;
  const segments = useMemo(
    () => deriveSegments(ensureMarkerIds(workingMarkers), duration),
    [workingMarkers, duration],
  );

  const markerSelectionHull = useMemo(
    () => computeLoopHull(segments, selectedSegmentIndices),
    [segments, selectedSegmentIndices],
  );
  const selectionSpan = selectionTimeSpan ?? markerSelectionHull;

  const selectionNudgeStepSec = useMemo(() => {
    if (
      typeof selectionSpanBeatDeltaSec === 'number' &&
      Number.isFinite(selectionSpanBeatDeltaSec) &&
      selectionSpanBeatDeltaSec > 0
    ) {
      return selectionSpanBeatDeltaSec;
    }
    return 1;
  }, [selectionSpanBeatDeltaSec]);

  const selectionNudgeHint = useMemo(() => {
    if (selectionNudgeStepSec === 1) return 'one second';
    const sec = selectionNudgeStepSec >= 10 ? selectionNudgeStepSec.toFixed(1) : selectionNudgeStepSec.toFixed(2);
    return `one beat (~${sec}s)`;
  }, [selectionNudgeStepSec]);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrubbingRef = useRef(false);
  const suppressSegmentClickRef = useRef(false);
  const [trackScrubActive, setTrackScrubActive] = useState(false);

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || !(duration > 0)) return 0;
      const r = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - r.left, r.width));
      return (x / r.width) * duration;
    },
    [duration],
  );

  const sortedMarkers = useMemo(
    () => [...ensureMarkerIds(workingMarkers)].sort((a, b) => a.time - b.time),
    [workingMarkers],
  );

  const markersRef = useRef(markers);
  markersRef.current = markers;
  const markerDragBaselineRef = useRef<StanzaMarker[] | null>(null);

  const endDragPersist = useCallback(
    (dm: StanzaMarker[] | null, releasedMarkerId: string | null) => {
      if (dm) {
        const baseline = markerDragBaselineRef.current ?? undefined;
        markerDragBaselineRef.current = null;
        onMarkersChange(dm, baseline ? { dragBaseline: baseline } : undefined);
        if (releasedMarkerId) {
          const m = dm.find((x) => x.id === releasedMarkerId);
          if (m) onSeek(m.time);
        }
      }
    },
    [onMarkersChange, onSeek],
  );

  useEffect(() => {
    if (!dragId) return;
    const releasedId = dragId;
    const onMove = (e: MouseEvent) => {
      setDragMarkers((prev) => {
        const base = ensureMarkerIds(prev ?? markersRef.current);
        const t = clampMarkerTimeBetweenNeighbours(releasedId, getTimeFromClientX(e.clientX), base, duration);
        return base.map((m) => (m.id === releasedId ? { ...m, time: t } : m));
      });
    };
    const onUp = () => {
      setDragMarkers((dm) => {
        endDragPersist(dm, releasedId);
        return null;
      });
      setDragId(null);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragId, duration, endDragPersist, getTimeFromClientX]);

  const SCRUB_MOVE_PX = 5;

  const beginTrackScrub = useCallback(
    (e: Pick<React.PointerEvent<Element>, 'pointerId' | 'clientX'>) => {
      const el = trackRef.current;
      if (!el) return;
      scrubbingRef.current = true;
      setTrackScrubActive(true);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      onSeek(getTimeFromClientX(e.clientX));
    },
    [getTimeFromClientX, onSeek],
  );

  const armDeferredSegmentScrub = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const startX = e.clientX;
      let moved = false;

      const cleanupDoc = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      };

      const onMove = (ev: PointerEvent) => {
        if (!moved && Math.abs(ev.clientX - startX) >= SCRUB_MOVE_PX) {
          moved = true;
          cleanupDoc();
          suppressSegmentClickRef.current = true;
          beginTrackScrub(ev);
        }
      };

      const onUp = () => {
        cleanupDoc();
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [beginTrackScrub],
  );

  const onTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest('.stanza-marker-handle')) return;

      if (t.closest('.stanza-playback-seg')) {
        armDeferredSegmentScrub(e);
        return;
      }

      beginTrackScrub(e);
    },
    [armDeferredSegmentScrub, beginTrackScrub],
  );

  const onTrackPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!scrubbingRef.current) return;
      onSeek(getTimeFromClientX(e.clientX));
    },
    [getTimeFromClientX, onSeek],
  );

  const onTrackPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!scrubbingRef.current) return;
      scrubbingRef.current = false;
      setTrackScrubActive(false);
      onSeek(getTimeFromClientX(e.clientX), { flushPlaybackState: true });
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [getTimeFromClientX, onSeek],
  );

  const onPlayheadPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      beginTrackScrub(e);
    },
    [beginTrackScrub],
  );

  const [hoverCard, setHoverCard] = useState<{
    segmentId: string;
    /** Horizontal center for the card (px). */
    anchorCenterX: number;
    segmentTop: number;
  } | null>(null);
  const [draftSectionLabel, setDraftSectionLabel] = useState('');
  const hoverCloseTimer = useRef<number | null>(null);
  const sectionHoverCardRootRef = useRef<HTMLDivElement | null>(null);
  const sectionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const commitSectionRenameRef = useRef<() => void>(() => {});

  const clearHoverClose = useCallback(() => {
    if (hoverCloseTimer.current != null) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (hoverCloseTimer.current != null) window.clearTimeout(hoverCloseTimer.current);
    },
    [],
  );

  const hoverSegment = hoverCard != null ? segments.find((s) => s.id === hoverCard.segmentId) ?? null : null;

  const hoverSectionMetronomeBpm = useMemo(() => {
    if (!hoverSegment || !(duration > 0)) return undefined;
    return effectiveBeatGridForSegment(
      hoverSegment,
      metronomeBySegmentId,
      metronomeSongCalibration,
    ).bpm;
  }, [duration, hoverSegment, metronomeBySegmentId, metronomeSongCalibration]);

  const hoverSectionBoundaryMisaligned = useMemo(() => {
    if (!hoverSegment || !(duration > 0)) return false;
    return sectionBoundaryBeatMisaligned(hoverSegment, duration, metronomeBySegmentId, metronomeSongCalibration);
  }, [duration, hoverSegment, metronomeBySegmentId, metronomeSongCalibration]);

  const commitSectionRename = useCallback(() => {
    if (hoverCard == null) return;
    const i = segments.findIndex((s) => s.id === hoverCard.segmentId);
    if (i < 0) return;
    const trimmed = draftSectionLabel.trim();
    if (trimmed.length > 0) onRenameSectionFromLabel(i, trimmed);
    else {
      const seg = segments[i];
      if (seg) setDraftSectionLabel(seg.label);
    }
  }, [draftSectionLabel, hoverCard, onRenameSectionFromLabel, segments]);

  commitSectionRenameRef.current = commitSectionRename;

  const scheduleHoverClose = useCallback(() => {
    clearHoverClose();
    hoverCloseTimer.current = window.setTimeout(() => {
      commitSectionRenameRef.current();
      setHoverCard(null);
      hoverCloseTimer.current = null;
    }, HOVER_CLOSE_MS);
  }, [clearHoverClose]);

  const positionHoverCardFromSegment = useCallback((segmentId: string) => {
    const el = sectionButtonRefs.current.get(segmentId);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setHoverCard({
      segmentId,
      anchorCenterX: r.left + r.width / 2,
      segmentTop: r.top,
    });
  }, []);

  const handleSectionPointerEnter = useCallback(
    (segmentId: string, e: React.PointerEvent<HTMLButtonElement>) => {
      clearHoverClose();
      commitSectionRenameRef.current();
      sectionButtonRefs.current.set(segmentId, e.currentTarget);
      positionHoverCardFromSegment(segmentId);
      const seg = segments.find((s) => s.id === segmentId);
      if (seg) setDraftSectionLabel(seg.label);
    },
    [clearHoverClose, positionHoverCardFromSegment, segments],
  );

  useEffect(() => {
    if (!hoverCard) return;
    const segmentId = hoverCard.segmentId;
    const onReflow = () => positionHoverCardFromSegment(segmentId);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [hoverCard, positionHoverCardFromSegment]);

  /** Commit when clicking outside the hover card — blur alone misses non-focusable targets (video, timeline). */
  useEffect(() => {
    if (hoverCard == null) return;
    const onDocPointerDown = (e: PointerEvent) => {
      const root = sectionHoverCardRootRef.current;
      const t = e.target;
      if (root && t instanceof Node && root.contains(t)) return;
      commitSectionRenameRef.current();
    };
    document.addEventListener('pointerdown', onDocPointerDown, true);
    return () => document.removeEventListener('pointerdown', onDocPointerDown, true);
  }, [hoverCard]);

  if (!(duration > 0) || segments.length === 0) {
    return (
      <Box className="stanza-playback-stack">
        <Box sx={{ py: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Load media to see the timeline. Use Split at playhead or press M to add splits.
          </Typography>
        </Box>
        {onAddMarker ? (
          <Box className="stanza-playback-track-footer">
            <Box className="stanza-playback-control-group">
              <Typography component="span" className="stanza-playback-control-label">
                Sections
              </Typography>
              <Box className="stanza-playback-chip">
                <AppTooltip title="Shortcut M when you are not typing.">
                  <Button
                    type="button"
                    size="small"
                    variant="text"
                    className="stanza-playback-chip-text-btn"
                    startIcon={<CallSplitOutlinedIcon fontSize="small" />}
                    onClick={onAddMarker}
                  >
                    Split at playhead
                  </Button>
                </AppTooltip>
              </Box>
            </Box>
          </Box>
        ) : null}
      </Box>
    );
  }

  /** While repeating the selection span, keep the playhead from painting past the span end between wrap and the next state tick. */
  const playheadTransportSec = transportTime ?? currentTime;
  const playheadDisplaySec = stanzaPlayheadDisplayTime(
    playheadTransportSec,
    duration,
    loopMode,
    selectionSpan,
  );
  const playheadPct = (playheadDisplaySec / duration) * 100;
  const showSelectionSpanWash =
    selectedSegmentIndices.length > 0 && selectionSpan != null && duration > 0;
  const selectionSpanLeftPct = selectionSpan ? (selectionSpan.start / duration) * 100 : 0;
  const selectionSpanWidthPct = selectionSpan
    ? ((selectionSpan.end - selectionSpan.start) / duration) * 100
    : 0;
  const loopPlaybackSpan =
    loopMode === 'loopAll' && duration > 0
      ? { start: 0, end: duration }
      : loopMode === 'loopSelection' && selectionSpan != null
        ? selectionSpan
        : null;
  const showLoopPlaybackRing = loopPlaybackSpan != null;
  const loopPlaybackLeftPct = loopPlaybackSpan ? (loopPlaybackSpan.start / duration) * 100 : 0;
  const loopPlaybackWidthPct = loopPlaybackSpan
    ? ((loopPlaybackSpan.end - loopPlaybackSpan.start) / duration) * 100
    : 0;

  const loopSkipEnabled = duration > 0;

  const loopWholeTooltip =
    selectedSegmentIndices.length > 0
      ? 'Loop the whole track. Your section selection and pink span stay as they are.'
      : 'Loop the whole song.';

  const hoverDeletableMarker =
    hoverSegment != null && duration > 0
      ? deletableBoundaryMarkerAtTime(hoverSegment.start, workingMarkers, duration)
      : null;

  const showSelectionEditControls =
    selectedSegmentIndices.length > 0 &&
    duration > 0 &&
    Boolean(onSelectionSpanNudge || onClearSegmentSelection || onSelectionMusicalPad || onResetSelectionSpan);

  const showCommitSelectionToBoundaries =
    selectedSegmentIndices.length > 0 && duration > 0 && Boolean(onCommitSelectionToBoundaries);

  const selectionEditControls = showSelectionEditControls ? (
    <Box className="stanza-playback-control-group stanza-playback-footer-selection" role="group" aria-label="Edit selection">
      <Typography component="span" className="stanza-playback-control-label">
        Edit selection
      </Typography>
      <Box className="stanza-playback-chip stanza-playback-chip--selection">
        {onSelectionSpanNudge ? (
          <>
            <Typography component="span" className="stanza-playback-chip-caption">
              Start
            </Typography>
            <AppTooltip title={`Move selection start ${selectionNudgeHint} earlier (include more before the span).`}>
              <IconButton
                size="small"
                className="stanza-playback-chip-btn"
                aria-label={`Move selection start ${selectionNudgeHint} earlier`}
                onClick={() => onSelectionSpanNudge('start', -selectionNudgeStepSec)}
              >
                <ArrowBackOutlinedIcon />
              </IconButton>
            </AppTooltip>
            <AppTooltip title={`Move selection start ${selectionNudgeHint} later (trim from the left).`}>
              <IconButton
                size="small"
                className="stanza-playback-chip-btn"
                aria-label={`Move selection start ${selectionNudgeHint} later`}
                onClick={() => onSelectionSpanNudge('start', selectionNudgeStepSec)}
              >
                <ArrowForwardOutlinedIcon />
              </IconButton>
            </AppTooltip>
            <span className="stanza-playback-chip-divider" aria-hidden />
            <Typography component="span" className="stanza-playback-chip-caption">
              End
            </Typography>
            <AppTooltip title={`Move selection end ${selectionNudgeHint} earlier (trim from the right).`}>
              <IconButton
                size="small"
                className="stanza-playback-chip-btn"
                aria-label={`Move selection end ${selectionNudgeHint} earlier`}
                onClick={() => onSelectionSpanNudge('end', -selectionNudgeStepSec)}
              >
                <ArrowBackOutlinedIcon />
              </IconButton>
            </AppTooltip>
            <AppTooltip title={`Move selection end ${selectionNudgeHint} later (include more after the span).`}>
              <IconButton
                size="small"
                className="stanza-playback-chip-btn"
                aria-label={`Move selection end ${selectionNudgeHint} later`}
                onClick={() => onSelectionSpanNudge('end', selectionNudgeStepSec)}
              >
                <ArrowForwardOutlinedIcon />
              </IconButton>
            </AppTooltip>
          </>
        ) : null}
        {onSelectionSpanNudge && onSelectionMusicalPad ? <span className="stanza-playback-chip-divider" aria-hidden /> : null}
        {onSelectionMusicalPad ? (
          <>
                <AppTooltip title="Pad both ends of the selection by one short beat. Uses section BPM when set, else ~⅔ of a beat at 120.">
              <IconButton
                size="small"
                className="stanza-playback-chip-btn"
                aria-label="Pad selection by one short beat on each end"
                onClick={onSelectionMusicalPad}
              >
                <UnfoldMoreDoubleOutlinedIcon className="stanza-selection-span-pad-icon" />
              </IconButton>
            </AppTooltip>
          </>
        ) : null}
        {onResetSelectionSpan ? (
          <>
            <span className="stanza-playback-chip-divider" aria-hidden />
            <span className="stanza-playback-chip-reset-slot">
              <AppTooltip
                title="Clear selection padding (back to marker-defined section edges)."
                disabled={!selectionExtendActive}
              >
                <span>
                  <IconButton
                    size="small"
                    className="stanza-playback-chip-btn"
                    aria-label="Reset selection span"
                    tabIndex={selectionExtendActive ? 0 : -1}
                    disabled={!selectionExtendActive}
                    onClick={onResetSelectionSpan}
                    sx={{ visibility: selectionExtendActive ? 'visible' : 'hidden' }}
                  >
                    <RestartAltOutlinedIcon />
                  </IconButton>
                </span>
              </AppTooltip>
            </span>
          </>
        ) : null}
        {onClearSegmentSelection ? (
          <>
            <span className="stanza-playback-chip-divider" aria-hidden />
            <AppTooltip title="Deselect sections">
              <IconButton
                size="small"
                className="stanza-playback-chip-btn"
                aria-label="Deselect sections"
                onClick={onClearSegmentSelection}
              >
                <DeselectOutlinedIcon />
              </IconButton>
            </AppTooltip>
          </>
        ) : null}
      </Box>
    </Box>
  ) : null;

  return (
    <Box className="stanza-playback-stack">
      <Box className="stanza-playback-strip">
        <Box className="stanza-playback-toolbar">
          <Box className="stanza-playback-transport">
            <Box className="stanza-playback-chip stanza-playback-chip--transport" role="group" aria-label="Transport">
              <AppTooltip
                title={
                  loopMode === 'through'
                    ? 'Jump to start of video'
                    : loopMode === 'loopAll'
                      ? 'Jump to start of track'
                      : 'Jump to start of selected time span'
                }
              >
                <span>
                  <IconButton
                    size="small"
                    className="stanza-playback-chip-btn"
                    aria-label="Skip to loop start"
                    disabled={!loopSkipEnabled}
                    onClick={onSkipToLoopStart}
                  >
                    <SkipPreviousIcon fontSize="small" />
                  </IconButton>
                </span>
              </AppTooltip>
              <AppTooltip title={isPlaying ? 'Pause' : 'Play'}>
                <IconButton
                  className="stanza-play-btn stanza-playback-chip-btn stanza-playback-chip-btn--play"
                  size="small"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  onClick={() => (isPlaying ? onPause() : onPlay())}
                >
                  {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                </IconButton>
              </AppTooltip>
              <AppTooltip
                title={
                  loopMode === 'through' || loopMode === 'loopAll'
                    ? 'Jump to end of video (just before the end)'
                    : 'Jump to end of selected time span (just before wrap)'
                }
              >
                <span>
                  <IconButton
                    size="small"
                    className="stanza-playback-chip-btn"
                    aria-label="Skip to loop end"
                    disabled={!loopSkipEnabled}
                    onClick={onSkipToLoopEnd}
                  >
                    <SkipNextIcon fontSize="small" />
                  </IconButton>
                </span>
              </AppTooltip>
            </Box>
            <Box className="stanza-playback-chip stanza-playback-chip--meta" aria-label="Playback position and speed">
              <Typography component="span" className="stanza-playback-time">
                {formatClock(playheadDisplaySec)} / {formatClock(duration)}
              </Typography>
              <span className="stanza-playback-chip-divider" aria-hidden />
              <PlaybackSpeedControl
                value={playbackRate}
                onChange={onPlaybackRateChange}
                variant="compact"
                className="shared-bpm-input stanza-playback-speed-control"
                dropdownClassName="stanza-bpm-dropdown"
                sliderClassName="stanza-bpm-slider"
              />
            </Box>
          </Box>

          <Box className="stanza-playback-toolbar-tools">
            <Box className="stanza-playback-control-group" role="group" aria-label="Playback loop mode">
              <Typography component="span" className="stanza-playback-control-label">
                Loop
              </Typography>
              <Box className="stanza-playback-chip">
                <AppTooltip title="Play through. No looping.">
                  <IconButton
                    size="small"
                    className={`stanza-playback-chip-btn${loopMode === 'through' ? ' stanza-playback-chip-btn--active' : ''}`}
                    aria-label="Play through (loop off)"
                    aria-pressed={loopMode === 'through'}
                    onClick={() => onLoopModeChange('through')}
                  >
                    <ArrowForwardOutlinedIcon fontSize="small" />
                  </IconButton>
                </AppTooltip>
                <AppTooltip title={loopWholeTooltip}>
                  <IconButton
                    size="small"
                    className={`stanza-playback-chip-btn${loopMode === 'loopAll' ? ' stanza-playback-chip-btn--active' : ''}`}
                    aria-label="Loop whole song"
                    aria-pressed={loopMode === 'loopAll'}
                    onClick={() => onLoopModeChange('loopAll')}
                  >
                    <RepeatIcon fontSize="small" />
                  </IconButton>
                </AppTooltip>
                <AppTooltip title="Loop the selection span (hot pink frame). Shift+click sections to build the range.">
                  <IconButton
                    size="small"
                    className={`stanza-playback-chip-btn${loopMode === 'loopSelection' ? ' stanza-playback-chip-btn--active' : ''}`}
                    aria-label="Loop selection span"
                    aria-pressed={loopMode === 'loopSelection'}
                    onClick={() => onLoopModeChange('loopSelection')}
                  >
                    <RepeatOneIcon fontSize="small" />
                  </IconButton>
                </AppTooltip>
              </Box>
            </Box>
            <AppTooltip title={BAR_HELP}>
              <IconButton size="small" className="stanza-playback-chip-btn stanza-playback-chip-btn--solo" aria-label="Timeline tips">
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </AppTooltip>
          </Box>
        </Box>

        <Box
          ref={trackRef}
          className={`stanza-playback-track${
            showLoopPlaybackRing && loopPlaybackWidthPct > 0 ? ' stanza-playback-track--loop' : ''
          }`}
          style={
            showLoopPlaybackRing && loopPlaybackWidthPct > 0
              ? ({
                  '--stanza-loop-start': `${loopPlaybackLeftPct}%`,
                  '--stanza-loop-width': `${loopPlaybackWidthPct}%`,
                } as React.CSSProperties)
              : undefined
          }
          role="slider"
          tabIndex={0}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration * 10) / 10}
          aria-valuenow={Math.round(currentTime * 10) / 10}
          aria-label="Seek and sections"
          onPointerDown={onTrackPointerDown}
          onPointerMove={onTrackPointerMove}
          onPointerUp={onTrackPointerUp}
          onPointerCancel={onTrackPointerUp}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            const step = duration * 0.02;
            onSeek(e.key === 'ArrowLeft' ? currentTime - step : currentTime + step);
          }}
        >
          {showSelectionSpanWash && selectionSpanWidthPct > 0 ? (
            <Box
              className="stanza-selection-span-wash"
              sx={{
                position: 'absolute',
                left: `${selectionSpanLeftPct}%`,
                width: `${selectionSpanWidthPct}%`,
                top: 0,
                bottom: 0,
                borderRadius: 'inherit',
                background: SELECTION_SPAN_WASH,
                pointerEvents: 'none',
                zIndex: 1,
                boxSizing: 'border-box',
              }}
              aria-hidden
            />
          ) : null}

          <Box
            className="stanza-playback-segments"
            sx={{
              height: '100%',
              width: '100%',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box
              className="stanza-playback-segments-clip"
              sx={{ display: 'flex', height: '100%', width: '100%' }}
            >
            {segments.map((seg) => {
              const widthPct = ((seg.end - seg.start) / duration) * 100;
              const ms = segmentMs[seg.id]?.totalMs ?? 0;
              const isSelected = selectedSegmentIndices.includes(seg.index);
              const practiced = ms > 0;
              const isSkipped = Boolean(skippedBySegmentId?.[seg.id]);
              const classes = [
                'stanza-playback-seg',
                isSelected ? 'stanza-playback-seg--selected' : '',
                isSkipped ? 'stanza-playback-seg--skipped' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={seg.id}
                  type="button"
                  className={classes}
                  ref={(el) => {
                    if (el) sectionButtonRefs.current.set(seg.id, el);
                    else sectionButtonRefs.current.delete(seg.id);
                  }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    if (suppressSegmentClickRef.current) {
                      suppressSegmentClickRef.current = false;
                      return;
                    }
                    onSelectSegments(seg.index, ev);
                  }}
                  onPointerEnter={(e) => handleSectionPointerEnter(seg.id, e)}
                  onPointerLeave={scheduleHoverClose}
                  aria-label={`Section ${seg.label}, ${formatClock(seg.start)} to ${formatClock(seg.end)}${practiced ? ', has practice time logged' : ''}${isSkipped ? ', skipped during playback' : ''}`}
                  aria-pressed={isSelected}
                  style={{ width: `${widthPct}%` }}
                >
                  {seg.label}
                </button>
              );
            })}
            </Box>
          </Box>

          <Box
            className="stanza-playback-playhead"
            onPointerDown={onPlayheadPointerDown}
            sx={{
              position: 'absolute',
              left: `${playheadPct}%`,
              top: -8,
              bottom: -4,
              width: 28,
              marginLeft: '-14px',
              /** Above loop ring (z 5) so the scrub handle stays grabbable; markers stay z 4 for thin-hit priority at splits. */
              zIndex: trackScrubActive ? 8 : 7,
              cursor: 'ew-resize',
              pointerEvents: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              touchAction: 'none',
            }}
            aria-hidden
          >
            <Box
              className="stanza-playback-playhead-knob"
              sx={{
                width: 11,
                height: 11,
                borderRadius: '50%',
                bgcolor: '#1d1d1f',
                border: '2px solid rgba(255, 253, 250, 0.95)',
                boxShadow: '0 1px 3px rgba(29, 29, 31, 0.22)',
                flexShrink: 0,
              }}
            />
            <Box
              className="stanza-playback-playhead-stem"
              sx={{
                width: 2,
                flex: 1,
                minHeight: 10,
                mt: -0.25,
                bgcolor: '#1d1d1f',
                borderRadius: 1,
              }}
            />
          </Box>

          {sortedMarkers.map((m) => {
            const leftPct = (m.time / duration) * 100;
            return (
              <Box
                key={m.id}
                className="stanza-marker-handle"
                sx={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  top: -2,
                  width: 2,
                  height: 'calc(100% + 4px)',
                  marginLeft: '-1px',
                  zIndex: trackScrubActive ? 2 : 4,
                  cursor: 'ew-resize',
                  borderRadius: 0.5,
                  bgcolor: 'rgba(60, 60, 67, 0.55)',
                  boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.75)',
                  '&:hover': { bgcolor: 'rgba(29, 29, 31, 0.85)' },
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (!m.id) return;
                  markerDragBaselineRef.current = ensureMarkerIds(markers);
                  setDragMarkers(markerDragBaselineRef.current);
                  setDragId(m.id);
                }}
                role="separator"
                aria-label={`Section boundary ${m.label} at ${m.time.toFixed(1)} seconds. Drag to move.`}
              />
            );
          })}
        </Box>

        {onAddMarker || selectionEditControls || showCommitSelectionToBoundaries ? (
          <Box className="stanza-playback-track-footer">
            {onAddMarker || showCommitSelectionToBoundaries ? (
              <Box className="stanza-playback-control-group stanza-playback-footer-sections">
                <Typography component="span" className="stanza-playback-control-label">
                  Sections
                </Typography>
                <Box className="stanza-playback-chip">
                  {onAddMarker ? (
                    <AppTooltip title="Shortcut M when you are not typing.">
                      <Button
                        type="button"
                        size="small"
                        variant="text"
                        className="stanza-playback-chip-text-btn"
                        startIcon={<CallSplitOutlinedIcon fontSize="small" />}
                        onClick={onAddMarker}
                      >
                        Split at playhead
                      </Button>
                    </AppTooltip>
                  ) : null}
                  {onJoinSections ? (
                    <>
                      {onAddMarker ? <span className="stanza-playback-chip-divider" aria-hidden /> : null}
                      <AppTooltip
                        title={
                          joinSectionsEnabled
                            ? 'Merge the selected adjacent sections.'
                            : 'Shift+click two sections to select a range, then join.'
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            className="stanza-playback-chip-btn"
                            disabled={!joinSectionsEnabled}
                            onClick={onJoinSections}
                            aria-label="Join sections"
                          >
                            <MergeTypeOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </AppTooltip>
                    </>
                  ) : null}
                  {onCommitSelectionToBoundaries ? (
                    <>
                      {onAddMarker || onJoinSections ? <span className="stanza-playback-chip-divider" aria-hidden /> : null}
                      {(() => {
                        const commitTitle =
                          commitSelectionToBoundariesTitle ??
                          'Resize the selected sections so their outer edges match the selection span. Inner splits stay put.';
                        return (
                          <AppTooltip title={commitTitle}>
                            <span>
                              <Button
                                type="button"
                                size="small"
                                variant="text"
                                className="stanza-playback-chip-text-btn"
                                startIcon={<CropFreeOutlinedIcon fontSize="small" />}
                                // Pass the dynamic title to aria-label so screen-reader users hear the
                                // same "why disabled" explanation sighted users see in the tooltip.
                                aria-label={commitTitle}
                                disabled={commitSelectionToBoundariesDisabled}
                                onClick={onCommitSelectionToBoundaries}
                              >
                                Resize to selection
                              </Button>
                            </span>
                          </AppTooltip>
                        );
                      })()}
                    </>
                  ) : null}
                </Box>
              </Box>
            ) : (
              <span aria-hidden />
            )}
            {selectionEditControls}
          </Box>
        ) : null}
      </Box>

      {hoverSegment != null && hoverCard != null ? (
        <StanzaSectionHoverCard
          segment={hoverSegment}
          stats={segmentMs[hoverSegment.id]}
          position={{ x: hoverCard.anchorCenterX, segmentTop: hoverCard.segmentTop }}
          draftLabel={draftSectionLabel}
          onDraftLabelChange={setDraftSectionLabel}
          onRenameCommit={commitSectionRename}
          onPointerEnter={clearHoverClose}
          onPointerLeave={scheduleHoverClose}
          cardRootRef={sectionHoverCardRootRef}
          sectionBoundaryMarkerDeletable={hoverDeletableMarker != null}
          onDeleteSectionBoundaryMarker={
            hoverDeletableMarker
              ? () => {
                  onDeleteMarker(hoverDeletableMarker.id!);
                  setHoverCard(null);
                }
              : undefined
          }
          sectionBpm={hoverSectionMetronomeBpm}
          boundariesMisalignedWithBeat={hoverSectionBoundaryMisaligned}
          onSnapBoundariesToBeat={
            onSnapSectionBoundariesToBeat && hoverSegment
              ? () => {
                  onSnapSectionBoundariesToBeat(hoverSegment.index);
                  setHoverCard(null);
                }
              : undefined
          }
          isSkipped={Boolean(skippedBySegmentId?.[hoverSegment.id])}
          onSkippedChange={
            onSegmentSkippedChange
              ? (next) => onSegmentSkippedChange(hoverSegment.id, next)
              : undefined
          }
        />
      ) : null}
    </Box>
  );
}
