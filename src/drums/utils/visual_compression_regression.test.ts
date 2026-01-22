
import { describe, it, expect } from 'vitest';
import { parseRhythm, findMeasureIndexFromVisualTick } from '../../shared/rhythm/rhythmParser';
import { mapLogicalToStringIndex, replacePatternAtIndex } from './dragAndDrop';

describe('Visual Time Coordinate Mapping', () => {
    const timeSignature = { numerator: 4, denominator: 4 };

    it('should map compressed visual ticks to expanded logical indices for Section Repeats', () => {
        // |: D--- :|x3 | K---
        const notation = '|: D--- :|x3 | K---';
        const parsed = parseRhythm(notation, timeSignature);
        console.log('Visual Regression Measures:', parsed.measures.length);
        console.log('Notation:', notation);

        // Click on K (Visual Tick 16 + 1 = 17)
        const lookup = findMeasureIndexFromVisualTick(parsed, 17);

        expect(lookup.index).toBe(3);
        expect(lookup.visualMeasureStartTick).toBe(16);
        expect(lookup.localTick).toBe(1);
    });

    it('should NOT hide Simile Repeats (x6)', () => {
        const notation = 'D--- | % |x6';
        const parsed = parseRhythm(notation, timeSignature);

        // Click on last measure (M6) - Total Count implies M0..M6.
        // Tick 113.
        const lookup = findMeasureIndexFromVisualTick(parsed, 113);
        expect(lookup.index).toBe(6);
    });

    it('should coordinate full replacement chain for Compressed Suffix', () => {
        const notation = 'A---|: B--- :|x3 | C---';
        const parsed = parseRhythm(notation, timeSignature);

        // Target C (Visual Tick 32).
        // M0 (16). M1 (16). C starts 32.
        const lookup = findMeasureIndexFromVisualTick(parsed, 32);

        expect(lookup.index).toBe(4); // M4 is C.
        expect(lookup.visualMeasureStartTick).toBe(32);

        // Logical Tick
        const logicalTick = lookup.logicalMeasureStartTick + lookup.localTick;
        expect(logicalTick).toBe(64);

        // Map to String Index
        const map = mapLogicalToStringIndex(notation, logicalTick, parsed, timeSignature);

        // Replace
        const newPattern = 'NEW-';
        const result = replacePatternAtIndex(notation, map.index, newPattern, 16);

        console.log('Result:', result.newNotation);

        // Result: A---|: B--- :|x3 | NEW-
        expect(result.newNotation).toContain('NEW-');
        expect(result.newNotation).toContain('|: B--- :|x3');
    });
});
