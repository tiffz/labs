/**
 * Cookie / analytics consent rules for Labs (GA4 via /scripts/analytics.js).
 *
 * **Banner copy lives only here** (`labsCookieBannerCopy`). Do not edit
 * `public/scripts/labs-cookie-consent.js` — it is generated (esbuild) and gitignored.
 * The Vite dev server and `vite build` rebuild it automatically when this file or
 * `labsCookieConsentBrowser.ts` changes (reload the page after edits). For a one-off
 * build without Vite: `npm run build:labs-cookie-consent`.
 */

export const LABS_ANALYTICS_CONSENT_STORAGE_KEY = 'labs_analytics_consent';

export const LABS_ANALYTICS_CONSENT_ACCEPTED = 'accepted';

export const LABS_ANALYTICS_CONSENT_DECLINED = 'declined';

/** GA loader script (only injected after consent). */
export const LABS_ANALYTICS_SCRIPT_PATH = '/scripts/analytics.js';

export const labsCookieBannerCopy = {
  introduction:
    "This site uses cookies to track usage data through Google Analytics. Usage of these cookies is optional.",
  privacyLinkText: 'Privacy policy',
  privacyLinkHref: '/legal/privacy.html',
  privacyLinkAriaLabel: 'Privacy Policy (opens in a new tab)',
  acceptButtonLabel: 'Accept',
  rejectButtonLabel: 'Reject',
} as const;

export function isLabsLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** True when the URL search string includes the preview flag (leading ? optional). */
export function labsCookieBannerPreviewRequested(search: string): boolean {
  try {
    return /(?:^|[?&])labs_preview_cookie_banner=1(?:&|$)/.test(search);
  } catch {
    return false;
  }
}

/**
 * First gate in the browser script: on localhost/127 without preview, exit before
 * reading storage (no banner, no GA — dev default).
 */
export function shouldExitCookieScriptBeforeStorage(opts: {
  hostname: string;
  search: string;
}): boolean {
  return isLabsLocalHost(opts.hostname) && !labsCookieBannerPreviewRequested(opts.search);
}

export function shouldLoadAnalyticsForStoredChoice(choice: string | null): boolean {
  return choice === LABS_ANALYTICS_CONSENT_ACCEPTED;
}

export function shouldStopWithoutAnalyticsForStoredChoice(choice: string | null): boolean {
  return choice === LABS_ANALYTICS_CONSENT_DECLINED;
}

export function shouldDeferBannerUntilDomContentLoaded(choice: string | null): boolean {
  return (
    !shouldLoadAnalyticsForStoredChoice(choice) && !shouldStopWithoutAnalyticsForStoredChoice(choice)
  );
}
