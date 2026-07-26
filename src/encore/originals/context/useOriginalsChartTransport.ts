import { useContext } from 'react';
import {
  OriginalsChartTransportContext,
  type OriginalsChartTransport,
} from './originalsChartTransportContextStore';

/**
 * Transport-only chart playback state. Prefer this over
 * {@link useOptionalOriginalsChartPlayback} in the chart subtree so components do
 * not re-render on every `playbackBeatTime` tick (~20x/second).
 */
export function useOptionalOriginalsChartTransport(): OriginalsChartTransport | null {
  return useContext(OriginalsChartTransportContext);
}
