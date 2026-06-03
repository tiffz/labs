import { describe, expect, it } from 'vitest';
import {
  buildAppBasePathsFromEntryPaths,
  getCanonicalTrailingSlashRedirect,
  getLegacyBeatRedirect,
} from './trailingSlashRouting';

describe('trailingSlashRouting', () => {
  it('builds app base paths from Vite entry paths', () => {
    const srcRoot = '/repo/src';
    const entryPaths = [
      '/repo/src/index.html',
      '/repo/src/words/index.html',
      '/repo/src/drums/index.html',
      '/repo/src/drums/universal_tom/index.html',
    ];

    const routes = buildAppBasePathsFromEntryPaths(entryPaths, srcRoot);
    expect(routes.has('/words')).toBe(true);
    expect(routes.has('/drums')).toBe(true);
    expect(routes.has('/drums/universal_tom')).toBe(true);
    expect(routes.has('/')).toBe(false);
  });

  it('normalizes known app routes with trailing slash', () => {
    const appBasePaths = new Set(['/words', '/drums']);

    expect(getCanonicalTrailingSlashRedirect('/words', appBasePaths)).toBe('/words/');
    expect(getCanonicalTrailingSlashRedirect('/words?foo=1', appBasePaths)).toBe('/words/?foo=1');
    expect(getCanonicalTrailingSlashRedirect('/words/', appBasePaths)).toBeNull();
    expect(getCanonicalTrailingSlashRedirect('/unknown', appBasePaths)).toBeNull();
    expect(getCanonicalTrailingSlashRedirect('/', appBasePaths)).toBeNull();
  });

  it('redirects legacy Find the Beat routes to Stanza', () => {
    expect(getLegacyBeatRedirect('/beat')).toBe('/stanza/');
    expect(getLegacyBeatRedirect('/beat/')).toBe('/stanza/');
    expect(getLegacyBeatRedirect('/beat?v=dQw4w9WgXcQ')).toBe('/stanza/?v=dQw4w9WgXcQ');
    expect(getLegacyBeatRedirect('/beat/?v=dQw4w9WgXcQ')).toBe('/stanza/?v=dQw4w9WgXcQ');
    expect(getLegacyBeatRedirect('/stanza/')).toBeNull();
  });
});
