import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  hasStanzaDriveDeepLinkQuery,
  parseStanzaDriveFileIdParam,
  pushStanzaPlaybackUrlSearchParams,
  readStanzaDriveBootstrapFromLocation,
  replaceStanzaPlaybackUrlSearchParams,
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
    });
    const url = String(spy.mock.calls[0]?.[2] ?? '');
    expect(url).toContain('df=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    expect(url).toContain('driveTitle=');
    expect(url).not.toContain('v=');
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
    });
    const url = String(spy.mock.calls[0]?.[2] ?? '');
    expect(url).toContain('debug');
    expect(url).toContain('v=dQw4w9WgXcQ');
  });
});
