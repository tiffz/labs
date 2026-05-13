export type { BeatAnalysisResult, AnalysisProgressCallback } from '../../shared/beat/findTheBeatAnalyzer';
export {
  analyzeBeat,
  adjustBeatsForGaps,
  regenerateBeats,
  getEssentia,
  detectFermatas,
  mergeFermataRegions,
  detectTempoChanges,
  combineTempoRegions,
} from '../../shared/beat/findTheBeatAnalyzer';
