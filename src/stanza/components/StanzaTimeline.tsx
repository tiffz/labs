import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { SegmentStat } from '../db/stanzaDb';
import type { StanzaMarker } from '../db/stanzaDb';
import {
  deletableBoundaryMarkerAtTime,
  deriveSegments,
  ensureMarkerIds,
  STANZA_TIME_EPS,
} from '../utils/segments';
import type { StanzaPlaybackLoopMode } from '../utils/stanzaPlaybackLoop';
import { computeLoopHull } from '../utils/stanzaPlaybackLoop';
import AppTooltip from '../../shared/components/AppTooltip';
import StanzaSectionHoverCard from './StanzaSectionHoverCard';

export type { StanzaPlaybackLoopMode };

const PROGRESS_WASH = 'rgba(232, 72, 160, 0.14)';
const LOOP_REGION_WASH = 'rgba(232, 72, 160, 0.09)';

const BAR_HELP =
  'Drag the bar (or the playhead dot) to scrub. A quick tap on a section selects it and jumps to its start; drag on a section to scrub without changing selection. Shift+click to multi-select. Loop modes: play through, repeat whole song, or repeat the selected range — while paused you can scrub anywhere; Play snaps into the loop. Skip previous/next jump to track start and end in play-through mode, or to the active loop range in other modes. Drag thin marker lines to move a boundary. Remove a boundary from the section hover card, Delete with a section selected, or it merges into the previous section (Logic-style).';

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function clampMarkerTime(markerId: string, rawTime: number, list: StanzaMarker[], dur: number): number {
  const sorted = [...list].sort((a, b) => a.time - b.time);
  const idx = sorted.findIndex((m) => m.id === markerId);
  if (idx < 0) return rawTime;
  const prevT = idx <= 0 ? 0 : sorted[idx - 1]!.time;
  const nextT = idx >= sorted.length - 1 ? dur : sorted[idx + 1]!.time;
  return Math.max(prevT + STANZA_TIME_EPS * 2, Math.min(nextT - STANZA_TIME_EPS * 2, rawTime));
}

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
  onSeek: (time: number) => void;
  onMarkersChange: (markers: StanzaMarker[]) => void;
  onDeleteMarker: (markerId: string) => void;
  onRenameSectionFromLabel: (segmentIndex: number, label: string) => void;
  onSkipToLoopStart: () => void;
  onSkipToLoopEnd: () => void;
  onAddMarker?: () => void;
}

