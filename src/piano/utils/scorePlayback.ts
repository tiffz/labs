// Re-export from shared module — piano-internal imports remain unchanged.
export type { BeatMap } from '../../shared/playback/scorePlayback';
export { resolvePlaybackOrder, ScorePlaybackEngine, getScorePlaybackEngine } from '../../shared/playback/scorePlayback';
