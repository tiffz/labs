import { describe, expect, it } from 'vitest';
import {
  STANZA_DRUMS_DEFAULT_PATTERN,
  STANZA_DRUM_PANEL_UX,
} from './stanzaPracticeRailConstants';
import { getInlineDrumUxProps } from '../../../shared/components/music/inlineDrumUxDefaults';

describe('stanzaPracticeRailConstants', () => {
  it('STANZA_DRUM_PANEL_UX uses practice-rail profile', () => {
    expect(STANZA_DRUM_PANEL_UX).toEqual(getInlineDrumUxProps('practice-rail'));
  });

  it('STANZA_DRUMS_DEFAULT_PATTERN is valid Darbuka notation', () => {
    expect(STANZA_DRUMS_DEFAULT_PATTERN.length).toBeGreaterThan(0);
    expect(STANZA_DRUMS_DEFAULT_PATTERN).toMatch(/[DTKS-]/);
  });
});
