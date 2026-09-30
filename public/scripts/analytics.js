/**
 * Labs Analytics Setup
 * Modern GA4 Google Analytics configuration for all micro-apps
 */

(function() {
  'use strict';

  /*
   * Labs has its own GA4 property now.
   *
   * It used to send to G-25C3B5B84M, which is the measurement ID of the ONE
   * data stream in the "Tiff Zhang - GA4" property — the stream configured for
   * tiffzhang.com, right down to its referral exclusion. So labs was not
   * "mixed in with" the main site's analytics; it was sending to the main
   * site's stream, on the main site's ID, and no report could separate them
   * because there was nothing to separate.
   *
   * A separate PROPERTY rather than a second stream in that one: GA4's default
   * reports, Home and Insights all aggregate at property level, so a second
   * stream would still need a comparison applied on every report. A property
   * also keeps the main site's historical traffic out of labs' totals and
   * period-over-period comparisons.
   */
  var GA4_ID = 'G-6DF4GDC8K1';

  var APP_MAP = {
    '/agility/': { name: 'agility', group: 'Music' },
    '/cats/':    { name: 'cats',    group: 'Games' },
    '/chords/':  { name: 'chords',  group: 'Music' },
    '/corp/':    { name: 'corp',    group: 'Games' },
    '/count/':   { name: 'count',   group: 'Music' },
    '/drums/':   { name: 'drums',   group: 'Music' },
    '/encore/':  { name: 'encore',  group: 'Music' },
    '/forms/':   { name: 'forms',   group: 'Art & Writing' },
    '/gesture/': { name: 'gesture', group: 'Art & Writing' },
    '/melodia/': { name: 'melodia', group: 'Music' },
    '/pitch/':   { name: 'pitch',   group: 'Music' },
    '/scales/':  { name: 'scales',  group: 'Music' },
    '/story/':   { name: 'story',   group: 'Art & Writing' },
    '/ui/':      { name: 'ui',      group: 'Internal' },
    '/words/':   { name: 'words',   group: 'Music' },
    '/zines/':   { name: 'zines',   group: 'Art & Writing' },

    // Added when the lookup was found to be nine apps out of date. Only the
    // group matters here now; the name comes from the path.
    '/lyrefly/':    { name: 'lyrefly',    group: 'Art & Writing' },
    '/maqam/':      { name: 'maqam',      group: 'Music' },
    '/midi/':       { name: 'midi',       group: 'Music' },
    '/muscle/':     { name: 'muscle',     group: 'Art & Writing' },
    '/palette/':    { name: 'palette',    group: 'Art & Writing' },
    '/scrapboard/': { name: 'scrapboard', group: 'Art & Writing' },
    '/sight/':      { name: 'sight',      group: 'Art & Writing' },
    '/stanza/':     { name: 'stanza',     group: 'Music' },
    '/zinebox/':    { name: 'zinebox',    group: 'Art & Writing' },
  };

  /**
   * Which app a page belongs to.
   *
   * The name is DERIVED FROM THE PATH, not looked up. `APP_MAP` supplies only
   * the human grouping.
   *
   * It used to be a lookup, and a miss fell through to `{ name: 'landing' }`.
   * Nine of the twenty-four apps were not in the map — maqam, palette, stanza,
   * muscle, scrapboard, sight, midi, zinebox, lyrefly — so every visit to any
   * of them was recorded as a visit to the HOME PAGE. That is not missing
   * data, it is data attributed to the wrong thing, which is worse: the
   * landing page looked busier than it was and nine apps looked dead.
   *
   * Deriving the name means a new app enrols itself the moment it has a URL.
   * The worst a missing map entry can do now is leave the group 'Unknown',
   * which shows up in a report instead of merging silently into another row.
   */
  function detectApp() {
    var match = window.location.pathname.match(/^\/([a-z0-9-]+)\//);
    if (!match) return { name: 'landing', group: 'Landing' };
    var slug = match[1];
    var known = APP_MAP['/' + slug + '/'];
    return { name: slug, group: known ? known.group : 'Unknown' };
  }

  function initGA4() {
    if (!GA4_ID) return;

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    window.gtag = gtag;

    var app = detectApp();

    gtag('js', new Date());
    gtag('config', GA4_ID, {
      send_page_view: true,
      transport_type: 'beacon',
      // Default dimensions attached to every hit
      micro_app: app.name,
      content_group: app.group,
      site_section: 'labs',
      custom_map: {
        custom_parameter_1: 'micro_app',
        custom_parameter_2: 'content_group',
        custom_parameter_3: 'site_section'
      }
    });
  }

  function trackEvent(eventName, parameters) {
    if (window.gtag) {
      var app = detectApp();
      var params = Object.assign(
        { micro_app: app.name, content_group: app.group, site_section: 'labs' },
        parameters || {}
      );
      window.gtag('event', eventName, params);
    }
  }

  function trackMicroApp(appName, action, details) {
    trackEvent('micro_app_' + action, Object.assign(
      { category: 'Micro App', label: appName },
      details || {}
    ));
  }

  function init() {
    if (window.labsAnalyticsInitialized) return;

    try {
      initGA4();

      window.labsAnalytics = {
        trackEvent: trackEvent,
        trackMicroApp: trackMicroApp,
        config: { ga4Id: GA4_ID }
      };

      window.labsAnalyticsInitialized = true;

      // Fire a visit event for the detected micro-app
      var app = detectApp();
      setTimeout(function() {
        trackMicroApp(app.name, 'visit', {
          path: window.location.pathname,
          referrer: document.referrer
        });
      }, 1000);

    } catch (error) {
      console.error('Analytics initialization error:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
