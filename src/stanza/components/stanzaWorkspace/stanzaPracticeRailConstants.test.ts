import { describe, expect, it } from 'vitest';
import {
  STANZA_DRUMS_DEFAULT_PATTERN,
  STANZA_DRUMS_DEFAULT_TIME_SIGNATURE,
  STANZA_DRUM_PANEL_UX,
} from './stanzaPracticeRailConstants';
import { getRhythmTemplatePresets } from '../../../shared/rhythm/presetDatabase';
import { parseRhythm } from '../../../shared/rhythm/rhythmParser';

/**
 * The previous version of this file asserted:
 *
 *   expect(STANZA_DRUMS_DEFAULT_PATTERN.length).toBeGreaterThan(0);
 *   expect(STANZA_DRUMS_DEFAULT_PATTERN).toMatch(/[DTKS-]/);
 *
 * `toMatch` succeeds if ANY single character is a drum token, so `'xxxD'` passed — and the `??`
 * fallback guarantees a non-empty string regardless. Mutation-checked: both assertions survive a
 * broken preset lookup AND an all-rests pattern.
 *
 * What can actually break: `STANZA_DRUMS_DEFAULT_PATTERN` reads the first 4/4 preset out of the
 * shared rhythm database and falls back to a literal with `??`. If that lookup stops resolving —
 * presets reordered, retyped, or the 4/4 bucket empties — the fallback absorbs it silently and
 * Stanza ships a default drum pattern nobody chose. So assert the lookup resolves AND that what it
 * returns is playable in 4/4.
 *
 * (The old profile assertion, `toEqual(getInlineDrumUxProps('practice-rail'))`, did catch a profile
 * switch — it re-derived the expected value from a literal. It is kept below in a narrower form
 * that names the properties doing the work.)
 */

describe('stanzaPracticeRailConstants', () => {
  it('the default pattern comes from the preset database, not the hardcoded fallback', () => {
    const firstPreset = getRhythmTemplatePresets(STANZA_DRUMS_DEFAULT_TIME_SIGNATURE)[0];
    expect(firstPreset, 'no 4/4 preset — the `??` fallback would be masking this').toBeDefined();
    expect(STANZA_DRUMS_DEFAULT_PATTERN).toBe(firstPreset!.notation);
  });

  it('the default pattern parses into playable 4/4 measures', () => {
    const parsed = parseRhythm(STANZA_DRUMS_DEFAULT_PATTERN, STANZA_DRUMS_DEFAULT_TIME_SIGNATURE);
    expect(parsed.isValid, parsed.error).toBe(true);
    expect(parsed.measures.length).toBeGreaterThan(0);
    // A pattern of nothing but rests renders an empty staff and plays silence — valid, but not a
    // usable default for a panel whose job is to preview a beat.
    const audible = parsed.measures.flatMap((m) => m.notes).filter((n) => n.sound !== 'rest');
    expect(audible.length).toBeGreaterThan(0);
  });

  it('the drum panel uses the practice-rail profile, not another one', () => {
    // Assert the properties that DISTINGUISH practice-rail, rather than re-calling the factory.
    // `audioEnabled` separates it from `settings-panel` (false there) and is load-bearing — the
    // practice rail's drum panel has to make sound. `drumSymbolScale` then separates it from
    // `sidebar-compact` (0.68). Together the pair fails if the profile is switched to either.
    expect(STANZA_DRUM_PANEL_UX.audioEnabled).toBe(true);
    expect(STANZA_DRUM_PANEL_UX.drumSymbolScale).toBe(0.62);
  });
});
