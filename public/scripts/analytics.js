/**
 * Labs Analytics Setup
 * Modern GA4 Google Analytics configuration for all micro-apps
 */

(function() {
  'use strict';

  var GA4_ID = 'G-25C3B5B84M';

  var APP_MAP = {
    '/beat/':    { name: 'beat',    group: 'Music' },
    '/cats/':    { name: 'cats',    group: 'Games' },
    '/chords/':  { name: 'chords',  group: 'Music' },
    '/corp/':    { name: 'corp',    group: 'Games' },
    '/drums/':   { name: 'drums',   group: 'Music' },
    '/forms/':   { name: 'forms',   group: 'Art & Writing' },
    '/piano/':   { name: 'piano',   group: 'Music' },
    '/pitch/':   { name: 'pitch',   group: 'Music' },
    '/count/':   { name: 'count',   group: 'Music' },
    '/scales/':  { name: 'scales',  group: 'Music' },
    '/story/':   { name: 'story',   group: 'Art & Writing' },
    '/words/':   { name: 'words',   group: 'Music' },
    '/zines/':   { name: 'zines',   group: 'Art & Writing' },
  };

  function detectApp() {
    var path = window.location.pathname;
    var keys = Object.keys(APP_MAP);
    for (var i = 0; i < keys.length; i++) {
      if (path.indexOf(keys[i]) === 0) return APP_MAP[keys[i]];
    }
    return { name: 'landing', group: 'Landing' };
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
