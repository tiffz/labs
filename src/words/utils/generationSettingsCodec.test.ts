import { describe, expect, it } from 'vitest';
import {
  decodeGenerationSettingsJson,
  encodeGenerationSettingsJson,
  migrateLegacyGenerationSettings,
} from './generationSettingsCodec';
import {
  DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
} from './prosodyEngine';

describe('generationSettingsCodec', () => {
  it('round-trips v3 JSON', () => {
    const original = {
      ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
      fillRests: true,
      subdivideNotes: true,
      stretchSyllables: true,
      stressAlignment: 'light' as const,
      wordStartAlignment: 'off' as const,
      noteValueBias: { sixteenth: 80, eighth: 40, dotted: 60, quarter: 30 },
      freestyleStrength: 55,
      phrasing: 'halfMeasureVariations' as const,
      landingNote: 'half' as const,
    };
    const json = encodeGenerationSettingsJson(original);
    expect(json.length).toBeLessThan(150);
    const decoded = decodeGenerationSettingsJson(json);
    expect(decoded).not.toBeNull();
    expect(decoded?.fillRests).toBe(true);
    expect(decoded?.subdivideNotes).toBe(true);
    expect(decoded?.stretchSyllables).toBe(true);
    expect(decoded?.stressAlignment).toBe('light');
    expect(decoded?.wordStartAlignment).toBe('off');
    expect(decoded?.noteValueBias.sixteenth).toBe(80);
    expect(decoded?.noteValueBias.eighth).toBe(40);
    expect(decoded?.noteValueBias.dotted).toBe(60);
    expect(decoded?.noteValueBias.quarter).toBe(30);
    expect(decoded?.freestyleStrength).toBe(55);
    expect(decoded?.phrasing).toBe('halfMeasureVariations');
    expect(decoded?.landingNote).toBe('half');
  });

  it('decodes legacy v2 JSON and migrates to v3', () => {
    // bit 0 = adventurousRhythm, bit 4 = midMeasureRests
    const v2Json = JSON.stringify({ v: 2, m: 0b00010001, sa: 1, wa: 0 });
    const decoded = decodeGenerationSettingsJson(v2Json);
    expect(decoded).not.toBeNull();
    expect(decoded?.stressAlignment).toBe('light');
    expect(decoded?.wordStartAlignment).toBe('off');
    expect(decoded?.subdivideNotes).toBe(true);
    expect(decoded?.fillRests).toBe(true);
    expect(decoded?.phrasing).toBe('repeat');
  });

  it('migrates legacy slider JSON', () => {
    const migrated = migrateLegacyGenerationSettings({
      adventurousness: 90,
      dottedBias: 80,
      templateBias: 90,
      alignStressToMajorBeats: 70,
      alignWordStartsToBeats: 20,
    });
    expect(migrated.subdivideNotes).toBe(true);
    expect(migrated.noteValueBias.dotted).toBe(75);
    expect(migrated.stressAlignment).toBe('strong');
    expect(migrated.wordStartAlignment).toBe('off');
  });
});
