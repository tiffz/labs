
import { describe, it, expect } from 'vitest';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import { replacePatternAtPosition } from './dragAndDrop';

describe('Regression Tests (Phase 5, 6 & 7)', () => {
    // ... Phase 5/6 tests omitted for brevity (they passed) ...
    // Re-adding them briefly to ensure full suite passes
    it('Bug 2: Content invisible after mixed repeats (Issue 9)', () => {
        const notation = 'D-T-____D-T-____|x2|:D-K-T-__:|x2____T_T-T-T-';
        const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });
        const allSounds = rhythm.measures.flatMap(m => m.notes.map(n => n.sound));
        expect(allSounds.slice(-5).filter(s => s === 'tak').length).toBeGreaterThan(0);
    });

    it('Bug 3: Dragging on implicit rest deletes repeat (Issue 10)', () => {
        const notation = "D- |x2";
        const parsedRhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });
        const result = replacePatternAtPosition(notation, 2, "T-", 2, { numerator: 4, denominator: 4 }, parsedRhythm);
        expect(result.newNotation).toContain('|x2');
    });

    it('Bug 4: Dragging on second loop deletes all repeats (Issue 11)', () => {
        const notation = 'TKTKK-TKTKDKTK__|x3|:KK-K--K___K---__:|x3';
        const parsedRhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });
        const resultFix = replacePatternAtPosition(notation, 16, "D-", 2, { numerator: 4, denominator: 4 }, parsedRhythm);
        expect(resultFix.newNotation).toContain('|x3');
        expect(resultFix.newNotation).toContain('|:');
    });

    it('Bug 5: Simple repeats cause coordinate drift (Issue 13)', () => {
        // Scenario: M0 |x3.
        // M0 (Source). M1, M2 (Repeats).
        // Parser should generate repeats of type 'measure'.
        // Parser should generate Mapping: 1->0, 2->0.
        // If mapping exists, VexFlow renderer (verified separately) will NOT advance globalCharPosition.

        const notation = 'TKTKK-TKTKDKTK__|x3';
        const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });

        // Verify Repeats exist
        expect(rhythm.repeats).toBeDefined();
        expect(rhythm.repeats!.length).toBeGreaterThan(0);

        // Verify Mapping
        // M0 is source (0).
        // M1 should map to 0.
        // M2 should map to 0.
        expect(rhythm.measureSourceMapping).toBeDefined();
        expect(rhythm.measureSourceMapping![1]).toBe(0);
        expect(rhythm.measureSourceMapping![2]).toBe(0);
    });

    it('Bug 6: Complex Mapping Verification (Issue 13 Follow-up)', () => {
        const notation = 'TKTKK-TKTKDKTK__|x3|:KK-K--K___K---__:|x3';
        // M0 (16 ticks) |x3.
        // M0, M1(G), M2(G).
        // |:KK-K--K___K---__:|x3
        // Content: KK-K--K___K---__ (16 ticks). M3.
        // Loops 3 times. M3, M4(G/M3), M5(G/M3).
        // Wait, |: ... :| x3 means Play Block 3 times.
        // Block is M3.
        // Instance 1: M3 (Source).
        // Instance 2: M4 (Ghost of M3).
        // Instance 3: M5 (Ghost of M3).

        const rhythm = parseRhythm(notation, { numerator: 4, denominator: 4 });

        // Debug Output
        console.log('Measures:', rhythm.measures.length);
        console.log('Repeats:', rhythm.repeats);
        console.log('Mapping:', rhythm.measureSourceMapping);

        // Logic Simulation
        let globalCharPosition = 0;
        const starts: number[] = [];

        rhythm.measures.forEach((m, idx) => {
            const mapping = rhythm.measureSourceMapping || {};
            const isGhost = mapping[idx] !== undefined && mapping[idx] !== idx;

            if (isGhost) {
                starts[idx] = starts[mapping[idx]]; // Visual start = source start
            } else {
                starts[idx] = globalCharPosition;
                // Advance global ONLY if source
                const duration = m.notes.reduce((s, n) => s + (n.durationInSixteenths || 0), 0);
                globalCharPosition += duration;
            }
        });

        console.log('Calculated Starts:', starts);

        // Expecations:
        // M0: 0.
        // M1: 0.
        // M2: 0.
        // M3 (Start of Section): Should be 16.
        // M4: 16.
        // M5: 16.

        expect(starts[0]).toBe(0);
        expect(starts[3]).toBe(16);
    });

    it('Bug 7: Note Splitting & Time Conservation (Issue 17)', () => {
        // Dotted Quarter (6 ticks) | Rest (2 ticks) (Total 8)
        // Notation: D-----_
        // Pattern to Drop: 2 Eighths "KK" (4 ticks, D-K- or similar)
        // User drops "KK" (4) onto "D-----" (6).
        // Expectation: "KK" (4) + "Remainder" (2) + "_" (2).
        // Total 4 + 2 + 2 = 8.

        // Setup: Single measure, 4/4 (16 ticks). Dotted Quarter (6) at start.

        // Drop "K-" (2) at pos 0.
        // We want to replace D----- (6) with K- (2).
        // Result should be: K- (2) + D- (4, Remainder of 6-2=4?).
        // Wait, user said "Two eighth notes" replace Dotted Quarter.
        // Pattern = "K-K-" (4). 
        // Target = "D-----" (6).
        // Result = "K-K-" (4) + "D-" (2).

        const pattern = 'K-K-'; // 4 ticks
        const input = 'D-----__________'; // 6 + 10
        const parsedRhythm = parseRhythm(input, { numerator: 4, denominator: 4 });
        // Replacement at 0.

        const result = replacePatternAtPosition(input, 0, pattern, 4, { numerator: 4, denominator: 4 }, parsedRhythm);

        // We expect the original 6 ticks to be fully accounted for.
        // 4 ticks from pattern. 2 ticks from remainder.
        // Remainder should ideally be the original sound 'D' shortened?
        // User said: "3rd eighth note is a shortened version of the original dotted quarter note"

        // Current likely behavior: "K-K-__________" (remainder lost).
        // Or "K-K-_ _" (auto-filled rests).

        console.log('Original:', input);
        console.log('Result:', result.newNotation);

        // Check for conservation (conceptually)
        // We look for 'K-K-' followed by something that isn't just the original tail.
        // If we replaced D-----, the next chars should be `D-` (if preserving sound) or `__` (if filling with rest).
        // User wants D-.

        expect(result.newNotation).toMatch(/^K-K-D-/);
    });

});
