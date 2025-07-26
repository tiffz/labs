/// <reference types="vite/client" />

// CSS module declarations
declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Analytics type declarations
interface AnalyticsEventParameters {
  category?: string;
  label?: string;
  value?: number;
  [key: string]: unknown;
}

interface LabsAnalytics {
  trackEvent(eventName: string, parameters?: AnalyticsEventParameters): void;
  trackMicroApp(appName: string, action: string, details?: AnalyticsEventParameters): void;
  config: {
    ga4Id: string;
  };
}

declare global {
  interface Window {
    labsAnalytics?: LabsAnalytics;
    labsAnalyticsInitialized?: boolean;
    ga?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
} 