export default function StanzaTimeline({
  duration,
  currentTime,
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
}: StanzaTimelineProps) {
  const [dragMarkers, setDragMarkers] = useState<StanzaMarker[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const workingMarkers = dragMarkers ?? markers;
  const segments = useMemo(
    () => deriveSegments(ensureMarkerIds(workingMarkers), duration),
    [workingMarkers, duration],
  );

  const loopHull = useMemo(() => computeLoopHull(segments, selectedSegmentIndices), [segments, selectedSegmentIndices]);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrubbingRef = useRef(false);
  const suppressSegmentClickRef = useRef(false);

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

  const endDragPersist = useCallback(
    (dm: StanzaMarker[] | null, releasedMarkerId: string | null) => {
      if (dm) {
        onMarkersChange(dm);
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
        const t = clampMarkerTime(releasedId, getTimeFromClientX(e.clientX), base, duration);
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

  const onTrackPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onPlayheadPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      beginTrackScrub(e);
    },
    [beginTrackScrub],
  );

  const [hoverCard, setHoverCard] = useState<{ segmentIndex: number; x: number; y: number } | null>(null);
  const [draftSectionLabel, setDraftSectionLabel] = useState('');
  const hoverCloseTimer = useRef<number | null>(null);
  const sectionHoverCardRootRef = useRef<HTMLDivElement | null>(null);
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

  const hoverSegment = hoverCard != null ? segments[hoverCard.segmentIndex] : null;

  const commitSectionRename = useCallback(() => {
    if (hoverCard == null) return;
    const i = hoverCard.segmentIndex;
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
    }, 120);
  }, [clearHoverClose]);

  const handleSectionPointerEnter = useCallback(
    (segmentIndex: number, e: React.PointerEvent) => {
      clearHoverClose();
      commitSectionRenameRef.current();
      setHoverCard({ segmentIndex, x: e.clientX, y: e.clientY });
      const seg = segments[segmentIndex];
      if (seg) setDraftSectionLabel(seg.label);
    },
    [clearHoverClose, segments],
  );

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
            Load media to see the timeline. Use Add marker or press M to split into sections.
          </Typography>
        </Box>
        {onAddMarker ? (
          <Box className="stanza-playback-track-footer">
            <AppTooltip title="Drop a marker at the playhead. Press M when not typing in a field.">
              <Button variant="outlined" size="small" className="stanza-btn-soft-outline" onClick={onAddMarker}>
                Add marker
              </Button>
            </AppTooltip>
          </Box>
        ) : null}
      </Box>
    );
  }

  const playheadPct = (currentTime / duration) * 100;
  const showLoopHullOverlay =
    (loopMode === 'loopSelection' && loopHull != null) || (loopMode === 'loopAll' && duration > 0);
  const loopOverlayLeftPct = loopMode === 'loopAll' ? 0 : loopHull ? (loopHull.start / duration) * 100 : 0;
  const loopOverlayWidthPct = loopMode === 'loopAll' ? 100 : loopHull ? ((loopHull.end - loopHull.start) / duration) * 100 : 0;
  const showLoopRing =
    (loopMode === 'loopAll' && duration > 0) || (loopMode === 'loopSelection' && loopHull != null);

  const loopRingLeftPct =
    loopMode === 'loopAll' ? 0 : loopHull ? (loopHull.start / duration) * 100 : 0;
  const loopRingWidthPct =
    loopMode === 'loopAll' ? 100 : loopHull ? ((loopHull.end - loopHull.start) / duration) * 100 : 0;

  const loopSkipEnabled = duration > 0;

  const hoverDeletableMarker =
    hoverSegment != null && duration > 0
      ? deletableBoundaryMarkerAtTime(hoverSegment.start, workingMarkers, duration)
      : null;

  return (
    <Box className="stanza-playback-stack">
      <Box className="stanza-playback-strip">
        <Box
          className="stanza-playback-toolbar"
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            gap: 1,
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
          }}
        >
          <Box
            className="stanza-playback-transport"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0, flexWrap: 'nowrap' }}
          >
            <AppTooltip
              title={
                loopMode === 'through'
                  ? 'Jump to start of video'
                  : loopMode === 'loopAll'
                    ? 'Jump to start of track'
                    : 'Jump to start of selected loop range'
              }
            >
              <span>
                <IconButton
                  size="small"
                  aria-label="Skip to loop start"
                  disabled={!loopSkipEnabled}
                  onClick={onSkipToLoopStart}
                  sx={{ color: '#1d1d1f' }}
                >
                  <SkipPreviousIcon fontSize="small" />
                </IconButton>
              </span>
            </AppTooltip>
            <AppTooltip title={isPlaying ? 'Pause' : 'Play'}>
              <IconButton
                className="stanza-play-btn"
                size="small"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={() => (isPlaying ? onPause() : onPlay())}
              >
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
            </AppTooltip>
            <AppTooltip
              title={
                loopMode === 'through' || loopMode === 'loopAll'
                  ? 'Jump to end of video (just before the end)'
                  : 'Jump to end of loop range (just before wrap)'
              }
            >
              <span>
                <IconButton
                  size="small"
                  aria-label="Skip to loop end"
                  disabled={!loopSkipEnabled}
                  onClick={onSkipToLoopEnd}
                  sx={{ color: '#1d1d1f' }}
                >
                  <SkipNextIcon fontSize="small" />
                </IconButton>
              </span>
            </AppTooltip>
            <Typography
              component="span"
              className="stanza-playback-time"
              sx={{ minWidth: '7.5rem', ml: 0.75, pl: 0.25 }}
            >
              {formatClock(currentTime)} / {formatClock(duration)}
            </Typography>
          </Box>

          <Box sx={{ flex: '1 1 8px', minWidth: 0 }} aria-hidden />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, ml: { xs: 0, sm: 'auto' } }}>
          <Box className="stanza-loop-options" role="group" aria-label="Playback loop mode">
            <AppTooltip title="Play through — no looping">
              <button
                type="button"
                className={`stanza-loop-option${loopMode === 'through' ? ' stanza-loop-option--active' : ''}`}
                aria-pressed={loopMode === 'through'}
                onClick={() => onLoopModeChange('through')}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  arrow_forward
                </span>
              </button>
            </AppTooltip>
            <AppTooltip title="Loop whole song">
              <button
                type="button"
                className={`stanza-loop-option${loopMode === 'loopAll' ? ' stanza-loop-option--active' : ''}`}
                aria-pressed={loopMode === 'loopAll'}
                onClick={() => onLoopModeChange('loopAll')}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  repeat
                </span>
              </button>
            </AppTooltip>
            <AppTooltip title="Loop selected section(s). Shift+click sections to multi-select.">
              <button
                type="button"
                className={`stanza-loop-option${loopMode === 'loopSelection' ? ' stanza-loop-option--active' : ''}`}
                aria-pressed={loopMode === 'loopSelection'}
                onClick={() => onLoopModeChange('loopSelection')}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  repeat_one
                </span>
              </button>
            </AppTooltip>
          </Box>

            <AppTooltip title={BAR_HELP}>
              <IconButton size="small" aria-label="How the timeline works" sx={{ color: '#6e6e73' }}>
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </AppTooltip>
          </Box>
        </Box>

        <Box
          ref={trackRef}
          className="stanza-playback-track"
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
          <Box
            className="stanza-playback-progress"
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${playheadPct}%`,
              borderRadius: 'inherit',
              background: PROGRESS_WASH,
              pointerEvents: 'none',
              zIndex: 0,
            }}
            aria-hidden
          />

          {showLoopHullOverlay && loopOverlayWidthPct > 0 && (
            <Box
              className="stanza-loop-region-overlay"
              sx={{
                position: 'absolute',
                left: `${loopOverlayLeftPct}%`,
                width: `${loopOverlayWidthPct}%`,
                top: 0,
                bottom: 0,
                borderRadius: '8px',
                background: LOOP_REGION_WASH,
                pointerEvents: 'none',
                zIndex: 0,
                boxSizing: 'border-box',
              }}
              aria-hidden
            />
          )}

          <Box
            className="stanza-playback-segments"
            sx={{
              display: 'flex',
              height: '100%',
              width: '100%',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {segments.map((seg) => {
              const widthPct = ((seg.end - seg.start) / duration) * 100;
              const ms = segmentMs[seg.id]?.totalMs ?? 0;
              const isSelected = selectedSegmentIndices.includes(seg.index);
              const practiced = ms > 0;
              const zebra = seg.index % 2 === 0 ? ' stanza-playback-seg--even' : ' stanza-playback-seg--odd';
              return (
                <button
                  key={seg.id}
                  type="button"
                  className={`stanza-playback-seg${zebra}${isSelected ? ' stanza-playback-seg--selected' : ''}`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    if (suppressSegmentClickRef.current) {
                      suppressSegmentClickRef.current = false;
                      return;
                    }
                    onSelectSegments(seg.index, ev);
                  }}
                  onPointerEnter={(e) => handleSectionPointerEnter(seg.index, e)}
                  onPointerLeave={scheduleHoverClose}
                  aria-label={`Section ${seg.label}, ${formatClock(seg.start)} to ${formatClock(seg.end)}${practiced ? ', has practice time logged' : ''}`}
                  aria-pressed={isSelected}
                  style={{
                    width: `${widthPct}%`,
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: isSelected ? 700 : 500,
                    padding: '4px 4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#1d1d1f',
                  }}
                >
                  {seg.label}
                </button>
              );
            })}
          </Box>

          {showLoopRing && loopRingWidthPct > 0 ? (
            <Box
              className="stanza-playback-loop-band"
              sx={{
                position: 'absolute',
                left: `${loopRingLeftPct}%`,
                width: `${loopRingWidthPct}%`,
                top: -4,
                bottom: -4,
                borderRadius: '12px',
                border: '3px solid rgba(232, 72, 160, 0.78)',
                boxShadow:
                  '0 0 0 1px rgba(255, 255, 255, 0.92), 0 0 0 5px rgba(232, 72, 160, 0.22), 0 6px 18px rgba(232, 72, 160, 0.18)',
                pointerEvents: 'none',
                boxSizing: 'border-box',
                zIndex: 2,
                bgcolor: 'transparent',
              }}
              aria-hidden
            />
          ) : null}

          <Box
            className="stanza-playback-playhead"
            onPointerDown={onPlayheadPointerDown}
            sx={{
              position: 'absolute',
              left: `${playheadPct}%`,
              top: -8,
              bottom: -4,
              width: 14,
              marginLeft: '-7px',
              zIndex: 3,
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
                  zIndex: 4,
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
                  setDragMarkers(ensureMarkerIds(markers));
                  setDragId(m.id);
                }}
                role="separator"
                aria-label={`Section boundary ${m.label} at ${m.time.toFixed(1)} seconds. Drag to move.`}
              />
            );
          })}
        </Box>

        {onAddMarker ? (
          <Box className="stanza-playback-track-footer">
            <AppTooltip title="Drop a marker at the playhead. Press M when not typing in a field. Loop modes are in the toolbar.">
              <Button variant="outlined" size="small" className="stanza-btn-soft-outline" onClick={onAddMarker}>
                Add marker
              </Button>
            </AppTooltip>
          </Box>
        ) : null}
      </Box>

      {hoverSegment != null && hoverCard != null ? (
        <StanzaSectionHoverCard
          segment={hoverSegment}
          stats={segmentMs[hoverSegment.id]}
          position={{ x: hoverCard.x, y: hoverCard.y }}
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
        />
      ) : null}
    </Box>
  );
}
