import { describe, expect, it } from 'vitest';

import { parseChordProToChartLayout } from '../../shared/music/chordPro/chordChartLayout';
import {
  remapSectionPlaybackOverrides,
  remapSectionPlaybackOverridesForChordPro,
} from './remapSectionPlaybackOverrides';

describe('remapSectionPlaybackOverrides', () => {
  it('keeps exact section id matches', () => {
    const layout = parseChordProToChartLayout('[Verse]\nHi\n\n[Chorus]\nHey');
    const overrides = {
      'verse-0': { customPlayback: true, drumPattern: 'D-T-K-T-' },
      'chorus-1': { customPlayback: true, drumPattern: 'D---' },
    };
    expect(remapSectionPlaybackOverrides(layout.sections, overrides)).toEqual(overrides);
  });

  it('reclaims orphaned overrides after section reorder by slug', () => {
    const layout = parseChordProToChartLayout('[Chorus]\nHey\n\n[Verse]\nHi');
    // Old order was Verse then Chorus → verse-0 / chorus-1
    const overrides = {
      'verse-0': { customPlayback: true, drumPattern: 'D-T-K-T-' },
      'chorus-1': { customPlayback: true, drumPattern: 'TkTk' },
    };
    const remapped = remapSectionPlaybackOverrides(layout.sections, overrides);
    expect(remapped?.['chorus-0']?.drumPattern).toBe('TkTk');
    expect(remapped?.['verse-1']?.drumPattern).toBe('D-T-K-T-');
    expect(remapped?.['verse-0']).toBeUndefined();
    expect(remapped?.['chorus-1']).toBeUndefined();
  });

  it('preserves unmatched orphans instead of dropping them', () => {
    const overrides = {
      'bridge-2': { customPlayback: true, drumPattern: 'D---' },
    };
    expect(remapSectionPlaybackOverridesForChordPro('[Verse]\nHi', overrides)).toEqual(overrides);
  });
});
