import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchYoutubeOembedMeta, getYoutubeOembedCached } from './youtubeOembedMeta';

describe('fetchYoutubeOembedMeta', () => {
  const watchUrl = 'https://www.youtube.com/watch?v=test-video-id-unique-xyz';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('caches embedDenied when oEmbed returns 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve({
          ok: false,
          status: 404,
        } as Response),
      ),
    );
    const m = await fetchYoutubeOembedMeta(watchUrl);
    expect(m?.embedDenied).toBe(true);
    expect(getYoutubeOembedCached(watchUrl)?.embedDenied).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);

    const second = await fetchYoutubeOembedMeta(watchUrl);
    expect(second?.embedDenied).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('returns title when oEmbed succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ title: 'Hello', author_name: 'Channel' }),
        } as Response),
      ),
    );
    const m = await fetchYoutubeOembedMeta('https://www.youtube.com/watch?v=ok-other-id');
    expect(m?.title).toBe('Hello');
    expect(m?.embedDenied).toBe(false);
  });
});
