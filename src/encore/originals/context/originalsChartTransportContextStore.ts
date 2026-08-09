import { createContext } from 'react';
import type { UseChartChordPlaybackResult } from '../../../shared/hooks/useChartChordPlayback';

/**
 * Transport-only view of the chart playback session: everything EXCEPT the
 * per-frame `playbackBeatTime` / `playbackBeat`, which tick ~20x/second.
 *
 * The chart subtree (every section heading, line, and chord badge) only needs
 * transport state (`playing`, `playingSectionId`, start/stop). Subscribing it to
 * the full result made the whole chart re-render on every beat tick — a 20Hz
 * reconciliation of a large MUI tree that drove the long-loop heap growth. This
 * value stays referentially stable across beat ticks, so chart consumers only
 * re-render when transport state actually changes.
 */
export type OriginalsChartTransport = Omit<
  UseChartChordPlaybackResult,
  'playbackBeatTime' | 'playbackBeat'
>;

export const OriginalsChartTransportContext = createContext<OriginalsChartTransport | null>(null);
