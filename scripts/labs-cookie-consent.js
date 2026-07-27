"use strict";
(() => {
  // src/shared/legal/labsCookieConsentPolicy.ts
  var LABS_ANALYTICS_CONSENT_STORAGE_KEY = "labs_analytics_consent";
  var LABS_ANALYTICS_CONSENT_ACCEPTED = "accepted";
  var LABS_ANALYTICS_CONSENT_DECLINED = "declined";
  var LABS_ANALYTICS_SCRIPT_PATH = "/scripts/analytics.js";
  var labsCookieBannerCopy = {
    introduction: "This site uses cookies to track usage data through Google Analytics. Usage of these cookies is optional.",
    privacyLinkText: "Privacy policy",
    privacyLinkHref: "/legal/privacy.html",
    privacyLinkAriaLabel: "Privacy Policy (opens in a new tab)",
    acceptButtonLabel: "Accept",
    rejectButtonLabel: "Reject"
  };
  function isLabsLocalHost(hostname2) {
    return hostname2 === "localhost" || hostname2 === "127.0.0.1";
  }
  function labsCookieBannerPreviewRequested(search2) {
    try {
      return /(?:^|[?&])labs_preview_cookie_banner=1(?:&|$)/.test(search2);
    } catch (e) {
      return false;
    }
  }

  // src/shared/legal/labsCookieConsentBrowser.ts
  function loadAnalytics() {
    if (window.__labsAnalyticsScriptRequested) return;
    window.__labsAnalyticsScriptRequested = true;
    const s = document.createElement("script");
    s.async = true;
    s.src = LABS_ANALYTICS_SCRIPT_PATH;
    document.head.appendChild(s);
  }
  function dismissBanner(root) {
    root.remove();
  }
  function showBanner() {
    var _a;
    if (document.getElementById("labs-cookie-consent-root")) return;
    const copy = labsCookieBannerCopy;
    const root = document.createElement("aside");
    root.id = "labs-cookie-consent-root";
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "Cookie consent");
    const inner = document.createElement("div");
    inner.className = "labs-cc-inner";
    const p = document.createElement("p");
    p.appendChild(document.createTextNode(copy.introduction));
    p.appendChild(document.createTextNode(" "));
    const a = document.createElement("a");
    a.href = copy.privacyLinkHref;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", copy.privacyLinkAriaLabel);
    a.textContent = copy.privacyLinkText;
    p.appendChild(a);
    p.appendChild(document.createTextNode("."));
    const actions = document.createElement("div");
    actions.className = "labs-cc-actions";
    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "labs-cc-reject";
    reject.textContent = copy.rejectButtonLabel;
    reject.addEventListener("click", () => {
      try {
        localStorage.setItem(LABS_ANALYTICS_CONSENT_STORAGE_KEY, LABS_ANALYTICS_CONSENT_DECLINED);
      } catch (e) {
      }
      dismissBanner(root);
    });
    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "labs-cc-accept";
    accept.textContent = copy.acceptButtonLabel;
    accept.addEventListener("click", () => {
      try {
        localStorage.setItem(LABS_ANALYTICS_CONSENT_STORAGE_KEY, LABS_ANALYTICS_CONSENT_ACCEPTED);
      } catch (e) {
      }
      dismissBanner(root);
      loadAnalytics();
    });
    actions.appendChild(reject);
    actions.appendChild(accept);
    inner.appendChild(p);
    inner.appendChild(actions);
    root.appendChild(inner);
    const target = (_a = document.body) != null ? _a : document.documentElement;
    target.appendChild(root);
  }
  var hostname = window.location.hostname;
  var search = window.location.search;
  var exitEarlyForLocalDev = isLabsLocalHost(hostname) && !labsCookieBannerPreviewRequested(search);
  if (!exitEarlyForLocalDev) {
    let choice = null;
    try {
      choice = localStorage.getItem(LABS_ANALYTICS_CONSENT_STORAGE_KEY);
    } catch (e) {
    }
    if (choice === LABS_ANALYTICS_CONSENT_ACCEPTED) {
      loadAnalytics();
    } else if (choice === LABS_ANALYTICS_CONSENT_DECLINED) {
    } else if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showBanner);
    } else {
      showBanner();
    }
  }
})();
