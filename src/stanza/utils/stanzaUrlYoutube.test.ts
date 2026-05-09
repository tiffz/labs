import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  replaceStanzaYoutubeSearchParam,
  stripStanzaYoutubeSearchParamPreservingDrive,
} from './stanzaUrlYoutube';

describe('replaceStanzaYoutubeSearchParam', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('calls replaceState with v when id provided', () => {
    const spy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    vi.stubGlobal('location', new URL('https://labs.test/stanza/'));
    replaceStanzaYoutubeSearchParam('dQw4w9WgXcQ');
    expect(spy).toHaveBeenCalledWith(null, '', expect.stringContaining('v=dQw4w9WgXcQ'));
  });

  it('calls replaceState without v when cleared', () => {
    const spy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    vi.stubGlobal('location', new URL('https://labs.test/stanza/?v=dQw4w9WgXcQ'));
    replaceStanzaYoutubeSearchParam(null);
    expect(spy).toHaveBeenCalledWith(null, '', expect.not.stringContaining('v='));
  });
});

describe('stripStanzaYoutubeSearchParamPreservingDrive', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('removes v but keeps df and driveTitle', () => {
    const spy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    vi.stubGlobal(
      'location',
      new URL(
        'https://labs.test/stanza/?v=dQw4w9WgXcQ&df=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&driveTitle=Hello',
      ),
    );
    stripStanzaYoutubeSearchParamPreservingDrive();
    const url = String(spy.mock.calls[0]?.[2] ?? '');
    expect(url).not.toContain('v=');
    expect(url).toContain('df=');
    expect(url).toContain('driveTitle=');
  });
});
