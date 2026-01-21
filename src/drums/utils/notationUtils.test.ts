
import { describe, it, expect } from 'vitest';
import { expandSimileMeasure } from './notationUtils';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';
import type { TimeSignature } from '../../shared/rhythm/types';

describe('notationUtils', () => {
    describe('expandSimileMeasure', () => {
        const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };

        it('should unroll a section repeat when editing a ghost measure', () => {
            // Case 1: Simple Section Repeat
            // |: A | B :|x2
            const notation = `|: D---D---D---D--- | T---T---T---T--- :|x2`;
            const parsed = parseRhythm(notation, timeSignature);

            // Target M3 (Ghost of A, index 2)
            // Expected behavior: The `x2` token should be replaced by `| D... | T...`.
            // resulting string: `|: D... | T... :| | D... | T... |` 

            const expanded = expandSimileMeasure(notation, 2, parsed);

            expect(expanded).not.toBe(notation);
            expect(expanded).toContain('D---D---D---D---');
            expect(expanded).toContain('T---T---T---T---');
        });
    });
});
