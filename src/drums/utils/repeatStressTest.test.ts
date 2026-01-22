
import { describe, it, expect } from 'vitest';
import { parseRhythm } from './rhythmParser';
// getExpandedMeasureIndexFromSourceTicks is removed as it's unused

/**
 * COMPREHENSIVE REPEAT ARCHITECTURE STRESS TESTS
 * 
 * These tests are designed to break the current implementation by testing 
 * complex, nested, split, and messy repeat structures.
 */

describe('Repeat Architecture Stress Tests', () => {

    // Helper: 16-tick measure string
    const M1 = 'D-T-____D-T-____'; // 16 ticks
    const M2 = 'D-K-____D-K-____'; // 16 ticks

    describe('1. Single Measure Repeats (|xN)', () => {

        it('should handle simple single measure repeat', () => {
            // M1 |x3 -> M1 M1 M1 (Total 3)
            const notation = `${M1} |x3`;
            const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });

            expect(rhythm.measures.length).toBe(3);
            expect(rhythm.repeats?.length).toBe(1);
            const repeat = rhythm.repeats![0];
            if (repeat.type === 'measure') {
                expect(repeat.repeatMeasures.length).toBe(2);
            } else {
                throw new Error('Expected measure repeat');
            }

            // Check mapping
            expect(rhythm.measureSourceMapping?.[0]).toBeUndefined(); // Source
            expect(rhythm.measureSourceMapping?.[1]).toBe(0); // Repeat 1
            expect(rhythm.measureSourceMapping?.[2]).toBe(0); // Repeat 2
        });

        it('should handle repeat following multiple measures (only repeat last)', () => {
            // M1 | M2 |x3 -> M1 | M2 | M2 | M2 (Total 4)
            const notation = `${M1} | ${M2} |x3`;
            const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });

            expect(rhythm.measures.length).toBe(4);
            expect(rhythm.measures[0].notes[0].sound).toBe('dum');
            expect(rhythm.measures[1].notes[0].sound).toBe('dum'); // D-K-
            // M2 (Index 1) is D-K-. M2 is source.
            // M3 (Index 2) should be copy of M2 -> D-K-
            expect(rhythm.measures[2].notes[0].sound).toBe('dum');
            expect(rhythm.measures[2].notes[1].sound).toBe('ka'); // Check 'ka' (Note Index 1)

            // Check mapping
            expect(rhythm.measureSourceMapping?.[2]).toBe(1);
            expect(rhythm.measureSourceMapping?.[3]).toBe(1);
        });

        it('should handle split measures across lines', () => {
            // M1
            // M2 split across lines
            // M1 (16). 
            // Line 2: "D-K-____ |x3". "D-K-____" is 8 ticks. 
            // Wait, if it's 8 ticks, it's half a measure.
            // |x3 repeats those 8 ticks?
            // D-K-____ x3 -> 24 ticks. + previous 16 ticks = 40 ticks = 2.5 measures.
            // User scenario usually implies full measures. Let's force full measure.
            const notationFull = `${M1}
${M2} |x3`;

            const rhythm = parseRhythm(notationFull, { numerator: 4, denominator: 4 });

            expect(rhythm.measures.length).toBe(4);
            expect(rhythm.measureSourceMapping?.[1]).toBeUndefined(); // M2 Source
            expect(rhythm.measureSourceMapping?.[2]).toBe(1);
        });

        it('should handle the "Complex User Scenario" (Split + Multiple Repeats)', () => {
            // Using condensed strings but ensuring they equal full measures or close to it
            // User string: D-__D-__S-______ (16 ticks)
            const MA = 'D-__D-__S-______';
            const MB = 'D-__K-__D-__S-__';

            const notation = `${MA} |x3
${MB} ${MA} |x3
${MB}`;
            // Line 1: MA |x3 -> 3 measures.
            // Line 2: MB MA |x3. 
            // Logic "repeat last measure" -> Repeats M4.
            // So Line 2: MB (M4 M4 M4).
            // Total measures: 3 + 1 (MB) + 3 (MA repeats) + 1 (Line 3 MB) = 8.

            const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });
            expect(rhythm.measures.length).toBe(8);

            // Check Repeats:
            // Group 1: M0 source. Repeats M1, M2.
            expect(rhythm.measureSourceMapping?.[1]).toBe(0);
            expect(rhythm.measureSourceMapping?.[2]).toBe(0);

            // Group 2:
            // M3 is MB.
            // M4 is MA. Source.
            // M5, M6 are repeats of M4.
            expect(rhythm.measureSourceMapping?.[5]).toBe(4);
            expect(rhythm.measureSourceMapping?.[6]).toBe(4);
        });
    });

    describe('2. Section Repeats (|: ... :| xN)', () => {
        it('should handle simple section repeat', () => {
            // |: M1 M2 :| x2 -> Total Count 2.
            // (M1 M2) (M1 M2) -> 4 measures.
            const notation = `|: ${M1} ${M2} :| x2`;
            const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });

            expect(rhythm.measures.length).toBe(4);
            // M0, M1 are source.
            // M2 is repeat of M0.
            // M3 is repeat of M1.
            expect(rhythm.measureSourceMapping?.[2]).toBe(0);
            expect(rhythm.measureSourceMapping?.[3]).toBe(1);
        });

        it('should handle nested repeats (implicit)', () => {
            // |: M1 |x2 :| x2
            // Inner: M1 |x2 -> M1 M1 (2 measures).
            // Outer: |: (M1 M1) :| x2 -> Total Count 2.
            // (M1 M1) (M1 M1) -> 4 measures.
            const notation = `|: ${M1} |x2 :| x2`;
            // Note: Parser pass 1 expands inner |x2.
            // Pass 1 result: |: M1 M1 :| x2.
            // Pass 2 expands outer.

            const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });

            console.log('Nested Repeat Length:', rhythm.measures.length);
            expect(rhythm.measures.length).toBe(4);

            // Mapping:
            // M0: Source.
            // M1: Repeat of M0 (from inner |x2). Source=0.
            // M2: Repeat of M0 (from outer loop first repeat). Source=0.
            // M3: Repeat of M1 (from outer loop first repeat). Source=1 -> 0.
            // Wait, mapping is purely index based.
            // M1 maps to 0.
            // M3 (copy of M1) maps to M1's source (0). Use deep mapping logic if implemented, otherwise 1.
            // Current parser implementation maps to InputMapping (Single Level).
            // M0->0, M1->0.
            // Outer loop copies M0->0, M1->0 -> M2->0, M3->1.

            expect(rhythm.measureSourceMapping?.[1]).toBe(0);
            expect(rhythm.measureSourceMapping?.[2]).toBe(0);
            expect(rhythm.measureSourceMapping?.[3]).toBe(1);
        });
    });

    describe('3. Robust Mapping Check', () => {
        it('should map repeats correctly even with padding', () => {
            // M1 (Padded) |x2
            const notation = 'D- |x2';
            // D- is 2 ticks. Needs 14 ticks padding.
            const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });

            expect(rhythm.measures.length).toBe(2);
            expect(rhythm.measures[0].notes.length).toBeGreaterThan(1); // Should have padding rests
            expect(rhythm.measureSourceMapping?.[1]).toBe(0);
        });
    });

    describe('4. End-to-End Edit Simulation', () => {
        it('should correctly redirect an edit on a repeated measure to the source', () => {
            // Setup: M1 |x2. 
            // M1 = D-T-____D-T-____ (16 ticks). 
            // Notation: "D-T-____D-T-____ |x2"
            const sourceMeasureStr = 'D-T-____D-T-____';
            const notation = `${sourceMeasureStr} |x2`;
            const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });

            // Scenario: User drops "K-" on the START of the 2nd measure (the repeat).
            // 2nd measure is Index 1.
            const targetMeasureIndex = 1;

            // 1. Simulate VexFlow Mapping Lookup
            // Logic from VexFlowRenderer:
            let sourceIdx = targetMeasureIndex;
            if (rhythm.measureSourceMapping?.[targetMeasureIndex] !== undefined) {
                sourceIdx = rhythm.measureSourceMapping[targetMeasureIndex];
            }

            expect(sourceIdx).toBe(0); // Should map to Source (M0)

            // 2. Calculate Char Position string index
            // M0 starts at 0.
            const targetCharIndex = 0; // Start of M0

            // 3. Perform String Replacement (simulate dragAndDrop.ts)
            // Replace first 2 chars "D-" with "K-"
            const pattern = 'K-';
            const newNotation = notation.slice(0, targetCharIndex) + pattern + notation.slice(targetCharIndex + 2);

            // 4. Verify Result
            // Expect: "K-T-____D-T-____ |x2"
            const expectedStr = `K-T-____D-T-____ |x2`;
            expect(newNotation).toBe(expectedStr);
        });

        it('should correctly redirect edit on Section Repeat', () => {
            // |: M1 :| x2
            const M1 = 'D-T-____D-T-____';
            const notation = `|: ${M1} :| x2`;
            const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });

            // M0: Source. M1: Repeat.
            // User edits M1 (Repeat).
            const targetMeasureIndex = 1;

            // Lookup
            let sourceIdx = targetMeasureIndex;
            if (rhythm.measureSourceMapping?.[targetMeasureIndex] !== undefined) {
                sourceIdx = rhythm.measureSourceMapping[targetMeasureIndex];
            }

            expect(sourceIdx).toBe(0);

            // Calculate Char Mapping
            // |: is 3 chars (with space).
            // M1 starts at index 3.
            const targetCharIndex = 3;

            const pattern = 'K-';
            // Replace D- at start of M1
            const newNotation = notation.slice(0, targetCharIndex) + pattern + notation.slice(targetCharIndex + 2);

            expect(newNotation).toBe(`|: K-T-____D-T-____ :| x2`);
        });
    });

    describe('5. Reported Bugs', () => {
        it('should handle the nested mixed repeat case correctly (Issue 7)', () => {
            // Check expansion:
            // |: M1 |x2
            //    M2 :| x2
            // Inner: M1 M1. Block = M1 M1 M2. (3 measures).
            // Outer x2 -> Total Count 2.
            // 2 * 3 = 6 measures.
            const M1 = 'D-T-____D-T-____';
            const M2 = 'D-K-____D-K-____'; // valid 16 ticks

            const notation = `|: ${M1} |x2
${M2} :| x2`;

            const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });

            expect(rhythm.measures.length).toBe(6);

            // Check Mapping
            // Block is indices 0, 1, 2. (M1, M1, M2).
            // Input Mapping: 0->0, 1->0, 2->2.
            // Repeat 1 (Indices 3,4,5): Copies 0,1,2 -> 0,0,2.
            // Repeat 2 (Indices 6,7,8): Copies 0,1,2 -> 0,0,2.

            expect(rhythm.measureSourceMapping?.[1]).toBe(0);
            expect(rhythm.measureSourceMapping?.[3]).toBe(0);
            expect(rhythm.measureSourceMapping?.[5]).toBe(2);
            expect(rhythm.measureSourceMapping?.[8]).toBe(2);
        });
    });


});
