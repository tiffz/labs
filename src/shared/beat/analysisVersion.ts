import type { BeatAnalysisResult } from './findTheBeatAnalyzer';

export const BEAT_ANALYSIS_SCHEMA_VERSION = 'beat-analysis-v1';
export const BEAT_ANALYSIS_ENGINE_VERSION = 'engine-2026-03-22';

export const BEAT_ANALYSIS_VERSION = `${BEAT_ANALYSIS_SCHEMA_VERSION}:${BEAT_ANALYSIS_ENGINE_VERSION}`;

export interface AnalysisMetadata {
  analysisVersion: string;
  analyzedAt: number;
  stale: boolean;
  staleReason?: string;
}

export interface PersistedAnalysisBundle {
  beat: BeatAnalysisResult;
  metadata: AnalysisMetadata;
}

export function isAnalysisVersionStale(analysisVersion: string | undefined): boolean {
  if (!analysisVersion) return true;
  return analysisVersion !== BEAT_ANALYSIS_VERSION;
}
