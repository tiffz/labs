/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Comma-separated SHA-256 hex hashes of tester emails for Drive backup UI (scales/stanza). */
  readonly VITE_LABS_DRIVE_TESTER_HASHES?: string;
  /** Optional label for builds (`staging` | `production`); inject in CI when using env-specific Google clients. */
  readonly VITE_APP_ENV?: string;
}

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