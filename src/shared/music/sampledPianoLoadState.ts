/** Shared load progress for {@link SampledPiano} across playback UIs. */
export type SampledPianoLoadState = {
  loading: boolean;
  loaded: number;
  total: number;
  ready: boolean;
};

export const IDLE_SAMPLED_PIANO_LOAD_STATE: SampledPianoLoadState = {
  loading: false,
  loaded: 0,
  total: 0,
  ready: false,
};

export function sampledPianoLoadPercent(state: SampledPianoLoadState): number {
  if (state.ready) return 100;
  if (state.total > 0) {
    return Math.round((state.loaded / Math.max(1, state.total)) * 100);
  }
  return state.loading ? 0 : 0;
}

export function sampledPianoLoadCaption(state: SampledPianoLoadState): string {
  if (state.ready) return 'Ready';
  if (state.loading) return 'Loading samples…';
  return 'Not loaded';
}
