import { useMemo, type ReactElement, type ReactNode } from 'react';
import {
  useChartChordPlayback,
  type UseChartChordPlaybackOptions,
} from '../../../shared/hooks/useChartChordPlayback';
import { OriginalsChartPlaybackContext } from './originalsChartPlaybackContextStore';
import { OriginalsChartTransportContext } from './originalsChartTransportContextStore';

export type OriginalsChartPlaybackProviderProps = UseChartChordPlaybackOptions & {
  children: ReactNode;
};

/** Shares one chart playback session between the toolbar and per-section controls. */
export function OriginalsChartPlaybackProvider({
  children,
  ...options
}: OriginalsChartPlaybackProviderProps): ReactElement {
  const playback = useChartChordPlayback(options);

  const {
    playing,
    canPlay,
    playingSectionId,
    settings,
    updateSettings,
    metronomePreferences,
    setMetronomePreferences,
    start,
    startSectionLoop,
    stop,
    sampledPianoLoad,
  } = playback;

  // Transport view excludes the per-frame beat fields so the chart subtree (which
  // subscribes here) stays off the 20Hz beat-tick re-render path. Referentially
  // stable across beat ticks — deps are only the low-frequency transport fields.
  const transport = useMemo(
    () => ({
      playing,
      canPlay,
      playingSectionId,
      settings,
      updateSettings,
      metronomePreferences,
      setMetronomePreferences,
      start,
      startSectionLoop,
      stop,
      sampledPianoLoad,
    }),
    [
      playing,
      canPlay,
      playingSectionId,
      settings,
      updateSettings,
      metronomePreferences,
      setMetronomePreferences,
      start,
      startSectionLoop,
      stop,
      sampledPianoLoad,
    ],
  );

  return (
    <OriginalsChartPlaybackContext.Provider value={playback}>
      <OriginalsChartTransportContext.Provider value={transport}>
        {children}
      </OriginalsChartTransportContext.Provider>
    </OriginalsChartPlaybackContext.Provider>
  );
}
