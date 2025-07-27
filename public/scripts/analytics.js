/**
 * Labs Analytics Setup
 * Modern GA4 Google Analytics configuration for all micro-apps
 */

(function() {
  'use strict';
  
  // Configuration
  const ANALYTICS_CONFIG = {
    ga4Id: 'G-25C3B5B84M' // Your GA4 Measurement ID
  };

  /**
   * Initialize Google Analytics 4 (GA4)
   */
  function initGA4() {
    if (!ANALYTICS_CONFIG.ga4Id) {
      console.warn('GA4 ID not configured');
      return;
    }

    // Load gtag library
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.ga4Id}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', ANALYTICS_CONFIG.ga4Id, {
      // Enhanced measurement for single-page apps
      send_page_view: true,
      // Better tracking for service worker environments
      transport_type: 'beacon',
      // Custom parameters for labs site
      custom_map: {
        custom_parameter_1: 'micro_app'
      }
    });

    console.log('GA4 Analytics initialized');
  }

  /**
   * Track custom events with GA4
   */
  function trackEvent(eventName, parameters = {}) {
    if (window.gtag) {
      gtag('event', eventName, parameters);
    }
  }

  /**
   * Track micro-app specific events
   */
  function trackMicroApp(appName, action, details = {}) {
    const eventData = {
      category: 'Micro App',
      label: appName,
      micro_app: appName,
      action: action,
      ...details
    };
    
    trackEvent(`micro_app_${action}`, eventData);
  }

  /**
   * Handle service worker compatibility
   */
  function ensureServiceWorkerCompatibility() {
    // Ensure analytics continues to work with service workers
    if ('serviceWorker' in navigator) {
      // Wait for service worker to be ready
      navigator.serviceWorker.ready.then(() => {
        console.log('Analytics: Service worker detected, using beacon transport');
      });
    }
  }

  /**
   * Initialize analytics
   */
  function init() {
    // Ensure we don't initialize multiple times
    if (window.labsAnalyticsInitialized) {
      return;
    }
    
    try {
      ensureServiceWorkerCompatibility();
      initGA4();
      
      // Expose utility functions globally
      window.labsAnalytics = {
        trackEvent,
        trackMicroApp,
        config: ANALYTICS_CONFIG
      };
      
      window.labsAnalyticsInitialized = true;
      
    } catch (error) {
      console.error('Analytics initialization error:', error);
    }
  }

  // Auto-detect micro-app and track visit
  function detectAndTrackMicroApp() {
    const path = window.location.pathname;
    let appName = 'landing';
    
    if (path.includes('/cats/')) {
      appName = 'cat-clicker';
    } else if (path.includes('/zines/')) {
      appName = 'zine-maker';
    }
    
    // Track the app visit
    setTimeout(() => {
      if (window.labsAnalytics) {
        window.labsAnalytics.trackMicroApp(appName, 'visit', {
          path: path,
          referrer: document.referrer
        });
      }
    }, 1000); // Delay to ensure analytics is loaded
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init();
      detectAndTrackMicroApp();
    });
  } else {
    init();
    detectAndTrackMicroApp();
  }

})(); 