import { describe, expect, it, vi } from 'vitest';

import { parseMuscleModuleFromSearch, muscleModuleHref } from './muscleAppUrl';

describe('muscleAppUrl', () => {
  it('parseMuscleModuleFromSearch accepts known modules', () => {
    expect(parseMuscleModuleFromSearch('?module=torso')).toBe('torso');
    expect(parseMuscleModuleFromSearch('?module=unknown')).toBeNull();
  });

  it('muscleModuleHref omits module for full body', () => {
    vi.stubGlobal('window', {
      location: { pathname: '/muscle/', search: '?module=hand&perf=1' },
    });
    expect(muscleModuleHref(null)).toBe('/muscle/?perf=1');
    expect(muscleModuleHref('torso')).toBe('/muscle/?module=torso&perf=1');
    vi.unstubAllGlobals();
  });
});
