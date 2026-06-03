import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  hasStanzaDriveDeepLinkQuery,
  hasStanzaMediaFingerprintDeepLinkQuery,
  parseStanzaDriveFileIdParam,
  parseStanzaMediaFingerprintParam,
  pushStanzaPlaybackUrlSearchParams,
  readStanzaDriveBootstrapFromLocation,
  replaceStanzaPlaybackUrlSearchParams,
  STANZA_MEDIA_FINGERPRINT_QUERY,
} from './stanzaDriveUrlParams';

describe('hasStanzaDriveDeepLinkQuery', () => {
  it('is true when df is non-empty', () => {
    vi.stubGlobal('location', { search: '?df=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' } as Location);
    expect(hasStanzaDriveDeepLinkQuery()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('is false when df absent or blank', () => {
    vi.stubGlobal('location', { search: '?v=dQw4w9WgXcQ' } as Location);
    expect(hasStanzaDriveDeepLinkQuery()).toBe(false);
    vi.stubGlobal('location', { search: '?df=%20' } as Location);
    expect(hasStanzaDriveDeepLinkQuery()).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('parseStanzaDriveFileIdParam', () => {
  it('accepts plausible Drive file ids', () => {
    expect(parseStanzaDriveFileIdParam('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')).toBe(
      '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    );
    expect(parseStanzaDriveFileIdParam('1qLhU_8tX4N2VTEmcHiUM3g29tsISy-ao')).toBe(
      '1qLhU_8tX4N2VTEmcHiUM3g29tsISy-ao',
    );
  });
  it('rejects short garbage', () => {
    expect(parseStanzaDriveFileIdParam('abc')).toBeNull();
  });
});

describe('parseStanzaMediaFingerprintParam', () => {
  it('accepts Beat SHA256 and Stanza size/duration keys', () => {
    const sha = '69a9c79ec8c4519a732ee7429969e167817d3c397118b38ec81c4af050c1fa33';
    expect(parseStanzaMediaFingerprintParam(sha)).toBe(sha);
    expect(parseStanzaMediaFingerprintParam('12345678:180.50')).toBe('12345678:180.50');
  });

  it('rejects garbage', () => {
    expect(parseStanzaMediaFingerprintParam('abc')).toBeNull();
  });
});

describe('hasStanzaMediaFingerprintDeepLinkQuery', () => {
  it('is true when f is non-empty', () => {
    vi.stubGlobal('location', { search: '?f=69a9c79ec8c4519a732ee7429969e167817d3c397118b38ec81c4af050c1fa33' } as Location);
    expect(hasStanzaMediaFingerprintDeepLinkQuery()).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe('readStanzaDriveBootstrapFromLocation', () => {
  it('prefers YouTube v over df', () => {
    vi.stubGlobal(
      'location',
      { search: '?v=dQw4w9WgXcQ&df=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' } as Location,
    );
    expect(readStanzaDriveBootstrapFromLocation().youtubeId).toBe('dQw4w9WgXcQ');
    expect(readStanzaDriveBootstrapFromLocation().driveFileId).toBeNull();
    vi.unstubAllGlobals();
  });

  it('prefers Drive df over f', () => {
    vi.stubGlobal(
      'location',
      {
        search: `?df=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&f=69a9c79ec8c4519a732ee7429969e167817d3c397118b38ec81c4af050c1fa33`,
      } as Location,
    );
    const boot = readStanzaDriveBootstrapFromLocation();
    expect(boot.driveFileId).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    expect(boot.mediaFingerprint).toBeNull();
    vi.unstubAllGlobals();
  });

  it('reads local upload fingerprint when v and df absent', () => {
    const fp = '69a9c79ec8c4519a732ee7429969e167817d3c397118b38ec81c4af050c1fa33';
    vi.stubGlobal('location', { search: `?f=${fp}` } as Location);
    expect(readStanzaDriveBootstrapFromLocation().mediaFingerprint).toBe(fp);
    vi.unstubAllGlobals();
  });
});

describe('replaceStanzaPlaybackUrlSearchParams', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sets v and strips Drive params when youtube wins', () => {
    const spy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    vi.stubGlobal(
      'location',
      new URL(
        'https://labs.test/stanza/?df=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&driveTitle=Hello',
      ),
    );
    replaceStanzaPlaybackUrlSearchParams({
      youtubeId: 'dQw4w9WgXcQ',
      driveFileId: null,
      driveTitle: null,
      mediaFingerprint: null,
    });
    expect(spy).toHaveBeenCalledWith(null, '', expect.stringContaining('v=dQw4w9WgXcQ'));
    expect(String(spy.mock.calls[0]?.[2])).not.toContain('df=');
  });

  it('sets df and strips v for local Drive-backed selection', () => {
    const spy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    vi.stubGlobal('location', new URL('https://labs.test/stanza/?v=dQw4w9WgXcQ'));
    replaceStanzaPlaybackUrlSearchParams({
      youtubeId: null,
      driveFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      driveTitle: 'Piece',
      mediaFingerprint: null,
    });
    const url = String(spy.mock.calls[0]?.[2] ?? '');
    expect(url).toContain('df=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    expect(url).toContain('driveTitle=');
    expect(url).not.toContain('v=');
  });

  it('sets f and strips v/df for local upload selection', () => {
    const spy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    vi.stubGlobal('location', new URL('https://labs.test/stanza/?v=dQw4w9WgXcQ'));
    const fp = '69a9c79ec8c4519a732ee7429969e167817d3c397118b38ec81c4af050c1fa33';
    replaceStanzaPlaybackUrlSearchParams({
      youtubeId: null,
      driveFileId: null,
      driveTitle: null,
      mediaFingerprint: fp,
    });
    const url = String(spy.mock.calls[0]?.[2] ?? '');
    expect(url).toContain(`${STANZA_MEDIA_FINGERPRINT_QUERY}=${fp}`);
    expect(url).not.toContain('v=');
    expect(url).not.toContain('df=');
  });
});

describe('pushStanzaPlaybackUrlSearchParams', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses pushState when the URL would actually change (library → song)', () => {
    const spy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    vi.stubGlobal('location', new URL('https://labs.test/stanza/'));
    pushStanzaPlaybackUrlSearchParams({
      youtubeId: 'dQw4w9WgXcQ',
      driveFileId: null,
      driveTitle: null,
      mediaFingerprint: null,
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]?.[2])).toContain('v=dQw4w9WgXcQ');
  });

  it('uses pushState when navigating song → library (clears params)', () => {
    const spy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    vi.stubGlobal('location', new URL('https://labs.test/stanza/?v=dQw4w9WgXcQ'));
    pushStanzaPlaybackUrlSearchParams({
      youtubeId: null,
      driveFileId: null,
      driveTitle: null,
      mediaFingerprint: null,
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]?.[2])).not.toContain('v=');
  });

  it('skips the push when the URL already matches (no duplicate history entries)', () => {
    const spy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    vi.stubGlobal('location', new URL('https://labs.test/stanza/?v=dQw4w9WgXcQ'));
    pushStanzaPlaybackUrlSearchParams({
      youtubeId: 'dQw4w9WgXcQ',
      driveFileId: null,
      driveTitle: null,
      mediaFingerprint: null,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('preserves unrelated query parameters like ?debug across navigations', () => {
    const spy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    vi.stubGlobal('location', new URL('https://labs.test/stanza/?debug&v=oldVideoId1'));
    pushStanzaPlaybackUrlSearchParams({
      youtubeId: 'dQw4w9WgXcQ',
      driveFileId: null,
      driveTitle: null,
      mediaFingerprint: null,
    });
    const url = String(spy.mock.calls[0]?.[2] ?? '');
    expect(url).toContain('debug');
    expect(url).toContain('v=dQw4w9WgXcQ');
  });
});
