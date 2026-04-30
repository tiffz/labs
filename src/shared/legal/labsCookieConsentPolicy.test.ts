import { describe, expect, it } from 'vitest';
import {
  LABS_ANALYTICS_CONSENT_ACCEPTED,
  LABS_ANALYTICS_CONSENT_DECLINED,
  labsCookieBannerCopy,
  isLabsLocalHost,
  labsCookieBannerPreviewRequested,
  shouldDeferBannerUntilDomContentLoaded,
  shouldExitCookieScriptBeforeStorage,
  shouldLoadAnalyticsForStoredChoice,
  shouldStopWithoutAnalyticsForStoredChoice,
} from './labsCookieConsentPolicy';

describe('labsCookieConsentPolicy', () => {
  it('localhost detection', () => {
    expect(isLabsLocalHost('localhost')).toBe(true);
    expect(isLabsLocalHost('127.0.0.1')).toBe(true);
    expect(isLabsLocalHost('labs.tiffzhang.com')).toBe(false);
  });

  it('preview query flag', () => {
    expect(labsCookieBannerPreviewRequested('')).toBe(false);
    expect(labsCookieBannerPreviewRequested('?labs_preview_cookie_banner=1')).toBe(true);
    expect(labsCookieBannerPreviewRequested('?foo=1&labs_preview_cookie_banner=1')).toBe(true);
    expect(labsCookieBannerPreviewRequested('?labs_preview_cookie_banner=1&x=2')).toBe(true);
    expect(labsCookieBannerPreviewRequested('?labs_preview_cookie_banner=0')).toBe(false);
  });

  it('exit-before-storage on local host without preview', () => {
    expect(
      shouldExitCookieScriptBeforeStorage({ hostname: '127.0.0.1', search: '' }),
    ).toBe(true);
    expect(
      shouldExitCookieScriptBeforeStorage({
        hostname: '127.0.0.1',
        search: '?labs_preview_cookie_banner=1',
      }),
    ).toBe(false);
    expect(
      shouldExitCookieScriptBeforeStorage({ hostname: 'labs.tiffzhang.com', search: '' }),
    ).toBe(false);
  });

  it('stored choice: load GA only when accepted', () => {
    expect(shouldLoadAnalyticsForStoredChoice(null)).toBe(false);
    expect(shouldLoadAnalyticsForStoredChoice('')).toBe(false);
    expect(shouldLoadAnalyticsForStoredChoice(LABS_ANALYTICS_CONSENT_DECLINED)).toBe(false);
    expect(shouldLoadAnalyticsForStoredChoice(LABS_ANALYTICS_CONSENT_ACCEPTED)).toBe(true);
  });

  it('stored choice: stop without GA when declined', () => {
    expect(shouldStopWithoutAnalyticsForStoredChoice(null)).toBe(false);
    expect(shouldStopWithoutAnalyticsForStoredChoice(LABS_ANALYTICS_CONSENT_ACCEPTED)).toBe(
      false,
    );
    expect(shouldStopWithoutAnalyticsForStoredChoice(LABS_ANALYTICS_CONSENT_DECLINED)).toBe(
      true,
    );
  });

  it('defer banner until DOM ready when no stored decision', () => {
    expect(shouldDeferBannerUntilDomContentLoaded(null)).toBe(true);
    expect(shouldDeferBannerUntilDomContentLoaded(LABS_ANALYTICS_CONSENT_ACCEPTED)).toBe(
      false,
    );
    expect(shouldDeferBannerUntilDomContentLoaded(LABS_ANALYTICS_CONSENT_DECLINED)).toBe(
      false,
    );
  });

  it('banner copy is non-empty (bundled script is generated from this module)', () => {
    expect(labsCookieBannerCopy.introduction.length).toBeGreaterThan(20);
    expect(labsCookieBannerCopy.privacyLinkHref).toMatch(/^\/legal\//);
  });
});
