/**
 * Browser entry for Labs cookie / GA4 consent. Bundled to gitignored
 * `public/scripts/labs-cookie-consent.js` (do not edit that file by hand).
 *
 * Edit copy and storage keys in `labsCookieConsentPolicy.ts` only. Vite rebuilds this
 * bundle on dev server start and when those files change; reload the browser after edits.
 * One-off: `npm run build:labs-cookie-consent`
 *
 * Local testing:
 *   1. `npm run dev` (predev rebuilds this script).
 *   2. Open `http://127.0.0.1:5173/?labs_preview_cookie_banner=1` (or any app path with the same query).
 *   3. Clear choice: DevTools → Application → Local Storage → remove `labs_analytics_consent`.
 *
 * Automated: `npx vitest run src/shared/legal/labsCookieConsentPolicy.test.ts` and
 * `npx playwright test e2e/labs-cookie-consent.spec.ts --project=e2e`
 *
 * Styling: /styles/labs-cookie-consent.css + per-app `:root { --labs-cc-accent: … }`.
 */
import {
  LABS_ANALYTICS_CONSENT_ACCEPTED,
  LABS_ANALYTICS_CONSENT_DECLINED,
  LABS_ANALYTICS_CONSENT_STORAGE_KEY,
  LABS_ANALYTICS_SCRIPT_PATH,
  labsCookieBannerCopy,
  isLabsLocalHost,
  labsCookieBannerPreviewRequested,
} from './labsCookieConsentPolicy';

declare global {
  interface Window {
    __labsAnalyticsScriptRequested?: boolean;
  }
}

function loadAnalytics(): void {
  if (window.__labsAnalyticsScriptRequested) return;
  window.__labsAnalyticsScriptRequested = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = LABS_ANALYTICS_SCRIPT_PATH;
  document.head.appendChild(s);
}

function dismissBanner(root: HTMLElement): void {
  root.remove();
}

function showBanner(): void {
  if (document.getElementById('labs-cookie-consent-root')) return;

  const copy = labsCookieBannerCopy;

  const root = document.createElement('aside');
  root.id = 'labs-cookie-consent-root';
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Cookie consent');

  const inner = document.createElement('div');
  inner.className = 'labs-cc-inner';

  const p = document.createElement('p');
  p.appendChild(document.createTextNode(copy.introduction));
  p.appendChild(document.createTextNode(' '));
  const a = document.createElement('a');
  a.href = copy.privacyLinkHref;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', copy.privacyLinkAriaLabel);
  a.textContent = copy.privacyLinkText;
  p.appendChild(a);
  p.appendChild(document.createTextNode('.'));

  const actions = document.createElement('div');
  actions.className = 'labs-cc-actions';

  const reject = document.createElement('button');
  reject.type = 'button';
  reject.className = 'labs-cc-reject';
  reject.textContent = copy.rejectButtonLabel;
  reject.addEventListener('click', () => {
    try {
      localStorage.setItem(LABS_ANALYTICS_CONSENT_STORAGE_KEY, LABS_ANALYTICS_CONSENT_DECLINED);
    } catch {
      /* ignore quota / private mode */
    }
    dismissBanner(root);
  });

  const accept = document.createElement('button');
  accept.type = 'button';
  accept.className = 'labs-cc-accept';
  accept.textContent = copy.acceptButtonLabel;
  accept.addEventListener('click', () => {
    try {
      localStorage.setItem(LABS_ANALYTICS_CONSENT_STORAGE_KEY, LABS_ANALYTICS_CONSENT_ACCEPTED);
    } catch {
      /* ignore */
    }
    dismissBanner(root);
    loadAnalytics();
  });

  actions.appendChild(reject);
  actions.appendChild(accept);
  inner.appendChild(p);
  inner.appendChild(actions);
  root.appendChild(inner);

  const target = document.body ?? document.documentElement;
  target.appendChild(root);
}

const hostname = window.location.hostname;
const search = window.location.search;
const exitEarlyForLocalDev =
  isLabsLocalHost(hostname) && !labsCookieBannerPreviewRequested(search);

if (!exitEarlyForLocalDev) {
  let choice: string | null = null;
  try {
    choice = localStorage.getItem(LABS_ANALYTICS_CONSENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }

  if (choice === LABS_ANALYTICS_CONSENT_ACCEPTED) {
    loadAnalytics();
  } else if (choice === LABS_ANALYTICS_CONSENT_DECLINED) {
    /* no-op */
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showBanner);
  } else {
    showBanner();
  }
}

export {};
