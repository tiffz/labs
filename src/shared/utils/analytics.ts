export type AppId =
  | 'beat'
  | 'cats'
  | 'chords'
  | 'corp'
  | 'drums'
  | 'forms'
  | 'piano'
  | 'pitch'
  | 'count'
  | 'scales'
  | 'story'
  | 'words'
  | 'zines';

type ContentGroup = 'Music' | 'Art & Writing' | 'Games';

const APP_CONTENT_GROUP: Record<AppId, ContentGroup> = {
  beat: 'Music',
  cats: 'Games',
  chords: 'Music',
  corp: 'Games',
  drums: 'Music',
  forms: 'Art & Writing',
  piano: 'Music',
  pitch: 'Music',
  count: 'Music',
  scales: 'Music',
  story: 'Art & Writing',
  words: 'Music',
  zines: 'Art & Writing',
};

export interface AppAnalytics {
  trackEvent(name: string, params?: Record<string, unknown>): void;
  trackSessionEnd(startTime: number): void;
}

/**
 * Create a namespaced analytics helper for a micro-app. All events are
 * automatically tagged with `micro_app` and `content_group` so GA4
 * reports can be filtered by app and category.
 *
 * Returns a no-op implementation when `window.labsAnalytics` is absent
 * (e.g. dev mode or ad-blockers) so callers never need null checks.
 */
export function createAppAnalytics(appId: AppId): AppAnalytics {
  const baseParams = {
    micro_app: appId,
    content_group: APP_CONTENT_GROUP[appId],
    site_section: 'labs',
  };

  function trackEvent(name: string, params?: Record<string, unknown>) {
    const la = window.labsAnalytics;
    if (!la) return;
    la.trackEvent(`${appId}_${name}`, { ...baseParams, ...params });
  }

  function trackSessionEnd(startTime: number) {
    const durationSec = Math.round((Date.now() - startTime) / 1000);
    if (durationSec < 1) return;
    trackEvent('session_end', { session_duration_sec: durationSec });
  }

  return { trackEvent, trackSessionEnd };
}
