
import { describe, it, expect } from 'vitest';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import { mapLogicalToStringIndex } from './dragAndDrop';
import type { TimeSignature } from '../../shared/rhythm/types';

describe('Editing Integration & Coordinate Mapping', () => {
    const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };

    describe('Implicit Rest & Gap Handling (Phase 24)', () => {
        it('should allow replacement in implicit rest ("void") at end of measure', () => {
            const notation = 'D';
            const parsed = parseRhythm(notation, timeSignature);
            const targetPos = 4;
            const map = mapLogicalToStringIndex(notation, targetPos, parsed, timeSignature);
            expect(map.index).toBe(1);
        });
    });

    describe('Repeat Handling & Post-Repeat Targeting (Regressions)', () => {
        it('should map coordinates correctly AFTER a repeat block', () => {
            // FIX: Use explicit repeat count (x2) to ensure a ghost block exists.
            // |: D :|x2 D
            // M0 (Source) -> 0-16
            // M1 (Ghost) -> 16-32
            // M2 (Post-Repeat D) -> 32-48
            // We target 16 (Start of M1). Should map to Source (M0, Index 3).
            const notation = '|: D :|x2 D';
            const parsed = parseRhythm(notation, timeSignature);
            const map = mapLogicalToStringIndex(notation, 16, parsed, timeSignature);
            expect(map.index).toBe(3); // Mapped to Source D (Index 3)
        });

        it('should map correctly when dragging valid note AFTER a repeat (User Report)', () => {
            const notation = '|: D :|x2 k';
            const parsed = parseRhythm(notation, timeSignature);
            const selMap = mapLogicalToStringIndex(notation, 32, parsed, timeSignature);
            // FIX Phase 77: Total Count x2 = 2 measures. M0, M1.
            // Tick 32 is start of M2 (Post-Repeat).
            // M2 is 'k' (index 10 or 11 due to spacing).
            const idx = selMap.index;
            expect(idx).toBeGreaterThanOrEqual(10);
            expect(idx).toBeLessThanOrEqual(11);
            // expect(notation[selMap.index]).toBe('k'); // Was 'D' in Additive logic
            // const startMap = mapLogicalToStringIndex(notation, 32, parsed, timeSignature);
            // const endMap = mapLogicalToStringIndex(notation, 33, parsed, timeSignature);
            const toMap = mapLogicalToStringIndex(notation, 36, parsed, timeSignature);
            const idx2 = toMap.index;
            expect(idx2).toBeGreaterThanOrEqual(10);
            expect(idx2).toBeLessThanOrEqual(11);
        });

        it('should map Multi-Measure Repeats (| % |x6) correctly (Phase 26)', () => {
            // User Case: T... | % |x6 | D...
            // M0: T... (0-16)
            // M1: % (16-32) -> Should map to index of %
            // M2..M6: Ghosts -> Should map to index of %
            // M7: D... (112-128) -> Should map to index of D

            const notation = 'D---D---D---D---|%|x6|D---D---D---D---';
            const parsed = parseRhythm(notation, timeSignature);

            // Verify M1 (Simile Source)
            // M0 is 16 ticks. M1 starts at 16.
            // Index of % in string: Top of my head ~19?
            // "T-K-K---S-----TK | % " -> 16 chars + " | % " (3 chars?) -> 19?
            // mapLogicalToStringIndex(16) should point to '%'

            const m1Map = mapLogicalToStringIndex(notation, 16, parsed, timeSignature);
            const charAtM1 = notation[m1Map.index];
            expect(charAtM1).toBe('%');

            // Verify M2 (Ghost)
            // logical 32. Should map to % (same index)
            const m2Map = mapLogicalToStringIndex(notation, 32, parsed, timeSignature);
            expect(m2Map.index).toBe(m1Map.index);

            // Verify M7 (Suffix)
            // M0(1) + M1(1) + M2..M6(5) = 7 repeats. M7 starts at 7*16 = 112.
            // D start index ~ 27?
            const m7Map = mapLogicalToStringIndex(notation, 112, parsed, timeSignature);
            const charAtM7 = notation[m7Map.index];
            expect(charAtM7).toBe('D');
        });
    });

    describe('Legacy "Wrong Note" Selection (Phase 24)', () => {
        it('should snap selection to note start when clicking sub-beat (Dash)', () => {
            const notation = 'D-';
            const parsed = parseRhythm(notation, timeSignature);
            const map = mapLogicalToStringIndex(notation, 1, parsed, timeSignature);
            expect(map.index).toBe(1);
            let snapped = map.index;
            while (snapped > 0 && notation[snapped] === '-') snapped--;
            expect(snapped).toBe(0);
        });
    });
});
