import { describe, expect, it } from 'vitest';

import { lyreflyProjectProfileHref, lyreflyProjectStageHref, lyreflyScriptHref, parseLyreflyHash } from '../routes/lyreflyHash';

describe('parseLyreflyHash', () => {
  it('parses gallery', () => {
    expect(parseLyreflyHash('#/gallery')).toEqual({ kind: 'gallery' });
  });

  it('treats legacy logo gallery hash as comics shelf', () => {
    expect(parseLyreflyHash('#/logo-gallery')).toEqual({ kind: 'gallery' });
  });

  it('parses project with stage', () => {
    expect(parseLyreflyHash('#/project/abc/script')).toEqual({
      kind: 'project',
      projectId: 'abc',
      stage: 'script',
    });
  });

  it('parses project profile route', () => {
    expect(parseLyreflyHash('#/project/abc/profile')).toEqual({
      kind: 'profile',
      projectId: 'abc',
    });
  });

  it('parses legacy script route', () => {
    expect(parseLyreflyHash('#/script/abc')).toEqual({ kind: 'script', projectId: 'abc' });
  });

  it('builds stage hrefs', () => {
    expect(lyreflyProjectStageHref('abc', 'art')).toBe('#/project/abc/art');
    expect(lyreflyProjectProfileHref('abc')).toBe('#/project/abc/profile');
    expect(lyreflyScriptHref('abc')).toBe('#/project/abc/script');
  });
});
