
import { describe, it, expect } from 'vitest';
import { notationToGrid, gridToNotation } from './sequencerUtils';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import type { TimeSignature } from '../types';

/**
 * SEQUENCER STABILITY REGRESSION SUITE
 * 
 * Verifies that the "Round Trip" (Notation -> Grid -> Notation) preserves 
 * critical structural intent, specifically repeat configurations that are 
 * susceptible to "Melting" (collapsing into simpler forms) or "Growth" (infinite expansion).
 */
describe('Sequencer Stability & Round Trip Integrity', () => {
    const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };

    describe('Repeat Count Stability', () => {
        it('should maintain stable repeat count for Single Repeats (User Scenario: x7)', () => {
            // Regression: "Repeat Growth/Shrink" Bug
            // x7 must remain x7. Not x6, not x8.
            const notation = 'D - - - | % |x7';
            const parsed = parseRhythm(notation, timeSignature);
            const grid = notationToGrid(notation, timeSignature);

            const roundTrip = gridToNotation(grid, parsed.repeats);

            // Check Invariant: Input Count == Output Count
            expect(roundTrip).toContain('|x7');
            expect(roundTrip).not.toContain('|x6');
            expect(roundTrip).not.toContain('|x8');
        });

        it('should maintain stable repeat count for Section Repeats', () => {
            const notation = '|: D - - - :|x3';
            const parsed = parseRhythm(notation, timeSignature);
            const grid = notationToGrid(notation, timeSignature);

            const roundTrip = gridToNotation(grid, parsed.repeats);

            expect(roundTrip).toContain(':|x3');
        });
    });

    describe('Structural Preservation', () => {
        it('should preserve Single-Instance Section Repeats (|: ... :|x1)', () => {
            // Regression: "Extra Repeat on M1" Bug
            // Parser must NOT discard repeat markers just because count is 1.
            const notation = '|: D - - - :|x1';
            const parsed = parseRhythm(notation, timeSignature);

            // Verify PArser State
            const sectionRepeat = parsed.repeats.find(r => r.type === 'section');
            expect(sectionRepeat).toBeDefined();
            expect(sectionRepeat?.repeatCount).toBe(1);

            const grid = notationToGrid(notation, timeSignature);
            const roundTrip = gridToNotation(grid, parsed.repeats || []);

            expect(roundTrip).toContain('|:');
            expect(roundTrip).toContain(':|x1');
            // Should NOT collapse to |x2
            expect(roundTrip).not.toContain('|x2');
        });
    });
});
