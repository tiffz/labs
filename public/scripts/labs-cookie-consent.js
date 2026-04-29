/**
 * Labs: optional GA4 after explicit cookie/analytics consent (production hostnames).
 * Localhost / 127.0.0.1: no banner, no analytics (matches prior inline guard).
 * Preview the banner on localhost: ?labs_preview_cookie_banner=1
 * Styling: /styles/labs-cookie-consent.css + per-app :root { --labs-cc-accent: … } in each index.html.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'labs_analytics_consent';
  var ACCEPTED = 'accepted';
  var DECLINED = 'declined';

  function isLocalHost() {
    var h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
  }

  function previewCookieBanner() {
    try {
      return /(?:^|[?&])labs_preview_cookie_banner=1(?:&|$)/.test(window.location.search);
    } catch (e) {
      return false;
    }
  }

  function loadAnalytics() {
    if (window.__labsAnalyticsScriptRequested) return;
    window.__labsAnalyticsScriptRequested = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = '/scripts/analytics.js';
    document.head.appendChild(s);
  }

  function dismissBanner(root) {
    if (root && root.parentNode) root.parentNode.removeChild(root);
  }

  function showBanner() {
    if (document.getElementById('labs-cookie-consent-root')) return;

    var root = document.createElement('aside');
    root.id = 'labs-cookie-consent-root';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Cookie consent');

    var inner = document.createElement('div');
    inner.className = 'labs-cc-inner';

    var p = document.createElement('p');
    p.appendChild(
      document.createTextNode(
        'We use optional cookies and similar technologies (Google Analytics) to measure how this site is used and to improve it. ',
      ),
    );
    p.appendChild(document.createTextNode('You can accept or reject these optional cookies. '));
    var a = document.createElement('a');
    a.href = '/legal/privacy.html';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', 'Privacy Policy (opens in a new tab)');
    a.textContent = 'Privacy Policy';
    p.appendChild(a);
    p.appendChild(document.createTextNode('.'));

    var actions = document.createElement('div');
    actions.className = 'labs-cc-actions';

    var reject = document.createElement('button');
    reject.type = 'button';
    reject.className = 'labs-cc-reject';
    reject.textContent = 'Reject';
    reject.addEventListener('click', function () {
      try {
        localStorage.setItem(STORAGE_KEY, DECLINED);
      } catch (e) {}
      dismissBanner(root);
    });

    var accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'labs-cc-accept';
    accept.textContent = 'Accept';
    accept.addEventListener('click', function () {
      try {
        localStorage.setItem(STORAGE_KEY, ACCEPTED);
      } catch (e) {}
      dismissBanner(root);
      loadAnalytics();
    });

    actions.appendChild(reject);
    actions.appendChild(accept);
    inner.appendChild(p);
    inner.appendChild(actions);
    root.appendChild(inner);

    var target = document.body || document.documentElement;
    target.appendChild(root);
  }

  if (isLocalHost() && !previewCookieBanner()) {
    return;
  }

  var choice = null;
  try {
    choice = localStorage.getItem(STORAGE_KEY);
  } catch (e) {}

  if (choice === ACCEPTED) {
    loadAnalytics();
    return;
  }
  if (choice === DECLINED) {
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showBanner);
  } else {
    showBanner();
  }
})();
