import { describe, expect, it } from 'vitest';

import { lyreflyProjectStageHref, lyreflyScriptHref, parseLyreflyHash } from '../routes/lyreflyHash';

describe('parseLyreflyHash', () => {
  it('parses gallery', () => {
    expect(parseLyreflyHash('#/gallery')).toEqual({ kind: 'gallery' });
  });

  it('parses project with stage', () => {
    expect(parseLyreflyHash('#/project/abc/script')).toEqual({
      kind: 'project',
      projectId: 'abc',
      stage: 'script',
    });
  });

  it('parses legacy script route', () => {
    expect(parseLyreflyHash('#/script/abc')).toEqual({ kind: 'script', projectId: 'abc' });
  });

  it('builds stage hrefs', () => {
    expect(lyreflyProjectStageHref('abc', 'art')).toBe('#/project/abc/art');
    expect(lyreflyScriptHref('abc')).toBe('#/project/abc/script');
  });
});
