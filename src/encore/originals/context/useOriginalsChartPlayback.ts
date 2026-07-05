import { useContext } from 'react';
import type { UseChartChordPlaybackResult } from '../../../shared/hooks/useChartChordPlayback';
import { OriginalsChartPlaybackContext } from './originalsChartPlaybackContextStore';

export function useOriginalsChartPlayback(): UseChartChordPlaybackResult {
  const playback = useContext(OriginalsChartPlaybackContext);
  if (!playback) {
    throw new Error('useOriginalsChartPlayback must be used within OriginalsChartPlaybackProvider');
  }
  return playback;
}

export function useOptionalOriginalsChartPlayback(): UseChartChordPlaybackResult | null {
  return useContext(OriginalsChartPlaybackContext);
}
