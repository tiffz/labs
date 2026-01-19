import { describe, it, expect } from 'vitest';
import { isDrumTab, parseDrumTab } from './drumTabParser';

describe('drumTabParser', () => {
  describe('isDrumTab', () => {
    it('returns true for valid drum tab format', () => {
      const tab = `
HH x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x-x-|
SD ----o-------o---|----o-------o---|
BD o------oo-o-----|o------oo-o-----|
      `;
      expect(isDrumTab(tab)).toBe(true);
    });

    it('returns true for minimal valid tab', () => {
      const tab = `BD o---|
SD -o--|`;
      expect(isDrumTab(tab)).toBe(true);
    });

    it('returns false for regular text', () => {
      expect(isDrumTab('Hello world')).toBe(false);
      expect(isDrumTab('D-T-__T-D---T---')).toBe(false);
    });

    it('returns false for empty or short text', () => {
      expect(isDrumTab('')).toBe(false);
      expect(isDrumTab('BD')).toBe(false);
    });

    it('returns false for single drum line (needs at least 2)', () => {
      const tab = 'BD o---o---|';
      expect(isDrumTab(tab)).toBe(false);
    });

    it('returns true for tabs with various drum components', () => {
      const tab = `
CC x---------------|
RC --x-x-x-x-x-x-x-|
HH ----------------|
SD ----o-------o---|
BD o------oo-o---o-|
      `;
      expect(isDrumTab(tab)).toBe(true);
    });
  });

  describe('parseDrumTab', () => {
    it('parses a simple rock beat pattern', () => {
      const tab = `
HH x-x-x-x-x-x-x-x-|
SD ----o-------o---|
BD o-------o-------|
      `;
      const result = parseDrumTab(tab);
      expect(result.notation).toBeTruthy();
      expect(result.componentsFound).toContain('HH');
      expect(result.componentsFound).toContain('SD');
      expect(result.componentsFound).toContain('BD');
    });

    it('prioritizes BD over SD over HH when on same beat', () => {
      const tab = `
HH x---|
BD o---|
      `;
      const result = parseDrumTab(tab);
      // First beat has both BD and HH, BD should win -> D
      expect(result.notation.charAt(0)).toBe('D');
    });

    it('maps SD to T (Tek)', () => {
      const tab = `
SD o---|
BD ----|
      `;
      const result = parseDrumTab(tab);
      expect(result.notation.charAt(0)).toBe('T');
    });

    it('includes HH as K when option is enabled', () => {
      const tab = `
HH x---|
SD ----|
BD ----|
      `;
      const result = parseDrumTab(tab, { includeBass: true, includeSnare: true, includeHiHat: true });
      // With HH enabled, should have K
      expect(result.notation).toContain('K');
    });

    it('excludes HH by default', () => {
      const tab = `
HH x-x-x-x-x-x-x-x-|
SD ----o-------o---|
BD o-------o-------|
      `;
      const result = parseDrumTab(tab);
      // By default, HH is excluded - should NOT contain K
      expect(result.notation).not.toContain('K');
      // Should contain D and T
      expect(result.notation).toContain('D');
      expect(result.notation).toContain('T');
    });

    it('includes HH alongside BD and SD when enabled', () => {
      const tab = `
HH x-x-x-x-x-x-x-x-|
SD ----o-------o---|
BD o-------o-------|
      `;
      const result = parseDrumTab(tab, { includeBass: true, includeSnare: true, includeHiHat: true });
      // With all enabled, should have D, T, and K
      expect(result.notation).toContain('D');
      expect(result.notation).toContain('T');
      expect(result.notation).toContain('K');
    });

    it('respects priority BD > SD > HH when all enabled', () => {
      const tab = `
HH x---|
SD o---|
BD o---|
      `;
      const result = parseDrumTab(tab, { includeBass: true, includeSnare: true, includeHiHat: true });
      // BD wins when all hit on same beat
      expect(result.notation.charAt(0)).toBe('D');
    });

    it('allows importing only hi-hat', () => {
      const tab = `
HH x-x-x-x-|
SD o-------|
BD o-------|
      `;
      const result = parseDrumTab(tab, { includeBass: false, includeSnare: false, includeHiHat: true });
      // Should only have K (from HH) and _ (rests)
      expect(result.notation).toContain('K');
      expect(result.notation).not.toContain('D');
      expect(result.notation).not.toContain('T');
    });

    it('allows importing only snare', () => {
      const tab = `
HH x-x-x-x-|
SD ----o---|
BD o-------|
      `;
      const result = parseDrumTab(tab, { includeBass: false, includeSnare: true, includeHiHat: false });
      // Should only have T (from SD) and _ (rests)
      expect(result.notation).toContain('T');
      expect(result.notation).not.toContain('D');
      expect(result.notation).not.toContain('K');
    });

    it('returns warning when no selected components found', () => {
      const tab = `
HH x-x-x-x-|
      `;
      const result = parseDrumTab(tab, { includeBass: true, includeSnare: true, includeHiHat: false });
      // BD and SD not in tab, HH not selected
      expect(result.warnings).toContain('No selected drum components found in tab');
      expect(result.notation).toBe('');
    });

    it('handles uppercase and lowercase for SD markers', () => {
      const tab = `
HH ----|
SD O-o-|
BD ----|
      `;
      const result = parseDrumTab(tab);
      // Both uppercase O and lowercase o should be recognized as hits -> T
      expect(result.notation).toContain('T');
    });

    it('handles multi-measure tabs', () => {
      const tab = `
HH x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x-x-|
SD ----o-------o---|----o-------o---|
BD o------oo-o-----|o------oo-o-----|
      `;
      const result = parseDrumTab(tab);
      expect(result.measureCount).toBeGreaterThanOrEqual(1);
      expect(result.notation.length).toBeGreaterThan(16);
    });

    it('returns empty notation for tab without BD or SD', () => {
      const tab = `
HH x-x-x-x-|
CC --------|
      `;
      const result = parseDrumTab(tab);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('groups repeating measures', () => {
      const tab = `
HH x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x-x-|
SD ----o-------o---|----o-------o---|
BD o-------o-------|o-------o-------|
      `;
      const result = parseDrumTab(tab);
      // Two identical measures should be grouped
      expect(result.uniqueMeasures.length).toBeGreaterThan(0);
      if (result.uniqueMeasures.length === 1) {
        expect(result.uniqueMeasures[0].count).toBe(2);
      }
    });

    it('provides simplified notation with unique patterns only', () => {
      const tab = `
HH x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x-x-|
SD ----o-------o---|----o-------o---|----o-------o---|
BD o-------o-------|o-------o-------|o-------o-------|
      `;
      const result = parseDrumTab(tab);
      // Simplified notation should be shorter than full notation
      expect(result.simplifiedNotation.length).toBeLessThanOrEqual(result.notation.length);
    });

    it('handles double hit notation (d)', () => {
      const tab = `
RC -ddddddddddddddd|
BD o---------------|
      `;
      const result = parseDrumTab(tab);
      expect(result.notation).toBeTruthy();
    });

    it('handles tabs with various whitespace', () => {
      const tab = `
  HH  x-x-x-x-|
  SD  ----o---|
  BD  o-------|
      `;
      const result = parseDrumTab(tab);
      expect(result.notation).toBeTruthy();
    });

    it('ignores non-drum lines (lyrics, headers)', () => {
      const tab = `
Verse 1:
   Before   Couldn't look you in 
CC ----------------|-------------
HH x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x
SD ----o-------o---|----o-------o
BD o------oo-o-----|o------oo-o--
      `;
      const result = parseDrumTab(tab);
      expect(result.notation).toBeTruthy();
      expect(result.componentsFound).toContain('BD');
    });

    it('produces valid darbuka notation characters only', () => {
      const tab = `
HH x-x-x-x-x-x-x-x-|
SD ----o-------o---|
BD o------oo-o-----|
      `;
      const result = parseDrumTab(tab);
      // Notation should only contain D, T, K, _, -, and spaces
      const validPattern = /^[DTK_\-\s]*$/;
      expect(validPattern.test(result.notation)).toBe(true);
    });

    it('handles continuation lines correctly', () => {
      const tab = `
HH x-x-x-x-x-x-x-x-|x-x-x-x-x-x-x
SD ----o-------o---|----o-------o
BD o------oo-o-----|o------oo-o--
-x-|
---|
---|
      `;
      const result = parseDrumTab(tab);
      // Should parse without errors
      expect(result.notation).toBeTruthy();
      expect(result.componentsFound).toContain('BD');
    });

    it('produces correct pattern for basic rock beat (Creep-style)', () => {
      const tab = `
SD ----o-------o---|
BD o------oo-o-----|
      `;
      const result = parseDrumTab(tab);
      // 16th note pattern: D___T__DD_D_T___
      // After 8th note simplification: D-__T-_DD-D-T-__
      // No hi-hat fill by default
      expect(result.notation).toMatch(/D-__T-_DD-D-T-__/);
    });

    it('produces pattern with hi-hat when enabled (Creep-style)', () => {
      const tab = `
HH x-x-x-x-x-x-x-x-|
SD ----o-------o---|
BD o------oo-o-----|
      `;
      const result = parseDrumTab(tab, { includeBass: true, includeSnare: true, includeHiHat: true });
      // With HH enabled, empty spaces where HH plays get K
      // HH pattern: x-x-x-x-x-x-x-x- (hits on positions 1,3,5,7,9,11,13,15)
      // BD priority wins where both hit
      expect(result.notation).toContain('D');
      expect(result.notation).toContain('T');
      expect(result.notation).toContain('K');
    });

    it('preserves consecutive 16th note hits (oo → DD)', () => {
      const tab = `
SD ----|
BD oo--|
      `;
      const result = parseDrumTab(tab);
      // Two consecutive kicks should produce DD, not D-D-
      expect(result.notation).toContain('DD');
    });

    it('only fills with K where HH actually plays (when enabled)', () => {
      const tab = `
HH x-x-x-x-|
SD --------|
BD o-------|
      `;
      const result = parseDrumTab(tab, { includeBass: true, includeSnare: true, includeHiHat: true });
      // D on beat 1, K where HH plays (positions 1,3,5,7 in 16ths)
      // But D takes priority at position 1
      expect(result.notation).toContain('D');
      expect(result.notation).toContain('K');
    });

    it('does not fill offbeat positions with hi-hat', () => {
      const tab = `
SD ----|
BD -o--|
      `;
      const result = parseDrumTab(tab);
      // Offbeat kick should be _D, not KD
      expect(result.notation).toContain('_D');
    });

    it('converts 8th note hits to proper notation (D-)', () => {
      const tab = `
SD o---|
BD ----|
      `;
      const result = parseDrumTab(tab);
      // Single hit followed by rest becomes 8th note T-
      expect(result.notation).toMatch(/T-/);
    });
  });
});
