import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { SegmentStat } from '../db/stanzaDb';
import type { StanzaMarker } from '../db/stanzaDb';
import { deriveSegments, ensureMarkerIds, STANZA_TIME_EPS } from '../utils/segments';
import AppTooltip from '../../shared/components/AppTooltip';

const HEAT_MAX_MS = 300_000;
const ACCENT = '#e848a0';

export type StanzaLoopScope = 'all' | 'section';

function heatBackground(totalMs: number): string {
  const t = Math.min(1, totalMs / HEAT_MAX_MS);
  const r = Math.round(252 + (232 - 252) * t);
  const g = Math.round(248 + (72 - 248) * t);
  const b = Math.round(242 + (160 - 242) * t);
  return `rgb(${r},${g},${b})`;
}

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
  activeLoopIndex: number | null;
  segmentMs: Record<string, SegmentStat | undefined>;
  loopScope: StanzaLoopScope;
  onLoopScopeChange: (scope: StanzaLoopScope) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onSelectSegment: (index: number) => void;
  onMarkersChange: (markers: StanzaMarker[]) => void;
}

export default function StanzaTimeline({
  duration,
  currentTime,
  markers,
  activeLoopIndex,
  segmentMs,
  loopScope,
  onLoopScopeChange,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onSelectSegment,
  onMarkersChange,
}: StanzaTimelineProps) {
  const [dragMarkers, setDragMarkers] = useState<StanzaMarker[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const workingMarkers = dragMarkers ?? markers;
  const segments = useMemo(
    () => deriveSegments(ensureMarkerIds(workingMarkers), duration),
    [workingMarkers, duration],
  );

  const trackRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!dragId) return;
    const onMove = (e: MouseEvent) => {
      setDragMarkers((prev) => {
        const base = ensureMarkerIds(prev ?? markersRef.current);
        const t = clampMarkerTime(dragId, getTimeFromClientX(e.clientX), base, duration);
        return base.map((m) => (m.id === dragId ? { ...m, time: t } : m));
      });
    };
    const onUp = () => {
      setDragMarkers((dm) => {
        if (dm) onMarkersChange(dm);
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
  }, [dragId, duration, onMarkersChange, getTimeFromClientX]);

  if (!(duration > 0) || segments.length === 0) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Load media to see the timeline. Use Add marker or press M to split into sections.
        </Typography>
      </Box>
    );
  }

  const activeSeg = activeLoopIndex != null ? segments[activeLoopIndex] : null;
  const showLoopOverlay = loopScope === 'section' && activeSeg;
  const loopLeftPct = activeSeg ? (activeSeg.start / duration) * 100 : 0;
  const loopWidthPct = activeSeg ? ((activeSeg.end - activeSeg.start) / duration) * 100 : 0;
  const playheadPct = (currentTime / duration) * 100;

  return (
    <Box className="stanza-playback-stack" sx={{ mt: 1.25 }}>
      <Box className="stanza-playback-strip">
        <Box className="stanza-playback-toolbar">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
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
            <Typography component="span" className="stanza-playback-time" sx={{ minWidth: '7.5rem' }}>
              {formatClock(currentTime)} / {formatClock(duration)}
            </Typography>
          </Box>
          <ToggleButtonGroup
            className="stanza-segmented"
            exclusive
            size="small"
            value={loopScope}
            onChange={(_, v: StanzaLoopScope | null) => v != null && onLoopScopeChange(v)}
            aria-label="Playback range"
          >
            <ToggleButton value="all" aria-label="Play through whole song">
              Whole song
            </ToggleButton>
            <ToggleButton value="section" aria-label="Loop selected section only">
              Loop section
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box className="stanza-playback-track-meta">
          <AppTooltip title="Seek on the bar. Sections show practice heat. In Loop section mode, the dashed band follows the active loop; drag handles to move markers.">
            <Typography component="span" className="stanza-hint-text stanza-hint-text--compact">
              How this bar works
            </Typography>
          </AppTooltip>
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
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            if ((e.target as HTMLElement).closest('.stanza-marker-handle')) return;
            onSeek(getTimeFromClientX(e.clientX));
          }}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            const step = duration * 0.02;
            onSeek(e.key === 'ArrowLeft' ? currentTime - step : currentTime + step);
          }}
        >
          <Box className="stanza-playback-segments" sx={{ display: 'flex', height: '100%', width: '100%' }}>
            {segments.map((seg) => {
              const widthPct = ((seg.end - seg.start) / duration) * 100;
              const ms = segmentMs[seg.id]?.totalMs ?? 0;
              const isLoop = loopScope === 'section' && activeLoopIndex === seg.index;
              return (
                <button
                  key={seg.id}
                  type="button"
                  className="stanza-playback-seg"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onSelectSegment(seg.index);
                  }}
                  aria-label={`Section ${seg.label}, ${formatClock(seg.start)} to ${formatClock(seg.end)}`}
                  style={{
                    width: `${widthPct}%`,
                    background: heatBackground(ms),
                    border: isLoop ? `2px solid ${ACCENT}` : '1px solid rgba(60, 60, 67, 0.12)',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: isLoop ? 700 : 500,
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

          {showLoopOverlay && activeSeg && (
            <Box
              className="stanza-playback-loop-band"
              sx={{
                position: 'absolute',
                left: `${loopLeftPct}%`,
                width: `${loopWidthPct}%`,
                top: 0,
                bottom: 0,
                border: `2px dashed ${ACCENT}`,
                borderRadius: 1,
                pointerEvents: 'none',
                boxSizing: 'border-box',
                opacity: 0.88,
              }}
              aria-hidden
            />
          )}

          <Box
            className="stanza-playback-playhead"
            sx={{
              position: 'absolute',
              left: `${playheadPct}%`,
              top: -4,
              bottom: -4,
              width: 2,
              marginLeft: '-1px',
              bgcolor: '#1d1d1f',
              borderRadius: 1,
              pointerEvents: 'none',
              zIndex: 2,
            }}
            aria-hidden
          />

          {sortedMarkers.map((m) => {
            const leftPct = (m.time / duration) * 100;
            return (
              <Box
                key={m.id}
                className="stanza-marker-handle"
                title={`${m.label} · ${m.time.toFixed(2)}s — drag to move`}
                sx={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  top: -6,
                  width: 10,
                  height: 'calc(100% + 12px)',
                  marginLeft: '-5px',
                  zIndex: 3,
                  cursor: 'ew-resize',
                  borderRadius: 0.5,
                  bgcolor: 'rgba(60, 60, 67, 0.5)',
                  border: '1px solid rgba(255,255,255,0.88)',
                  '&:hover': { bgcolor: 'rgba(29, 29, 31, 0.78)' },
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (!m.id) return;
                  setDragMarkers(ensureMarkerIds(markers));
                  setDragId(m.id);
                }}
                role="separator"
                aria-label={`Marker ${m.label} at ${m.time.toFixed(1)} seconds`}
              />
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
