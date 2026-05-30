import { useEffect, useRef, type RefObject } from 'react';
import { ChordInstrumentSession } from '../music/chordInstrumentSession';
import type { SampledPianoLoadState } from '../music/sampledPianoLoadState';
import {
  getSalamanderPianoLoadState,
  subscribeSalamanderPianoLoadState,
} from '../playback/instruments/salamanderPianoSamplePool';
import type { SoundType } from '../music/soundOptions';

/**
 * Preloads sampled piano when `soundType` is `piano-sampled`. Reuses one
 * {@link ChordInstrumentSession} instance for the caller's playback hook and
 * mirrors global Salamander load state across Labs apps on the same page.
 */
export function useSampledPianoPreload(
  soundType: SoundType,
  onLoadState: (state: SampledPianoLoadState) => void,
): RefObject<ChordInstrumentSession | null> {
  const sessionRef = useRef<ChordInstrumentSession | null>(null);
  const onLoadStateRef = useRef(onLoadState);
  onLoadStateRef.current = onLoadState;

  useEffect(() => {
    onLoadStateRef.current(getSalamanderPianoLoadState());
    return subscribeSalamanderPianoLoadState((state) => onLoadStateRef.current(state));
  }, []);

  useEffect(() => {
    if (soundType !== 'piano-sampled') return;
    if (sessionRef.current?.isDisposed()) {
      sessionRef.current = null;
    }
    const session = sessionRef.current ?? new ChordInstrumentSession();
    sessionRef.current = session;
    session.setSampleLoadListener((state) => onLoadStateRef.current(state));
    void session.ensureInstrument('piano-sampled');
  }, [soundType]);

  return sessionRef;
}
