import type { PersistedAnalysisBundle } from '../../shared/beat/analysisVersion';
import { isAnalysisVersionStale } from '../../shared/beat/analysisVersion';

/** True when cached whole-song analysis should be refreshed on explicit user action. */
export function isStanzaAnalysisCacheStale(
  cache: PersistedAnalysisBundle | undefined,
): boolean {
  if (!cache) return false;
  return cache.metadata.stale || isAnalysisVersionStale(cache.metadata.analysisVersion);
}
