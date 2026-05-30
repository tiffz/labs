import {
  loadSamples,
  noteToMidi,
  type LoadedSample,
  type LoadingProgressCallback,
  type SampleEntry,
  type VelocityLayer,
} from './sampleLoader';
import {
  IDLE_SAMPLED_PIANO_LOAD_STATE,
  type SampledPianoLoadState,
} from '../../music/sampledPianoLoadState';

const SAMPLE_BASE_URL = 'https://tonejs.github.io/audio/salamander/';

const SAMPLE_NOTES = [
  'A0', 'C1', 'Ds1', 'Fs1', 'A1', 'C2', 'Ds2', 'Fs2',
  'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4',
  'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6',
  'A6', 'C7', 'Ds7', 'Fs7', 'A7', 'C8',
];

const VELOCITY_LAYERS: VelocityLayer[] = [
  { name: 'default', velocityMin: 0, velocityMax: 1.0, suffix: '' },
];

export function getSalamanderSampleEntries(): SampleEntry[] {
  const entries: SampleEntry[] = [];
  for (const note of SAMPLE_NOTES) {
    for (const layer of VELOCITY_LAYERS) {
      entries.push({
        note,
        midiNote: noteToMidi(note),
        url: `${SAMPLE_BASE_URL}${note}.mp3`,
        velocityLayer: layer.name,
      });
    }
  }
  return entries;
}

let sharedSamples: LoadedSample[] = [];
let loadPromise: Promise<LoadedSample[]> | null = null;
let loadState: SampledPianoLoadState = { ...IDLE_SAMPLED_PIANO_LOAD_STATE };
const listeners = new Set<(state: SampledPianoLoadState) => void>();

function emit(state: SampledPianoLoadState): void {
  loadState = state;
  for (const listener of listeners) {
    listener(state);
  }
}

export function getSalamanderPianoLoadState(): SampledPianoLoadState {
  return loadState;
}

export function isSalamanderPianoReady(): boolean {
  return sharedSamples.length > 0;
}

export function subscribeSalamanderPianoLoadState(
  listener: (state: SampledPianoLoadState) => void,
): () => void {
  listeners.add(listener);
  listener(loadState);
  return () => listeners.delete(listener);
}

/**
 * Loads Salamander piano samples once per page session. Subsequent callers
 * (any Labs app) reuse decoded buffers from {@link loadSamples}'s URL cache.
 */
export async function ensureSalamanderPianoSamples(
  audioContext: AudioContext,
  onProgress?: LoadingProgressCallback,
): Promise<LoadedSample[]> {
  if (sharedSamples.length > 0) {
    emit({ loading: false, loaded: 1, total: 1, ready: true });
    return sharedSamples;
  }

  if (!loadPromise) {
    emit({ loading: true, loaded: 0, total: 0, ready: false });
    loadPromise = loadSamples(audioContext, getSalamanderSampleEntries(), (loaded, total) => {
      emit({
        loading: loaded < total,
        loaded,
        total,
        ready: false,
      });
      onProgress?.(loaded, total);
    })
      .then((samples) => {
        sharedSamples = samples;
        const ready = samples.length > 0;
        emit({
          loading: false,
          loaded: ready ? samples.length : 0,
          total: ready ? samples.length : 0,
          ready,
        });
        return samples;
      })
      .catch((error) => {
        console.error('Failed to load Salamander piano samples:', error);
        emit({ loading: false, loaded: 0, total: 0, ready: false });
        loadPromise = null;
        return [];
      });
  }

  return loadPromise;
}

/** Test-only reset — not for production callers. */
export function resetSalamanderPianoSamplePoolForTests(): void {
  sharedSamples = [];
  loadPromise = null;
  loadState = { ...IDLE_SAMPLED_PIANO_LOAD_STATE };
  listeners.clear();
}
