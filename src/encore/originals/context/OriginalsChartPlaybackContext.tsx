import { type ReactElement, type ReactNode } from 'react';
import {
  useChartChordPlayback,
  type UseChartChordPlaybackOptions,
} from '../../../shared/hooks/useChartChordPlayback';
import { OriginalsChartPlaybackContext } from './originalsChartPlaybackContextStore';

export type OriginalsChartPlaybackProviderProps = UseChartChordPlaybackOptions & {
  children: ReactNode;
};

/** Shares one chart playback session between the toolbar and per-section controls. */
export function OriginalsChartPlaybackProvider({
  children,
  ...options
}: OriginalsChartPlaybackProviderProps): ReactElement {
  const playback = useChartChordPlayback(options);
  return (
    <OriginalsChartPlaybackContext.Provider value={playback}>
      {children}
    </OriginalsChartPlaybackContext.Provider>
  );
}
