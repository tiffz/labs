import { describe, expect, it } from 'vitest';

import { classifyLyreflyLink } from './lyreflyAccountUrl';

describe('classifyLyreflyLink', () => {
  // Every link below is one the importer meets on tiffatiel.com or slantofrain.com.
  it.each([
    ['https://x.com/betweenwalks', 'X', 'betweenwalks', 'https://x.com/betweenwalks'],
    ['https://www.instagram.com/betweenwalks', 'Instagram', 'betweenwalks', 'https://instagram.com/betweenwalks'],
    ['https://www.facebook.com/betweenwalks', 'Facebook', 'betweenwalks', 'https://facebook.com/betweenwalks'],
    ['https://x.com/tiffatiel', 'X', 'tiffatiel', 'https://x.com/tiffatiel'],
    ['https://www.threads.net/@tiffatiel', 'Threads', 'tiffatiel', 'https://threads.net/@tiffatiel'],
    ['https://bsky.app/profile/tiffatiel.bsky.social', 'Bluesky', 'tiffatiel.bsky.social', 'https://bsky.app/profile/tiffatiel.bsky.social'],
    ['https://tiffatiel.tumblr.com/', 'Tumblr', 'tiffatiel', 'https://tiffatiel.tumblr.com/'],
  ])('%s is an account', (url, platform, handle, normalized) => {
    expect(classifyLyreflyLink(url)).toEqual({ kind: 'account', platform, handle, url: normalized });
  });

  it('a site root is a website account, or the hinted platform when the site says so', () => {
    expect(classifyLyreflyLink('https://slantofrain.com/')).toMatchObject({ kind: 'account', platform: 'Website', handle: 'slantofrain.com' });
    // tiffatiel.com files betweenwalks.art under "tumblr": a Tumblr blog on its own domain.
    expect(classifyLyreflyLink('https://betweenwalks.art/', 'Tumblr')).toMatchObject({ kind: 'account', platform: 'Tumblr', handle: 'betweenwalks.art' });
  });

  it.each([
    ['https://x.com/tiffatiel/status/1882986433369215040', 'X', 'tiffatiel'],
    ['https://bsky.app/profile/tiffatiel.bsky.social/post/3lgks2akhac2k', 'Bluesky', 'tiffatiel.bsky.social'],
    ['https://tiffatiel.tumblr.com/post/773612817505976320/the-perfect-wedding', 'Tumblr', 'tiffatiel'],
    ['https://www.instagram.com/p/C1abc/', 'Instagram', undefined],
  ])('%s is a post by %s', (url, platform, handle) => {
    expect(classifyLyreflyLink(url)).toEqual({ kind: 'post', platform, handle });
  });

  it.each([
    'https://www.webtoons.com/en/canvas/the-perfect-wedding/list?title_no=1021257',
    'https://tapas.io/series/The-Perfect-Wedding',
    'https://mixam.com/print-on-demand/67749e32894b152626d83839',
  ])('a listing page is a publication, never an account: %s', (url) => {
    expect(classifyLyreflyLink(url)?.kind).toBe('post');
  });

  it('a numeric Facebook profile keeps its id', () => {
    expect(classifyLyreflyLink('https://www.facebook.com/profile.php?id=1234567')).toEqual({
      kind: 'account',
      platform: 'Facebook',
      handle: '1234567',
      url: 'https://facebook.com/profile.php?id=1234567',
    });
  });

  it.each(['https://x.com/search?q=comics', 'https://x.com/explore', 'https://www.instagram.com/explore/'])(
    'a site section is not an account: %s',
    (url) => {
      expect(classifyLyreflyLink(url)?.kind).not.toBe('account');
    },
  );

  it('rejects what is not a link', () => {
    expect(classifyLyreflyLink('')).toBeNull();
    expect(classifyLyreflyLink('not a url at all')).toBeNull();
    expect(classifyLyreflyLink('mailto:tiffatiel@gmail.com')).toBeNull();
    expect(classifyLyreflyLink('x.com/tiffatiel')).toMatchObject({ kind: 'account', handle: 'tiffatiel' });
  });
});
